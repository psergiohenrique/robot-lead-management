import { LogoutButton } from "@/components/logout-button";
import { StatCard } from "@/components/stat-card";
import { getActivitySummary } from "@/lib/api";
import { requireUser } from "@/lib/auth";

const periodOptions = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "Últimos 7 dias" },
  { key: "30d", label: "Últimos 30 dias" },
  { key: "tudo", label: "Tudo" },
] as const;

const metricGroups = [
  {
    title: "Atividade",
    helper: "Mostra se a operação está produzindo volume suficiente.",
    items: [
      ["primeiros_contatos_periodo", "Primeiros contatos", "Leads abordados pela primeira vez no período"],
      ["leads_contatados_unicos_periodo", "Leads únicos trabalhados", "Empresas com alguma ação no período"],
      ["acoes_periodo", "Ações registradas", "Status, observações e follow-ups no período"],
      ["followups_periodo", "Follow-ups registrados", "Retomadas ou próximos passos registrados"],
    ],
  },
  {
    title: "Resposta",
    helper: "Ajuda a entender se a mensagem e a base estão gerando retorno.",
    items: [
      ["respostas_periodo", "Respostas no período", "Leads que avançaram para Respondeu"],
      ["taxa_resposta_primeiro_contato", "Taxa de resposta", "Respostas ÷ primeiros contatos", "%"],
      ["contatos_sem_resposta", "Sem resposta agora", "Leads parados em Primeiro contato"],
      ["contatos_invalidos", "Contatos inválidos", "Número errado, sem WhatsApp ou não é do local"],
    ],
  },
  {
    title: "Funil",
    helper: "Mostra se os retornos estão virando oportunidade comercial.",
    items: [
      ["qualificados_periodo", "Qualificados", "Leads que avançaram além do contato inicial"],
      ["reunioes_periodo", "Reuniões geradas", "Reuniões marcadas no período"],
      ["propostas_periodo", "Propostas", "Propostas criadas ou enviadas no período"],
      ["fechados_periodo", "Fechados", "Clientes ganhos no período"],
    ],
  },
  {
    title: "Eficiência",
    helper: "Indica se o esforço comercial está bem direcionado.",
    items: [
      ["conversao_contato_reuniao", "Contato → reunião", "Reuniões ÷ leads únicos trabalhados", "%"],
      ["conversao_resposta_reuniao", "Resposta → reunião", "Reuniões ÷ respostas", "%"],
      ["eficiencia_acoes_resposta", "Ações → resposta", "Respostas ÷ ações registradas", "%"],
      ["tempo_medio_primeira_resposta_dias", "Tempo até resposta", "Média em dias após o primeiro contato", " dias"],
    ],
  },
] as const;

type MetricKey = (typeof metricGroups)[number]["items"][number][0];
type PeriodKey = (typeof periodOptions)[number]["key"];

type MetricasPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function paramValue(params: Record<string, string | string[] | undefined>, key: string): string | undefined {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function formatMetric(value: number, suffix?: string): string {
  if (suffix === "%") return `${value.toLocaleString("pt-BR")}%`;
  if (suffix) return `${value.toLocaleString("pt-BR")}${suffix}`;
  return value.toLocaleString("pt-BR");
}

export default async function MetricasPage({ searchParams }: MetricasPageProps) {
  const user = await requireUser();
  const params = (await searchParams) ?? {};
  const requestedPeriod = paramValue(params, "periodo");
  const periodo: PeriodKey = periodOptions.some((option) => option.key === requestedPeriod)
    ? (requestedPeriod as PeriodKey)
    : "7d";
  const summary = await getActivitySummary(periodo);
  const followupsPendentes = summary.leads_com_followup_hoje + summary.leads_com_followup_atrasado;
  const activePeriodLabel = periodOptions.find((option) => option.key === periodo)?.label ?? "Últimos 7 dias";

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-5 py-8 sm:px-8">
      <header className="overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-soft">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.3em] text-yellow-300">Codepath BDR</p>
            <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Métricas e ações</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">
              Acompanhe volume de prospecção, resposta, avanço de funil e eficiência da operação BDR.
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

      <section className="rounded-[2rem] bg-white p-4 shadow-soft ring-1 ring-black/5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Período analisado</p>
            <p className="mt-1 text-sm text-slate-500">Use para comparar ritmo de hoje, semana, mês ou histórico completo.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {periodOptions.map((option) => (
              <a
                key={option.key}
                className={`rounded-2xl px-4 py-2 text-sm font-black transition ${
                  option.key === periodo
                    ? "bg-slate-950 text-white"
                    : "bg-slate-50 text-slate-600 ring-1 ring-black/5 hover:bg-yellow-100"
                }`}
                href={`/metricas?periodo=${option.key}`}
              >
                {option.label}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Primeiros contatos"
          value={summary.primeiros_contatos_periodo}
          helper={activePeriodLabel}
          tone="dark"
        />
        <StatCard
          label="Taxa de resposta"
          value={`${summary.taxa_resposta_primeiro_contato.toLocaleString("pt-BR")}%`}
          helper="Respostas ÷ primeiros contatos"
          tone="gold"
        />
        <StatCard label="Follow-ups pendentes" value={followupsPendentes} helper="Hoje + atrasados" />
        <StatCard label="Reuniões geradas" value={summary.reunioes_periodo} helper={activePeriodLabel} />
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
                <p className="mt-3 text-3xl font-black text-slate-950">
                  {formatMetric(summary[key as MetricKey], group.items.find((item) => item[0] === key)?.[3])}
                </p>
                <p className="mt-2 text-xs font-bold leading-5 text-slate-400">{helper}</p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-[2rem] bg-yellow-50 p-6 ring-1 ring-yellow-200">
        <p className="text-sm font-black uppercase tracking-[0.2em] text-yellow-800">Como ler este painel</p>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
          No início da operação, olhe primeiro para volume de primeiros contatos, taxa de resposta e reuniões geradas.
          Se há muitos contatos e pouca resposta, o problema pode estar na mensagem, canal ou qualidade da base. Se há
          respostas mas poucas reuniões, o gargalo está na condução da conversa.
        </p>
      </section>
    </main>
  );
}
