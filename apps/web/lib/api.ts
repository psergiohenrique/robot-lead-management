import { getSessionToken } from "./auth";
import type { CampaignSummary, DashboardSummary, Lead, LeadListResponse, SearchBatchSummary } from "./types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

const emptySummary: DashboardSummary = {
  total_leads: 0,
  leads_sem_site: 0,
  leads_quentes: 0,
  provavel_whatsapp: 0,
  status_novo: 0,
  status_primeiro_contato: 0,
  status_respondeu: 0,
  status_diagnostico_enviado: 0,
  status_reuniao_marcada: 0,
  status_proposta: 0,
  status_fechado: 0,
  status_perdido: 0,
  status_contato_invalido: 0,
  contatos_feitos: 0,
  respostas_recebidas: 0,
  reunioes_marcadas: 0,
  propostas_enviadas: 0,
  fechados: 0,
};

const emptyLeads: LeadListResponse = {
  items: [],
  total: 0,
  limit: 50,
  offset: 0,
  database_configured: false,
};

async function apiGet<T>(path: string, fallback: T): Promise<T> {
  const token = await getSessionToken();
  if (!token) {
    return fallback;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      return fallback;
    }

    return (await response.json()) as T;
  } catch {
    return fallback;
  }
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  return apiGet<DashboardSummary>("/dashboard/summary", emptySummary);
}

type LeadQuery = {
  limit?: number;
  offset?: number;
  cidade?: string;
  segmento?: string;
  classificacao?: string;
  sem_site?: string;
  batch_id?: string;
  campaign_id?: string;
};

export async function getLeads(query: LeadQuery = {}): Promise<LeadListResponse> {
  const params = new URLSearchParams();
  const limit = query.limit ?? 12;
  const offset = query.offset ?? 0;

  params.set("limit", String(limit));
  params.set("offset", String(offset));

  if (query.cidade) params.set("cidade", query.cidade);
  if (query.segmento) params.set("segmento", query.segmento);
  if (query.classificacao) params.set("classificacao", query.classificacao);
  if (query.sem_site) params.set("sem_site", query.sem_site);
  if (query.batch_id) params.set("batch_id", query.batch_id);
  if (query.campaign_id) params.set("campaign_id", query.campaign_id);

  return apiGet<LeadListResponse>(`/leads?${params.toString()}`, {
    ...emptyLeads,
    limit,
    offset,
  });
}

export async function getSearchBatches(limit = 30, campaignId?: string): Promise<SearchBatchSummary[]> {
  const params = new URLSearchParams();
  params.set("limit", String(limit));
  if (campaignId) params.set("campaign_id", campaignId);
  return apiGet<SearchBatchSummary[]>(`/search-batches?${params.toString()}`, []);
}

export async function getLead(leadId: string): Promise<Lead | null> {
  return apiGet<Lead | null>(`/leads/${leadId}`, null);
}

export async function getCampaigns(): Promise<CampaignSummary[]> {
  return apiGet<CampaignSummary[]>("/campaigns", []);
}
