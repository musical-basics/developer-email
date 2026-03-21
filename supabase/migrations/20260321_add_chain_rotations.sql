-- Chain Rotations: A/B testing between entire email chains (journeys)
CREATE TABLE chain_rotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    chain_ids UUID[] NOT NULL,
    cursor_position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Link chain processes to a chain rotation for attribution
ALTER TABLE chain_processes ADD COLUMN chain_rotation_id UUID REFERENCES chain_rotations(id) DEFAULT NULL;

-- Track which master chain a process was started from (snapshots get new IDs)
ALTER TABLE chain_processes ADD COLUMN original_chain_id UUID REFERENCES email_chains(id) DEFAULT NULL;

-- Link completed campaign copies to a chain rotation for stats aggregation
ALTER TABLE campaigns ADD COLUMN chain_rotation_id UUID REFERENCES chain_rotations(id) DEFAULT NULL;
