-- Add bounce and complaint event types for Resend webhook tracking
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'bounce';
ALTER TYPE event_type ADD VALUE IF NOT EXISTS 'complaint';
