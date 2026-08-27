"use client";

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
  "Contato inválido",
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
  "Contato invalido": "Contato inválido",
  "Contato inválido": "Contato inválido",
  "Número errado": "Contato inválido",
  "Numero errado": "Contato inválido",
  "Telefone errado": "Contato inválido",
  "Não é WhatsApp": "Contato inválido",
  "Nao e WhatsApp": "Contato inválido",
  "Sem WhatsApp": "Contato inválido",
  "Não é do local": "Contato inválido",
  "Nao e do local": "Contato inválido",
  "DiagnÃ³stico enviado": "Diagnóstico enviado",
  "ReuniÃ£o marcada": "Reunião marcada",
};

function normalizeStatus(status?: string | null): string {
  return statusAliases[status?.trim() ?? ""] ?? status?.trim() ?? "Novo";
}

export function LeadStatusForm({ leadId, status, returnTo = "/", compact = false }: LeadStatusFormProps) {
  return (
    <form action={updateLeadStatus} className={`flex gap-2 ${compact ? "min-w-0" : "min-w-48"}`}>
      <input type="hidden" name="lead_id" value={leadId} />
      <input type="hidden" name="return_to" value={returnTo} />
      <select
        className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
        name="status_contato"
        defaultValue={normalizeStatus(status)}
      >
        {statusOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button
        className={`rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800 ${
          compact ? "px-2" : ""
        }`}
      >
        {compact ? "OK" : "Salvar"}
      </button>
    </form>
  );
}
