-- Enhanced Apple Wallet Integration with Security Tracking
-- This migration adds comprehensive tracking for Apple Wallet passes and usage logging

-- Apple Wallet passes tracking table
CREATE TABLE IF NOT EXISTS apple_wallet_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_pass_id UUID REFERENCES guest_passes(id) ON DELETE CASCADE,
    serial_number VARCHAR NOT NULL UNIQUE,
    auth_token VARCHAR NOT NULL,
    security_hash VARCHAR NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pass usage logging table (prevents reuse and tracks verification attempts)
CREATE TABLE IF NOT EXISTS pass_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_pass_id UUID REFERENCES guest_passes(id) ON DELETE CASCADE,
    security_hash VARCHAR NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    verification_method VARCHAR DEFAULT 'web',
    verified_by VARCHAR DEFAULT 'security_guard',
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN DEFAULT true,
    error_message TEXT
);

-- Add missing fields to guest_passes if they don't exist
ALTER TABLE guest_passes 
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pass_usage_recent ON pass_usage_log(guest_pass_id, used_at);
CREATE INDEX IF NOT EXISTS idx_apple_wallet_serial ON apple_wallet_passes(serial_number);
CREATE INDEX IF NOT EXISTS idx_security_hash ON pass_usage_log(security_hash);
CREATE INDEX IF NOT EXISTS idx_guest_passes_email ON guest_passes(guest_email);
CREATE INDEX IF NOT EXISTS idx_pass_usage_success ON pass_usage_log(success, used_at);

-- Add constraint to ensure one Apple Wallet pass per guest pass
CREATE UNIQUE INDEX IF NOT EXISTS idx_apple_wallet_unique_pass 
ON apple_wallet_passes(guest_pass_id);

-- Function to clean up old usage logs (keep for 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM pass_usage_log 
    WHERE used_at < NOW() - INTERVAL '90 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get pass verification stats
CREATE OR REPLACE FUNCTION get_pass_verification_stats(
    start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
    end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    total_verifications BIGINT,
    successful_verifications BIGINT,
    failed_verifications BIGINT,
    apple_wallet_verifications BIGINT,
    web_verifications BIGINT,
    unique_guests BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_verifications,
        COUNT(*) FILTER (WHERE success = true) as successful_verifications,
        COUNT(*) FILTER (WHERE success = false) as failed_verifications,
        COUNT(*) FILTER (WHERE verification_method = 'apple_wallet') as apple_wallet_verifications,
        COUNT(*) FILTER (WHERE verification_method = 'web') as web_verifications,
        COUNT(DISTINCT guest_pass_id) as unique_guests
    FROM pass_usage_log 
    WHERE used_at::date BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql;

-- Enhanced guest pass creation function with unique QR data
CREATE OR REPLACE FUNCTION create_guest_pass_with_qr(
    p_resident_id UUID,
    p_guest_name TEXT,
    p_guest_email TEXT,
    p_guest_phone TEXT DEFAULT NULL,
    p_visit_date DATE DEFAULT CURRENT_DATE,
    p_floor TEXT DEFAULT 'Lobby'
)
RETURNS TABLE (
    pass_id UUID,
    security_hash TEXT,
    qr_data JSONB
) AS $$
DECLARE
    new_pass_id UUID;
    pass_code_val TEXT;
    security_hash_val TEXT;
    expires_at_val TIMESTAMPTZ;
    resident_info RECORD;
    qr_data_val JSONB;
BEGIN
    -- Get resident information
    SELECT name, unit_number, email 
    INTO resident_info
    FROM residents 
    WHERE id = p_resident_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Resident not found';
    END IF;
    
    -- Generate expiration (end of visit day)
    expires_at_val := (p_visit_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMPTZ;
    
    -- Create the guest pass
    INSERT INTO guest_passes (
        resident_id,
        guest_name,
        guest_email,
        guest_phone,
        visit_date,
        floor,
        expires_at,
        status,
        host_name,
        unit_number
    ) VALUES (
        p_resident_id,
        p_guest_name,
        p_guest_email,
        p_guest_phone,
        p_visit_date,
        p_floor,
        expires_at_val,
        'scheduled',
        resident_info.name,
        resident_info.unit_number
    ) RETURNING id INTO new_pass_id;
    
    -- Generate security hash
    security_hash_val := LEFT(
        encode(
            digest(
                new_pass_id::text || '_' || 
                p_guest_email || '_' || 
                p_resident_id::text || '_' || 
                current_setting('app.apple_wallet_secret', true),
                'sha256'
            ),
            'hex'
        ),
        16
    );
    
    -- Create QR data JSON
    qr_data_val := jsonb_build_object(
        'passId', new_pass_id,
        'guestName', p_guest_name,
        'guestEmail', p_guest_email,
        'guestPhone', COALESCE(p_guest_phone, 'Not provided'),
        'hostName', resident_info.name,
        'hostUnit', resident_info.unit_number,
        'visitDate', p_visit_date,
        'validUntil', expires_at_val,
        'residentId', p_resident_id,
        'securityHash', security_hash_val,
        'buildingCode', 'FT001',
        'passType', 'web'
    );
    
    RETURN QUERY SELECT new_pass_id, security_hash_val, qr_data_val;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to apple_wallet_passes
DROP TRIGGER IF EXISTS trg_apple_wallet_passes_updated_at ON apple_wallet_passes;
CREATE TRIGGER trg_apple_wallet_passes_updated_at
    BEFORE UPDATE ON apple_wallet_passes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE apple_wallet_passes IS 'Tracks Apple Wallet pass generation and authentication tokens';
COMMENT ON TABLE pass_usage_log IS 'Logs all pass verification attempts for security and analytics';
COMMENT ON COLUMN pass_usage_log.security_hash IS 'Hash used to verify pass authenticity and prevent reuse';
COMMENT ON COLUMN pass_usage_log.verification_method IS 'Method used: apple_wallet, web, manual';
COMMENT ON COLUMN pass_usage_log.verified_by IS 'Who verified the pass: security_guard, admin, system';
COMMENT ON FUNCTION create_guest_pass_with_qr IS 'Creates guest pass with unique QR data and security hash';
COMMENT ON FUNCTION get_pass_verification_stats IS 'Returns verification statistics for reporting';

-- Grant permissions (adjust as needed for your setup)
-- GRANT SELECT, INSERT, UPDATE ON apple_wallet_passes TO authenticated;
-- GRANT SELECT, INSERT ON pass_usage_log TO authenticated;
-- GRANT EXECUTE ON FUNCTION create_guest_pass_with_qr TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_pass_verification_stats TO authenticated;