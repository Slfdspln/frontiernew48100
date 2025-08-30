-- Create temp_login_sessions table for temporary login session storage
create table if not exists temp_login_sessions (
  id uuid default gen_random_uuid() primary key,
  email text not null,
  phone text,
  ip text,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

-- Add index for quick lookups
create index if not exists temp_login_sessions_email_idx on temp_login_sessions(email);
create index if not exists temp_login_sessions_expires_at_idx on temp_login_sessions(expires_at);

-- Add RLS policy (allow all operations for now, can be tightened later)
alter table temp_login_sessions enable row level security;

create policy "Allow all operations on temp_login_sessions" on temp_login_sessions
for all using (true);