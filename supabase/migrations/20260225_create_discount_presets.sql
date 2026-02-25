create table if not exists discount_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null default 'percentage',
  value numeric not null default 5,
  duration_days int not null default 2,
  code_prefix text not null default 'VIP',
  target_url_key text not null default 'main_cta_url',
  usage_limit int not null default 1,
  is_active boolean not null default true,
  created_at timestamptz default now()
);
