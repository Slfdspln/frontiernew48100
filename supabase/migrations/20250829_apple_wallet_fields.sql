-- Add fields required for Apple Wallet integration to guest_passes table

-- Add pass_code field for unique pass identification
ALTER TABLE guest_passes 
ADD COLUMN IF NOT EXISTS pass_code TEXT;

-- Add host_name field (resident name)
ALTER TABLE guest_passes 
ADD COLUMN IF NOT EXISTS host_name TEXT;

-- Add unit_number field
ALTER TABLE guest_passes 
ADD COLUMN IF NOT EXISTS unit_number TEXT;

-- Add expires_at field for pass expiration
ALTER TABLE guest_passes 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create index for pass_code lookups
CREATE INDEX IF NOT EXISTS idx_guest_passes_pass_code ON guest_passes (pass_code);

-- Add comments explaining the new columns
COMMENT ON COLUMN guest_passes.pass_code IS 'Unique code for guest pass verification (used in QR codes and Apple Wallet)';
COMMENT ON COLUMN guest_passes.host_name IS 'Name of the resident host (cached for Apple Wallet display)';
COMMENT ON COLUMN guest_passes.unit_number IS 'Unit number or access level (e.g., "101", "Lobby")';
COMMENT ON COLUMN guest_passes.expires_at IS 'When the pass expires (defaults to end of visit_date)';

-- Function to generate unique pass codes
CREATE OR REPLACE FUNCTION generate_pass_code()
RETURNS TEXT AS $$
DECLARE
    code TEXT;
    exists_check INTEGER;
BEGIN
    LOOP
        -- Generate a 6-character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 6));
        
        -- Check if it already exists
        SELECT COUNT(*) INTO exists_check 
        FROM guest_passes 
        WHERE pass_code = code;
        
        -- If unique, return it
        IF exists_check = 0 THEN
            RETURN code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically set pass_code and expires_at on insert
CREATE OR REPLACE FUNCTION set_guest_pass_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Set pass_code if not provided
    IF NEW.pass_code IS NULL THEN
        NEW.pass_code := generate_pass_code();
    END IF;
    
    -- Set expires_at to end of visit_date if not provided
    IF NEW.expires_at IS NULL AND NEW.visit_date IS NOT NULL THEN
        NEW.expires_at := (NEW.visit_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMPTZ;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS trg_guest_pass_defaults ON guest_passes;
CREATE TRIGGER trg_guest_pass_defaults
    BEFORE INSERT ON guest_passes
    FOR EACH ROW
    EXECUTE FUNCTION set_guest_pass_defaults();

-- Update existing records to have pass codes and host names
UPDATE guest_passes 
SET 
    pass_code = generate_pass_code(),
    expires_at = (visit_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMPTZ
WHERE pass_code IS NULL;

-- Try to populate host_name from residents table
UPDATE guest_passes 
SET host_name = r.name
FROM residents r
WHERE guest_passes.resident_id = r.id 
AND guest_passes.host_name IS NULL;