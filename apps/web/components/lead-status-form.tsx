"use client";

import { useRef } from "react";

import { updateLeadStatus } from "@/lib/actions";

type LeadStatusFormProps = {
  leadId: number;
  status?: string | null;
  returnTo?: string;
  compact?: boolean;
};

const statusOptions = [
  "Novo",
  "Primeiro contato",
  "Respondeu",
  "Diagnóstico enviado",
  "Reunião marcada",
  "Proposta",
  "Fechado",
  "Perdido",
];

const statusAliases: Record<string, string> = {
  Contactado: "Primeiro contato",
  Contactada: "Primeiro contato",
  Contactados: "Primeiro contato",
  Contactadas: "Primeiro contato",
  Contatado: "Primeiro contato",
  Contatada: "Primeiro contato",
  Contatados: "Primeiro contato",
  Contatadas: "Primeiro contato",
  Abordado: "Primeiro contato",
  Abordada: "Primeiro contato",
  "Contato feito": "Primeiro contato",
  "Contato realizado": "Primeiro contato",
  "Em contato": "Primeiro contato",
  "1º contato": "Primeiro contato",
  Diagnostico: "Diagnóstico enviado",
  "Diagnostico enviado": "Diagnóstico enviado",
  Reuniao: "Reunião marcada",
  "Reuniao marcada": "Reunião marcada",
  "Proposta enviada": "Proposta",
  "DiagnÃ³stico enviado": "Diagnóstico enviado",
  "ReuniÃ£o marcada": "Reunião marcada",
};

function normalizeStatus(status?: string | null): string {
  return statusAliases[status?.trim() ?? ""] ?? status?.trim() ?? "Novo";
}

export function LeadStatusForm({ leadId, status, returnTo = "/", compact = false }: LeadStatusFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={updateLeadStatus} className={`flex gap-2 ${compact ? "min-w-0" : "min-w-48"}`}>
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
        name="status_contato"
        defaultValue={normalizeStatus(status)}
        onChange={() => formRef.current?.requestSubmit()}
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button
        className={`rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 ${
          compact ? "sr-only" : ""
        }`}
      >
        Salvar
      </button>
    </form>
  );
}
