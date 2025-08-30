-- Create guests table
CREATE TABLE guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  id_country TEXT,
  id_type TEXT,
  id_last4 TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create guest_passes table
CREATE TABLE guest_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id UUID NOT NULL REFERENCES residents(id),
  guest_id UUID REFERENCES guests(id),
  visit_date DATE NOT NULL,
  floor TEXT NOT NULL,
  status TEXT CHECK (status IN ('pending','scheduled','checked_in','canceled','expired')) NOT NULL DEFAULT 'pending',
  policy_version TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  checked_out_at TIMESTAMPTZ
);

-- Create used_qr_tokens table for replay protection
CREATE TABLE used_qr_tokens (
  pass_id UUID NOT NULL REFERENCES guest_passes(id),
  jti UUID NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (pass_id, jti)
);

-- Create indexes for performance
CREATE INDEX idx_guest_passes_host_visit_status ON guest_passes (host_id, visit_date, status);
CREATE INDEX idx_guest_passes_guest_visit ON guest_passes (guest_id, visit_date);
CREATE INDEX idx_used_qr_tokens_pass_jti ON used_qr_tokens (pass_id, jti);
