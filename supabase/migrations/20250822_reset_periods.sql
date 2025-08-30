-- Migration: create reset_periods table for 30-day reset tracking
create table if not exists public.reset_periods (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_reset_at timestamptz not null default now(),
  reset_count integer not null default 0,
  last_membership_checked_at timestamptz,
  last_membership_result jsonb
);

create index if not exists idx_reset_periods_last_reset_at on public.reset_periods(last_reset_at);
