import { LogoutButton } from "@/components/logout-button";
import { TodayWorkbench } from "@/components/today-workbench";
import { getCampaigns, getLeads } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type HojePageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function paramValue(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function currentHref(params: Record<string, string | string[] | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    const finalValue = Array.isArray(value) ? value[0] : value;
    if (finalValue && key !== "status_salvo") search.set(key, finalValue);
  }

  const query = search.toString();
  return query ? `/hoje?${query}` : "/hoje";
}

export default async function HojePage({ searchParams }: HojePageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const campaigns = await getCampaigns();
  const campaignId = paramValue(params, "campaign_id") ?? campaigns[0]?.id?.toString();
  const statusSalvo = paramValue(params, "status_salvo");
  const currentCampaign = campaigns.find((campaign) => String(campaign.id) === campaignId);
  const returnTo = currentHref(params);

  const leads = await getLeads({
    limit: 1000,
    offset: 0,
    sem_site: "SIM",
    campaign_id: campaignId,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8">
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-soft">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-300">Codepath BDR</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Hoje</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Sua fila diária de prospecção: follow-ups, novos contatos, oportunidades quentes e propostas abertas.
            </p>
          </div>

          <div className="rounded-3xl bg-white/10 p-5 ring-1 ring-white/15">
            <p className="text-sm text-slate-300">Conta logada</p>
            <div className="mt-3 flex items-center justify-between gap-4">
              <p className="text-sm font-bold text-white">{user.email}</p>
              <LogoutButton />
            </div>
            <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
              <a
                className="rounded-2xl bg-yellow-300 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-yellow-200"
                href={campaignId ? `/?base=sem_site&campaign_id=${campaignId}` : "/"}
              >
                Dashboard
              </a>
              <a
                className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
                href={campaignId ? `/kanban?campaign_id=${campaignId}` : "/kanban"}
              >
                Kanban
              </a>
              <a
                className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
                href="/metricas"
              >
                Métricas
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="rounded-[2rem] bg-white p-4 shadow-soft ring-1 ring-black/5">
        <form className="grid gap-3 md:grid-cols-[1fr_auto]" action="/hoje">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-slate-700">Campanha</span>
            <select
              className="rounded-2xl border border-slate-200 px-3 py-3 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
              name="campaign_id"
              defaultValue={campaignId ?? ""}
            >
              {campaigns.length ? (
                campaigns.map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.nome}
                  </option>
                ))
              ) : (
                <option value="">Campanha padrão</option>
              )}
            </select>
          </label>

          <div className="flex items-end">
            <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
              Atualizar rotina
            </button>
          </div>
        </form>
      </section>

      {statusSalvo === "ok" ? (
        <div className="rounded-3xl bg-emerald-50 px-5 py-4 text-sm font-bold text-emerald-800 ring-1 ring-emerald-200">
          Alteração salva com sucesso. A fila de hoje já foi atualizada.
        </div>
      ) : null}
      {statusSalvo === "erro" ? (
        <div className="rounded-3xl bg-red-50 px-5 py-4 text-sm font-bold text-red-800 ring-1 ring-red-200">
          Não consegui salvar a alteração. Confira se a API está online e tente novamente.
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold text-slate-500">Campanha</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{currentCampaign?.nome ?? "Campanha padrão"}</p>
        </div>
        <div className="rounded-3xl bg-yellow-300 p-5 shadow-soft">
          <p className="text-sm font-bold text-slate-700">Leads sem site carregados</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{leads.total.toLocaleString("pt-BR")}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold text-slate-500">Uso recomendado</p>
          <p className="mt-2 text-lg font-black text-slate-950">Comece pelo topo da fila</p>
        </div>
      </section>

      <TodayWorkbench leads={leads.items} campaign={currentCampaign} returnTo={returnTo} />
    </main>
  );
}
