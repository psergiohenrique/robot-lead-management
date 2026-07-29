export type User = {
  id: number;
  email: string;
};

export type DashboardSummary = {
  total_leads: number;
  leads_sem_site: number;
  leads_quentes: number;
  provavel_whatsapp: number;
  contatos_feitos: number;
  respostas_recebidas: number;
  reunioes_marcadas: number;
  propostas_enviadas: number;
  fechados: number;
};

export type Lead = {
  id?: number | null;
  nome: string;
  telefone?: string | null;
  telefone_limpo?: string | null;
  whatsapp_status?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  segmento?: string | null;
  regiao?: string | null;
  google_maps_url?: string | null;
  avaliacao?: number | null;
  quantidade_avaliacoes?: number | null;
  site_cadastrado?: string | null;
  sem_site_cadastrado?: string | null;
  score_oportunidade?: number | null;
  classificacao_lead?: string | null;
  prioridade?: string | null;
  status_contato?: string | null;
  proximo_followup?: string | null;
  oferta_principal?: string | null;
  observacao_comercial?: string | null;
  motivo_perda?: string | null;
  observacao_humana?: string | null;
  updated_at?: string | null;
};

export type LeadListResponse = {
  items: Lead[];
  total: number;
  limit: number;
  offset: number;
  database_configured: boolean;
};

export type CampaignSummary = {
  id: number;
  nome: string;
  objetivo?: string | null;
  oferta_principal?: string | null;
  criterio_principal?: string | null;
  canal?: string | null;
  status?: string | null;
  total_lotes: number;
  total_leads: number;
  total_sem_site: number;
  created_at: string;
  updated_at?: string | null;
};

export type SearchBatchResult = {
  id: number;
  status: string;
  total_encontrado: number;
  total_sem_site: number;
  novos_leads: number;
  leads_atualizados: number;
  message: string;
};

export type SearchBatchSummary = {
  id: number;
  campaign_id?: number | null;
  campaign_nome?: string | null;
  nome_lote?: string | null;
  status: string;
  prioridade?: string | null;
  cidade?: string | null;
  segmento?: string | null;
  total_leads?: number | null;
  total_sem_site?: number | null;
  erro?: string | null;
  created_at: string;
  finished_at?: string | null;
};
