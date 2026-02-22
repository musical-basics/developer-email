-- Tag definitions table for the Tags Manager
-- Stores tag metadata (display name, color) separately from subscriber assignments

CREATE TABLE IF NOT EXISTS tag_definitions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL UNIQUE,
    color text NOT NULL DEFAULT '#6b7280',  -- hex color
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Index for fast lookups by name
CREATE INDEX IF NOT EXISTS idx_tag_definitions_name ON tag_definitions(name);

-- RLS
ALTER TABLE tag_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read tag_definitions"
    ON tag_definitions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow authenticated insert tag_definitions"
    ON tag_definitions FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated update tag_definitions"
    ON tag_definitions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated delete tag_definitions"
    ON tag_definitions FOR DELETE TO authenticated USING (true);

-- Seed existing tags from subscribers into definitions with default colors
INSERT INTO tag_definitions (name, color)
SELECT DISTINCT unnest(tags), '#6b7280'
FROM subscribers
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
ON CONFLICT (name) DO NOTHING;
