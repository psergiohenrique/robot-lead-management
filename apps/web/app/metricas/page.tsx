import { LogoutButton } from "@/components/logout-button";
import { StatCard } from "@/components/stat-card";
import { getActivitySummary } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const metricGroups = [
  {
    title: "Movimento comercial",
    helper: "Tudo que mostra avanço ou tentativa real de contato.",
    items: [
      ["contatos_feitos", "Contatos feitos", "Leads que já saíram de Novo"],
      ["acoes_hoje", "Ações hoje", "Registros feitos hoje"],
      ["acoes_7_dias", "Ações em 7 dias", "Ritmo recente da operação"],
      ["total_acoes", "Ações totais", "Histórico geral registrado"],
    ],
  },
  {
    title: "Tipos de ação",
    helper: "O que está sendo registrado dentro das fichas dos leads.",
    items: [
      ["mudancas_status", "Mudanças de status", "Movimentações no funil"],
      ["observacoes_registradas", "Observações", "Anotações humanas salvas"],
      ["followups_agendados", "Follow-ups agendados", "Próximas ações marcadas"],
      ["contatos_invalidos", "Contatos inválidos", "Número errado ou sem WhatsApp"],
    ],
  },
  {
    title: "Resultado do funil",
    helper: "Indicadores comerciais principais do BDR.",
    items: [
      ["respostas_recebidas", "Respostas", "Leads que responderam"],
      ["reunioes_marcadas", "Reuniões", "Conversas comerciais marcadas"],
      ["propostas_enviadas", "Propostas", "Negociações abertas"],
      ["fechados", "Fechados", "Clientes ganhos"],
    ],
  },
] as const;

type MetricKey = (typeof metricGroups)[number]["items"][number][0];

type MetricasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MetricasPage(_props: MetricasPageProps) {
  const user = await requireUser();
  const summary = await getActivitySummary();
  const followupsPendentes = summary.leads_com_followup_hoje + summary.leads_com_followup_atrasado;

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8">
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-soft">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-300">Codepath BDR</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Métricas e ações</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Acompanhe quantos contatos foram feitos, quantas ações foram registradas e onde a operação está avançando.
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
                href="/hoje"
              >
                Rotina de hoje
              </a>
              <a
                className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
                href="/"
              >
                Dashboard
              </a>
              <a
                className="rounded-2xl bg-white/10 px-4 py-2 text-sm font-black text-white ring-1 ring-white/15 transition hover:bg-white/15"
                href="/kanban"
              >
                Kanban
              </a>
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Contatos feitos" value={summary.contatos_feitos} helper="Leads que já tiveram ação" tone="dark" />
        <StatCard label="Ações hoje" value={summary.acoes_hoje} helper="Registros criados hoje" tone="gold" />
        <StatCard label="Follow-ups pendentes" value={followupsPendentes} helper="Hoje + atrasados" />
        <StatCard label="Contatos inválidos" value={summary.contatos_invalidos} helper="Não é WhatsApp ou número errado" />
      </section>

      {metricGroups.map((group) => (
        <section key={group.title} className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
          <div className="mb-5">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">{group.title}</p>
            <p className="mt-2 text-sm leading-6 text-slate-500">{group.helper}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {group.items.map(([key, label, helper]) => (
              <div key={key} className="rounded-3xl bg-slate-50 p-5 ring-1 ring-black/5">
                <p className="text-sm font-bold text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{summary[key as MetricKey].toLocaleString("pt-BR")}</p>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-400">{helper}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-[2rem] bg-yellow-50 p-6 ring-1 ring-yellow-200">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-800">Como ler este painel</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          “Contatos feitos” mede leads que saíram de Novo. “Ações” mede registros no histórico, como mudança de status,
          observação e follow-up. Então um mesmo lead pode ter várias ações, mas conta uma vez como contato feito.
        </p>
      </section>
    </main>
  );
}
