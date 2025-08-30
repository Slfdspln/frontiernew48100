-- Add phone column to residents table
alter table residents add column if not exists phone text;

-- Create index for phone lookups
create index if not exists residents_phone_idx on residents(phone);

-- Update temp_login_sessions to have phone column (if not already exists)
alter table temp_login_sessions add column if not exists phone text;