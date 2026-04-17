-- Migration: Create ContactRequest table for contact form submissions
CREATE TABLE IF NOT EXISTS contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP,
  notes TEXT
);

-- Index para buscar requisições não respondidas
CREATE INDEX IF NOT EXISTS idx_contact_requests_responded ON contact_requests(responded_at);

-- Index para ordenar por data de criação
CREATE INDEX IF NOT EXISTS idx_contact_requests_created ON contact_requests(created_at DESC);
