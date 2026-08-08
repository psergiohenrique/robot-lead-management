"use client";

import { addLeadObservation } from "@/lib/actions";
import type { Lead } from "@/lib/types";
import { criarLinkWhatsApp, criarMensagemWhatsApp, limparTelefoneBrasil } from "@/lib/whatsapp";

import { LeadMessageCard } from "./lead-message-card";
import { LeadStatusForm } from "./lead-status-form";

type LeadDetailModalProps = {
  lead: Lead;
  returnTo: string;
  onClose: () => void;
};

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function InfoItem({ label, value, roomy = false }: { label: string; value?: string | number | null; roomy?: boolean }) {
  return (
    <div className={`rounded-3xl bg-slate-50 p-4 ring-1 ring-black/5 ${roomy ? "sm:col-span-2" : ""}`}>
      <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
      <p className="mt-2 whitespace-pre-wrap text-sm font-bold leading-6 text-slate-950">{value || "-"}</p>
    </div>
  );
}

function ActivityTimeline({ lead }: { lead: Lead }) {
  const atividades = lead.atividades ?? [];

  return (
    <div className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Histórico recente</p>
      <div className="mt-5 space-y-3">
        {atividades.length ? (
          atividades.map((atividade) => (
            <div key={atividade.id ?? `${atividade.titulo}-${atividade.created_at}`} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-black/5">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <p className="text-sm font-black text-slate-950">{atividade.titulo ?? "Atividade registrada"}</p>
                <p className="text-xs font-bold text-slate-400">{formatDate(atividade.created_at)}</p>
              </div>
              {atividade.status_anterior || atividade.status_novo ? (
                <p className="mt-2 text-xs font-bold text-slate-500">
                  {atividade.status_anterior ?? "-"} → {atividade.status_novo ?? "-"}
                </p>
              ) : null}
              {atividade.descricao ? (
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">{atividade.descricao}</p>
              ) : null}
            </div>
          ))
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-200 p-5 text-sm font-bold text-slate-400">
            Ainda não há atividades registradas para este lead.
          </div>
        )}
      </div>
    </div>
  );
}

function ObservationForm({ lead, returnTo }: { lead: Lead; returnTo: string }) {
  if (!lead.id) return null;

  return (
    <form action={addLeadObservation} className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5">
      <input type="hidden" name="lead_id" value={lead.id} />
      <input type="hidden" name="return_to" value={returnTo} />
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Nova observação</p>
      <textarea
        className="mt-4 min-h-28 w-full rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
        name="observacao_humana"
        placeholder="Ex.: Cliente pediu para retornar amanhã, demonstrou interesse no site promocional..."
        required
      />
      <button className="mt-3 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">
        Salvar observação
      </button>
    </form>
  );
}

export function LeadDetailModal({ lead, returnTo, onClose }: LeadDetailModalProps) {
  const telefoneLimpo = limparTelefoneBrasil(lead);
  const whatsappLink = criarLinkWhatsApp(lead);
  const mensagem = criarMensagemWhatsApp(lead);
  const detailHref = lead.id ? `/kanban/lead/${lead.id}?return_to=${encodeURIComponent(returnTo)}` : "";

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Fechar detalhe do lead"
        className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
        onClick={onClose}
      />

      <aside className="absolute right-0 top-0 flex h-full w-full max-w-5xl flex-col overflow-hidden bg-slate-100 shadow-2xl ring-1 ring-black/10 lg:rounded-l-[2rem]">
        <div className="bg-slate-950 p-5 text-white sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-yellow-300">Ficha do lead</p>
              <h2 className="mt-3 line-clamp-2 text-2xl font-black tracking-tight sm:text-3xl">{lead.nome}</h2>
              <p className="mt-2 text-sm text-slate-300">
                {lead.cidade ?? "-"} · {lead.segmento ?? "-"} · Score {lead.score_oportunidade ?? "-"} ·{" "}
                {lead.classificacao_lead ?? "Sem classificação"}
              </p>
            </div>

            <button
              type="button"
              className="shrink-0 rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
              onClick={onClose}
            >
              Fechar
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {lead.google_maps_url ? (
              <a
                className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
                href={lead.google_maps_url}
                target="_blank"
                rel="noreferrer"
              >
                Abrir Google Maps
              </a>
            ) : null}
            {whatsappLink ? (
              <a
                className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700"
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
              >
                Abrir WhatsApp
              </a>
            ) : null}
            {detailHref ? (
              <a
                className="rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-200"
                href={detailHref}
              >
                Abrir página completa
              </a>
            ) : null}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          <section className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Controle comercial</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <InfoItem label="Status atual" value={lead.status_contato ?? "Novo"} />
                <InfoItem label="Classificação" value={lead.classificacao_lead} />
                <InfoItem label="Score" value={lead.score_oportunidade} />
                <InfoItem label="Prioridade" value={lead.prioridade} />
                <InfoItem label="Primeiro contato" value={formatDate(lead.data_primeiro_contato)} />
                <InfoItem label="Último contato" value={formatDate(lead.data_ultimo_contato)} />
                <InfoItem label="Próximo follow-up" value={lead.proximo_followup} />
                <InfoItem label="Atualizado em" value={formatDate(lead.updated_at)} />
              </div>

              <div className="mt-5 rounded-3xl bg-slate-50 p-5 ring-1 ring-black/5">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mover lead no funil</p>
                <p className="mt-2 text-sm text-slate-600">
                  Ao alterar a etapa, o status fica salvo no banco e o lead aparece na coluna correta.
                </p>
                {lead.id ? (
                  <div className="mt-4 max-w-sm">
                    <LeadStatusForm leadId={lead.id} status={lead.status_contato} returnTo={returnTo} />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Contato e oportunidade</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <InfoItem label="Telefone original" value={lead.telefone} />
                <InfoItem label="Telefone limpo" value={telefoneLimpo || "-"} />
                <InfoItem label="WhatsApp" value={lead.whatsapp_status} />
                <InfoItem label="Sem site cadastrado" value={lead.sem_site_cadastrado} />
                <InfoItem label="Cidade" value={lead.cidade} />
                <InfoItem label="Região" value={lead.regiao} />
                <InfoItem label="Segmento" value={lead.segmento} />
                <InfoItem label="Oferta principal" value={lead.oferta_principal} />
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-2">
            <div className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Presença no Google</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <InfoItem label="Avaliação" value={lead.avaliacao} />
                <InfoItem label="Quantidade de avaliações" value={lead.quantidade_avaliacoes} />
                <InfoItem label="Endereço" value={lead.endereco} roomy />
                <InfoItem label="Site cadastrado" value={lead.site_cadastrado || "Não informado"} roomy />
              </div>
            </div>

            <div className="rounded-[2rem] bg-white p-5 shadow-soft ring-1 ring-black/5">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Anotações</p>
              <div className="mt-5 grid gap-4">
                <InfoItem label="Observação comercial" value={lead.observacao_comercial} roomy />
                <InfoItem label="Observação humana" value={lead.observacao_humana} roomy />
                <InfoItem label="Motivo de perda" value={lead.motivo_perda} roomy />
              </div>
            </div>
          </section>

          <section className="mt-5 grid gap-5 xl:grid-cols-2">
            <ObservationForm lead={lead} returnTo={returnTo} />
            <ActivityTimeline lead={lead} />
          </section>

          <div className="mt-5">
            <LeadMessageCard message={mensagem} whatsappLink={whatsappLink} />
          </div>
        </div>
      </aside>
    </div>
  );
}
