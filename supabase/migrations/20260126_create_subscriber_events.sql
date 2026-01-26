-- Create Event Type Enum
create type event_type as enum ('sent', 'open', 'click', 'page_view', 'session_end');

-- Create Subscriber Events Table
create table subscriber_events (
  id uuid default uuid_generate_v4() primary key,
  subscriber_id uuid references subscribers(id) on delete cascade,
  campaign_id uuid references campaigns(id) on delete set null,
  type event_type not null,
  
  -- Context
  url text,                -- What link did they click?
  metadata jsonb,          -- { "duration_seconds": 45, "browser": "Chrome" }
  ip_address text,         -- For location history
  
  created_at timestamp with time zone default now()
);

-- Fast lookup so you can load the "History" tab instantly
create index idx_subscriber_events on subscriber_events(subscriber_id);
