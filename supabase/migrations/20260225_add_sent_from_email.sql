-- Add sent_from_email column to campaigns table
-- Stores the actual sender email used at broadcast time (vs the editor-saved from_email)
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS sent_from_email TEXT;
