-- Rotations table for round-robin split testing
CREATE TABLE rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    campaign_ids UUID[] NOT NULL,
    cursor_position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tag child campaigns with their rotation for analytics isolation
ALTER TABLE campaigns ADD COLUMN rotation_id UUID REFERENCES rotations(id) DEFAULT NULL;
