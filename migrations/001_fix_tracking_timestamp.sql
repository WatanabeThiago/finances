-- Migration: Fix Tracking table to auto-generate createdAt with timezone
-- Execute this SQL against your Neon database

-- Alter the createdAt column to have CURRENT_TIMESTAMP default if it doesn't already
ALTER TABLE public."Tracking"
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Verify the column has timezone info (it should be 'timestamp with time zone')
-- If it's 'timestamp without time zone', you may need to:
-- ALTER TABLE public."Tracking"
-- ALTER COLUMN "createdAt" TYPE timestamp with time zone USING "createdAt" AT TIME ZONE 'UTC';
