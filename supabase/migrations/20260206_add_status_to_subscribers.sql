-- Add a status column with a default value of 'active'
ALTER TABLE subscribers 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

-- Optional: Add a check constraint to ensure data integrity
-- Dropping constraint first if it exists to avoid errors on re-run (safe for dev)
ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS check_status;

ALTER TABLE subscribers 
ADD CONSTRAINT check_status CHECK (status IN ('active', 'unsubscribed', 'bounced'));
