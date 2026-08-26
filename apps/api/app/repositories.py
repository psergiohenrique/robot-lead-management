from __future__ import annotations

from typing import Any

from app.config import get_settings
from app.db import database_configured, get_connection
from app.importer import normalizar_status_contato
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


def ensure_campaigns_table() -> None:
    if not database_configured():
        return

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS campaigns (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    nome TEXT NOT NULL,
                    objetivo TEXT,
                    oferta_principal TEXT,
                    criterio_principal TEXT,
                    canal TEXT NOT NULL DEFAULT 'WhatsApp manual',
                    status TEXT NOT NULL DEFAULT 'Ativa',
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cursor.execute(
                "ALTER TABLE search_batches ADD COLUMN IF NOT EXISTS campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL"
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns (user_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status)")
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_search_batches_campaign_id ON search_batches (campaign_id)"
            )
        connection.commit()


def ensure_lead_activities_table() -> None:
    if not database_configured():
        return

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS lead_activities (
                    id BIGSERIAL PRIMARY KEY,
                    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
                    tipo TEXT NOT NULL,
                    titulo TEXT NOT NULL,
                    descricao TEXT,
                    status_anterior TEXT,
                    status_novo TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                )
                """
            )
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_lead_activities_lead_id ON lead_activities (lead_id)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_lead_activities_user_id ON lead_activities (user_id)")
            cursor.execute(
                "CREATE INDEX IF NOT EXISTS idx_lead_activities_created_at ON lead_activities (created_at DESC)"
            )
        connection.commit()


def _formatar_atividade(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row.get("id"),
        "tipo": row.get("tipo"),
        "titulo": row.get("titulo"),
        "descricao": row.get("descricao"),
        "status_anterior": row.get("status_anterior"),
        "status_novo": row.get("status_novo"),
        "created_at": row.get("created_at"),
    }


def _listar_atividades_lead(cursor: Any, *, lead_id: int, user_id: int, limit: int = 8) -> list[dict[str, Any]]:
    cursor.execute(
        """
        SELECT id, tipo, titulo, descricao, status_anterior, status_novo, created_at
        FROM lead_activities
        WHERE lead_id = %(lead_id)s AND user_id = %(user_id)s
        ORDER BY created_at DESC
        LIMIT %(limit)s
        """,
        {"lead_id": lead_id, "user_id": user_id, "limit": limit},
    )
    return [_formatar_atividade(dict(row)) for row in cursor.fetchall()]


def _observacao_repetida_recente(cursor: Any, *, lead_id: int, user_id: int, descricao: str) -> bool:
    cursor.execute(
        """
        SELECT 1
        FROM lead_activities
        WHERE lead_id = %(lead_id)s
          AND user_id = %(user_id)s
          AND tipo = 'observacao'
          AND descricao = %(descricao)s
          AND created_at >= now() - interval '3 minutes'
        LIMIT 1
        """,
        {"lead_id": lead_id, "user_id": user_id, "descricao": descricao},
    )
    return cursor.fetchone() is not None


def _registrar_atividade(
    cursor: Any,
    *,
    user_id: int,
    lead_id: int,
    tipo: str,
    titulo: str,
    descricao: str | None = None,
    status_anterior: str | None = None,
    status_novo: str | None = None,
) -> None:
    cursor.execute(
        """
        INSERT INTO lead_activities (
            user_id, lead_id, tipo, titulo, descricao, status_anterior, status_novo
        ) VALUES (
            %(user_id)s, %(lead_id)s, %(tipo)s, %(titulo)s, %(descricao)s,
            %(status_anterior)s, %(status_novo)s
        )
        """,
        {
            "user_id": user_id,
            "lead_id": lead_id,
            "tipo": tipo,
            "titulo": titulo,
            "descricao": descricao,
            "status_anterior": status_anterior,
            "status_novo": status_novo,
        },
    )


def _formatar_data_br(value: Any) -> str:
    if not value:
        return "-"
    try:
        return value.strftime("%d/%m/%Y")
    except AttributeError:
        return str(value)


def _normalizar_lead_saida(lead: dict[str, Any]) -> dict[str, Any]:
    if lead.get("status_contato"):
        lead["status_contato"] = normalizar_status_contato(lead.get("status_contato"))
    return lead


def create_campaign(user_id: int, payload: dict[str, Any]) -> dict[str, Any]:
    if not database_configured():
        raise RuntimeError("DATABASE_URL não configurada.")

    ensure_campaigns_table()
    values = {
        "user_id": user_id,
        "nome": payload.get("nome") or "Venda de site institucional",
        "objetivo": payload.get("objetivo") or "Vender site institucional para empresas sem site",
        "oferta_principal": payload.get("oferta_principal") or "Site institucional R$ 499 + manutenção mensal",
        "criterio_principal": payload.get("criterio_principal") or "Empresas sem site cadastrado no Google",
        "canal": payload.get("canal") or "WhatsApp manual",
        "status": payload.get("status") or "Ativa",
    }

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO campaigns (
                    user_id, nome, objetivo, oferta_principal, criterio_principal, canal, status
                ) VALUES (
                    %(user_id)s, %(nome)s, %(objetivo)s, %(oferta_principal)s,
                    %(criterio_principal)s, %(canal)s, %(status)s
                )
                RETURNING *
                """,
                values,
            )
            campaign = dict(cursor.fetchone())
        connection.commit()
    return campaign


