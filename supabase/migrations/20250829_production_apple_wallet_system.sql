-- ==================================================================================
-- PRODUCTION-READY APPLE WALLET SYSTEM FOR FRONTIER TOWER
-- ==================================================================================
-- This migration creates a comprehensive, enterprise-grade Apple Wallet system
-- with security, audit logging, monitoring, and compliance features.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_stat_statements";

-- ==================================================================================
-- SECURITY AND AUDIT CONFIGURATION
-- ==================================================================================

-- Create audit schema for sensitive operations
CREATE SCHEMA IF NOT EXISTS audit;

-- Security settings table for dynamic configuration
CREATE TABLE IF NOT EXISTS security_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES residents(id)
);

-- Insert default security settings
INSERT INTO security_config (setting_key, setting_value, description) VALUES
('apple_wallet_enabled', 'true', 'Enable Apple Wallet pass generation'),
('max_passes_per_resident_per_month', '10', 'Maximum passes per resident per month'),
('pass_expiry_hours', '24', 'Default pass expiry in hours'),
('security_hash_rotation_days', '30', 'Days before security hash rotation'),
('failed_verification_threshold', '5', 'Failed verifications before account lock'),
('audit_retention_days', '2555', 'Audit log retention period (7 years)'),
('rate_limit_per_minute', '10', 'API rate limit per minute per IP'),
('certificate_expiry_warning_days', '30', 'Days before certificate expiry warning')
ON CONFLICT (setting_key) DO NOTHING;

-- ==================================================================================
-- ENHANCED GUEST PASSES TABLE
-- ==================================================================================

-- Add production columns to guest_passes
ALTER TABLE guest_passes 
ADD COLUMN IF NOT EXISTS guest_email TEXT,
ADD COLUMN IF NOT EXISTS guest_phone TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT,
ADD COLUMN IF NOT EXISTS purpose_of_visit TEXT,
ADD COLUMN IF NOT EXISTS security_clearance_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES residents(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS risk_assessment_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS compliance_flags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS access_restrictions JSONB DEFAULT '{}';

-- Add constraints and indexes
CREATE INDEX IF NOT EXISTS idx_guest_passes_security_level ON guest_passes(security_clearance_level);
CREATE INDEX IF NOT EXISTS idx_guest_passes_risk_score ON guest_passes(risk_assessment_score);
CREATE INDEX IF NOT EXISTS idx_guest_passes_metadata ON guest_passes USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_guest_passes_compliance ON guest_passes USING gin(compliance_flags);

-- ==================================================================================
-- APPLE WALLET PASSES TABLE (PRODUCTION)
-- ==================================================================================

CREATE TABLE IF NOT EXISTS apple_wallet_passes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_pass_id UUID NOT NULL REFERENCES guest_passes(id) ON DELETE CASCADE,
    serial_number VARCHAR(255) NOT NULL UNIQUE,
    auth_token VARCHAR(512) NOT NULL,
    security_hash VARCHAR(64) NOT NULL,
    certificate_fingerprint VARCHAR(128),
    device_identifier VARCHAR(255),
    wallet_version VARCHAR(50),
    
    -- Security and Compliance
    encryption_key_version INTEGER DEFAULT 1,
    pass_signature BYTEA,
    tamper_detection_hash VARCHAR(128),
    
    -- Lifecycle Management
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    first_accessed_at TIMESTAMP WITH TIME ZONE,
    last_accessed_at TIMESTAMP WITH TIME ZONE,
    download_count INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'revoked', 'expired')),
    
    -- Compliance and Audit
    compliance_version VARCHAR(20) DEFAULT '1.0',
    gdpr_consent BOOLEAN DEFAULT false,
    data_retention_until TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    creation_ip INET,
    creation_user_agent TEXT,
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_apple_wallet_serial ON apple_wallet_passes(serial_number);
CREATE INDEX IF NOT EXISTS idx_apple_wallet_guest_pass ON apple_wallet_passes(guest_pass_id);
CREATE INDEX IF NOT EXISTS idx_apple_wallet_status ON apple_wallet_passes(status);
CREATE INDEX IF NOT EXISTS idx_apple_wallet_device ON apple_wallet_passes(device_identifier);
CREATE INDEX IF NOT EXISTS idx_apple_wallet_metadata ON apple_wallet_passes USING gin(metadata);

