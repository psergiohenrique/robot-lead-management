import { LeadBaseTabs } from "@/components/lead-base-tabs";
import { LeadsFilters } from "@/components/leads-filters";
import { LeadsTable } from "@/components/leads-table";
import { LogoutButton } from "@/components/logout-button";
import { Pagination } from "@/components/pagination";
import { RunSearchForm } from "@/components/run-search-form";
import { StatCard } from "@/components/stat-card";
import { getDashboardSummary, getLeads, getSearchBatches } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const pipeline = [
  "Novo",
  "Primeiro contato",
  "Respondeu",
  "Diagnóstico enviado",
  "Reunião marcada",
  "Proposta",
  "Fechado",
];

type HomePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function paramValue(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function paramNumber(params: Record<string, string | string[] | undefined>, key: string, fallback: number): number {
  const value = Number(paramValue(params, key));
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const limit = Math.min(Math.max(paramNumber(params, "limit", 12), 1), 100);
  const offset = paramNumber(params, "offset", 0);
  const rawBase = paramValue(params, "base") ?? "sem_site";
  const base = ["sem_site", "todos", "pesquisa"].includes(rawBase) ? rawBase : "sem_site";
  const batchId = paramValue(params, "batch_id");
  const cidade = paramValue(params, "cidade");
  const segmento = paramValue(params, "segmento");
  const classificacao = paramValue(params, "classificacao");
  const semSite = paramValue(params, "sem_site") ?? (base === "sem_site" ? "SIM" : undefined);

  const [summary, batches] = await Promise.all([getDashboardSummary(), getSearchBatches()]);
  const selectedBatchId = base === "pesquisa" ? batchId ?? batches[0]?.id?.toString() : undefined;
  const leads = await getLeads({
    limit,
    offset,
    cidade,
    segmento,
    classificacao,
    sem_site: semSite,
    batch_id: selectedBatchId,
  });

  const currentBatch = batches.find((batch) => String(batch.id) === selectedBatchId);
  const sectionTitle =
    base === "todos"
      ? "Todos os leads"
      : base === "pesquisa"
        ? `Pesquisa #${selectedBatchId ?? currentBatch?.id ?? "-"}`
        : "Leads sem site";
  const sectionHelper =
    base === "pesquisa" && currentBatch
      ? `${currentBatch.cidade ?? "Cidade não informada"} / ${currentBatch.segmento ?? "Segmento não informado"}`
      : base === "todos"
        ? "Base geral consolidada"
        : "Primeira abordagem";

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
            <p className="text-sm text-slate-300">Status da conexão</p>
            <p className="mt-2 text-lg font-bold">
              {leads.database_configured ? "Neon DB conectado" : "Aguardando Neon DB"}
            </p>
            <div className="mt-4 flex items-center justify-between gap-4 border-t border-white/10 pt-4">
              <p className="text-sm text-slate-300">{user.email}</p>
              <LogoutButton />
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

      <section className="grid gap-4 lg:grid-cols-5">
        {pipeline.map((step, index) => (
          <div key={step} className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Etapa {index + 1}</p>
            <p className="mt-3 font-bold text-slate-950">{step}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Coleta de leads</p>
              <h2 className="mt-2 text-3xl font-black text-slate-950">Buscar novos leads</h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Execute uma busca por cidade e segmento. A API consulta o Google Places e salva os resultados
                direto no banco para aparecerem na tabela.
              </p>
            </div>
            <RunSearchForm />
          </div>
        </div>

        <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
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

      <section>
        <LeadBaseTabs activeBase={base} activeBatchId={selectedBatchId} batches={batches} />

        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mt-6 text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">{sectionHelper}</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{sectionTitle}</h2>
          </div>
          <p className="text-sm text-slate-500">{leads.total.toLocaleString("pt-BR")} registros</p>
        </div>

        <div className="flex flex-col gap-4">
          <LeadsFilters
            cidade={cidade}
            segmento={segmento}
            classificacao={classificacao}
            semSite={semSite}
            base={base}
            batchId={selectedBatchId}
          />
          <LeadsTable leads={leads.items} />
          <Pagination
            total={leads.total}
            limit={leads.limit}
            offset={leads.offset}
            query={{
              cidade,
              segmento,
              classificacao,
              sem_site: semSite,
              base,
              batch_id: selectedBatchId,
            }}
          />
        </div>
      </section>
    </main>
  );
}
