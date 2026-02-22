-- Add is_ready flag to campaigns for master template readiness
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS is_ready boolean DEFAULT false;
