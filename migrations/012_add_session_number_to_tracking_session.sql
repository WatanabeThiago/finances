-- Migration 012: Adicionar session_number sequencial único na TrackingSession
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'TrackingSession' AND column_name = 'session_number'
  ) THEN
    ALTER TABLE public."TrackingSession" 
    ADD COLUMN session_number BIGSERIAL;

    CREATE UNIQUE INDEX IF NOT EXISTS idx_tracking_session_number 
    ON public."TrackingSession"(session_number);
  END IF;
END $$;
