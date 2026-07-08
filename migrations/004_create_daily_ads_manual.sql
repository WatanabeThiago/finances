CREATE TABLE IF NOT EXISTS public."DailyAdsManual" (
  id TEXT PRIMARY KEY,
  date TEXT NOT NULL UNIQUE CHECK (date ~ '^\d{2}/\d{2}/\d{4}$'),
  spend NUMERIC(12, 2) NOT NULL CHECK (spend >= 0),
  cpc NUMERIC(12, 2) NOT NULL CHECK (cpc >= 0),
  impressions INTEGER NOT NULL CHECK (impressions >= 0),
  "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
