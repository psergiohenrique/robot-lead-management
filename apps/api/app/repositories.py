from __future__ import annotations

from typing import Any

from app.config import get_settings
from app.db import database_configured, get_connection
from app.places import buscar_lugares, montar_lead


def ensure_search_batch_leads_table() -> None:
    if not database_configured():
        return

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS search_batch_leads (
                    batch_id BIGINT NOT NULL REFERENCES search_batches(id) ON DELETE CASCADE,
                    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    PRIMARY KEY (batch_id, lead_id)
                )
                """
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_search_batch_leads_lead_id ON search_batch_leads (lead_id)"
            )
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_search_batch_leads_batch_id ON search_batch_leads (batch_id)"
            )
        connection.commit()


def get_dashboard_summary() -> dict[str, int]:
    if not database_configured():
        return {
            "total_leads": 0,
            "leads_sem_site": 0,
            "leads_quentes": 0,
            "provavel_whatsapp": 0,
            "contatos_feitos": 0,
            "respostas_recebidas": 0,
            "reunioes_marcadas": 0,
            "propostas_enviadas": 0,
            "fechados": 0,
        }

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    COUNT(*)::int AS total_leads,
                    COUNT(*) FILTER (WHERE sem_site_cadastrado = 'SIM')::int AS leads_sem_site,
                    COUNT(*) FILTER (WHERE classificacao_lead = 'Quente')::int AS leads_quentes,
                    COUNT(*) FILTER (WHERE whatsapp_status = 'Provável WhatsApp')::int AS provavel_whatsapp,
                    COUNT(*) FILTER (WHERE COALESCE(status_contato, 'Novo') <> 'Novo')::int AS contatos_feitos,
                    COUNT(*) FILTER (WHERE respondeu = true)::int AS respostas_recebidas,
                    COUNT(*) FILTER (WHERE reuniao_marcada = true)::int AS reunioes_marcadas,
                    COUNT(*) FILTER (WHERE proposta_enviada = true)::int AS propostas_enviadas,
                    COUNT(*) FILTER (WHERE fechado = true)::int AS fechados
                FROM leads
                """
            )
            row = cursor.fetchone() or {}
            return dict(row)


def list_leads(
    *,
    limit: int = 50,
    offset: int = 0,
    cidade: str | None = None,
    segmento: str | None = None,
    classificacao: str | None = None,
    sem_site: str | None = None,
    batch_id: int | None = None,
) -> tuple[list[dict[str, Any]], int]:
    if not database_configured():
        return [], 0

    if batch_id:
        ensure_search_batch_leads_table()

    filters: list[str] = []
    params: dict[str, Any] = {"limit": limit, "offset": offset}

    if cidade:
        filters.append("cidade ILIKE %(cidade)s")
        params["cidade"] = f"%{cidade}%"
    if segmento:
        filters.append("segmento ILIKE %(segmento)s")
        params["segmento"] = f"%{segmento}%"
    if classificacao:
        filters.append("classificacao_lead = %(classificacao)s")
        params["classificacao"] = classificacao
    if sem_site:
        filters.append("sem_site_cadastrado = %(sem_site)s")
        params["sem_site"] = sem_site

    from_clause = "leads l"
    if batch_id:
        from_clause = """
            leads l
            INNER JOIN search_batch_leads sbl ON sbl.lead_id = l.id
        """
        filters.append("sbl.batch_id = %(batch_id)s")
        params["batch_id"] = batch_id

    where = f"WHERE {' AND '.join(filters)}" if filters else ""

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*)::int AS total FROM {from_clause} {where}", params)
            total = int((cursor.fetchone() or {"total": 0})["total"])
            cursor.execute(
                f"""
                SELECT
                    l.id, l.place_id, l.nome, l.telefone, l.telefone_limpo, l.whatsapp_status,
                    l.endereco, l.cidade, l.segmento, l.regiao, l.google_maps_url, l.avaliacao,
                    l.quantidade_avaliacoes, l.site_cadastrado, l.sem_site_cadastrado,
                    l.score_oportunidade, l.classificacao_lead, l.prioridade,
                    l.status_contato, l.proximo_followup, l.updated_at
                FROM {from_clause}
                {where}
                ORDER BY
                    CASE l.classificacao_lead
                        WHEN 'Quente' THEN 1
                        WHEN 'Morno' THEN 2
                        WHEN 'Frio' THEN 3
                        ELSE 4
                    END,
                    l.score_oportunidade DESC NULLS LAST,
                    l.quantidade_avaliacoes DESC NULLS LAST,
                    l.updated_at DESC NULLS LAST
                LIMIT %(limit)s OFFSET %(offset)s
                """,
                params,
            )
            return [dict(row) for row in cursor.fetchall()], total


