from __future__ import annotations

from datetime import date, datetime
from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    app: str
    environment: str
    database_configured: bool


class DashboardSummary(BaseModel):
    total_leads: int = 0
    leads_sem_site: int = 0
    leads_quentes: int = 0
    provavel_whatsapp: int = 0
    contatos_feitos: int = 0
    respostas_recebidas: int = 0
    reunioes_marcadas: int = 0
    propostas_enviadas: int = 0
    fechados: int = 0


class Lead(BaseModel):
    id: int | None = None
    place_id: str | None = None
    nome: str
    telefone: str | None = None
    telefone_limpo: str | None = None
    whatsapp_status: str | None = None
    endereco: str | None = None
    cidade: str | None = None
    segmento: str | None = None
    regiao: str | None = None
    google_maps_url: str | None = None
    avaliacao: float | None = None
    quantidade_avaliacoes: int | None = None
    site_cadastrado: str | None = None
    sem_site_cadastrado: str | None = None
    score_oportunidade: int | None = None
    classificacao_lead: str | None = None
    prioridade: str | None = None
    status_contato: str | None = None
    proximo_followup: date | None = None
    updated_at: datetime | None = None


class LeadListResponse(BaseModel):
    items: list[Lead]
    total: int
    limit: int
    offset: int
    database_configured: bool


class LeadUpdate(BaseModel):
    status_contato: str | None = Field(default=None, max_length=80)
    proximo_followup: date | None = None
    respondeu: bool | None = None
    interesse: str | None = Field(default=None, max_length=80)
    diagnostico_enviado: bool | None = None
    reuniao_marcada: bool | None = None
    proposta_enviada: bool | None = None
    fechado: bool | None = None
    motivo_perda: str | None = None
    observacao_humana: str | None = None


class SearchBatchCreate(BaseModel):
    nome_lote: str | None = None
    cidade: str
    segmento: str
    prioridade: str = "Alta"
    limite: int = Field(default=100, ge=1, le=500)


class SearchBatchResponse(BaseModel):
    id: int | None = None
    status: str
    message: str
    payload: dict[str, Any]
