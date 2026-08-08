"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getSessionToken } from "./auth";
import { SESSION_COOKIE } from "./constants";
import type { CampaignSummary, ImportLeadsResult, SearchBatchResult } from "./types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export type RunSearchState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type CreateCampaignState = {
  status: "idle" | "success" | "error";
  message: string;
};

export type ImportLeadsState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function runSearchBatch(
  _prevState: RunSearchState,
  formData: FormData
): Promise<RunSearchState> {
  const cidade = String(formData.get("cidade") ?? "").trim();
  const segmento = String(formData.get("segmento") ?? "").trim();
  const limite = Number.parseInt(String(formData.get("limite") ?? "20"), 10) || 20;
  const campaignId = Number.parseInt(String(formData.get("campaign_id") ?? ""), 10);

  if (!cidade || !segmento) {
    return { status: "error", message: "Informe cidade e segmento." };
  }

  const token = await getSessionToken();
  if (!token) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/search-batches`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        cidade,
        segmento,
        limite,
        campaign_id: Number.isFinite(campaignId) ? campaignId : undefined,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : "Falha ao buscar leads.";
      return { status: "error", message: detail };
    }

    const resultado = data as SearchBatchResult;
    revalidatePath("/");
    return {
      status: "success",
      message: `${resultado.total_encontrado} empresa(s) encontrada(s) — ${resultado.total_sem_site} sem site (${resultado.novos_leads} novo(s), ${resultado.leads_atualizados} atualizado(s)).`,
    };
  } catch {
    return { status: "error", message: "Não foi possível conectar à API." };
  }
}

export async function createCampaign(
  _prevState: CreateCampaignState,
  formData: FormData
): Promise<CreateCampaignState> {
  const nome = String(formData.get("nome") ?? "").trim();
  const objetivo = String(formData.get("objetivo") ?? "").trim();
  const ofertaPrincipal = String(formData.get("oferta_principal") ?? "").trim();
  const criterioPrincipal = String(formData.get("criterio_principal") ?? "").trim();

  if (!nome) {
    return { status: "error", message: "Informe o nome da campanha." };
  }

  const token = await getSessionToken();
  if (!token) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/campaigns`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        nome,
        objetivo: objetivo || undefined,
        oferta_principal: ofertaPrincipal || undefined,
        criterio_principal: criterioPrincipal || undefined,
      }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : "Falha ao criar campanha.";
      return { status: "error", message: detail };
    }

    const campaign = data as CampaignSummary;
    revalidatePath("/");
    return { status: "success", message: `Campanha "${campaign.nome}" criada com sucesso.` };
  } catch {
    return { status: "error", message: "Não foi possível conectar à API." };
  }
}

export async function importLeadsFile(
  _prevState: ImportLeadsState,
  formData: FormData
): Promise<ImportLeadsState> {
  const file = formData.get("file");
  const campaignId = String(formData.get("campaign_id") ?? "").trim();

  if (!(file instanceof File) || !file.name) {
    return { status: "error", message: "Selecione uma planilha .xlsx." };
  }

  const token = await getSessionToken();
  if (!token) {
    return { status: "error", message: "Sessão expirada. Faça login novamente." };
  }

  const payload = new FormData();
  payload.set("file", file);
  if (campaignId) payload.set("campaign_id", campaignId);

  try {
    const response = await fetch(`${API_BASE_URL}/imports/leads`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: payload,
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : "Falha ao importar a planilha.";
      return { status: "error", message: detail };
    }

    const resultado = data as ImportLeadsResult;
    revalidatePath("/");
    revalidatePath("/kanban");
    return { status: "success", message: resultado.message };
  } catch {
    return { status: "error", message: "Não foi possível conectar à API para importar a planilha." };
  }
}

function appendStatusParam(returnTo: string, status: "ok" | "erro"): string {
  const baseUrl = "http://robot-leads.local";
  const url = new URL(returnTo || "/", baseUrl);
  url.searchParams.set("status_salvo", status);
  return `${url.pathname}${url.search}`;
}

export async function updateLeadStatus(formData: FormData): Promise<void> {
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const statusContato = String(formData.get("status_contato") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "/").trim() || "/";

  if (!leadId || !statusContato) {
    redirect(appendStatusParam(returnTo, "erro"));
  }

  let saved = false;

  const token = await getSessionToken();
  if (!token) {
    redirect(appendStatusParam(returnTo, "erro"));
  }

  try {
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status_contato: statusContato }),
      cache: "no-store",
    });
    saved = response.ok;
  } catch {
    saved = false;
  }

  if (saved) {
    revalidatePath("/");
    revalidatePath("/kanban");
  }

  redirect(appendStatusParam(returnTo, saved ? "ok" : "erro"));
}

export async function addLeadObservation(formData: FormData): Promise<void> {
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const observacao = String(formData.get("observacao_humana") ?? "").trim();
  const returnTo = String(formData.get("return_to") ?? "/").trim() || "/";

  if (!leadId || !observacao) {
    redirect(appendStatusParam(returnTo, "erro"));
  }

  let saved = false;

  const token = await getSessionToken();
  if (!token) {
    redirect(appendStatusParam(returnTo, "erro"));
  }

  try {
    const response = await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ observacao_humana: observacao }),
      cache: "no-store",
    });
    saved = response.ok;
  } catch {
    saved = false;
  }

  if (saved) {
    revalidatePath("/");
    revalidatePath("/kanban");
  }

  redirect(appendStatusParam(returnTo, saved ? "ok" : "erro"));
}

export type RequestLinkState = {
  status: "idle" | "success" | "error";
  message: string;
};

export async function requestMagicLink(
  _prevState: RequestLinkState,
  formData: FormData
): Promise<RequestLinkState> {
  const email = String(formData.get("email") ?? "").trim();

  if (!email) {
    return { status: "error", message: "Informe seu email." };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/request-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      cache: "no-store",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const detail = typeof data?.detail === "string" ? data.detail : "Falha ao enviar link de acesso.";
      return { status: "error", message: detail };
    }

    const debugSuffix = data?.debug_link ? ` (modo dev, sem envio de email: ${data.debug_link})` : "";
    return {
      status: "success",
      message: `Verifique seu email para o link de acesso.${debugSuffix}`,
    };
  } catch {
    return { status: "error", message: "Não foi possível conectar à API." };
  }
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/auth/login");
}
