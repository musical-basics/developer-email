-- Migration: Add subscriber_id to email_chains for draft chains
-- Draft chains (subscriber_id is set) are tied to a specific subscriber
-- Master chains (subscriber_id is null) are reusable templates

alter table email_chains add column subscriber_id uuid references subscribers(id) on delete set null;

-- Index for fast lookups of draft chains by subscriber
create index email_chains_subscriber_idx on email_chains(subscriber_id) where subscriber_id is not null;
