"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { importLeadsFile, type ImportLeadsState } from "@/lib/actions";
import type { CampaignSummary } from "@/lib/types";

const initialState: ImportLeadsState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Importando..." : "Importar planilha"}
    </button>
  );
}

type ImportLeadsFormProps = {
  campaigns: CampaignSummary[];
  activeCampaignId?: string;
};

export function ImportLeadsForm({ campaigns, activeCampaignId }: ImportLeadsFormProps) {
  const [state, formAction] = useActionState(importLeadsFile, initialState);
  const defaultCampaignId = activeCampaignId ?? campaigns[0]?.id?.toString() ?? "";

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="import_campaign_id" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Campanha
        </label>
        <select
          id="import_campaign_id"
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
        <label htmlFor="file" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Planilha .xlsx
        </label>
        <input
          id="file"
          name="file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          required
          className="mt-1 w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-yellow-300 file:px-3 file:py-2 file:text-xs file:font-black file:text-slate-950"
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