def update_lead_contact(lead_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not database_configured():
        return None

    allowed_fields = {
        "status_contato",
        "proximo_followup",
        "respondeu",
        "interesse",
        "diagnostico_enviado",
        "reuniao_marcada",
        "proposta_enviada",
        "fechado",
        "motivo_perda",
        "observacao_humana",
    }
    values = {key: value for key, value in payload.items() if key in allowed_fields and value is not None}
    if not values:
        return get_lead(lead_id)

    assignments = ", ".join(f"{field} = %({field})s" for field in values)
    values["lead_id"] = lead_id

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                f"""
                UPDATE leads
                SET {assignments}, updated_at = now()
                WHERE id = %(lead_id)s
                RETURNING *
                """,
                values,
            )
            row = cursor.fetchone()
            connection.commit()
            return dict(row) if row else None


def get_lead(lead_id: int) -> dict[str, Any] | None:
    if not database_configured():
        return None

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute("SELECT * FROM leads WHERE id = %s", (lead_id,))
            row = cursor.fetchone()
            return dict(row) if row else None


def _marcar_erro(batch_id: int, item_id: int, erro: str) -> None:
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "UPDATE search_batches SET status = 'error', erro = %(erro)s, finished_at = now() WHERE id = %(id)s",
                {"erro": erro, "id": batch_id},
            )
            cursor.execute(
                "UPDATE search_batch_items SET status = 'error', erro = %(erro)s, finished_at = now() WHERE id = %(id)s",
                {"erro": erro, "id": item_id},
            )
        connection.commit()


