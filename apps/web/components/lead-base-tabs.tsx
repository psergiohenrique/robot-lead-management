import type { SearchBatchSummary } from "@/lib/types";

type LeadBaseTabsProps = {
  activeBase: string;
  activeBatchId?: string;
  batches: SearchBatchSummary[];
};

function hrefFor(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) search.set(key, value);
  }

  const query = search.toString();
  return query ? `/?${query}` : "/";
}

function tabClass(active: boolean): string {
  return [
    "rounded-2xl px-4 py-3 text-sm font-black transition",
    active ? "bg-slate-950 text-white shadow-soft" : "bg-white text-slate-700 ring-1 ring-black/5 hover:bg-slate-50",
  ].join(" ");
}

export function LeadBaseTabs({ activeBase, activeBatchId, batches }: LeadBaseTabsProps) {
  return (
    <div className="rounded-[2rem] bg-white p-4 shadow-soft ring-1 ring-black/5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-yellow-700">Navegação da base</p>
          <h3 className="mt-1 text-xl font-black text-slate-950">Escolha quais leads quer ver agora</h3>
          <p className="mt-1 text-sm text-slate-500">
            O status comercial fica salvo no lead, mesmo quando ele aparece em mais de uma visão.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <a className={tabClass(activeBase === "sem_site")} href={hrefFor({ base: "sem_site" })}>
            Sem site
          </a>
          <a className={tabClass(activeBase === "todos")} href={hrefFor({ base: "todos", sem_site: "" })}>
            Todos os leads
          </a>
          <a
            className={tabClass(activeBase === "pesquisa")}
            href={hrefFor({ base: "pesquisa", batch_id: activeBatchId ?? batches[0]?.id?.toString() })}
          >
            Por pesquisa
          </a>
        </div>
      </div>

      {activeBase === "pesquisa" ? (
        <form className="mt-4 grid gap-3 md:grid-cols-[1fr_auto]" action="/">
          <input type="hidden" name="base" value="pesquisa" />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-bold text-slate-700">Pesquisa anterior</span>
            <select
              className="rounded-2xl border border-slate-200 px-3 py-3 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
              name="batch_id"
              defaultValue={activeBatchId ?? batches[0]?.id?.toString() ?? ""}
            >
              {batches.length ? (
                batches.map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    #{batch.id} — {batch.cidade ?? "Cidade não informada"} / {batch.segmento ?? "Segmento não informado"} —{" "}
                    {batch.total_leads ?? 0} leads
                  </option>
                ))
              ) : (
                <option value="">Nenhuma pesquisa encontrada</option>
              )}
            </select>
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-2xl bg-yellow-300 px-5 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-200">
              Abrir pesquisa
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
