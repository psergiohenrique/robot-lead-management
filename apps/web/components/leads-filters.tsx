type LeadsFiltersProps = {
  cidade?: string;
  segmento?: string;
  classificacao?: string;
  semSite?: string;
};

export function LeadsFilters({ cidade, segmento, classificacao, semSite = "SIM" }: LeadsFiltersProps) {
  return (
    <form className="grid gap-3 rounded-3xl bg-white p-4 shadow-soft ring-1 ring-black/5 md:grid-cols-5" action="/">
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-bold text-slate-700">Cidade</span>
        <input
          className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
          name="cidade"
          placeholder="Ex.: Campinas"
          defaultValue={cidade}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-bold text-slate-700">Segmento</span>
        <input
          className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
          name="segmento"
          placeholder="Ex.: dentista"
          defaultValue={segmento}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-bold text-slate-700">Classificação</span>
        <select
          className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
          name="classificacao"
          defaultValue={classificacao ?? ""}
        >
          <option value="">Todas</option>
          <option value="Quente">Quente</option>
          <option value="Morno">Morno</option>
          <option value="Frio">Frio</option>
        </select>
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-bold text-slate-700">Site</span>
        <select
          className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
          name="sem_site"
          defaultValue={semSite}
        >
          <option value="SIM">Sem site</option>
          <option value="">Todos</option>
          <option value="NÃO">Com site</option>
        </select>
      </label>

      <div className="flex items-end gap-2">
        <button className="w-full rounded-2xl bg-slate-950 px-4 py-2.5 text-sm font-black text-white transition hover:bg-slate-800">
          Filtrar
        </button>
        <a
          className="rounded-2xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-100"
          href="/"
        >
          Limpar
        </a>
      </div>
    </form>
  );
}