def get_or_create_default_campaign(user_id: int) -> dict[str, Any]:
    ensure_campaigns_table()
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT *
                FROM campaigns
                WHERE user_id = %(user_id)s
                  AND nome = 'Venda de site institucional'
                ORDER BY id
                LIMIT 1
                """,
                {"user_id": user_id},
            )
            row = cursor.fetchone()
            if row:
                campaign = dict(row)
                cursor.execute(
                    """
                    UPDATE search_batches
                    SET campaign_id = %(campaign_id)s
                    WHERE user_id = %(user_id)s
                      AND campaign_id IS NULL
                    """,
                    {"campaign_id": campaign["id"], "user_id": user_id},
                )
                connection.commit()
                return campaign

            cursor.execute(
                """
                INSERT INTO campaigns (
                    user_id, nome, objetivo, oferta_principal, criterio_principal, canal, status
                ) VALUES (
                    %(user_id)s,
                    'Venda de site institucional',
                    'Vender site institucional para empresas sem site',
                    'Site institucional R$ 499 + manutenção mensal',
                    'Empresas sem site cadastrado no Google',
                    'WhatsApp manual',
                    'Ativa'
                )
                RETURNING *
                """,
                {"user_id": user_id},
            )
            campaign = dict(cursor.fetchone())
            cursor.execute(
                """
                UPDATE search_batches
                SET campaign_id = %(campaign_id)s
                WHERE user_id = %(user_id)s
                  AND campaign_id IS NULL
                """,
                {"campaign_id": campaign["id"], "user_id": user_id},
            )
        connection.commit()
    return campaign


def get_campaign(campaign_id: int, user_id: int) -> dict[str, Any] | None:
    if not database_configured():
        return None

    ensure_campaigns_table()
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM campaigns WHERE id = %(id)s AND user_id = %(user_id)s",
                {"id": campaign_id, "user_id": user_id},
            )
            row = cursor.fetchone()
            return dict(row) if row else None


def list_campaigns(user_id: int) -> list[dict[str, Any]]:
    if not database_configured():
        return []

    ensure_campaigns_table()
    ensure_search_batch_leads_table()
    get_or_create_default_campaign(user_id)

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    c.*,
                    COUNT(DISTINCT sb.id)::int AS total_lotes,
                    COALESCE(SUM(sb.total_leads), 0)::int AS total_leads,
                    COALESCE(SUM(sb.total_sem_site), 0)::int AS total_sem_site
                FROM campaigns c
                LEFT JOIN search_batches sb ON sb.campaign_id = c.id
                WHERE c.user_id = %(user_id)s
                GROUP BY c.id
                ORDER BY
                    CASE c.status WHEN 'Ativa' THEN 1 ELSE 2 END,
                    c.created_at DESC
                """,
                {"user_id": user_id},
            )
            return [dict(row) for row in cursor.fetchall()]


