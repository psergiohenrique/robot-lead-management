import type { DashboardSummary, LeadListResponse } from "./types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

const emptySummary: DashboardSummary = {
  total_leads: 0,
  leads_sem_site: 0,
  leads_quentes: 0,
  provavel_whatsapp: 0,
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
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      next: { revalidate: 30 },
      headers: {
        Accept: "application/json",
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

export async function getLeads(): Promise<LeadListResponse> {
  return apiGet<LeadListResponse>("/leads?limit=12&sem_site=SIM", emptyLeads);
}
