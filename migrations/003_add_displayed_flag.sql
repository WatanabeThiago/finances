-- Migration: Add displayed flag to contact_requests
ALTER TABLE contact_requests 
ADD COLUMN IF NOT EXISTS displayed BOOLEAN DEFAULT FALSE;

-- Index para buscar notificações não exibidas
CREATE INDEX IF NOT EXISTS idx_contact_requests_displayed 
ON contact_requests(displayed);
