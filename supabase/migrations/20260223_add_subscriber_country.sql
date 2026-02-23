-- Add country, phone, and shipping address columns to subscribers
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS country TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS phone_code TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS phone_number TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS shipping_address1 TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS shipping_address2 TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS shipping_city TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS shipping_zip TEXT DEFAULT '';
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS shipping_province TEXT DEFAULT '';