def criar_e_executar_lote(
    *, cidade: str, segmento: str, prioridade: str, limite: int, nome_lote: str | None
) -> dict[str, Any]:
    if not database_configured():
        raise RuntimeError("DATABASE_URL não configurada.")

    settings = get_settings()
    api_key = (settings.google_places_api_key or "").strip()
    if not api_key:
        raise RuntimeError("GOOGLE_PLACES_API_KEY não configurada.")

    query_base = f"{segmento} em {cidade}"

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO search_batches (nome_lote, status, prioridade, total_planejado, started_at)
                VALUES (%(nome_lote)s, 'running', %(prioridade)s, %(limite)s, now())
                RETURNING id
                """,
                {"nome_lote": nome_lote, "prioridade": prioridade, "limite": limite},
            )
            batch_id = cursor.fetchone()["id"]
            cursor.execute(
                """
                INSERT INTO search_batch_items (batch_id, cidade, segmento, limite, query_base, status)
                VALUES (%(batch_id)s, %(cidade)s, %(segmento)s, %(limite)s, %(query_base)s, 'running')
                RETURNING id
                """,
                {
                    "batch_id": batch_id,
                    "cidade": cidade,
                    "segmento": segmento,
                    "limite": limite,
                    "query_base": query_base,
                },
            )
            item_id = cursor.fetchone()["id"]
        connection.commit()

    try:
        lugares = buscar_lugares(api_key, query_base, limite)
    except RuntimeError as erro:
        _marcar_erro(batch_id, item_id, str(erro))
        raise

    leads = [
        montar_lead(lugar, cidade=cidade, segmento=segmento, prioridade=prioridade)
        for lugar in lugares
        if lugar.get("id")
    ]

    novos = 0
    atualizados = 0
    sem_site = sum(1 for lead in leads if lead["sem_site_cadastrado"] == "SIM")
    ensure_search_batch_leads_table()

    with get_connection() as connection:
        with connection.cursor() as cursor:
            for lead in leads:
                cursor.execute(
                    """
                    INSERT INTO leads (
                        place_id, nome, telefone, telefone_limpo, whatsapp_status,
                        endereco, cidade, segmento, google_maps_url, avaliacao,
                        quantidade_avaliacoes, site_cadastrado, sem_site_cadastrado,
                        business_status, score_oportunidade, classificacao_lead, prioridade
                    ) VALUES (
                        %(place_id)s, %(nome)s, %(telefone)s, %(telefone_limpo)s, %(whatsapp_status)s,
                        %(endereco)s, %(cidade)s, %(segmento)s, %(google_maps_url)s, %(avaliacao)s,
                        %(quantidade_avaliacoes)s, %(site_cadastrado)s, %(sem_site_cadastrado)s,
                        %(business_status)s, %(score_oportunidade)s, %(classificacao_lead)s, %(prioridade)s
                    )
                    ON CONFLICT (place_id) DO UPDATE SET
                        nome = EXCLUDED.nome,
                        telefone = EXCLUDED.telefone,
                        telefone_limpo = EXCLUDED.telefone_limpo,
                        whatsapp_status = EXCLUDED.whatsapp_status,
                        endereco = EXCLUDED.endereco,
                        cidade = EXCLUDED.cidade,
                        segmento = EXCLUDED.segmento,
                        google_maps_url = EXCLUDED.google_maps_url,
                        avaliacao = EXCLUDED.avaliacao,
                        quantidade_avaliacoes = EXCLUDED.quantidade_avaliacoes,
                        site_cadastrado = EXCLUDED.site_cadastrado,
                        sem_site_cadastrado = EXCLUDED.sem_site_cadastrado,
                        business_status = EXCLUDED.business_status,
                        score_oportunidade = EXCLUDED.score_oportunidade,
                        classificacao_lead = EXCLUDED.classificacao_lead,
                        updated_at = now()
                    RETURNING id, (xmax = 0) AS inserted
                    """,
                    lead,
                )
                row = cursor.fetchone()
                if row and row["inserted"]:
                    novos += 1
                else:
                    atualizados += 1
                if row:
                    cursor.execute(
                        """
                        INSERT INTO search_batch_leads (batch_id, lead_id)
                        VALUES (%(batch_id)s, %(lead_id)s)
                        ON CONFLICT (batch_id, lead_id) DO NOTHING
                        """,
                        {"batch_id": batch_id, "lead_id": row["id"]},
                    )

            cursor.execute(
                """
                UPDATE search_batches
                SET status = 'done', total_processado = %(total)s, total_leads = %(total)s,
                    total_sem_site = %(sem_site)s, finished_at = now()
                WHERE id = %(batch_id)s
                """,
                {"total": len(leads), "sem_site": sem_site, "batch_id": batch_id},
            )
            cursor.execute(
                "UPDATE search_batch_items SET status = 'done', finished_at = now() WHERE id = %(item_id)s",
                {"item_id": item_id},
            )
        connection.commit()

    return {
        "id": batch_id,
        "status": "done",
        "total_encontrado": len(leads),
        "total_sem_site": sem_site,
        "novos_leads": novos,
        "leads_atualizados": atualizados,
        "message": f"{len(leads)} empresa(s) encontrada(s), {sem_site} sem site cadastrado.",
    }


def list_search_batches(limit: int = 20) -> list[dict[str, Any]]:
    if not database_configured():
        return []
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT sb.id, sb.nome_lote, sb.status, sb.prioridade, sb.total_leads,
                       sb.total_sem_site, sb.erro, sb.created_at, sb.finished_at,
                       sbi.cidade, sbi.segmento
                FROM search_batches sb
                LEFT JOIN search_batch_items sbi ON sbi.batch_id = sb.id
                ORDER BY sb.created_at DESC
                LIMIT %(limit)s
                """,
                {"limit": limit},
            )
            return [dict(row) for row in cursor.fetchall()]
