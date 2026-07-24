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
  cidade?: string | null;
  segmento?: string | null;
  regiao?: string | null;
  google_maps_url?: string | null;
  avaliacao?: number | null;
  quantidade_avaliacoes?: number | null;
  sem_site_cadastrado?: string | null;
  score_oportunidade?: number | null;
  classificacao_lead?: string | null;
  prioridade?: string | null;
  status_contato?: string | null;
  proximo_followup?: string | null;
};

export type LeadListResponse = {
  items: Lead[];
  total: number;
  limit: number;
  offset: number;
  database_configured: boolean;
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
