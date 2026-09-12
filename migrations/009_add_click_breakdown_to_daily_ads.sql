-- Adiciona colunas para tipos de cliques segmentados (site, chamadas diretas e whatsapp/mensagens)
ALTER TABLE public."DailyAdsManual"
  ADD COLUMN IF NOT EXISTS url_clicks INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS call_clicks INTEGER DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS msg_clicks INTEGER DEFAULT NULL;
