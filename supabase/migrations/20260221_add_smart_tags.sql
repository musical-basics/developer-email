-- Add smart_tags column for behavioral AI enrichment
-- Separate from manual tags array to avoid interference
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS smart_tags jsonb DEFAULT '{}'::jsonb;

-- Structure: { "engagement": "high", "intents": ["customize", "shipping"], "region": "europe" }

COMMENT ON COLUMN subscribers.smart_tags IS 'Auto-generated behavioral tags from the nightly enrichment engine. Structure: { engagement, intents[], region }';
