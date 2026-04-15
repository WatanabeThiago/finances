/**
 * Esquema SQL para integração WhatsApp
 * Use este arquivo para criar tabelas no seu banco de dados PostgreSQL
 */

-- Tabela para armazenar sessões de WhatsApp
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id SERIAL PRIMARY KEY,
  client_id VARCHAR(255) UNIQUE NOT NULL,
  phone_number VARCHAR(20),
  status VARCHAR(50) DEFAULT 'inactive', -- 'active', 'inactive', 'error'
  last_connected TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar mensagens recebidas
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES whatsapp_sessions(id),
  message_id VARCHAR(255) UNIQUE NOT NULL,
  from_number VARCHAR(20) NOT NULL,
  to_number VARCHAR(20),
  body TEXT,
  message_type VARCHAR(50) DEFAULT 'text', -- 'text', 'image', 'document', 'audio', 'video', 'contact'
  is_from_me BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP,
  received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela para armazenar QR codes gerados
CREATE TABLE IF NOT EXISTS whatsapp_qr_codes (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES whatsapp_sessions(id),
  qr_code TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'scanned', 'expired'
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  scanned_at TIMESTAMP
);

-- Tabela para armazenar eventos de conexão
CREATE TABLE IF NOT EXISTS whatsapp_events (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES whatsapp_sessions(id),
  event_type VARCHAR(50) NOT NULL, -- 'qr', 'authenticated', 'ready', 'disconnected', 'error'
  event_data JSONB,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_from ON whatsapp_messages(from_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_timestamp ON whatsapp_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_whatsapp_events_session ON whatsapp_events(session_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_events_type ON whatsapp_events(event_type);

-- Views úteis

-- View de status atual de todas as sessões
CREATE OR REPLACE VIEW whatsapp_sessions_status AS
SELECT
  s.id,
  s.client_id,
  s.phone_number,
  s.status,
  s.last_connected,
  COUNT(m.id) as total_messages,
  MAX(m.timestamp) as last_message_at
FROM whatsapp_sessions s
LEFT JOIN whatsapp_messages m ON s.id = m.session_id
GROUP BY s.id, s.client_id, s.phone_number, s.status, s.last_connected;

-- View de mensagens não lidas
CREATE OR REPLACE VIEW whatsapp_unread_messages AS
SELECT
  m.id,
  m.session_id,
  m.from_number,
  m.body,
  m.timestamp,
  m.received_at
FROM whatsapp_messages m
WHERE m.is_from_me = FALSE
ORDER BY m.timestamp DESC;
