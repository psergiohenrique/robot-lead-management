"use server";

import { revalidatePath } from "next/cache";

import type { SearchBatchResult } from "./types";

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:8000";

export type RunSearchState = {
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

  if (!cidade || !segmento) {
    return { status: "error", message: "Informe cidade e segmento." };
  }

  try {
    const response = await fetch(`${API_BASE_URL}/search-batches`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cidade, segmento, limite }),
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

export async function updateLeadStatus(formData: FormData): Promise<void> {
  const leadId = String(formData.get("lead_id") ?? "").trim();
  const statusContato = String(formData.get("status_contato") ?? "").trim();

  if (!leadId || !statusContato) return;

  try {
    await fetch(`${API_BASE_URL}/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status_contato: statusContato }),
      cache: "no-store",
    });
    revalidatePath("/");
  } catch {
    // A tela continua funcionando mesmo se a API estiver offline.
  }
}
