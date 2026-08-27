import { CampaignsPanel } from "@/components/campaigns-panel";
import { ImportLeadsForm } from "@/components/import-leads-form";
import { LogoutButton } from "@/components/logout-button";
import { RunSearchForm } from "@/components/run-search-form";
import { StatCard } from "@/components/stat-card";
import { getCampaigns, getDashboardSummary } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function paramValue(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const campaignId = paramValue(params, "campaign_id");

  const [summary, campaigns] = await Promise.all([getDashboardSummary(), getCampaigns()]);
  const selectedCampaignId = campaignId ?? campaigns[0]?.id?.toString();

  const currentCampaign = campaigns.find((campaign) => String(campaign.id) === selectedCampaignId);

  const pipelineResumo = [
    { label: "Novo", value: summary.status_novo, helper: "Ainda sem abordagem" },
    { label: "Primeiro contato", value: summary.status_primeiro_contato, helper: "Abordagem iniciada" },
    { label: "Respondeu", value: summary.status_respondeu, helper: "Retornaram contato" },
    { label: "Diagnóstico enviado", value: summary.status_diagnostico_enviado, helper: "Análise enviada" },
    { label: "Reunião marcada", value: summary.status_reuniao_marcada, helper: "Próxima conversa" },
    { label: "Proposta", value: summary.status_proposta, helper: "Em negociação" },
    { label: "Fechado", value: summary.status_fechado, helper: "Clientes ganhos" },
    { label: "Perdido", value: summary.status_perdido, helper: "Sem avanço" },
    { label: "Contato inválido", value: summary.status_contato_invalido, helper: "Número errado ou sem WhatsApp" },
  ];

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8">
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-soft">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-300">Codepath</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              Robot Lead Management
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Dashboard para buscar empresas sem site, priorizar oportunidades e controlar a abordagem
              manual pelo WhatsApp.
            </p>
          </div>
          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
            <p className="text-sm text-slate-300">Status do painel</p>
            <p className="mt-2 text-lg font-bold">Resumo operacional</p>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <p className="text-sm text-slate-300">{user.email}</p>
              <LogoutButton />
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                className="inline-flex rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
                href={selectedCampaignId ? `/hoje?campaign_id=${selectedCampaignId}` : "/hoje"}
              >
                Rotina de hoje
              </a>
              <a
                className="inline-flex rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
                href="/metricas"
              >
                Métricas
              </a>
              <a
                className="inline-flex rounded-2xl bg-yellow-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-yellow-200"
                href={selectedCampaignId ? `/kanban?campaign_id=${selectedCampaignId}` : "/kanban"}
              >
                Abrir Kanban
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total de leads" value={summary.total_leads} helper="Base consolidada" tone="dark" />
        <StatCard label="Sem site" value={summary.leads_sem_site} helper="Oportunidade principal" tone="gold" />
        <StatCard label="Leads quentes" value={summary.leads_quentes} helper="Maior prioridade comercial" />
        <StatCard label="Provável WhatsApp" value={summary.provavel_whatsapp} helper="Prontos para contato manual" />
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {pipelineResumo.map((step, index) => (
          <div key={step.label} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Etapa {index + 1}</p>
            <div className="mt-3 flex items-end justify-between gap-3">
              <p className="font-bold text-slate-950">{step.label}</p>
              <p className="text-3xl font-black text-slate-950">{step.value.toLocaleString("pt-BR")}</p>
            </div>
            <p className="mt-2 text-xs font-bold text-slate-400">{step.helper}</p>
          </div>
        ))}
      </section>

      <CampaignsPanel campaigns={campaigns} activeCampaignId={selectedCampaignId} />

      <section className="grid gap-4 md:grid-cols-3">
        <a
          className="rounded-[2rem] bg-slate-950 p-6 text-white shadow-soft transition hover:-translate-y-0.5 hover:shadow-xl"
          href={selectedCampaignId ? `/hoje?campaign_id=${selectedCampaignId}` : "/hoje"}
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-300">Operação</p>
          <h2 className="mt-3 text-2xl font-black">Rotina de hoje</h2>
          <p className="mt-3 text-sm leading-6 text-slate-300">Veja quem abordar, quem retomar e quais follow-ups estão pendentes.</p>
        </a>
        <a
          className="rounded-[2rem] bg-yellow-300 p-6 text-slate-950 shadow-soft transition hover:-translate-y-0.5 hover:shadow-xl"
          href={selectedCampaignId ? `/kanban?campaign_id=${selectedCampaignId}` : "/kanban"}
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-900/70">Funil</p>
          <h2 className="mt-3 text-2xl font-black">Kanban de leads</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-700">Acompanhe cada lead por etapa e abra a ficha completa.</p>
        </a>
        <a
          className="rounded-[2rem] bg-white p-6 text-slate-950 shadow-soft ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-xl"
          href="/metricas"
        >
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Gestão</p>
          <h2 className="mt-3 text-2xl font-black">Métricas BDR</h2>
          <p className="mt-3 text-sm font-bold leading-6 text-slate-500">Veja contatos feitos, ações registradas e evolução comercial.</p>
        </a>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <div className="grid gap-6 lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Coleta de leads</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Buscar novos leads</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Execute uma busca por cidade e segmento. A API consulta o Google Places e salva os resultados
                direto no banco para aparecerem na tabela.
              </p>
            </div>
            <RunSearchForm campaigns={campaigns} activeCampaignId={selectedCampaignId} />
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <div className="grid gap-6 lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Importação</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Trazer planilha</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Importe uma planilha .xlsx do Drive ou do computador. Os leads entram na base geral, sem duplicar
                empresas já cadastradas.
              </p>
            </div>
            <ImportLeadsForm campaigns={campaigns} activeCampaignId={selectedCampaignId} />
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <div className="grid gap-6 lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Mensagem atual</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Promoção Codepath</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Esta é a oferta usada no botão de WhatsApp da tabela. O lead abre com a mensagem pronta,
                mas o envio continua manual.
              </p>
              <a
                className="mt-5 inline-flex rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-200"
                href="https://promocao.codepath.dev.br/"
                target="_blank"
                rel="noreferrer"
              >
                Ver site promocional
              </a>
            </div>
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <p className="font-bold">Site institucional completo</p>
              <p className="mt-3 text-3xl font-black text-yellow-300">R$ 499 à vista</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                + R$ 129,90/mês de manutenção, suporte e cuidados contínuos do site enquanto a Codepath
                cuidar dele.
              </p>
              <ul className="mt-5 grid gap-2 text-sm text-slate-200 sm:grid-cols-2">
                <li>- Site profissional</li>
                <li>- Layout responsivo</li>
                <li>- Estrutura pensada para o Google</li>
                <li>- Suporte direto da Codepath</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {currentCampaign ? (
        <section className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Campanha ativa</p>
          <h2 className="mt-2 text-2xl font-black text-slate-950">{currentCampaign.nome}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-500">
            A dashboard fica como visão executiva e ponto de entrada. Para trabalhar os leads, use Rotina de hoje,
            Kanban ou Métricas.
          </p>
        </section>
      ) : null}
    </main>
  );
}
