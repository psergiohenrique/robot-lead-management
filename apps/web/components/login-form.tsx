"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { requestMagicLink, type RequestLinkState } from "@/lib/actions";

const initialState: RequestLinkState = { status: "idle", message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center rounded-2xl bg-yellow-300 px-4 py-3 text-sm font-black text-slate-950 transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enviando..." : "Enviar link de acesso"}
    </button>
  );
}

export function LoginForm() {
  const [state, formAction] = useActionState(requestMagicLink, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <label htmlFor="email" className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          placeholder="voce@empresa.com"
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
