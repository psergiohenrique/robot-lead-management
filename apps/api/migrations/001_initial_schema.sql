CREATE TABLE IF NOT EXISTS leads (
    id BIGSERIAL PRIMARY KEY,
    place_id TEXT UNIQUE,
    nome TEXT NOT NULL,
    telefone TEXT,
    telefone_limpo TEXT,
    whatsapp_status TEXT,
    endereco TEXT,
    cidade TEXT,
    segmento TEXT,
    regiao TEXT,
    google_maps_url TEXT,
    avaliacao NUMERIC(3, 2),
    quantidade_avaliacoes INTEGER,
    site_cadastrado TEXT,
    sem_site_cadastrado TEXT,
    business_status TEXT,
    score_oportunidade INTEGER,
    classificacao_lead TEXT,
    prioridade TEXT,
    oferta_principal TEXT,
    observacao_comercial TEXT,
    status_contato TEXT DEFAULT 'Novo',
    data_primeiro_contato DATE,
    data_ultimo_contato DATE,
    proximo_followup DATE,
    respondeu BOOLEAN DEFAULT FALSE,
    interesse TEXT,
    diagnostico_enviado BOOLEAN DEFAULT FALSE,
    reuniao_marcada BOOLEAN DEFAULT FALSE,
    proposta_enviada BOOLEAN DEFAULT FALSE,
    fechado BOOLEAN DEFAULT FALSE,
    motivo_perda TEXT,
    observacao_humana TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_cidade ON leads (cidade);
CREATE INDEX IF NOT EXISTS idx_leads_segmento ON leads (segmento);
CREATE INDEX IF NOT EXISTS idx_leads_classificacao ON leads (classificacao_lead);
CREATE INDEX IF NOT EXISTS idx_leads_sem_site ON leads (sem_site_cadastrado);
CREATE INDEX IF NOT EXISTS idx_leads_score ON leads (score_oportunidade DESC);

CREATE TABLE IF NOT EXISTS search_batches (
    id BIGSERIAL PRIMARY KEY,
    nome_lote TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    prioridade TEXT,
    total_planejado INTEGER DEFAULT 0,
    total_processado INTEGER DEFAULT 0,
    total_leads INTEGER DEFAULT 0,
    total_sem_site INTEGER DEFAULT 0,
    erro TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    started_at TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS search_batch_items (
    id BIGSERIAL PRIMARY KEY,
    batch_id BIGINT NOT NULL REFERENCES search_batches(id) ON DELETE CASCADE,
    cidade TEXT NOT NULL,
    segmento TEXT NOT NULL,
    limite INTEGER NOT NULL DEFAULT 100,
    query_base TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    erro TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS message_templates (
    id BIGSERIAL PRIMARY KEY,
    nome TEXT NOT NULL,
    abordagem_tipo TEXT NOT NULL,
    conteudo TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exports (
    id BIGSERIAL PRIMARY KEY,
    tipo TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    filtros_json JSONB,
    arquivo_url TEXT,
    erro TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ
);
