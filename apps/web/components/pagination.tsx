type PaginationProps = {
  total: number;
  limit: number;
  offset: number;
  query: Record<string, string | undefined>;
};

function pageHref(query: Record<string, string | undefined>, limit: number, offset: number): string {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (value) params.set(key, value);
  }

  params.set("limit", String(limit));
  params.set("offset", String(Math.max(0, offset)));

  return `/?${params.toString()}`;
}

export function Pagination({ total, limit, offset, query }: PaginationProps) {
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const previousOffset = Math.max(0, offset - limit);
  const nextOffset = offset + limit;
  const hasPrevious = offset > 0;
  const hasNext = nextOffset < total;

  return (
    <div className="flex flex-col gap-3 rounded-3xl bg-white p-4 text-sm shadow-soft ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-medium text-slate-600">
        Página <span className="font-black text-slate-950">{currentPage}</span> de{" "}
        <span className="font-black text-slate-950">{totalPages}</span> · {total.toLocaleString("pt-BR")} leads
      </p>

      <div className="flex gap-2">
        <a
          aria-disabled={!hasPrevious}
          className={`rounded-2xl px-4 py-2 font-bold transition ${
            hasPrevious
              ? "bg-slate-950 text-white hover:bg-slate-800"
              : "pointer-events-none bg-slate-100 text-slate-400"
          }`}
          href={pageHref(query, limit, previousOffset)}
        >
          Anterior
        </a>
        <a
          aria-disabled={!hasNext}
          className={`rounded-2xl px-4 py-2 font-bold transition ${
            hasNext
              ? "bg-yellow-300 text-slate-950 hover:bg-yellow-200"
              : "pointer-events-none bg-slate-100 text-slate-400"
          }`}
          href={pageHref(query, limit, nextOffset)}
        >
          Próxima
        </a>
      </div>
    </div>
  );
}
