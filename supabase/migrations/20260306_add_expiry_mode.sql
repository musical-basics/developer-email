-- Add expiry mode support to discount presets
-- expiry_mode: 'duration' (rolling N days) or 'fixed_date' (specific calendar date)
-- expires_on: only used when expiry_mode = 'fixed_date'

ALTER TABLE discount_presets
  ADD COLUMN IF NOT EXISTS expiry_mode text NOT NULL DEFAULT 'duration',
  ADD COLUMN IF NOT EXISTS expires_on date;
