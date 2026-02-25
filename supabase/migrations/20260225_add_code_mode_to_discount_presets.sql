-- Add code_mode column: 'per_user' generates a unique code per recipient at send time,
-- 'all_users' uses a single shared code (existing behavior).
alter table discount_presets add column if not exists code_mode text not null default 'all_users';
