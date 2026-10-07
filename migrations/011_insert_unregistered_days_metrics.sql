-- Migration 011: Inserir métricas consolidadas dos dias não registrados (23/09 a 06/10)
-- Tabela: DailyAdsManual (date no formato DD/MM/YYYY)

INSERT INTO public."DailyAdsManual" (id, date, spend, cpc, impressions, revenue, commission, clients, "createdAt")
VALUES
  (gen_random_uuid()::text, '23/09/2026', 0, 0, 0, 300.00, 300.00, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '25/09/2026', 0, 0, 0, 420.00, 420.00, 4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '26/09/2026', 0, 0, 0, 100.00, 100.00, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '27/09/2026', 0, 0, 0, 700.00, 700.00, 5, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '28/09/2026', 0, 0, 0, 621.00, 621.00, 4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '29/09/2026', 0, 0, 0, 575.00, 575.00, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '30/09/2026', 0, 0, 0, 525.00, 525.00, 2, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '01/10/2026', 0, 0, 0, 150.00, 150.00, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '02/10/2026', 0, 0, 0, 465.00, 465.00, 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '03/10/2026', 0, 0, 0, 760.00, 760.00, 5, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '04/10/2026', 0, 0, 0, 580.00, 580.00, 4, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '05/10/2026', 0, 0, 0, 475.00, 475.00, 1, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, '06/10/2026', 0, 0, 0, 615.00, 615.00, 5, CURRENT_TIMESTAMP)
ON CONFLICT (date) DO UPDATE
SET
  revenue = EXCLUDED.revenue,
  commission = EXCLUDED.commission,
  clients = EXCLUDED.clients;
