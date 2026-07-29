import { notFound } from "next/navigation";

import { LeadMessageCard } from "@/components/lead-message-card";
import { LeadStatusForm } from "@/components/lead-status-form";
import { getLead } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { criarLinkWhatsApp, criarMensagemWhatsApp, limparTelefoneBrasil } from "@/lib/whatsapp";

type LeadDetailPageProps = {
  params: Promise<{ leadId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function paramValue(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function safeReturnTo(value?: string): string {
  if (!value || !value.startsWith("/")) return "/kanban";
  return value;
}

function detailHref(leadId: string, returnTo: string): string {
  return `/kanban/lead/${leadId}?return_to=${encodeURIComponent(returnTo)}`;
}

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

export default async function LeadDetailPage({ params, searchParams }: LeadDetailPageProps) {
  await requireUser();

  const { leadId } = await params;
  const query = (await searchParams) ?? {};
  const returnTo = safeReturnTo(paramValue(query, "return_to"));
  const statusSalvo = paramValue(query, "status_salvo");
  const currentDetailHref = detailHref(leadId, returnTo);
  const lead = await getLead(leadId);

  if (!lead) {
    notFound();
  }

  const telefoneLimpo = limparTelefoneBrasil(lead);
  const whatsappLink = criarLinkWhatsApp(lead);
  const mensagem = criarMensagemWhatsApp(lead);

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-5 py-8 sm:px-8">
      <header className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-soft">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-300">Ficha do lead</p>
            <h1 className="mt-4 max-w-4xl text-4xl font-black tracking-tight">{lead.nome}</h1>
            <p className="mt-3 text-slate-300">
              {lead.cidade ?? "-"} · {lead.segmento ?? "-"} · Score {lead.score_oportunidade ?? "-"} ·{" "}
              {lead.classificacao_lead ?? "Sem classificação"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              className="rounded-2xl bg-white/10 px-4 py-3 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
              href={returnTo}
            >
              Voltar ao Kanban
            </a>
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
          </div>
        </div>
      </header>

      {statusSalvo === "ok" ? (
        <div className="rounded-3xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
          Status do lead salvo com sucesso.
        </div>
      ) : null}
      {statusSalvo === "erro" ? (
        <div className="rounded-3xl bg-red-50 px-5 py-4 text-sm font-bold text-red-800 ring-1 ring-red-200">
          Não consegui salvar o status. Confira se a API está online e se o Neon DB está conectado.
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Controle comercial</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Status atual" value={lead.status_contato ?? "Novo"} />
            <InfoItem label="Classificação" value={lead.classificacao_lead} />
            <InfoItem label="Score" value={lead.score_oportunidade} />
            <InfoItem label="Prioridade" value={lead.prioridade} />
            <InfoItem label="Próximo follow-up" value={lead.proximo_followup} />
            <InfoItem label="Atualizado em" value={formatDate(lead.updated_at)} />
          </div>

          <div className="mt-6 rounded-3xl bg-slate-50 p-5 ring-1 ring-black/5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Mover lead no funil</p>
            <p className="mt-2 text-sm text-slate-600">
              Ao alterar a etapa, o status fica salvo no banco e o lead aparece na coluna correta do Kanban.
            </p>
            {lead.id ? (
              <div className="mt-4 max-w-sm">
                <LeadStatusForm leadId={lead.id} status={lead.status_contato} returnTo={currentDetailHref} />
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
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

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Presença no Google</p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <InfoItem label="Avaliação" value={lead.avaliacao} />
            <InfoItem label="Quantidade de avaliações" value={lead.quantidade_avaliacoes} />
            <InfoItem label="Endereço" value={lead.endereco} roomy />
            <InfoItem label="Site cadastrado" value={lead.site_cadastrado || "Não informado"} roomy />
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Anotações</p>
          <div className="mt-5 grid gap-4">
            <InfoItem label="Observação comercial" value={lead.observacao_comercial} roomy />
            <InfoItem label="Observação humana" value={lead.observacao_humana} roomy />
            <InfoItem label="Motivo de perda" value={lead.motivo_perda} roomy />
          </div>
        </div>
      </section>

      <LeadMessageCard message={mensagem} whatsappLink={whatsappLink} />
    </main>
  );
}
