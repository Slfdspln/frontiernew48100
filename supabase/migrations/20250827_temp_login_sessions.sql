-- temp_login_sessions for resident authentication
create table if not exists temp_login_sessions (
  email text primary key,
  phone text,
  ip text not null,
  created_at timestamptz not null,
  expires_at timestamptz not null
);

-- Add index for cleanup
create index if not exists temp_login_sessions_expires_at_idx on temp_login_sessions(expires_at);

-- Add guests table if it doesn't exist (used by guest pass system)
create table if not exists guests (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  first_name text,
  last_name text,
  id_country text,
  id_type text,
  id_last4 text,
  phone text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Update guest_passes table to reference guests properly if needed
-- This will only run if the guest_id column doesn't already exist with proper foreign key
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints 
    where constraint_name = 'guest_passes_guest_id_fkey' 
    and table_name = 'guest_passes'
  ) then
    alter table guest_passes add column if not exists guest_id uuid references guests(id);
  end if;
end $$;