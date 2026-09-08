-- Adiciona colunas para faturamento, comissão e clientes consolidados
ALTER TABLE public."DailyAdsManual"
  ADD COLUMN IF NOT EXISTS revenue NUMERIC(12, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS commission NUMERIC(12, 2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS clients INTEGER DEFAULT NULL;

-- Insere os dados consolidados do histórico de 01/09 a 08/09
INSERT INTO public."DailyAdsManual" (id, date, spend, cpc, impressions, revenue, commission, clients, "createdAt")
VALUES
  (gen_random_uuid()::text, '01/09/2026', 0, 0, 0, 145.00, 145.00, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '02/09/2026', 0, 0, 0, 660.00, 660.00, 4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '03/09/2026', 0, 0, 0, 255.00, 255.00, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '04/09/2026', 0, 0, 0, 200.00, 200.00, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '05/09/2026', 0, 0, 0, 260.00, 260.00, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '06/09/2026', 0, 0, 0, 360.00, 360.00, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '07/09/2026', 0, 0, 0, 430.00, 430.00, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '08/09/2026', 0, 0, 0, 0.00, 0.00, 0, CURRENT_TIMESTAMP)
ON CONFLICT (date) DO UPDATE
SET
  revenue = EXCLUDED.revenue,
  commission = EXCLUDED.commission,
  clients = EXCLUDED.clients;
