import { LeadsFilters } from "@/components/leads-filters";
import { LeadsTable } from "@/components/leads-table";
import { Pagination } from "@/components/pagination";
import { RunSearchForm } from "@/components/run-search-form";
import { StatCard } from "@/components/stat-card";
import { getDashboardSummary, getLeads } from "@/lib/api";

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
  const params = (await searchParams) ?? {};
  const limit = Math.min(Math.max(paramNumber(params, "limit", 12), 1), 100);
  const offset = paramNumber(params, "offset", 0);
  const cidade = paramValue(params, "cidade");
  const segmento = paramValue(params, "segmento");
  const classificacao = paramValue(params, "classificacao");
  const semSite = paramValue(params, "sem_site") ?? "SIM";

  const [summary, leads] = await Promise.all([
    getDashboardSummary(),
    getLeads({
      limit,
      offset,
      cidade,
      segmento,
      classificacao,
      sem_site: semSite,
    }),
  ]);

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

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Primeira abordagem</p>
              <h2 className="mt-2 text-2xl font-black text-slate-950">Leads sem site</h2>
            </div>
            <p className="text-sm text-slate-500">{leads.total.toLocaleString("pt-BR")} registros</p>
          </div>

          <div className="flex flex-col gap-4">
            <LeadsFilters cidade={cidade} segmento={segmento} classificacao={classificacao} semSite={semSite} />
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
              }}
            />
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Coleta de leads</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Buscar novos leads</h2>
            <p className="mt-2 text-sm text-slate-500">
              Busca empresas na Google Places API e salva direto no banco.
            </p>
            <div className="mt-5">
              <RunSearchForm />
            </div>
          </div>

          <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Mensagem atual</p>
            <h2 className="mt-2 text-2xl font-black">Promoção Codepath</h2>
            <div className="mt-5 rounded-3xl bg-slate-950 p-5 text-white">
              <p className="font-bold">Site institucional completo</p>
              <p className="mt-3 text-3xl font-black text-yellow-300">R$ 499 à vista</p>
              <p className="mt-3 text-sm leading-6 text-slate-300">
                + R$ 129,90/mês de manutenção, suporte e cuidados contínuos do site enquanto a Codepath
                cuidar dele.
              </p>
            </div>
            <ul className="mt-5 space-y-3 text-sm text-slate-700">
              <li>- Site profissional</li>
              <li>- Layout responsivo</li>
              <li>- Estrutura pensada para o Google</li>
              <li>- Suporte direto da Codepath</li>
            </ul>
            <a
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-200"
              href="https://promocao.codepath.dev.br/"
              target="_blank"
              rel="noreferrer"
            >
              Ver site promocional
            </a>
          </div>
        </aside>
      </section>
    </main>
  );
}
