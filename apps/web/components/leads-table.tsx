import type { Lead } from "@/lib/types";
import { LeadStatusForm } from "@/components/lead-status-form";
import { criarLinkWhatsApp, limparTelefoneBrasil } from "@/lib/whatsapp";

type LeadsTableProps = {
  leads: Lead[];
  returnTo?: string;
};

export function LeadsTable({ leads, returnTo = "/" }: LeadsTableProps) {
  if (!leads.length) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center shadow-soft">
        <p className="text-lg font-bold text-slate-900">Nenhum lead carregado ainda</p>
        <p className="mt-2 text-sm text-slate-600">
          Quando o Neon DB estiver conectado e a base for importada, os leads aparecerão aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
      <div className="max-h-[720px] overflow-auto">
        <table className="min-w-[1100px] divide-y divide-slate-200 text-sm">
          <thead className="sticky top-0 z-10 bg-slate-950 text-left text-white">
            <tr>
              <th className="px-5 py-4 font-semibold">Empresa</th>
              <th className="px-5 py-4 font-semibold">Cidade</th>
              <th className="px-5 py-4 font-semibold">Segmento</th>
              <th className="px-5 py-4 font-semibold">Score</th>
              <th className="px-5 py-4 font-semibold">Classificação</th>
              <th className="px-5 py-4 font-semibold">WhatsApp</th>
              <th className="px-5 py-4 font-semibold">Contato</th>
              <th className="px-5 py-4 font-semibold">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {leads.map((lead, index) => {
              const whatsappLink = criarLinkWhatsApp(lead);
              const telefoneLimpo = limparTelefoneBrasil(lead);

              return (
                <tr key={lead.id ?? `${lead.nome}-${index}`} className="hover:bg-yellow-50/60">
                  <td className="px-5 py-4">
                    <p className="font-bold text-slate-950">{lead.nome}</p>
                    <p className="text-xs text-slate-500">{lead.telefone || telefoneLimpo || "Sem telefone"}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-700">{lead.cidade ?? "-"}</td>
                  <td className="px-5 py-4 text-slate-700">{lead.segmento ?? "-"}</td>
                  <td className="px-5 py-4 font-bold">{lead.score_oportunidade ?? "-"}</td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-yellow-900">
                      {lead.classificacao_lead ?? "Sem classificação"}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-slate-700">{lead.whatsapp_status ?? "Verificar"}</span>
                      {telefoneLimpo ? <span className="text-xs text-slate-400">{telefoneLimpo}</span> : null}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    {lead.id ? (
                      <LeadStatusForm leadId={lead.id} status={lead.status_contato} returnTo={returnTo} />
                    ) : (
                      <span className="text-slate-700">{lead.status_contato ?? "Novo"}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {whatsappLink ? (
                      <a
                        className="inline-flex whitespace-nowrap rounded-2xl bg-green-600 px-4 py-2 text-xs font-black text-white transition hover:bg-green-700"
                        href={whatsappLink}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Abrir WhatsApp
                      </a>
                    ) : (
                      <span className="inline-flex whitespace-nowrap rounded-2xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-500">
                        Verificar telefone
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
