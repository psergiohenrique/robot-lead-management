"use client";

import { useActionState } from "react";

import { createCampaign, updateCampaign, type CreateCampaignState, type UpdateCampaignState } from "@/lib/actions";
import type { CampaignSummary } from "@/lib/types";

type CampaignsPanelProps = {
  campaigns: CampaignSummary[];
  activeCampaignId?: string;
};

const initialState: CreateCampaignState = { status: "idle", message: "" };
const updateInitialState: UpdateCampaignState = { status: "idle", message: "" };

function campaignHref(campaignId: number): string {
  return `/?base=sem_site&campaign_id=${campaignId}`;
}

export function CampaignsPanel({ campaigns, activeCampaignId }: CampaignsPanelProps) {
  const [createState, createFormAction] = useActionState(createCampaign, initialState);
  const [updateState, updateFormAction] = useActionState(updateCampaign, updateInitialState);
  const activeCampaign = campaigns.find((campaign) => String(campaign.id) === activeCampaignId) ?? campaigns[0];

  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Campanhas</p>
            <h2 className="mt-2 text-3xl font-black text-slate-950">Frentes comerciais</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              Cada busca deve pertencer a uma campanha. Assim conseguimos medir qual oferta, público e
              abordagem estão funcionando melhor.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {campaigns.map((campaign) => {
            const active = String(campaign.id) === activeCampaignId;
            return (
              <a
                key={campaign.id}
                href={campaignHref(campaign.id)}
                className={`rounded-3xl p-5 ring-1 transition ${
                  active
                    ? "bg-slate-950 text-white ring-slate-950"
                    : "bg-slate-50 text-slate-950 ring-black/5 hover:bg-yellow-50"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-black">{campaign.nome}</p>
                    <p className={`mt-2 text-sm leading-6 ${active ? "text-slate-300" : "text-slate-500"}`}>
                      {campaign.criterio_principal ?? "Critério ainda não informado"}
                    </p>
                  </div>
                  <span className="rounded-full bg-yellow-300 px-3 py-1 text-xs font-black text-slate-950">
                    {campaign.status ?? "Ativa"}
                  </span>
                </div>
                <div className={`mt-4 grid grid-cols-3 gap-2 text-sm ${active ? "text-slate-200" : "text-slate-600"}`}>
                  <span>
                    <strong className={active ? "text-white" : "text-slate-950"}>{campaign.total_lotes}</strong> buscas
                  </span>
                  <span>
                    <strong className={active ? "text-white" : "text-slate-950"}>{campaign.total_leads}</strong> leads
                  </span>
                  <span>
                    <strong className={active ? "text-white" : "text-slate-950"}>{campaign.total_sem_site}</strong> sem site
                  </span>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
        {activeCampaign ? (
          <>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Editar campanha ativa</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">{activeCampaign.nome}</h2>
            <form action={updateFormAction} className="mt-5 space-y-3">
              <input type="hidden" name="campaign_id" value={activeCampaign.id} />
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-bold text-slate-700">Nome</span>
                <input
                  name="nome"
                  required
                  defaultValue={activeCampaign.nome}
                  className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-bold text-slate-700">Objetivo</span>
                <input
                  name="objetivo"
                  defaultValue={activeCampaign.objetivo ?? ""}
                  placeholder="Ex.: vender site institucional"
                  className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-bold text-slate-700">Oferta principal</span>
                <input
                  name="oferta_principal"
                  defaultValue={activeCampaign.oferta_principal ?? ""}
                  placeholder="Ex.: Site R$ 499 + manutenção mensal"
                  className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-bold text-slate-700">Critério principal</span>
                <input
                  name="criterio_principal"
                  defaultValue={activeCampaign.criterio_principal ?? ""}
                  placeholder="Ex.: empresas sem site cadastrado no Google"
                  className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-bold text-slate-700">Canal</span>
                  <input
                    name="canal"
                    defaultValue={activeCampaign.canal ?? "WhatsApp manual"}
                    className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-bold text-slate-700">Status</span>
                  <select
                    name="status"
                    defaultValue={activeCampaign.status ?? "Ativa"}
                    className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Pausada">Pausada</option>
                    <option value="Encerrada">Encerrada</option>
                  </select>
                </label>
              </div>
              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                Salvar campanha
              </button>
              {updateState.status !== "idle" ? (
                <p className={`text-sm font-bold ${updateState.status === "success" ? "text-emerald-600" : "text-red-600"}`}>
                  {updateState.message}
                </p>
              ) : null}
            </form>
            <details className="mt-5 rounded-3xl bg-slate-50 p-4 ring-1 ring-black/5">
              <summary className="cursor-pointer text-sm font-black text-slate-950">Criar nova campanha</summary>
              <form action={createFormAction} className="mt-4 space-y-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-bold text-slate-700">Nome</span>
                  <input
                    name="nome"
                    required
                    placeholder="Ex.: Sites para clínicas sem site"
                    className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-bold text-slate-700">Objetivo</span>
                  <input
                    name="objetivo"
                    placeholder="Ex.: vender site institucional"
                    className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-bold text-slate-700">Oferta principal</span>
                  <input
                    name="oferta_principal"
                    placeholder="Ex.: Site R$ 499 + manutenção mensal"
                    className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-bold text-slate-700">Critério principal</span>
                  <input
                    name="criterio_principal"
                    placeholder="Ex.: empresas sem site cadastrado no Google"
                    className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                  />
                </label>
                <button className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-black text-slate-950 ring-1 ring-black/10 transition hover:bg-yellow-50">
                  Criar campanha
                </button>
                {createState.status !== "idle" ? (
                  <p className={`text-sm font-bold ${createState.status === "success" ? "text-emerald-600" : "text-red-600"}`}>
                    {createState.message}
                  </p>
                ) : null}
              </form>
            </details>
          </>
        ) : (
          <>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Nova campanha</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Criar frente de prospecção</h2>
            <form action={createFormAction} className="mt-5 space-y-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-bold text-slate-700">Nome</span>
                <input
                  name="nome"
                  required
                  placeholder="Ex.: Sites para clínicas sem site"
                  className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-bold text-slate-700">Objetivo</span>
                <input
                  name="objetivo"
                  placeholder="Ex.: vender site institucional"
                  className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-bold text-slate-700">Oferta principal</span>
                <input
                  name="oferta_principal"
                  placeholder="Ex.: Site R$ 499 + manutenção mensal"
                  className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-bold text-slate-700">Critério principal</span>
                <input
                  name="criterio_principal"
                  placeholder="Ex.: empresas sem site cadastrado no Google"
                  className="rounded-2xl border border-slate-200 px-3 py-2 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-100"
                />
              </label>
              <button className="w-full rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800">
                Criar campanha
              </button>
              {createState.status !== "idle" ? (
                <p className={`text-sm font-bold ${createState.status === "success" ? "text-emerald-600" : "text-red-600"}`}>
                  {createState.message}
                </p>
              ) : null}
            </form>
          </>
        )}
      </div>
    </section>
  );
}
