create table campaign_versions (
  id uuid default uuid_generate_v4() primary key,
  campaign_id uuid references campaigns(id) on delete cascade,
  html_content text not null,
  prompt text,
  created_at timestamp with time zone default now()
);

alter table campaign_versions enable row level security;

create policy "Allow authenticated insert" on campaign_versions for insert to authenticated with check (true);
create policy "Allow authenticated select" on campaign_versions for select to authenticated using (true);
