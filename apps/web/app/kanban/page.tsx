import { KanbanBoard } from "@/components/kanban-board";
import { LogoutButton } from "@/components/logout-button";
import { getCampaigns, getLeads } from "@/lib/api";
import { requireUser } from "@/lib/auth";

type KanbanPageProps = {
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
  return query ? `/kanban?${query}` : "/kanban";
}

function dashboardHref(campaignId?: string): string {
  return campaignId ? `/?base=sem_site&campaign_id=${campaignId}` : "/";
}

export default async function KanbanPage({ searchParams }: KanbanPageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const campaigns = await getCampaigns();
  const campaignId = paramValue(params, "campaign_id") ?? campaigns[0]?.id?.toString();
  const semSite = paramValue(params, "sem_site") ?? "SIM";
  const statusSalvo = paramValue(params, "status_salvo");
  const returnTo = currentHref(params);
  const currentCampaign = campaigns.find((campaign) => String(campaign.id) === campaignId);

  const leads = await getLeads({
    limit: 200,
    offset: 0,
    sem_site: semSite,
    campaign_id: campaignId,
  });

  return (
    <main className="mx-auto flex min-h-screen max-w-[1800px] flex-col gap-8 px-5 py-8 sm:px-8">
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-soft">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-300">Funil comercial</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Kanban de leads</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Acompanhe os leads por etapa, abra o WhatsApp e mova oportunidades conforme a conversa evolui.
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
                href={dashboardHref(campaignId)}
              >
                Voltar para dashboard
              </a>
              <a
                className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
                href="/kanban"
              >
                Limpar filtros
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold text-slate-500">Campanha</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{currentCampaign?.nome ?? "Campanha padrão"}</p>
        </div>
        <div className="rounded-3xl bg-yellow-300 p-5 shadow-soft">
          <p className="text-sm font-bold text-slate-700">Leads no Kanban</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{leads.total.toLocaleString("pt-BR")}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold text-slate-500">Filtro de site</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{semSite === "SIM" ? "Sem site" : "Todos"}</p>
        </div>
        <div className="rounded-3xl bg-white p-5 shadow-soft ring-1 ring-black/5">
          <p className="text-sm font-bold text-slate-500">Carregados agora</p>
          <p className="mt-2 text-2xl font-black text-slate-950">{leads.items.length}</p>
        </div>
      </section>

      <section className="rounded-[2rem] bg-white p-4 shadow-soft ring-1 ring-black/5">
        <form className="grid gap-3 md:grid-cols-[1fr_220px_auto]" action="/kanban">
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

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-slate-700">Site</span>
            <select
              className="rounded-2xl border border-slate-200 px-3 py-3 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
              name="sem_site"
              defaultValue={semSite}
            >
              <option value="SIM">Sem site</option>
              <option value="">Todos</option>
            </select>
          </label>

          <div className="flex items-end">
            <button className="w-full rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white transition hover:bg-slate-800">
              Atualizar Kanban
            </button>
          </div>
        </form>
      </section>

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

      <KanbanBoard leads={leads.items} returnTo={returnTo} />
    </main>
  );
}
