"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { runSearchBatch, type RunSearchState } from "@/lib/actions";
import type { CampaignSummary } from "@/lib/types";

const initialState: RunSearchState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Buscando leads..." : "Buscar novos leads"}
    </button>
  );
}

type RunSearchFormProps = {
  campaigns: CampaignSummary[];
  activeCampaignId?: string;
};

export function RunSearchForm({ campaigns, activeCampaignId }: RunSearchFormProps) {
  const [state, formAction] = useActionState(runSearchBatch, initialState);
  const defaultCampaignId = activeCampaignId ?? campaigns[0]?.id?.toString() ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="campaign_id" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Campanha
        </label>
        <select
          id="campaign_id"
          name="campaign_id"
          defaultValue={defaultCampaignId}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-950 focus:border-slate-950 focus:outline-none"
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
      </div>

      <div>
        <label htmlFor="cidade" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Cidade
        </label>
        <input
          id="cidade"
          name="cidade"
          required
          placeholder="Ex.: São José do Rio Preto SP"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-950 focus:border-slate-950 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="segmento" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Segmento
        </label>
        <input
          id="segmento"
          name="segmento"
          required
          placeholder="Ex.: dentista"
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-950 focus:border-slate-950 focus:outline-none"
        />
      </div>

      <div>
        <label htmlFor="limite" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Limite de resultados
        </label>
        <input
          id="limite"
          name="limite"
          type="number"
          min={1}
          max={100}
          defaultValue={20}
          className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-950 focus:border-slate-950 focus:outline-none"
        />
      </div>

      <SubmitButton />

      {state.status !== "idle" && (
        <p
          className={`text-sm font-bold ${
            state.status === "success" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {state.message}
        </p>
      )}
    </form>
  );
}
