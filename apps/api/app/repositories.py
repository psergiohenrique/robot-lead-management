from __future__ import annotations

from typing import Any

from app.db import database_configured, get_connection


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
) -> tuple[list[dict[str, Any]], int]:
    if not database_configured():
        return [], 0

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

    where = f"WHERE {' AND '.join(filters)}" if filters else ""

    with get_connection() as connection:
        with connection.cursor() as cursor:
            cursor.execute(f"SELECT COUNT(*)::int AS total FROM leads {where}", params)
            total = int((cursor.fetchone() or {"total": 0})["total"])
            cursor.execute(
                f"""
                SELECT
                    id, place_id, nome, telefone, telefone_limpo, whatsapp_status,
                    endereco, cidade, segmento, regiao, google_maps_url, avaliacao,
                    quantidade_avaliacoes, site_cadastrado, sem_site_cadastrado,
                    score_oportunidade, classificacao_lead, prioridade,
                    status_contato, proximo_followup, updated_at
                FROM leads
                {where}
                ORDER BY
                    CASE classificacao_lead
                        WHEN 'Quente' THEN 1
                        WHEN 'Morno' THEN 2
                        WHEN 'Frio' THEN 3
                        ELSE 4
                    END,
                    score_oportunidade DESC NULLS LAST,
                    quantidade_avaliacoes DESC NULLS LAST,
                    updated_at DESC NULLS LAST
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
