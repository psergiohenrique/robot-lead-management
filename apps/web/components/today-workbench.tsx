"use client";

import { useMemo, useState } from "react";

import type { CampaignSummary, Lead } from "@/lib/types";
import { criarLinkWhatsApp, limparTelefoneBrasil } from "@/lib/whatsapp";

import { LeadDetailModal } from "./lead-detail-modal";

type TodayWorkbenchProps = {
  leads: Lead[];
  campaign?: CampaignSummary | null;
  returnTo: string;
};

type WorkSection = {
  id: string;
  title: string;
  helper: string;
  tone: "gold" | "dark" | "white";
  leads: Lead[];
};

const finishedStatuses = new Set(["Fechado", "Perdido", "Contato inválido"]);

function normalizeText(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeStatus(status?: string | null): string {
  const value = normalizeText(status);
  if (!value || value === "novo") return "Novo";
  if (
    value.includes("invalido") ||
    value.includes("numero errado") ||
    value.includes("telefone errado") ||
    value.includes("nao e whatsapp") ||
    value.includes("sem whatsapp") ||
    value.includes("nao e do local")
  ) {
    return "Contato inválido";
  }
  if (value.includes("primeiro") || value.includes("contato") || value.includes("contact")) return "Primeiro contato";
  if (value.includes("respondeu")) return "Respondeu";
  if (value.includes("diagnostico")) return "Diagnóstico enviado";
  if (value.includes("reuniao")) return "Reunião marcada";
  if (value.includes("proposta")) return "Proposta";
  if (value.includes("fechado")) return "Fechado";
  if (value.includes("perdido")) return "Perdido";
  return status?.trim() || "Novo";
}

function parseDate(value?: string | null): Date | null {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysSince(value?: string | null): number | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  const diff = today.getTime() - date.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function isDueToday(value?: string | null): boolean {
  const date = parseDate(value);
  if (!date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date.getTime() <= today.getTime();
}

function leadPriority(lead: Lead): number {
  const status = normalizeStatus(lead.status_contato);
  const score = lead.score_oportunidade ?? 0;
  const reviews = lead.quantidade_avaliacoes ?? 0;
  const whatsapp = lead.whatsapp_status === "Provável WhatsApp" ? 30 : 0;
  const hot = lead.classificacao_lead === "Quente" ? 40 : lead.classificacao_lead === "Morno" ? 15 : 0;
  const statusWeight = status === "Respondeu" ? 60 : status === "Proposta" ? 55 : status === "Novo" ? 35 : 20;
  return statusWeight + hot + whatsapp + score * 5 + Math.min(reviews, 250) / 10;
}

function sortLeads(leads: Lead[]): Lead[] {
  return [...leads].sort((a, b) => leadPriority(b) - leadPriority(a));
}

function uniqueLeads(leads: Lead[]): Lead[] {
  const seen = new Set<string>();
  return leads.filter((lead) => {
    const key = String(lead.id ?? lead.nome);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildSections(leads: Lead[]): WorkSection[] {
  const active = leads.filter((lead) => !finishedStatuses.has(normalizeStatus(lead.status_contato)));
  const due = active.filter((lead) => isDueToday(lead.proximo_followup));
  const novos = active.filter((lead) => normalizeStatus(lead.status_contato) === "Novo");
  const aguardando = active.filter((lead) => {
    const status = normalizeStatus(lead.status_contato);
    const dias = daysSince(lead.data_ultimo_contato);
    return status === "Primeiro contato" && (dias === null || dias >= 2);
  });
  const quentesSemPasso = active.filter((lead) => {
    const status = normalizeStatus(lead.status_contato);
    return lead.classificacao_lead === "Quente" && !lead.proximo_followup && !["Fechado", "Perdido"].includes(status);
  });
  const propostas = active.filter((lead) => normalizeStatus(lead.status_contato) === "Proposta");

  return [
    {
      id: "followup",
      title: "Follow-ups de hoje",
      helper: "Leads com retorno vencido ou marcado para hoje.",
      tone: "gold",
      leads: sortLeads(due).slice(0, 20),
    },
    {
      id: "novos",
      title: "Novos para abordar",
      helper: "Sem site, ainda sem primeiro contato.",
      tone: "dark",
      leads: sortLeads(novos).slice(0, 20),
    },
    {
      id: "aguardando",
      title: "Aguardando resposta",
      helper: "Primeiro contato feito e sem avanço recente.",
      tone: "white",
      leads: sortLeads(aguardando).slice(0, 20),
    },
    {
      id: "quentes",
      title: "Quentes sem próximo passo",
      helper: "Oportunidades boas que precisam de uma próxima ação.",
      tone: "white",
      leads: sortLeads(quentesSemPasso).slice(0, 20),
    },
    {
      id: "propostas",
      title: "Propostas em aberto",
      helper: "Negociações que não podem esfriar.",
      tone: "white",
      leads: sortLeads(propostas).slice(0, 20),
    },
  ];
}

function sectionClass(tone: WorkSection["tone"]): string {
  if (tone === "gold") return "bg-yellow-300 text-slate-950";
  if (tone === "dark") return "bg-slate-950 text-white";
  return "bg-white text-slate-950";
}

function LeadTaskCard({
  lead,
  campaign,
  onOpen,
}: {
  lead: Lead;
  campaign?: CampaignSummary | null;
  onOpen: () => void;
}) {
  const phone = limparTelefoneBrasil(lead);
  const whatsappLink = criarLinkWhatsApp(lead, campaign);
  const status = normalizeStatus(lead.status_contato);

  return (
    <article className="rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-black text-slate-950">{lead.nome}</p>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {lead.cidade ?? "-"} · {lead.segmento ?? "-"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-yellow-100 px-2.5 py-1 text-[10px] font-black text-yellow-900">
          {lead.classificacao_lead ?? "Lead"}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded-2xl bg-slate-50 px-2 py-2">
          <p className="font-bold text-slate-400">Score</p>
          <p className="font-black text-slate-950">{lead.score_oportunidade ?? "-"}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-2 py-2">
          <p className="font-bold text-slate-400">Aval.</p>
          <p className="font-black text-slate-950">{lead.quantidade_avaliacoes ?? "-"}</p>
        </div>
        <div className="rounded-2xl bg-slate-50 px-2 py-2">
          <p className="font-bold text-slate-400">Status</p>
          <p className="truncate font-black text-slate-950">{status}</p>
        </div>
      </div>

      <p className="mt-3 truncate text-xs font-bold text-slate-400">{lead.telefone || phone || "Sem telefone"}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="rounded-2xl bg-slate-950 px-3 py-2 text-xs font-black text-white transition hover:bg-slate-800"
        >
          Abrir ficha
        </button>
        {whatsappLink ? (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="rounded-2xl bg-green-600 px-3 py-2 text-xs font-black text-white transition hover:bg-green-700"
          >
            WhatsApp
          </a>
        ) : null}
      </div>
    </article>
  );
}

export function TodayWorkbench({ leads, campaign, returnTo }: TodayWorkbenchProps) {
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const sections = useMemo(() => buildSections(leads), [leads]);
  const totalTasks = uniqueLeads(sections.flatMap((section) => section.leads)).length;
  const primary = sections[0]?.leads[0] ?? sections[1]?.leads[0] ?? null;

  return (
    <>
      <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] bg-slate-950 p-7 text-white shadow-soft">
          <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-300">Rotina BDR</p>
          <h2 className="mt-3 text-3xl font-black">Fila de trabalho de hoje</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
            Esta tela organiza os leads por ação comercial. A ideia é você começar pelos follow-ups vencidos,
            depois atacar novos leads quentes e, por fim, revisar oportunidades paradas.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="text-xs font-bold text-slate-300">Tarefas únicas</p>
              <p className="mt-2 text-3xl font-black">{totalTasks}</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="text-xs font-bold text-slate-300">Follow-ups</p>
              <p className="mt-2 text-3xl font-black">{sections[0]?.leads.length ?? 0}</p>
            </div>
            <div className="rounded-3xl bg-white/10 p-4 ring-1 ring-white/15">
              <p className="text-xs font-bold text-slate-300">Novos</p>
              <p className="mt-2 text-3xl font-black">{sections[1]?.leads.length ?? 0}</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] bg-yellow-300 p-7 text-slate-950 shadow-soft">
          <p className="text-sm font-black uppercase tracking-[0.25em]">Primeira ação sugerida</p>
          {primary ? (
            <>
              <h3 className="mt-4 text-2xl font-black">{primary.nome}</h3>
              <p className="mt-2 text-sm font-bold text-slate-700">
                {primary.cidade ?? "-"} · {primary.segmento ?? "-"} · Score {primary.score_oportunidade ?? "-"}
              </p>
              <button
                type="button"
                onClick={() => setSelectedLead(primary)}
                className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800"
              >
                Abrir ficha agora
              </button>
            </>
          ) : (
            <p className="mt-4 text-sm font-bold text-slate-700">
              Nenhuma tarefa crítica encontrada nesta seleção. Boa hora para buscar novos leads ou revisar o Kanban.
            </p>
          )}
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        {sections.map((section) => (
          <div key={section.id} className={`rounded-[2rem] p-5 shadow-soft ring-1 ring-black/5 ${sectionClass(section.tone)}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] opacity-70">{section.title}</p>
                <p className="mt-2 text-sm font-bold opacity-70">{section.helper}</p>
              </div>
              <span className="rounded-2xl bg-white/80 px-3 py-1.5 text-sm font-black text-slate-950 ring-1 ring-black/5">
                {section.leads.length}
              </span>
            </div>

            <div className="mt-5 grid max-h-[44rem] gap-3 overflow-y-auto pr-1">
              {section.leads.length ? (
                section.leads.map((lead) => (
                  <LeadTaskCard
                    key={`${section.id}-${lead.id ?? lead.nome}`}
                    lead={lead}
                    campaign={campaign}
                    onOpen={() => setSelectedLead(lead)}
                  />
                ))
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white/70 p-6 text-center text-sm font-bold text-slate-500">
                  Nada urgente aqui agora.
                </div>
              )}
            </div>
          </div>
        ))}
      </section>

      {selectedLead ? (
        <LeadDetailModal lead={selectedLead} campaign={campaign} returnTo={returnTo} onClose={() => setSelectedLead(null)} />
      ) : null}
    </>
  );
}
