-- Add country, country_code, phone_code, phone_number columns to subscribers
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS phone_code TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';
