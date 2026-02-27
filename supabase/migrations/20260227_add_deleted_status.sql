-- Migration: Allow 'deleted' status for soft-delete
ALTER TABLE subscribers DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE subscribers ADD CONSTRAINT check_status CHECK (status IN ('active', 'unsubscribed', 'bounced', 'deleted'));
