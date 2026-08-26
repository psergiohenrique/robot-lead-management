"use client";

import { useState } from "react";

import type { Lead } from "@/lib/types";
import { limparTelefoneBrasil } from "@/lib/whatsapp";

import { LeadDetailModal } from "./lead-detail-modal";

const columns = [
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
  "DiagnÃƒÂ³stico enviado": "Diagnóstico enviado",
  "DiagnÃƒÆ’Ã‚Â³stico enviado": "Diagnóstico enviado",
  "ReuniÃ£o marcada": "Reunião marcada",
  "ReuniÃƒÂ£o marcada": "Reunião marcada",
  "ReuniÃƒÆ’Ã‚Â£o marcada": "Reunião marcada",
};

type KanbanBoardProps = {
  leads: Lead[];
  returnTo: string;
};

function normalizeStatus(status?: string | null): string {
  const value = statusAliases[status?.trim() ?? ""] ?? status?.trim();
  return value && columns.includes(value) ? value : "Novo";
}

function scoreTone(classificacao?: string | null): string {
  if (classificacao === "Quente") return "bg-yellow-100 text-yellow-900";
  if (classificacao === "Morno") return "bg-orange-100 text-orange-900";
  if (classificacao === "Frio") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
}

export function KanbanBoard({ leads, returnTo }: KanbanBoardProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  const grouped = columns.map((column) => ({
    title: column,
    leads: leads.filter((lead) => normalizeStatus(lead.status_contato) === column),
  }));

  if (!leads.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-soft">
        <p className="text-lg font-bold text-slate-900">Nenhum lead encontrado para este Kanban</p>
        <p className="mt-2 text-sm text-slate-600">
          Escolha outra campanha ou volte para a dashboard para buscar novos leads.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="-mx-5 overflow-x-auto px-5 pb-5 sm:-mx-8 sm:px-8">
        <div className="flex min-w-max gap-4">
          {grouped.map((group) => (
            <section
              key={group.title}
              className="flex max-h-[calc(100vh-260px)] w-[300px] shrink-0 flex-col rounded-[1.5rem] bg-white p-4 shadow-soft ring-1 ring-black/5"
            >
              <div className="border-b border-slate-100 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{group.title}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">Etapa do funil</p>
                  </div>
                  <span className="rounded-2xl bg-slate-950 px-3 py-1.5 text-sm font-black text-white">
                    {group.leads.length}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex flex-1 flex-col gap-3 overflow-y-auto pr-1">
                {group.leads.length ? (
                  group.leads.map((lead) => {
                    const telefoneLimpo = limparTelefoneBrasil(lead);

                    return (
                      <button
                        key={lead.id ?? lead.nome}
                        type="button"
                        onClick={() => setSelectedLead(lead)}
                        className="group block w-full rounded-2xl bg-slate-50 p-4 text-left ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-yellow-50 hover:shadow-soft"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="line-clamp-3 text-sm font-black leading-5 text-slate-950">{lead.nome}</p>
                            <p className="mt-2 line-clamp-2 text-xs leading-4 text-slate-500">
                              {lead.cidade ?? "-"} · {lead.segmento ?? "-"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${scoreTone(
                              lead.classificacao_lead
                            )}`}
                          >
                            {lead.classificacao_lead ?? "-"}
                          </span>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-slate-600">
                          <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Score</p>
                            <p className="mt-1 font-black text-slate-950">{lead.score_oportunidade ?? "-"}</p>
                          </div>
                          <div className="rounded-2xl bg-white px-3 py-2 ring-1 ring-black/5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">Avaliações</p>
                            <p className="mt-1 font-black text-slate-950">{lead.quantidade_avaliacoes ?? "-"}</p>
                          </div>
                        </div>

                        <div className="mt-3 rounded-2xl bg-white px-3 py-2 text-xs leading-5 ring-1 ring-black/5">
                          <p className="font-black text-slate-700">{lead.whatsapp_status ?? "Verificar WhatsApp"}</p>
                          <p className="mt-0.5 truncate text-slate-400">{lead.telefone || telefoneLimpo || "Sem telefone"}</p>
                        </div>

                        <p className="mt-3 text-xs font-black text-yellow-800 opacity-80 transition group-hover:opacity-100">
                          Abrir detalhes →
                        </p>
                      </button>
                    );
                  })
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-5 text-center text-sm font-bold text-slate-400">
                    Sem leads nesta etapa
                  </div>
                )}
              </div>
            </section>
          ))}
        </div>
      </div>

      {selectedLead ? (
        <LeadDetailModal lead={selectedLead} returnTo={returnTo} onClose={() => setSelectedLead(null)} />
      ) : null}
    </>
  );
}
