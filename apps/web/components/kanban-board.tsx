import type { Lead } from "@/lib/types";
import { limparTelefoneBrasil } from "@/lib/whatsapp";

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

const statusAliases: Record<string, string> = {
  "DiagnÃ³stico enviado": "Diagnóstico enviado",
  "ReuniÃ£o marcada": "Reunião marcada",
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
      <div className="grid min-w-[1320px] grid-cols-8 gap-3">
        {grouped.map((group) => (
          <section key={group.title} className="rounded-[1.35rem] bg-white p-3 shadow-soft ring-1 ring-black/5">
            <div className="sticky top-0 z-10 rounded-t-[1.1rem] bg-white pb-3">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">{group.title}</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{group.leads.length}</p>
            </div>

            <div className="mt-1 flex max-h-[720px] flex-col gap-2 overflow-y-auto pr-1">
              {group.leads.length ? (
                group.leads.map((lead) => {
                  const telefoneLimpo = limparTelefoneBrasil(lead);
                  const detailHref = lead.id
                    ? `/kanban/lead/${lead.id}?return_to=${encodeURIComponent(returnTo)}`
                    : "#";

                  return (
                    <a
                      key={lead.id ?? lead.nome}
                      href={detailHref}
                      className="group block rounded-2xl bg-slate-50 p-3 ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:bg-yellow-50 hover:shadow-soft"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="line-clamp-2 text-[13px] font-black leading-5 text-slate-950">{lead.nome}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {lead.cidade ?? "-"} · {lead.segmento ?? "-"}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${scoreTone(
                            lead.classificacao_lead
                          )}`}
                        >
                          {lead.classificacao_lead ?? "-"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-slate-600">
                        <span className="rounded-full bg-white px-2 py-1 font-bold ring-1 ring-black/5">
                          Score {lead.score_oportunidade ?? "-"}
                        </span>
                        <span className="rounded-full bg-white px-2 py-1 font-bold ring-1 ring-black/5">
                          {lead.quantidade_avaliacoes ?? "-"} aval.
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] leading-4">
                        <p className="truncate font-bold text-slate-700">{lead.whatsapp_status ?? "Verificar WhatsApp"}</p>
                        <p className="truncate text-slate-400">{lead.telefone || telefoneLimpo || "Sem telefone"}</p>
                      </div>

                      <p className="mt-3 text-[11px] font-black text-yellow-800 opacity-80 transition group-hover:opacity-100">
                        Abrir detalhes →
                      </p>
                    </a>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center text-xs font-bold text-slate-400">
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