def get_dashboard_summary(user_id: int) -> dict[str, int]:
    if not database_configured():
        return {
            "total_leads": 0,
            "leads_sem_site": 0,
            "leads_quentes": 0,
            "provavel_whatsapp": 0,
            "status_novo": 0,
            "status_primeiro_contato": 0,
            "status_respondeu": 0,
            "status_diagnostico_enviado": 0,
            "status_reuniao_marcada": 0,
            "status_proposta": 0,
            "status_fechado": 0,
            "status_perdido": 0,
            "status_contato_invalido": 0,
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
                    COUNT(*) FILTER (
                        WHERE COALESCE(status_contato, 'Novo') = 'Novo'
                    )::int AS status_novo,
                    COUNT(*) FILTER (
                        WHERE COALESCE(status_contato, '') IN (
                            'Primeiro contato', 'Contactado', 'Contactada', 'Contactados', 'Contactadas',
                            'Contatado', 'Contatada', 'Contatados', 'Contatadas',
                            'Contato feito', 'Contato realizado', 'Em contato', 'Abordado', 'Abordada', '1º contato'
                        )
                    )::int AS status_primeiro_contato,
                    COUNT(*) FILTER (
                        WHERE COALESCE(status_contato, '') = 'Respondeu'
                    )::int AS status_respondeu,
                    COUNT(*) FILTER (
                        WHERE COALESCE(status_contato, '') IN (
                            'Diagnóstico enviado', 'Diagnostico enviado', 'DiagnÃ³stico enviado'
                        )
                    )::int AS status_diagnostico_enviado,
                    COUNT(*) FILTER (
                        WHERE COALESCE(status_contato, '') IN (
                            'Reunião marcada', 'Reuniao marcada', 'ReuniÃ£o marcada'
                        )
                    )::int AS status_reuniao_marcada,
                    COUNT(*) FILTER (
                        WHERE COALESCE(status_contato, '') IN ('Proposta', 'Proposta enviada')
                    )::int AS status_proposta,
                    COUNT(*) FILTER (
                        WHERE COALESCE(status_contato, '') = 'Fechado'
                    )::int AS status_fechado,
                    COUNT(*) FILTER (
                        WHERE COALESCE(status_contato, '') = 'Perdido'
                    )::int AS status_perdido,
                    COUNT(*) FILTER (
                        WHERE COALESCE(status_contato, '') IN (
                            'Contato inválido', 'Contato invalido', 'Número errado', 'Numero errado',
                            'Telefone errado', 'Não é WhatsApp', 'Nao e WhatsApp', 'Sem WhatsApp',
                            'Não é do local', 'Nao e do local'
                        )
                    )::int AS status_contato_invalido,
                    COUNT(*) FILTER (WHERE COALESCE(status_contato, 'Novo') <> 'Novo')::int AS contatos_feitos,
                    COUNT(*) FILTER (WHERE respondeu = true)::int AS respostas_recebidas,
                    COUNT(*) FILTER (WHERE reuniao_marcada = true)::int AS reunioes_marcadas,
                    COUNT(*) FILTER (WHERE proposta_enviada = true)::int AS propostas_enviadas,
                    COUNT(*) FILTER (WHERE fechado = true)::int AS fechados
                FROM leads
                WHERE user_id = %(user_id)s
                """,
                {"user_id": user_id},
            )
            row = cursor.fetchone() or {}
            return dict(row)


def list_leads(
    *,
    user_id: int,
    limit: int = 50,
    offset: int = 0,
    cidade: str | None = None,
    segmento: str | None = None,
    classificacao: str | None = None,
    sem_site: str | None = None,
    batch_id: int | None = None,
    campaign_id: int | None = None,
) -> tuple[list[dict[str, Any]], int]:
    if not database_configured():
        return [], 0

    if batch_id:
        ensure_search_batch_leads_table()
    if campaign_id:
        ensure_campaigns_table()
        ensure_search_batch_leads_table()
    ensure_lead_activities_table()

    filters: list[str] = ["l.user_id = %(user_id)s"]
    params: dict[str, Any] = {"limit": limit, "offset": offset, "user_id": user_id}

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
    if campaign_id:
        filters.append(
            """
            EXISTS (
                SELECT 1
                FROM search_batches campaign_sb
                LEFT JOIN search_batch_leads campaign_sbl
                    ON campaign_sbl.batch_id = campaign_sb.id
                    AND campaign_sbl.lead_id = l.id
                LEFT JOIN search_batch_items campaign_sbi
                    ON campaign_sbi.batch_id = campaign_sb.id
                WHERE campaign_sb.campaign_id = %(campaign_id)s
                  AND campaign_sb.user_id = %(user_id)s
                  AND (
                    campaign_sbl.lead_id IS NOT NULL
                    OR (
                        lower(COALESCE(l.cidade, '')) = lower(COALESCE(campaign_sbi.cidade, ''))
                        AND lower(COALESCE(l.segmento, '')) = lower(COALESCE(campaign_sbi.segmento, ''))
                    )
                  )
            )
            """
        )
        params["campaign_id"] = campaign_id

    from_clause = "leads l"
    if batch_id:
        from_clause = """
            leads l
            LEFT JOIN search_batch_leads sbl
                ON sbl.lead_id = l.id
                AND sbl.batch_id = %(batch_id)s
        """
        filters.append(
            """
            (
                sbl.batch_id IS NOT NULL
                OR EXISTS (
                    SELECT 1
                    FROM search_batch_items sbi
                    WHERE sbi.batch_id = %(batch_id)s
                      AND lower(COALESCE(l.cidade, '')) = lower(COALESCE(sbi.cidade, ''))
                      AND lower(COALESCE(l.segmento, '')) = lower(COALESCE(sbi.segmento, ''))
                )
            )
            """
        )
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
                    l.status_contato, l.data_primeiro_contato, l.data_ultimo_contato,
                    l.proximo_followup, l.updated_at,
                    COALESCE((
                        SELECT json_agg(activity_row)
                        FROM (
                            SELECT id, tipo, titulo, descricao, status_anterior, status_novo, created_at
                            FROM lead_activities la
                            WHERE la.lead_id = l.id AND la.user_id = %(user_id)s
                            ORDER BY la.created_at DESC
                            LIMIT 5
                        ) activity_row
                    ), '[]'::json) AS atividades
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
            return [_normalizar_lead_saida(dict(row)) for row in cursor.fetchall()], total


def update_lead_contact(lead_id: int, user_id: int, payload: dict[str, Any]) -> dict[str, Any] | None:
    if not database_configured():
        return None

    ensure_lead_activities_table()
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
        return get_lead(lead_id, user_id)

    if "status_contato" in values:
        values["status_contato"] = normalizar_status_contato(values["status_contato"])

    assignments_parts = [f"{field} = %({field})s" for field in values]
    if "status_contato" in values and values["status_contato"] != "Novo":
        assignments_parts.append("data_primeiro_contato = COALESCE(data_primeiro_contato, CURRENT_DATE)")
        assignments_parts.append("data_ultimo_contato = CURRENT_DATE")
    assignments = ", ".join(assignments_parts)
    values["lead_id"] = lead_id
    values["user_id"] = user_id

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT status_contato, observacao_humana, proximo_followup
                FROM leads
                WHERE id = %(lead_id)s AND user_id = %(user_id)s
                """,
                values,
            )
            previous = cursor.fetchone()
            if not previous:
                return None
            previous_status = normalizar_status_contato(previous["status_contato"] or "Novo")
            previous_followup = previous["proximo_followup"]
            cursor.execute(
                f"""
                UPDATE leads
                SET {assignments}, updated_at = now()
                WHERE id = %(lead_id)s AND user_id = %(user_id)s
                RETURNING *
                """,
                values,
            )
            row = cursor.fetchone()
            if row:
                updated = _normalizar_lead_saida(dict(row))
                new_status = updated.get("status_contato") or "Novo"
                if "status_contato" in values and previous_status != new_status:
                    _registrar_atividade(
                        cursor,
                        user_id=user_id,
                        lead_id=lead_id,
                        tipo="status",
                        titulo=f"Status alterado para {new_status}",
                        status_anterior=previous_status,
                        status_novo=new_status,
                    )
                if "proximo_followup" in values and str(previous_followup or "") != str(updated.get("proximo_followup") or ""):
                    _registrar_atividade(
                        cursor,
                        user_id=user_id,
                        lead_id=lead_id,
                        tipo="followup",
                        titulo=f"Follow-up agendado para {_formatar_data_br(updated.get('proximo_followup'))}",
                        descricao="Próxima ação comercial definida para este lead.",
                    )
                observacao = str(values["observacao_humana"]) if values.get("observacao_humana") else ""
                if observacao and not _observacao_repetida_recente(
                    cursor, lead_id=lead_id, user_id=user_id, descricao=observacao
                ):
                    _registrar_atividade(
                        cursor,
                        user_id=user_id,
                        lead_id=lead_id,
                        tipo="observacao",
                        titulo="Observação adicionada",
                        descricao=observacao,
                    )
            connection.commit()
            if row:
                updated["atividades"] = _listar_atividades_lead(cursor, lead_id=lead_id, user_id=user_id)
                return updated
            return None