-- Unique constraint
ALTER TABLE apple_wallet_passes ADD CONSTRAINT unique_active_pass_per_guest 
UNIQUE (guest_pass_id) DEFERRABLE INITIALLY DEFERRED;

-- ==================================================================================
-- COMPREHENSIVE USAGE AND AUDIT LOGGING
-- ==================================================================================

CREATE TABLE IF NOT EXISTS pass_usage_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guest_pass_id UUID NOT NULL REFERENCES guest_passes(id) ON DELETE CASCADE,
    apple_wallet_pass_id UUID REFERENCES apple_wallet_passes(id),
    
    -- Verification Details
    security_hash VARCHAR(64) NOT NULL,
    verification_method VARCHAR(50) NOT NULL DEFAULT 'web',
    verified_by VARCHAR(100) DEFAULT 'system',
    verification_location VARCHAR(255),
    
    -- Request Information
    ip_address INET NOT NULL,
    user_agent TEXT,
    request_id UUID DEFAULT gen_random_uuid(),
    session_id VARCHAR(255),
    
    -- Security and Fraud Detection
    success BOOLEAN NOT NULL DEFAULT true,
    failure_reason TEXT,
    fraud_score INTEGER DEFAULT 0,
    security_flags TEXT[] DEFAULT '{}',
    geolocation JSONB,
    
    -- Timing and Performance
    used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_time_ms INTEGER,
    
    -- Compliance
    gdpr_anonymized BOOLEAN DEFAULT false,
    retention_policy VARCHAR(50) DEFAULT 'standard',
    
    -- Metadata
    metadata JSONB DEFAULT '{}'
);

