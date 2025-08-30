-- enable if needed
create extension if not exists "pgcrypto";

create table if not exists public.qr_codes (
  id uuid primary key default gen_random_uuid(),
  short_id text unique not null,
  user_id uuid references auth.users(id) on delete set null,
  target_url text not null,
  secure boolean not null default true,
  one_time boolean not null default false,
  ttl_sec integer not null default 3600,
  created_at timestamptz not null default now(),
  expires_at timestamptz generated always as (created_at + make_interval(secs => ttl_sec)) stored,
  consumed_at timestamptz,
  meta jsonb not null default '{}'::jsonb
);

create index if not exists qr_codes_short_id_idx on public.qr_codes(short_id);
create index if not exists qr_codes_expires_at_idx on public.qr_codes(expires_at);

alter table public.qr_codes enable row level security;

-- App users can see/manage only their own rows (for listing/history if you add it)
create policy "qr own select" on public.qr_codes
  for select using (auth.uid() is not null and auth.uid() = user_id);

create policy "qr own insert" on public.qr_codes
  for insert with check (auth.uid() is not null and auth.uid() = user_id);

create policy "qr own update" on public.qr_codes
  for update using (auth.uid() is not null and auth.uid() = user_id);

-- Add a table to track resident guest pass usage
create table if not exists public.resident_guest_passes (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid references auth.users(id) on delete cascade,
  month_year text not null, -- Format: YYYY-MM
  passes_used integer not null default 0,
  passes_limit integer not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists resident_month_idx on public.resident_guest_passes(resident_id, month_year);

alter table public.resident_guest_passes enable row level security;

create policy "resident own select" on public.resident_guest_passes
  for select using (auth.uid() is not null and auth.uid() = resident_id);

-- Function to get or create resident pass usage for current month
create or replace function get_resident_pass_usage(p_resident_id uuid)
returns table (passes_used integer, passes_limit integer)
language plpgsql security definer
as $$
declare
  current_month text := to_char(now(), 'YYYY-MM');
  v_record record;
begin
  -- Try to get existing record
  select * into v_record 
  from public.resident_guest_passes 
  where resident_id = p_resident_id and month_year = current_month;
  
  -- If no record exists, create one
  if v_record.id is null then
    insert into public.resident_guest_passes (resident_id, month_year, passes_used, passes_limit)
    values (p_resident_id, current_month, 0, 3)
    returning * into v_record;
  end if;
  
  return query select v_record.passes_used, v_record.passes_limit;
end;
$$;
