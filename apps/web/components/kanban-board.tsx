import { LeadStatusForm } from "@/components/lead-status-form";
import type { Lead } from "@/lib/types";
import { criarLinkWhatsApp, limparTelefoneBrasil } from "@/lib/whatsapp";

const columns = [
  "Novo",
  "Primeiro contato",
  "Respondeu",
  "Diagnóstico enviado",
  "Reunião marcada",
  "Proposta",
  "Fechado",
  "Perdido",
];

type KanbanBoardProps = {
  leads: Lead[];
  returnTo: string;
};

function normalizeStatus(status?: string | null): string {
  const value = status?.trim();
  return value && columns.includes(value) ? value : "Novo";
}

function scoreTone(classificacao?: string | null): string {
  if (classificacao === "Quente") return "bg-yellow-100 text-yellow-900";
  if (classificacao === "Morno") return "bg-orange-100 text-orange-900";
  if (classificacao === "Frio") return "bg-slate-100 text-slate-600";
  return "bg-slate-100 text-slate-600";
}

export function KanbanBoard({ leads, returnTo }: KanbanBoardProps) {
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
    <div className="overflow-x-auto pb-3">
      <div className="grid min-w-[1600px] grid-cols-8 gap-4">
        {grouped.map((group) => (
          <section key={group.title} className="rounded-[1.75rem] bg-white p-4 shadow-soft ring-1 ring-black/5">
            <div className="sticky top-0 z-10 bg-white pb-3">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{group.title}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{group.leads.length}</p>
            </div>

            <div className="mt-2 flex max-h-[760px] flex-col gap-3 overflow-y-auto pr-1">
              {group.leads.length ? (
                group.leads.map((lead) => {
                  const whatsappLink = criarLinkWhatsApp(lead);
                  const telefoneLimpo = limparTelefoneBrasil(lead);

                  return (
                    <article key={lead.id ?? lead.nome} className="rounded-3xl bg-slate-50 p-4 ring-1 ring-black/5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black leading-5 text-slate-950">{lead.nome}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {lead.cidade ?? "-"} · {lead.segmento ?? "-"}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${scoreTone(lead.classificacao_lead)}`}>
                          {lead.classificacao_lead ?? "Sem classificação"}
                        </span>
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
                        <span>
                          Score <strong className="text-slate-950">{lead.score_oportunidade ?? "-"}</strong>
                        </span>
                        <span>
                          Avaliações{" "}
                          <strong className="text-slate-950">{lead.quantidade_avaliacoes ?? "-"}</strong>
                        </span>
                        <span className="col-span-2">
                          WhatsApp <strong className="text-slate-950">{lead.whatsapp_status ?? "Verificar"}</strong>
                        </span>
                        <span className="col-span-2 text-slate-400">{lead.telefone || telefoneLimpo || "Sem telefone"}</span>
                      </div>

                      <div className="mt-4 space-y-2">
                        {lead.id ? (
                          <LeadStatusForm leadId={lead.id} status={lead.status_contato} returnTo={returnTo} compact />
                        ) : null}

                        {whatsappLink ? (
                          <a
                            className="flex w-full items-center justify-center rounded-2xl bg-green-600 px-3 py-2 text-xs font-black text-white transition hover:bg-green-700"
                            href={whatsappLink}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Abrir WhatsApp
                          </a>
                        ) : (
                          <span className="flex w-full items-center justify-center rounded-2xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-500">
                            Verificar telefone
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-3xl border border-dashed border-slate-200 p-4 text-center text-xs font-bold text-slate-400">
                  Sem leads nesta etapa
                </div>
              )}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
