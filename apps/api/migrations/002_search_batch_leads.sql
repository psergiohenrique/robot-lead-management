CREATE TABLE IF NOT EXISTS search_batch_leads (
    batch_id BIGINT NOT NULL REFERENCES search_batches(id) ON DELETE CASCADE,
    lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (batch_id, lead_id)
);

CREATE INDEX IF NOT EXISTS idx_search_batch_leads_lead_id ON search_batch_leads (lead_id);
CREATE INDEX IF NOT EXISTS idx_search_batch_leads_batch_id ON search_batch_leads (batch_id);