def get_lead(lead_id: int, user_id: int) -> dict[str, Any] | None:
    if not database_configured():
        return None

    ensure_lead_activities_table()
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT * FROM leads WHERE id = %(id)s AND user_id = %(user_id)s",
                {"id": lead_id, "user_id": user_id},
            )
            row = cursor.fetchone()
            if not row:
                return None
            lead = _normalizar_lead_saida(dict(row))
            lead["atividades"] = _listar_atividades_lead(cursor, lead_id=lead_id, user_id=user_id)
            return lead


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
    *,
    user_id: int,
    cidade: str,
    segmento: str,
    prioridade: str,
    limite: int,
    nome_lote: str | None,
    campaign_id: int | None = None,
) -> dict[str, Any]:
    if not database_configured():
        raise RuntimeError("DATABASE_URL não configurada.")

    settings = get_settings()
    api_key = (settings.google_places_api_key or "").strip()
    if not api_key:
        raise RuntimeError("GOOGLE_PLACES_API_KEY não configurada.")

    query_base = f"{segmento} em {cidade}"
    campaign = get_campaign(campaign_id, user_id) if campaign_id else get_or_create_default_campaign(user_id)
    if campaign_id and not campaign:
        raise RuntimeError("Campanha não encontrada para este usuário.")
    final_campaign_id = campaign["id"]

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO search_batches (
                    user_id, campaign_id, nome_lote, status, prioridade, total_planejado, started_at
                )
                VALUES (
                    %(user_id)s, %(campaign_id)s, %(nome_lote)s, 'running',
                    %(prioridade)s, %(limite)s, now()
                )
                RETURNING id
                """,
                {
                    "user_id": user_id,
                    "campaign_id": final_campaign_id,
                    "nome_lote": nome_lote,
                    "prioridade": prioridade,
                    "limite": limite,
                },
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
        {**montar_lead(lugar, cidade=cidade, segmento=segmento, prioridade=prioridade), "user_id": user_id}
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
                        user_id, place_id, nome, telefone, telefone_limpo, whatsapp_status,
                        endereco, cidade, segmento, google_maps_url, avaliacao,
                        quantidade_avaliacoes, site_cadastrado, sem_site_cadastrado,
                        business_status, score_oportunidade, classificacao_lead, prioridade
                    ) VALUES (
                        %(user_id)s, %(place_id)s, %(nome)s, %(telefone)s, %(telefone_limpo)s, %(whatsapp_status)s,
                        %(endereco)s, %(cidade)s, %(segmento)s, %(google_maps_url)s, %(avaliacao)s,
                        %(quantidade_avaliacoes)s, %(site_cadastrado)s, %(sem_site_cadastrado)s,
                        %(business_status)s, %(score_oportunidade)s, %(classificacao_lead)s, %(prioridade)s
                    )
                    ON CONFLICT (user_id, place_id) DO UPDATE SET
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


def list_search_batches(user_id: int, limit: int = 20, campaign_id: int | None = None) -> list[dict[str, Any]]:
    if not database_configured():
        return []
    ensure_campaigns_table()
    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT sb.id, sb.campaign_id, c.nome AS campaign_nome,
                       sb.nome_lote, sb.status, sb.prioridade, sb.total_leads,
                       sb.total_sem_site, sb.erro, sb.created_at, sb.finished_at,
                       sbi.cidade, sbi.segmento
                FROM search_batches sb
                LEFT JOIN campaigns c ON c.id = sb.campaign_id
                LEFT JOIN search_batch_items sbi ON sbi.batch_id = sb.id
                WHERE sb.user_id = %(user_id)s
                  AND (%(campaign_id)s IS NULL OR sb.campaign_id = %(campaign_id)s)
                ORDER BY sb.created_at DESC
                LIMIT %(limit)s
                """,
                {"user_id": user_id, "limit": limit, "campaign_id": campaign_id},
            )
            return [dict(row) for row in cursor.fetchall()]


