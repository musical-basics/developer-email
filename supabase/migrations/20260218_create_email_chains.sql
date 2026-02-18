-- Migration: Create email chains tables
-- Stores email chain definitions, their steps, and branching rules

-- email_chains: one row per chain (e.g. "DreamPlay Onboarding")
create table email_chains (
  id            uuid default uuid_generate_v4() primary key,
  slug          text not null unique,
  name          text not null,
  description   text,
  trigger_label text,
  trigger_event text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- chain_steps: ordered emails within a chain
create table chain_steps (
  id            uuid default uuid_generate_v4() primary key,
  chain_id      uuid not null references email_chains(id) on delete cascade,
  position      int not null,
  label         text not null,
  template_key  text not null,
  wait_after    text,
  created_at    timestamptz default now()
);

-- chain_branches: branching rules at the end of a chain
create table chain_branches (
  id            uuid default uuid_generate_v4() primary key,
  chain_id      uuid not null references email_chains(id) on delete cascade,
  description   text,
  position      int not null,
  label         text not null,
  condition     text not null,
  action        text not null,
  created_at    timestamptz default now()
);

-- Indexes for fast lookups
create index chain_steps_chain_idx on chain_steps(chain_id, position);
create index chain_branches_chain_idx on chain_branches(chain_id, position);
