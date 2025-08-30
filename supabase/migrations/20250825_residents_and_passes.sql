-- residents
create table if not exists residents (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  role text not null default 'USER',
  created_at timestamptz default now()
);

-- resident_auth
create table if not exists resident_auth (
  resident_id uuid primary key references residents(id) on delete cascade,
  frontier_user_id text,
  frontier_access_token text,
  frontier_refresh_token text,
  is_resident boolean default false,
  verified_at timestamptz,
  updated_at timestamptz default now()
);

-- guest_passes
create type pass_status as enum ('scheduled','checked_in','canceled','expired');

create table if not exists guest_passes (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references residents(id) on delete cascade,
  guest_name text not null,
  visit_date date not null,
  status pass_status not null default 'scheduled',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  checked_in_at timestamptz,
  checked_out_at timestamptz,
  verified_by_admin text
);

create index if not exists gp_resident_month_idx on guest_passes(resident_id, visit_date);
create index if not exists gp_status_day_idx on guest_passes(status, visit_date);
