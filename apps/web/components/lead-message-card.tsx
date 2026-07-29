"use client";

import { useState } from "react";

type LeadMessageCardProps = {
  message: string;
  whatsappLink: string;
};

export function LeadMessageCard({ message, whatsappLink }: LeadMessageCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyMessage() {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="rounded-[2rem] bg-white p-6 shadow-soft ring-1 ring-black/5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-yellow-700">Mensagem pronta</p>
          <p className="mt-2 text-sm text-slate-600">
            Revise antes de enviar. O sistema só abre o WhatsApp; o envio continua manual.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800"
            type="button"
            onClick={copyMessage}
          >
            {copied ? "Mensagem copiada" : "Copiar mensagem"}
          </button>
          {whatsappLink ? (
            <a
              className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-black text-white transition hover:bg-green-700"
              href={whatsappLink}
              target="_blank"
              rel="noreferrer"
            >
              Abrir WhatsApp
            </a>
          ) : null}
        </div>
      </div>

      <textarea
        className="mt-5 min-h-80 w-full rounded-3xl border border-slate-200 bg-slate-50 p-5 text-sm leading-6 text-slate-800 outline-none"
        readOnly
        value={message}
      />
    </div>
  );
}
