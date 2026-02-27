-- Migration: Add is_snapshot flag to email_chains
-- Snapshot chains are frozen copies created when a master chain is run.
-- They should not appear in the Master Chains or Drafts lists.

alter table email_chains add column is_snapshot boolean default false;
