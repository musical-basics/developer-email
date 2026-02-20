-- Attribution & Conversion Tracking
-- Adds new event types for conversion tiers and unsubscribe tracking,
-- plus parent_template_id for template lineage rollup.

-- New event types
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'unsubscribe';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'conversion_t1';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'conversion_t2';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'conversion_t3';

-- Parent tracking so cloned drafts roll up to their Master Template
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS parent_template_id uuid REFERENCES campaigns(id) ON DELETE SET NULL;