def importar_leads_planilha(
    *,
    user_id: int,
    leads: list[dict[str, Any]],
    nome_arquivo: str,
    campaign_id: int | None = None,
) -> dict[str, Any]:
    if not database_configured():
        raise RuntimeError("DATABASE_URL não configurada.")

    ensure_campaigns_table()
    ensure_search_batch_leads_table()

    campaign = get_campaign(campaign_id, user_id) if campaign_id else get_or_create_default_campaign(user_id)
    if campaign_id and not campaign:
        raise RuntimeError("Campanha não encontrada para este usuário.")
    final_campaign_id = campaign["id"]

    total_sem_site = sum(1 for lead in leads if lead.get("sem_site_cadastrado") == "SIM")
    novos = 0
    atualizados = 0
    ignorados = 0

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                """
                INSERT INTO search_batches (
                    user_id, campaign_id, nome_lote, status, prioridade,
                    total_planejado, total_processado, total_leads, total_sem_site,
                    started_at, finished_at
                )
                VALUES (
                    %(user_id)s, %(campaign_id)s, %(nome_lote)s, 'done', 'Importação',
                    %(total)s, %(total)s, %(total)s, %(total_sem_site)s,
                    now(), now()
                )
                RETURNING id
                """,
                {
                    "user_id": user_id,
                    "campaign_id": final_campaign_id,
                    "nome_lote": f"Importação: {nome_arquivo}",
                    "total": len(leads),
                    "total_sem_site": total_sem_site,
                },
            )
            batch_id = cursor.fetchone()["id"]

            for lead in leads:
                if not lead.get("nome") or not lead.get("place_id"):
                    ignorados += 1
                    continue

                values = {
                    "user_id": user_id,
                    "place_id": lead.get("place_id"),
                    "nome": lead.get("nome"),
                    "telefone": lead.get("telefone"),
                    "telefone_limpo": lead.get("telefone_limpo"),
                    "whatsapp_status": lead.get("whatsapp_status"),
                    "endereco": lead.get("endereco"),
                    "cidade": lead.get("cidade"),
                    "segmento": lead.get("segmento"),
                    "regiao": lead.get("regiao"),
                    "google_maps_url": lead.get("google_maps_url"),
                    "avaliacao": lead.get("avaliacao"),
                    "quantidade_avaliacoes": lead.get("quantidade_avaliacoes"),
                    "site_cadastrado": lead.get("site_cadastrado"),
                    "sem_site_cadastrado": lead.get("sem_site_cadastrado"),
                    "business_status": lead.get("business_status"),
                    "score_oportunidade": lead.get("score_oportunidade"),
                    "classificacao_lead": lead.get("classificacao_lead"),
                    "prioridade": lead.get("prioridade"),
                    "oferta_principal": lead.get("oferta_principal"),
                    "observacao_comercial": lead.get("observacao_comercial"),
                    "status_contato": lead.get("status_contato") or "Novo",
                    "data_primeiro_contato": lead.get("data_primeiro_contato"),
                    "data_ultimo_contato": lead.get("data_ultimo_contato"),
                    "proximo_followup": lead.get("proximo_followup"),
                    "respondeu": lead.get("respondeu") if lead.get("respondeu") is not None else False,
                    "interesse": lead.get("interesse"),
                    "diagnostico_enviado": lead.get("diagnostico_enviado")
                    if lead.get("diagnostico_enviado") is not None
                    else False,
                    "reuniao_marcada": lead.get("reuniao_marcada")
                    if lead.get("reuniao_marcada") is not None
                    else False,
                    "proposta_enviada": lead.get("proposta_enviada")
                    if lead.get("proposta_enviada") is not None
                    else False,
                    "fechado": lead.get("fechado") if lead.get("fechado") is not None else False,
                    "motivo_perda": lead.get("motivo_perda"),
                    "observacao_humana": lead.get("observacao_humana"),
                }

                cursor.execute(
                    """
                    INSERT INTO leads (
                        user_id, place_id, nome, telefone, telefone_limpo, whatsapp_status,
                        endereco, cidade, segmento, regiao, google_maps_url, avaliacao,
                        quantidade_avaliacoes, site_cadastrado, sem_site_cadastrado,
                        business_status, score_oportunidade, classificacao_lead, prioridade,
                        oferta_principal, observacao_comercial, status_contato,
                        data_primeiro_contato, data_ultimo_contato, proximo_followup,
                        respondeu, interesse, diagnostico_enviado, reuniao_marcada,
                        proposta_enviada, fechado, motivo_perda, observacao_humana
                    ) VALUES (
                        %(user_id)s, %(place_id)s, %(nome)s, %(telefone)s, %(telefone_limpo)s, %(whatsapp_status)s,
                        %(endereco)s, %(cidade)s, %(segmento)s, %(regiao)s, %(google_maps_url)s, %(avaliacao)s,
                        %(quantidade_avaliacoes)s, %(site_cadastrado)s, %(sem_site_cadastrado)s,
                        %(business_status)s, %(score_oportunidade)s, %(classificacao_lead)s, %(prioridade)s,
                        %(oferta_principal)s, %(observacao_comercial)s, %(status_contato)s,
                        %(data_primeiro_contato)s, %(data_ultimo_contato)s, %(proximo_followup)s,
                        %(respondeu)s, %(interesse)s, %(diagnostico_enviado)s, %(reuniao_marcada)s,
                        %(proposta_enviada)s, %(fechado)s, %(motivo_perda)s, %(observacao_humana)s
                    )
                    ON CONFLICT (user_id, place_id) DO UPDATE SET
                        nome = EXCLUDED.nome,
                        telefone = COALESCE(EXCLUDED.telefone, leads.telefone),
                        telefone_limpo = COALESCE(EXCLUDED.telefone_limpo, leads.telefone_limpo),
                        whatsapp_status = COALESCE(EXCLUDED.whatsapp_status, leads.whatsapp_status),
                        endereco = COALESCE(EXCLUDED.endereco, leads.endereco),
                        cidade = COALESCE(EXCLUDED.cidade, leads.cidade),
                        segmento = COALESCE(EXCLUDED.segmento, leads.segmento),
                        regiao = COALESCE(EXCLUDED.regiao, leads.regiao),
                        google_maps_url = COALESCE(EXCLUDED.google_maps_url, leads.google_maps_url),
                        avaliacao = COALESCE(EXCLUDED.avaliacao, leads.avaliacao),
                        quantidade_avaliacoes = COALESCE(EXCLUDED.quantidade_avaliacoes, leads.quantidade_avaliacoes),
                        site_cadastrado = COALESCE(EXCLUDED.site_cadastrado, leads.site_cadastrado),
                        sem_site_cadastrado = COALESCE(EXCLUDED.sem_site_cadastrado, leads.sem_site_cadastrado),
                        business_status = COALESCE(EXCLUDED.business_status, leads.business_status),
                        score_oportunidade = COALESCE(EXCLUDED.score_oportunidade, leads.score_oportunidade),
                        classificacao_lead = COALESCE(EXCLUDED.classificacao_lead, leads.classificacao_lead),
                        prioridade = COALESCE(EXCLUDED.prioridade, leads.prioridade),
                        oferta_principal = COALESCE(EXCLUDED.oferta_principal, leads.oferta_principal),
                        observacao_comercial = COALESCE(leads.observacao_comercial, EXCLUDED.observacao_comercial),
                        status_contato = CASE
                            WHEN COALESCE(EXCLUDED.status_contato, 'Novo') <> 'Novo'
                            THEN EXCLUDED.status_contato
                            ELSE leads.status_contato
                        END,
                        data_primeiro_contato = COALESCE(leads.data_primeiro_contato, EXCLUDED.data_primeiro_contato),
                        data_ultimo_contato = COALESCE(EXCLUDED.data_ultimo_contato, leads.data_ultimo_contato),
                        proximo_followup = COALESCE(EXCLUDED.proximo_followup, leads.proximo_followup),
                        respondeu = leads.respondeu OR EXCLUDED.respondeu,
                        diagnostico_enviado = leads.diagnostico_enviado OR EXCLUDED.diagnostico_enviado,
                        reuniao_marcada = leads.reuniao_marcada OR EXCLUDED.reuniao_marcada,
                        proposta_enviada = leads.proposta_enviada OR EXCLUDED.proposta_enviada,
                        fechado = leads.fechado OR EXCLUDED.fechado,
                        interesse = COALESCE(leads.interesse, EXCLUDED.interesse),
                        motivo_perda = COALESCE(leads.motivo_perda, EXCLUDED.motivo_perda),
                        observacao_humana = COALESCE(leads.observacao_humana, EXCLUDED.observacao_humana),
                        updated_at = now()
                    RETURNING id, (xmax = 0) AS inserted
                    """,
                    values,
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

        connection.commit()

    return {
        "batch_id": batch_id,
        "total_processado": len(leads),
        "total_sem_site": total_sem_site,
        "novos_leads": novos,
        "leads_atualizados": atualizados,
        "ignorados": ignorados,
    }
