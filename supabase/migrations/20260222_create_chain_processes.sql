-- Chain Processes: individual instances of a chain running for a specific subscriber
-- This is the orchestration state table — the Inngest runner reads/writes to this table at every step.

CREATE TYPE chain_process_status AS ENUM ('active', 'paused', 'cancelled', 'completed');

CREATE TABLE chain_processes (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  chain_id uuid NOT NULL REFERENCES email_chains(id) ON DELETE CASCADE,
  subscriber_id uuid NOT NULL REFERENCES subscribers(id) ON DELETE CASCADE,
  status chain_process_status DEFAULT 'active',
  current_step_index INT DEFAULT 0,
  next_step_at TIMESTAMPTZ,
  history JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_chain_processes_subscriber ON chain_processes(subscriber_id);
CREATE INDEX idx_chain_processes_chain ON chain_processes(chain_id);
