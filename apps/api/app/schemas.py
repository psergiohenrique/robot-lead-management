from __future__ import annotations

from datetime import date, datetime

from pydantic import BaseModel, EmailStr, Field


class User(BaseModel):
    id: int
    email: str


class MagicLinkRequest(BaseModel):
    email: EmailStr


class MagicLinkRequestResponse(BaseModel):
    message: str
    debug_link: str | None = None


class MagicLinkVerify(BaseModel):
    token: str


class AuthSession(BaseModel):
    session_token: str
    user: User


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
    data_primeiro_contato: date | None = None
    data_ultimo_contato: date | None = None
    proximo_followup: date | None = None
    updated_at: datetime | None = None


class LeadListResponse(BaseModel):
    items: list[Lead]
    total: int
    limit: int
    offset: int
    database_configured: bool


class CampaignCreate(BaseModel):
    nome: str = Field(default="Venda de site institucional", min_length=2, max_length=120)
    objetivo: str | None = Field(default="Vender site institucional para empresas sem site", max_length=240)
    oferta_principal: str | None = Field(default="Site institucional R$ 499 + manutenção mensal", max_length=240)
    criterio_principal: str | None = Field(default="Empresas sem site cadastrado no Google", max_length=240)
    canal: str = Field(default="WhatsApp manual", max_length=80)
    status: str = Field(default="Ativa", max_length=40)


class CampaignSummary(BaseModel):
    id: int
    nome: str
    objetivo: str | None = None
    oferta_principal: str | None = None
    criterio_principal: str | None = None
    canal: str | None = None
    status: str | None = None
    total_lotes: int = 0
    total_leads: int = 0
    total_sem_site: int = 0
    created_at: datetime
    updated_at: datetime | None = None


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
    campaign_id: int | None = None
    cidade: str
    segmento: str
    prioridade: str = "Alta"
    limite: int = Field(default=100, ge=1, le=500)


class SearchBatchResult(BaseModel):
    id: int
    status: str
    total_encontrado: int
    total_sem_site: int
    novos_leads: int
    leads_atualizados: int
    message: str


class ImportLeadsResult(BaseModel):
    batch_id: int
    total_processado: int
    total_sem_site: int
    novos_leads: int
    leads_atualizados: int
    ignorados: int = 0
    message: str


class SearchBatchSummary(BaseModel):
    id: int
    campaign_id: int | None = None
    campaign_nome: str | None = None
    nome_lote: str | None = None
    status: str
    prioridade: str | None = None
    cidade: str | None = None
    segmento: str | None = None
    total_leads: int | None = None
    total_sem_site: int | None = None
    erro: str | None = None
    created_at: datetime
    finished_at: datetime | None = None
