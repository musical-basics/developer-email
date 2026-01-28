-- 1. Create a table for app settings
create table if not exists app_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone default now()
);

-- 2. Enable Row Level Security (RLS)
alter table app_settings enable row level security;

-- 3. Policy: Allow authenticated users to READ settings
create policy "Allow authenticated read"
on app_settings for select
to authenticated
using (true);

-- 4. Policy: Allow authenticated users to UPDATE settings
create policy "Allow authenticated update"
on app_settings for update
to authenticated
using (true);

-- 5. Insert your default context (so it's not empty)
insert into app_settings (key, value)
values ('company_context', '### COMPANY KNOWLEDGE BASE (DreamPlay Pianos):\n- Product: DreamPlay One...')
on conflict (key) do nothing;