-- Indexes for performance and queries
CREATE INDEX IF NOT EXISTS idx_usage_log_guest_pass ON pass_usage_log(guest_pass_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_security_hash ON pass_usage_log(security_hash);
CREATE INDEX IF NOT EXISTS idx_usage_log_success ON pass_usage_log(success, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_ip ON pass_usage_log(ip_address, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_log_fraud ON pass_usage_log(fraud_score DESC) WHERE fraud_score > 0;
CREATE INDEX IF NOT EXISTS idx_usage_log_metadata ON pass_usage_log USING gin(metadata);
CREATE INDEX IF NOT EXISTS idx_usage_log_security_flags ON pass_usage_log USING gin(security_flags);

-- ==================================================================================
-- SECURITY INCIDENTS AND THREAT DETECTION
-- ==================================================================================

CREATE TABLE IF NOT EXISTS security_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_type VARCHAR(100) NOT NULL,
    severity_level INTEGER NOT NULL CHECK (severity_level BETWEEN 1 AND 5),
    
    -- Related Entities
    guest_pass_id UUID REFERENCES guest_passes(id),
    apple_wallet_pass_id UUID REFERENCES apple_wallet_passes(id),
    resident_id UUID REFERENCES residents(id),
    
    -- Incident Details
    description TEXT NOT NULL,
    technical_details JSONB DEFAULT '{}',
    affected_systems TEXT[] DEFAULT '{}',
    
    -- Investigation
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
    assigned_to VARCHAR(255),
    investigation_notes TEXT,
    
    -- Detection
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detection_method VARCHAR(100),
    source_ip INET,
    
    -- Resolution
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    preventive_actions TEXT[],
    
    -- Compliance
    reported_to_authorities BOOLEAN DEFAULT false,
    compliance_impact TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_incidents_severity ON security_incidents(severity_level DESC, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_status ON security_incidents(status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_incidents_type ON security_incidents(incident_type, detected_at DESC);

-- ==================================================================================
-- CERTIFICATE MANAGEMENT
-- ==================================================================================

CREATE TABLE IF NOT EXISTS apple_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_type VARCHAR(50) NOT NULL,
    certificate_name VARCHAR(255) NOT NULL,
    
    -- Certificate Data
    certificate_data BYTEA NOT NULL,
    private_key_encrypted BYTEA,
    public_key_fingerprint VARCHAR(128) NOT NULL,
    
    -- Validity
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    
    -- Security
    encryption_algorithm VARCHAR(50) DEFAULT 'AES-256',
    key_strength INTEGER,
    
    -- Compliance
    compliance_standard VARCHAR(100),
    audit_trail JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificates_type ON apple_certificates(certificate_type);
CREATE INDEX IF NOT EXISTS idx_certificates_expiry ON apple_certificates(valid_until) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_certificates_fingerprint ON apple_certificates(public_key_fingerprint);

-- ==================================================================================
-- PERFORMANCE MONITORING
-- ==================================================================================

CREATE TABLE IF NOT EXISTS system_performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,6) NOT NULL,
    metric_unit VARCHAR(50),
    
    -- Context
    component VARCHAR(100),
    endpoint VARCHAR(255),
    operation VARCHAR(100),
    
    -- Timing
    measured_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    time_window_seconds INTEGER DEFAULT 60,
    
    -- Metadata
    tags JSONB DEFAULT '{}',
    additional_data JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_name_time ON system_performance_metrics(metric_name, measured_at DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_component ON system_performance_metrics(component, measured_at DESC);

-- ==================================================================================
-- ADVANCED FUNCTIONS FOR PRODUCTION
-- ==================================================================================

-- Enhanced pass creation with full security
CREATE OR REPLACE FUNCTION create_production_guest_pass(
    p_resident_id UUID,
    p_guest_name TEXT,
    p_guest_email TEXT,
    p_guest_phone TEXT DEFAULT NULL,
    p_emergency_contact_name TEXT DEFAULT NULL,
    p_emergency_contact_phone TEXT DEFAULT NULL,
    p_visit_date DATE DEFAULT CURRENT_DATE,
    p_floor TEXT DEFAULT 'Lobby',
    p_purpose TEXT DEFAULT 'Visit',
    p_security_clearance INTEGER DEFAULT 1,
    p_client_ip INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS TABLE (
    pass_id UUID,
    security_hash TEXT,
    qr_data JSONB,
    compliance_status TEXT
) AS $$
DECLARE
    new_pass_id UUID;
    security_hash_val TEXT;
    expires_at_val TIMESTAMPTZ;
    resident_info RECORD;
    qr_data_val JSONB;
    monthly_pass_count INTEGER;
    max_passes INTEGER;
    risk_score INTEGER := 0;
    compliance_flags TEXT[] := '{}';
BEGIN
    -- Get resident information
    SELECT name, unit_number, email, role
    INTO resident_info
    FROM residents 
    WHERE id = p_resident_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Resident not found' USING ERRCODE = 'P0001';
    END IF;
    
    -- Check monthly limits
    SELECT COALESCE(setting_value::INTEGER, 10) INTO max_passes
    FROM security_config WHERE setting_key = 'max_passes_per_resident_per_month';
    
    SELECT COUNT(*) INTO monthly_pass_count
    FROM guest_passes
    WHERE resident_id = p_resident_id
    AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_TIMESTAMP);
    
    IF monthly_pass_count >= max_passes THEN
        RAISE EXCEPTION 'Monthly pass limit exceeded: % of % used', monthly_pass_count, max_passes
        USING ERRCODE = 'P0002';
    END IF;
    
    -- Calculate risk assessment
    IF p_security_clearance > 2 THEN risk_score := risk_score + 20; END IF;
    IF p_visit_date > CURRENT_DATE + INTERVAL '7 days' THEN risk_score := risk_score + 10; END IF;
    
    -- Set compliance flags
    IF p_guest_email IS NULL THEN compliance_flags := array_append(compliance_flags, 'missing_email'); END IF;
    IF p_emergency_contact_phone IS NULL THEN compliance_flags := array_append(compliance_flags, 'no_emergency_contact'); END IF;
    
    -- Generate expiration
    expires_at_val := (p_visit_date + INTERVAL '1 day' - INTERVAL '1 second')::TIMESTAMPTZ;
    
    -- Create the guest pass with all production fields
    INSERT INTO guest_passes (
        resident_id, guest_name, guest_email, guest_phone,
        emergency_contact_name, emergency_contact_phone,
        visit_date, floor, expires_at, status,
        host_name, unit_number, purpose_of_visit,
        security_clearance_level, risk_assessment_score,
        compliance_flags, approved_by, approved_at,
        metadata
    ) VALUES (
        p_resident_id, p_guest_name, p_guest_email, p_guest_phone,
        p_emergency_contact_name, p_emergency_contact_phone,
        p_visit_date, p_floor, expires_at_val, 'scheduled',
        resident_info.name, resident_info.unit_number, p_purpose,
        p_security_clearance, risk_score, compliance_flags,
        p_resident_id, NOW(),
        jsonb_build_object(
            'created_via', 'production_api',
            'client_ip', p_client_ip,
            'user_agent', p_user_agent,
            'compliance_version', '2.0'
        )
    ) RETURNING id INTO new_pass_id;
    
    -- Generate production-grade security hash
    security_hash_val := encode(
        hmac(
            new_pass_id::text || '|' || 
            p_guest_email || '|' || 
            p_resident_id::text || '|' || 
            extract(epoch from now())::text || '|' ||
            current_setting('app.apple_wallet_secret', true),
            current_setting('app.apple_wallet_secret', true),
            'sha256'
        ),
        'hex'
    );
    
    -- Create comprehensive QR data
    qr_data_val := jsonb_build_object(
        'passId', new_pass_id,
        'guestName', p_guest_name,
        'guestEmail', p_guest_email,
        'guestPhone', COALESCE(p_guest_phone, 'Not provided'),
        'emergencyContact', COALESCE(p_emergency_contact_phone, 'Not provided'),
        'hostName', resident_info.name,
        'hostUnit', resident_info.unit_number,
        'visitDate', p_visit_date,
        'validUntil', expires_at_val,
        'residentId', p_resident_id,
        'securityHash', security_hash_val,
        'buildingCode', 'FT001',
        'passType', 'production',
        'securityClearance', p_security_clearance,
        'riskScore', risk_score,
        'version', '2.0',
        'generatedAt', extract(epoch from now()),
        'complianceFlags', compliance_flags
    );
    
    RETURN QUERY SELECT 
        new_pass_id, 
        security_hash_val, 
        qr_data_val,
        CASE 
            WHEN array_length(compliance_flags, 1) > 0 THEN 'WARNING'
            WHEN risk_score > 30 THEN 'HIGH_RISK'
            ELSE 'COMPLIANT'
        END::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security incident logging function
CREATE OR REPLACE FUNCTION log_security_incident(
    p_incident_type TEXT,
    p_severity INTEGER,
    p_description TEXT,
    p_guest_pass_id UUID DEFAULT NULL,
    p_source_ip INET DEFAULT NULL,
    p_technical_details JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
    incident_id UUID;
BEGIN
    INSERT INTO security_incidents (
        incident_type, severity_level, description,
        guest_pass_id, source_ip, technical_details,
        detection_method
    ) VALUES (
        p_incident_type, p_severity, p_description,
        p_guest_pass_id, p_source_ip, p_technical_details,
        'automated_function'
    ) RETURNING id INTO incident_id;
    
    -- Alert if high severity
    IF p_severity >= 4 THEN
        PERFORM pg_notify('security_alert', 
            json_build_object(
                'incident_id', incident_id,
                'severity', p_severity,
                'type', p_incident_type,
                'timestamp', now()
            )::text
        );
    END IF;
    
    RETURN incident_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Performance monitoring function
CREATE OR REPLACE FUNCTION record_performance_metric(
    p_metric_name TEXT,
    p_metric_value DECIMAL,
    p_component TEXT DEFAULT 'apple_wallet',
    p_endpoint TEXT DEFAULT NULL,
    p_tags JSONB DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO system_performance_metrics (
        metric_name, metric_value, component, endpoint, tags
    ) VALUES (
        p_metric_name, p_metric_value, p_component, p_endpoint, p_tags
    );
    
    -- Clean old metrics (keep last 30 days)
    DELETE FROM system_performance_metrics 
    WHERE measured_at < NOW() - INTERVAL '30 days'
    AND random() < 0.01; -- Only clean 1% of the time to avoid performance impact
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- TRIGGERS AND AUTOMATION
-- ==================================================================================

-- Update timestamps trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply update triggers
DROP TRIGGER IF EXISTS trg_apple_wallet_passes_updated_at ON apple_wallet_passes;
CREATE TRIGGER trg_apple_wallet_passes_updated_at
    BEFORE UPDATE ON apple_wallet_passes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_security_incidents_updated_at ON security_incidents;
CREATE TRIGGER trg_security_incidents_updated_at
    BEFORE UPDATE ON security_incidents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit logging trigger
CREATE OR REPLACE FUNCTION audit_sensitive_operations()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit.operation_log (
            table_name, operation, old_values, user_id, timestamp
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(OLD), 
            current_setting('app.current_user_id', true)::UUID, NOW()
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit.operation_log (
            table_name, operation, old_values, new_values, user_id, timestamp
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW),
            current_setting('app.current_user_id', true)::UUID, NOW()
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit.operation_log (
            table_name, operation, new_values, user_id, timestamp
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(NEW),
            current_setting('app.current_user_id', true)::UUID, NOW()
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit log table
CREATE TABLE IF NOT EXISTS audit.operation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    user_id UUID,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_table_time ON audit.operation_log(table_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_time ON audit.operation_log(user_id, timestamp DESC);

-- Apply audit triggers to sensitive tables
DROP TRIGGER IF EXISTS trg_audit_apple_wallet_passes ON apple_wallet_passes;
CREATE TRIGGER trg_audit_apple_wallet_passes
    AFTER INSERT OR UPDATE OR DELETE ON apple_wallet_passes
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operations();

DROP TRIGGER IF EXISTS trg_audit_guest_passes ON guest_passes;
CREATE TRIGGER trg_audit_guest_passes
    AFTER INSERT OR UPDATE OR DELETE ON guest_passes
    FOR EACH ROW EXECUTE FUNCTION audit_sensitive_operations();

-- ==================================================================================
-- DATA RETENTION AND CLEANUP
-- ==================================================================================

-- Automated cleanup function
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS TABLE (
    table_name TEXT,
    records_deleted BIGINT
) AS $$
DECLARE
    audit_retention_days INTEGER;
    usage_retention_days INTEGER;
    perf_retention_days INTEGER;
    deleted_count BIGINT;
BEGIN
    -- Get retention settings
    SELECT COALESCE(setting_value::INTEGER, 2555) INTO audit_retention_days
    FROM security_config WHERE setting_key = 'audit_retention_days';
    
    usage_retention_days := 365; -- 1 year for usage logs
    perf_retention_days := 90;   -- 3 months for performance metrics
    
    -- Clean usage logs
    DELETE FROM pass_usage_log 
    WHERE used_at < NOW() - (usage_retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'pass_usage_log'::TEXT, deleted_count;
    
    -- Clean performance metrics
    DELETE FROM system_performance_metrics 
    WHERE measured_at < NOW() - (perf_retention_days || ' days')::INTERVAL;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'system_performance_metrics'::TEXT, deleted_count;
    
    -- Clean resolved security incidents (older than 2 years)
    DELETE FROM security_incidents 
    WHERE status = 'resolved' 
    AND resolved_at < NOW() - INTERVAL '2 years';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'security_incidents'::TEXT, deleted_count;
    
    -- Anonymize old audit logs (GDPR compliance)
    UPDATE audit.operation_log 
    SET old_values = jsonb_strip_nulls(
        old_values - 'guest_email' - 'guest_phone' - 'emergency_contact_name' - 'emergency_contact_phone'
    ),
    new_values = jsonb_strip_nulls(
        new_values - 'guest_email' - 'guest_phone' - 'emergency_contact_name' - 'emergency_contact_phone'
    )
    WHERE timestamp < NOW() - INTERVAL '1 year'
    AND (old_values ? 'guest_email' OR new_values ? 'guest_email');
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN QUERY SELECT 'audit_anonymized'::TEXT, deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- SECURITY POLICIES (ROW LEVEL SECURITY)
-- ==================================================================================

-- Enable RLS on sensitive tables
ALTER TABLE apple_wallet_passes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pass_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;

-- Policies for apple_wallet_passes
CREATE POLICY apple_wallet_resident_access ON apple_wallet_passes
    USING (
        guest_pass_id IN (
            SELECT id FROM guest_passes 
            WHERE resident_id = current_setting('app.current_user_id', true)::UUID
        )
    );

-- Policies for usage logs
CREATE POLICY usage_log_resident_access ON pass_usage_log
    USING (
        guest_pass_id IN (
            SELECT id FROM guest_passes 
            WHERE resident_id = current_setting('app.current_user_id', true)::UUID
        )
    );

-- ==================================================================================
-- MONITORING AND HEALTH CHECKS
-- ==================================================================================

-- Health check function
CREATE OR REPLACE FUNCTION system_health_check()
RETURNS JSONB AS $$
DECLARE
    health_status JSONB := '{}';
    cert_expiry_days INTEGER;
    failed_verifications INTEGER;
    active_passes INTEGER;
    avg_response_time DECIMAL;
BEGIN
    -- Check certificate expiry
    SELECT MIN(EXTRACT(days FROM (valid_until - NOW())))::INTEGER
    INTO cert_expiry_days
    FROM apple_certificates 
    WHERE is_active = true;
    
    health_status := health_status || jsonb_build_object(
        'certificate_expiry_days', COALESCE(cert_expiry_days, -1)
    );
    
    -- Check recent failures
    SELECT COUNT(*)::INTEGER INTO failed_verifications
    FROM pass_usage_log
    WHERE success = false 
    AND used_at > NOW() - INTERVAL '1 hour';
    
    health_status := health_status || jsonb_build_object(
        'failed_verifications_last_hour', failed_verifications
    );
    
    -- Check active passes
    SELECT COUNT(*)::INTEGER INTO active_passes
    FROM apple_wallet_passes
    WHERE status = 'active';
    
    health_status := health_status || jsonb_build_object(
        'active_passes_count', active_passes
    );
    
    -- Check average response time
    SELECT AVG(response_time_ms) INTO avg_response_time
    FROM pass_usage_log
    WHERE used_at > NOW() - INTERVAL '1 hour'
    AND response_time_ms IS NOT NULL;
    
    health_status := health_status || jsonb_build_object(
        'avg_response_time_ms', COALESCE(avg_response_time, 0),
        'status', CASE 
            WHEN cert_expiry_days < 30 THEN 'warning'
            WHEN failed_verifications > 10 THEN 'warning'
            WHEN avg_response_time > 2000 THEN 'warning'
            ELSE 'healthy'
        END,
        'timestamp', NOW()
    );
    
    RETURN health_status;
END;
$$ LANGUAGE plpgsql;

-- ==================================================================================
-- COMMENTS AND DOCUMENTATION
-- ==================================================================================

COMMENT ON SCHEMA audit IS 'Audit trail for all sensitive operations';
COMMENT ON TABLE security_config IS 'Dynamic security configuration settings';
COMMENT ON TABLE apple_wallet_passes IS 'Production Apple Wallet pass tracking with full audit trail';
COMMENT ON TABLE pass_usage_log IS 'Comprehensive usage logging for security and compliance';
COMMENT ON TABLE security_incidents IS 'Security incident tracking and investigation';
COMMENT ON TABLE apple_certificates IS 'Certificate lifecycle management';
COMMENT ON TABLE system_performance_metrics IS 'System performance monitoring';
COMMENT ON FUNCTION create_production_guest_pass IS 'Production guest pass creation with full security checks';
COMMENT ON FUNCTION log_security_incident IS 'Automated security incident logging';
COMMENT ON FUNCTION system_health_check IS 'Comprehensive system health monitoring';
COMMENT ON FUNCTION cleanup_old_data IS 'Automated data retention and cleanup';

-- ==================================================================================
-- FINAL PRODUCTION SETTINGS
-- ==================================================================================

-- Create scheduled job for cleanup (if using pg_cron extension)
-- SELECT cron.schedule('cleanup-apple-wallet-data', '0 2 * * *', 'SELECT cleanup_old_data();');

-- Grant appropriate permissions
-- Note: Adjust these based on your user roles
-- GRANT USAGE ON SCHEMA audit TO authenticated;
-- GRANT SELECT ON audit.operation_log TO authenticated;
-- GRANT EXECUTE ON FUNCTION system_health_check() TO authenticated;

-- Enable query performance insights
-- ALTER SYSTEM SET track_activities = on;
-- ALTER SYSTEM SET track_counts = on;
-- ALTER SYSTEM SET track_io_timing = on;

-- Success message
DO $$ 
BEGIN 
    RAISE NOTICE 'Production Apple Wallet system deployed successfully!';
    RAISE NOTICE 'Health check: %', system_health_check();
END $$;