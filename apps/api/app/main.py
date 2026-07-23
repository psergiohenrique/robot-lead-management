from __future__ import annotations

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.db import database_configured
from app.repositories import get_dashboard_summary, get_lead, list_leads, update_lead_contact
from app.schemas import (
    DashboardSummary,
    HealthResponse,
    LeadListResponse,
    LeadUpdate,
    SearchBatchCreate,
    SearchBatchResponse,
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


@app.get("/dashboard/summary", response_model=DashboardSummary)
def dashboard_summary() -> DashboardSummary:
    return DashboardSummary(**get_dashboard_summary())


@app.get("/leads", response_model=LeadListResponse)
def leads(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    cidade: str | None = None,
    segmento: str | None = None,
    classificacao: str | None = None,
    sem_site: str | None = None,
) -> LeadListResponse:
    items, total = list_leads(
        limit=limit,
        offset=offset,
        cidade=cidade,
        segmento=segmento,
        classificacao=classificacao,
        sem_site=sem_site,
    )
    return LeadListResponse(
        items=items,
        total=total,
        limit=limit,
        offset=offset,
        database_configured=database_configured(),
    )


@app.get("/leads/{lead_id}")
def lead_detail(lead_id: int):
    lead = get_lead(lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead não encontrado ou banco não configurado.")
    return lead


@app.patch("/leads/{lead_id}")
def update_lead(lead_id: int, payload: LeadUpdate):
    updated = update_lead_contact(lead_id, payload.model_dump(exclude_unset=True))
    if not updated:
        raise HTTPException(status_code=404, detail="Lead não encontrado ou banco não configurado.")
    return updated


@app.post("/search-batches", response_model=SearchBatchResponse, status_code=202)
def create_search_batch(payload: SearchBatchCreate) -> SearchBatchResponse:
    return SearchBatchResponse(
        status="pending",
        message="Lote recebido. O processamento assíncrono será implementado na próxima fase.",
        payload=payload.model_dump(),
    )


@app.get("/search-batches")
def search_batches():
    return {
        "items": [],
        "total": 0,
        "database_configured": database_configured(),
        "message": "Listagem real de lotes será conectada ao Neon DB na próxima fase.",
    }


@app.get("/whatsapp/top-leads", response_model=LeadListResponse)
def whatsapp_top_leads(limit: int = Query(default=50, ge=1, le=100)) -> LeadListResponse:
    items, total = list_leads(limit=limit, offset=0, sem_site="SIM")
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
