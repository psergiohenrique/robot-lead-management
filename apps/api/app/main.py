from __future__ import annotations

from fastapi import Depends, FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from app.auth import get_current_user, request_magic_link, verify_magic_link
from app.config import get_settings
from app.db import database_configured
from app.importer import extrair_leads_xlsx
from app.repositories import (
    create_campaign,
    criar_e_executar_lote,
    get_dashboard_summary,
    get_lead,
    importar_leads_planilha,
    list_campaigns,
    list_leads,
    list_search_batches,
    update_lead_contact,
)
from app.schemas import (
    AuthSession,
    CampaignCreate,
    CampaignSummary,
    DashboardSummary,
    HealthResponse,
    ImportLeadsResult,
    LeadListResponse,
    LeadUpdate,
    MagicLinkRequest,
    MagicLinkRequestResponse,
    MagicLinkVerify,
    SearchBatchCreate,
    SearchBatchResult,
    SearchBatchSummary,
    User,
)


settings = get_settings()

app = FastAPI(
    title="Robot Lead Management API",
    version="0.1.0",
    description="API para dashboard de geração e gestão de leads da Codepath.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(
        status="ok",
        app="robot-lead-management-api",
        environment=settings.app_env,
        database_configured=database_configured(),
    )


@app.post("/auth/request-link", response_model=MagicLinkRequestResponse)
def auth_request_link(payload: MagicLinkRequest) -> MagicLinkRequestResponse:
    debug_link = request_magic_link(payload.email)
    return MagicLinkRequestResponse(
        message="Se o email existir, um link de acesso foi enviado.",
        debug_link=debug_link,
    )


@app.post("/auth/verify", response_model=AuthSession)
def auth_verify(payload: MagicLinkVerify) -> AuthSession:
    result = verify_magic_link(payload.token)
    return AuthSession(**result)


@app.get("/auth/me", response_model=User)
def auth_me(current_user: dict = Depends(get_current_user)) -> User:
    return User(**current_user)


@app.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary(current_user: dict = Depends(get_current_user)) -> DashboardSummary:
    return DashboardSummary(**get_dashboard_summary(current_user["id"]))


@app.get("/campaigns", response_model=list[CampaignSummary])
def campaigns(current_user: dict = Depends(get_current_user)) -> list[dict]:
    return list_campaigns(current_user["id"])


@app.post("/campaigns", response_model=CampaignSummary, status_code=201)
def new_campaign(payload: CampaignCreate, current_user: dict = Depends(get_current_user)) -> CampaignSummary:
    try:
        campaign = create_campaign(current_user["id"], payload.model_dump())
    except RuntimeError as erro:
        raise HTTPException(status_code=502, detail=str(erro)) from erro
    return CampaignSummary(**{**campaign, "total_lotes": 0, "total_leads": 0, "total_sem_site": 0})


@app.get("/leads", response_model=LeadListResponse)
def leads(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    cidade: str | None = None,
    segmento: str | None = None,
    classificacao: str | None = None,
    sem_site: str | None = None,
    batch_id: int | None = Query(default=None, ge=1),
    campaign_id: int | None = Query(default=None, ge=1),
    current_user: dict = Depends(get_current_user),
) -> LeadListResponse:
    items, total = list_leads(
        user_id=current_user["id"],
        limit=limit,
        offset=offset,
        cidade=cidade,
        segmento=segmento,
        classificacao=classificacao,
        sem_site=sem_site,
        batch_id=batch_id,
        campaign_id=campaign_id,
    )
    return LeadListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        database_configured=database_configured(),
    )


@app.get("/leads/{lead_id}")
def lead_detail(lead_id: int, current_user: dict = Depends(get_current_user)):
    lead = get_lead(lead_id, current_user["id"])
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado ou banco não configurado.")
    return lead


@app.patch("/leads/{lead_id}")
def update_lead(lead_id: int, payload: LeadUpdate, current_user: dict = Depends(get_current_user)):
    updated = update_lead_contact(lead_id, current_user["id"], payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Lead não encontrado ou banco não configurado.")
    return updated


@app.post("/search-batches", response_model=SearchBatchResult, status_code=201)
def create_search_batch(
    payload: SearchBatchCreate, current_user: dict = Depends(get_current_user)
) -> SearchBatchResult:
    try:
        resultado = criar_e_executar_lote(
            user_id=current_user["id"],
            cidade=payload.cidade,
            segmento=payload.segmento,
            prioridade=payload.prioridade,
            limite=payload.limite,
            nome_lote=payload.nome_lote,
            campaign_id=payload.campaign_id,
        )
    except RuntimeError as erro:
        raise HTTPException(status_code=502, detail=str(erro)) from erro
    return SearchBatchResult(**resultado)


@app.post("/imports/leads", response_model=ImportLeadsResult, status_code=201)
async def import_leads(
    file: UploadFile = File(...),
    campaign_id: int | None = Form(default=None),
    current_user: dict = Depends(get_current_user),
) -> ImportLeadsResult:
    filename = file.filename or "planilha.xlsx"
    if not filename.lower().endswith(".xlsx"):
        raise HTTPException(status_code=400, detail="Envie uma planilha .xlsx.")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="A planilha enviada está vazia.")

    try:
        leads = extrair_leads_xlsx(content)
        if not leads:
            raise RuntimeError("Não encontrei leads válidos na planilha.")
        resultado = importar_leads_planilha(
            user_id=current_user["id"],
            leads=leads,
            nome_arquivo=filename,
            campaign_id=campaign_id,
        )
    except RuntimeError as erro:
        raise HTTPException(status_code=502, detail=str(erro)) from erro
    except Exception as erro:
        raise HTTPException(status_code=400, detail="Não consegui ler essa planilha. Confira o formato.") from erro

    return ImportLeadsResult(
        **resultado,
        message=(
            f"{resultado['total_processado']} lead(s) importado(s): "
            f"{resultado['novos_leads']} novo(s), "
            f"{resultado['leads_atualizados']} atualizado(s), "
            f"{resultado['total_sem_site']} sem site."
        ),
    )


@app.get("/search-batches", response_model=list[SearchBatchSummary])
def search_batches(
    limit: int = Query(default=20, ge=1, le=100),
    campaign_id: int | None = Query(default=None, ge=1),
    current_user: dict = Depends(get_current_user),
) -> list[dict]:
    return list_search_batches(current_user["id"], limit=limit, campaign_id=campaign_id)


@app.get("/whatsapp/top-leads", response_model=LeadListResponse)
def whatsapp_top_leads(
    limit: int = Query(default=50, ge=1, le=100), current_user: dict = Depends(get_current_user)
) -> LeadListResponse:
    items, total = list_leads(user_id=current_user["id"], limit=limit, offset=0, sem_site="SIM")
    return LeadListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=0,
        database_configured=database_configured(),
    )


@app.post("/exports", status_code=202)
def create_export():
    return {
        "status": "pending",
        "message": "Exportações via API serão implementadas na próxima fase. O motor Excel local já existe.",
    }
