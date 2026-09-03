import type { CampaignSummary, Lead } from "./types";

function somenteNumeros(value: string | null | undefined): string {
  return (value ?? "").replace(/\D/g, "");
}

export function limparTelefoneBrasil(lead: Lead): string {
  const original = somenteNumeros(lead.telefone_limpo || lead.telefone);

  if (!original) return "";
  if (original.startsWith("55")) return original;
  if (original.length >= 10 && original.length <= 11) return `55${original}`;

  return original;
}

export function telefonePareceWhatsApp(telefone: string): boolean {
  return /^55[1-9][0-9]9?[0-9]{8}$/.test(telefone);
}

function ofertaPrincipal(lead: Lead, campaign?: CampaignSummary | null): string {
  return (
    campaign?.oferta_principal?.trim() ||
    lead.oferta_principal?.trim() ||
    "Site institucional completo por R$ 499 à vista + R$ 129,90/mês de manutenção, suporte e cuidados contínuos"
  );
}

export function criarMensagemWhatsApp(lead: Lead, campaign?: CampaignSummary | null): string {
  const cidade = lead.cidade?.trim() || "sua região";
  const segmento = lead.segmento?.trim().toLocaleLowerCase("pt-BR") || "";
  const oferta = ofertaPrincipal(lead, campaign);

  const justificativa =
    segmento.includes("dent") ||
    segmento.includes("clínica") ||
    segmento.includes("clinica") ||
    segmento.includes("médic") ||
    segmento.includes("medic") ||
    segmento.includes("saúde") ||
    segmento.includes("saude")
      ? "Na área da saúde, isso pode influenciar a confiança do paciente antes do primeiro contato."
      : segmento.includes("arquitet") ||
          segmento.includes("imobili") ||
          segmento.includes("móveis") ||
          segmento.includes("moveis")
        ? "Em serviços de alto valor, um site ajuda a apresentar portfólio, diferenciais e formas de contato com mais clareza."
        : "Isso pode fazer alguns clientes terem menos informações antes de chamar no WhatsApp ou solicitar orçamento.";

  return [
    "Olá, tudo bem?",
    "",
    "Sou da *Codepath*. Estamos com uma *condição promocional por tempo limitado* para criação de *site institucional completo*.",
    "",
    "*Promoção Codepath*",
    oferta,
    "",
    "Inclui:",
    "- Site profissional",
    "- Layout responsivo",
    "- Estrutura pensada para o Google",
    "- Suporte direto da Codepath",
    "- *Vagas limitadas nessa condição promocional*",
    "",
    `Vi que vocês aparecem no Google em ${cidade}, mas não encontrei um *site cadastrado no perfil*.`,
    "",
    justificativa,
    "",
    "Posso te enviar mais detalhes dessa condição e, se fizer sentido, um *diagnóstico rápido* do perfil de vocês?",
    "",
    "Para conhecer melhor a *Codepath*:",
    "Site: https://promocao.codepath.dev.br/",
    "Instagram: @codepath.softwares",
  ].join("\n");
}

export function criarLinkWhatsApp(lead: Lead, campaign?: CampaignSummary | null): string {
  const telefone = limparTelefoneBrasil(lead);

  if (!telefone || !telefonePareceWhatsApp(telefone)) return "";

  return `https://wa.me/${telefone}?text=${encodeURIComponent(criarMensagemWhatsApp(lead, campaign))}`;
}
