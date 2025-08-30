/**
 * PRODUCTION APPLE WALLET API
 * Enterprise-grade Apple Wallet pass generation with comprehensive
 * security, monitoring, audit logging, and error handling.
 */

import { NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { getSupa } from '@/utils/supabaseAdmin';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import sharp from 'sharp';

// Production configuration
const PRODUCTION_CONFIG = {
  passTypeIdentifier: 'pass.com.frontiertower.guestpass',
  teamIdentifier: '3UP2HQ3A3J',
  organizationName: 'Frontier Tower',
  description: 'Guest Access Pass',
  formatVersion: 1,
  maxPassesPerHour: 50,
  maxPassesPerDay: 500,
  certificateValidityDays: 365,
  securityLevel: 'enterprise'
};

const CERT_PATHS = {
  wwdr: path.join(process.cwd(), 'certificates/AppleWWDRCAG4.cer'),
  signerCert: path.join(process.cwd(), 'certificates/FrontierTowerPassV3.cer'),
  signerKey: path.join(process.cwd(), 'certificates/FrontierTowerPassV3_private.key'),
  signerKeyPassphrase: process.env.APPLE_CERT_PASSPHRASE || ''
};

/**
 * Production-grade security hash generation
 */
function generateProductionSecurityHash(passData) {
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(16).toString('hex');
  
  const hashInput = [
    passData.id,
    passData.guest_email,
    passData.resident_id,
    timestamp,
    nonce,
    process.env.APPLE_WALLET_SECRET
  ].join('|');
  
  return {
    hash: crypto.createHmac('sha256', process.env.APPLE_WALLET_SECRET)
      .update(hashInput)
      .digest('hex'),
    timestamp,
    nonce,
    version: '2.0'
  };
}

/**
 * Generate comprehensive QR data with enterprise security
 */
async function generateEnterpriseQRData(pass, resident, securityData) {
  return {
    // Core identification
    passId: pass.id,
    serialNumber: uuidv4(),
    
    // Guest information
    guestName: pass.guest_name,
    guestEmail: pass.guest_email,
    guestPhone: pass.guest_phone || 'Not provided',
    emergencyContact: pass.emergency_contact_phone || 'Not provided',
    
    // Host information
    hostName: resident.name,
    hostUnit: resident.unit_number || pass.unit_number || pass.floor,
    hostEmail: resident.email,
    residentId: pass.resident_id,
    
    // Visit details
    visitDate: pass.visit_date,
    validUntil: pass.expires_at,
    purpose: pass.purpose_of_visit || 'Visit',
    securityClearance: pass.security_clearance_level || 1,
    
    // Security data
    securityHash: securityData.hash,
    securityTimestamp: securityData.timestamp,
    securityNonce: securityData.nonce,
    securityVersion: securityData.version,
    
    // Compliance and audit
    buildingCode: 'FT001',
    passType: 'production_apple_wallet',
    complianceVersion: '2.0',
    riskScore: pass.risk_assessment_score || 0,
    complianceFlags: pass.compliance_flags || [],
    
    // Technical metadata
    generatedAt: new Date().toISOString(),
    apiVersion: '2.0',
    certificateFingerprint: await getCertificateFingerprint(),
    
    // Fraud prevention
    deviceBinding: false, // Can be enabled for high-security
    geoValidation: false,  // Can be enabled for location-based access
    timeWindow: 24 * 60 * 60 * 1000 // 24 hours in milliseconds
  };
}

/**
 * Get certificate fingerprint for security validation
 */
async function getCertificateFingerprint() {
  try {
    const cert = fs.readFileSync(CERT_PATHS.signerCert);
    return crypto.createHash('sha256').update(cert).digest('hex').substring(0, 16);
  } catch (error) {
    console.error('Certificate fingerprint generation failed:', error);
    return 'unknown';
  }
}

/**
 * Validate certificates and system prerequisites
 */
async function validateSystemPrerequisites() {
  const issues = [];
  
  // Check certificates
  for (const [name, path] of Object.entries(CERT_PATHS)) {
    if (name === 'signerKeyPassphrase') continue;
    if (!fs.existsSync(path)) {
      issues.push(`Missing certificate: ${name} at ${path}`);
    } else {
      const stats = fs.statSync(path);
      if (stats.size === 0) {
        issues.push(`Empty certificate file: ${name}`);
      }
    }
  }
  
  // Check environment variables
  const requiredEnvVars = [
    'APPLE_WALLET_SECRET',
    'NEXT_PUBLIC_SITE_URL',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      issues.push(`Missing environment variable: ${envVar}`);
    }
  }
  
  return issues;
}

/**
 * Record performance metrics
 */
async function recordMetrics(operation, duration, success, metadata = {}) {
  try {
    const supabase = getSupa();
    await supabase.from('system_performance_metrics').insert({
      metric_name: `apple_wallet_${operation}`,
      metric_value: duration,
      metric_unit: 'milliseconds',
      component: 'apple_wallet_api',
      endpoint: '/api/production/apple-wallet',
      operation: operation,
      tags: {
        success,
        ...metadata,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Failed to record metrics:', error);
  }
}

/**
 * Log security incident
 */
async function logSecurityIncident(type, severity, description, passId, clientIP, details = {}) {
  try {
    const supabase = getSupa();
    await supabase.rpc('log_security_incident', {
      p_incident_type: type,
      p_severity: severity,
      p_description: description,
      p_guest_pass_id: passId,
      p_source_ip: clientIP,
      p_technical_details: details
    });
  } catch (error) {
    console.error('Failed to log security incident:', error);
  }
}

/**
 * Rate limiting check
 */
async function checkRateLimit(clientIP) {
  const supabase = getSupa();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const { count } = await supabase
    .from('apple_wallet_passes')
    .select('*', { count: 'exact' })
    .gte('created_at', oneHourAgo.toISOString())
    .eq('creation_ip', clientIP);
  
  return count < PRODUCTION_CONFIG.maxPassesPerHour;
}

/**
 * Generate production Apple Wallet pass
 */
async function generateProductionPass(pass, resident, qrData, serialNumber, authToken) {
  const startTime = Date.now();
  
  try {
    const passData = {
      ...PRODUCTION_CONFIG,
      serialNumber: serialNumber,
      webServiceURL: `${process.env.NEXT_PUBLIC_SITE_URL}/api/production/apple-wallet/`,
      authenticationToken: authToken,
      relevantDate: new Date().toISOString(),
      expirationDate: new Date(pass.expires_at || pass.visit_date).toISOString(),
      
      generic: {
        headerFields: [{
          key: 'header',
          label: 'GUEST ACCESS',
          value: 'FRONTIER TOWER'
        }],
        primaryFields: [{
          key: 'guest',
          label: 'Guest',
          value: qrData.guestName
        }],
        secondaryFields: [
          {
            key: 'host',
            label: 'Host',
            value: `${qrData.hostName} - Unit ${qrData.hostUnit}`
          },
          {
            key: 'visitDate',
            label: 'Visit Date',
            value: new Date(qrData.visitDate).toLocaleDateString()
          },
          {
            key: 'security',
            label: 'Security Level',
            value: `Level ${qrData.securityClearance}`
          }
        ],
        auxiliaryFields: [
          {
            key: 'email',
            label: 'Contact',
            value: qrData.guestEmail
          },
          {
            key: 'purpose',
            label: 'Purpose',
            value: qrData.purpose
          }
        ],
        backFields: [
          {
            key: 'instructions',
            label: 'Instructions',
            value: 'Present this pass to building security for verification. This pass contains unique security codes and cannot be shared.'
          },
          {
            key: 'phone',
            label: 'Guest Phone',
            value: qrData.guestPhone
          },
          {
            key: 'emergency',
            label: 'Emergency Contact',
            value: qrData.emergencyContact
          },
          {
            key: 'security_notice',
            label: 'Security Notice',
            value: `This is a production security pass with Level ${qrData.securityClearance} clearance. Tampering or unauthorized use will be prosecuted.`
          },
          {
            key: 'compliance',
            label: 'Compliance',
            value: `Version ${qrData.complianceVersion} - Risk Score: ${qrData.riskScore}`
          },
          {
            key: 'support',
            label: 'Support',
            value: 'Security Desk: (510) 974-6838 | Emergency: 911'
          }
        ]
      },
      
      // Enhanced QR code with comprehensive data
      barcodes: [{
        format: 'PKBarcodeFormatQR',
        message: JSON.stringify(qrData),
        messageEncoding: 'iso-8859-1'
      }],
      
      // Location relevance
      locations: process.env.BUILDING_LAT && process.env.BUILDING_LNG ? [{
        latitude: parseFloat(process.env.BUILDING_LAT),
        longitude: parseFloat(process.env.BUILDING_LNG),
        relevantText: 'Welcome to Frontier Tower - Present pass to security'
      }] : undefined
    };
    
    const pkPass = await PKPass.from({
      model: passData,
      certificates: {
        wwdr: fs.readFileSync(CERT_PATHS.wwdr),
        signerCert: fs.readFileSync(CERT_PATHS.signerCert),
        signerKey: fs.readFileSync(CERT_PATHS.signerKey),
        signerKeyPassphrase: CERT_PATHS.signerKeyPassphrase
      }
    });
    
    // Production visual styling
    pkPass.backgroundColor = 'rgb(15, 23, 42)';
    pkPass.foregroundColor = 'rgb(255, 255, 255)';
    pkPass.labelColor = 'rgb(148, 163, 184)';
    
    // Add enhanced icon
    const icon = await createProductionIcon();
    pkPass.addBuffer('icon.png', icon);
    pkPass.addBuffer('icon@2x.png', icon);
    pkPass.addBuffer('icon@3x.png', icon);
    
    const duration = Date.now() - startTime;
    await recordMetrics('pass_generation', duration, true, {
      passId: pass.id,
      securityLevel: qrData.securityClearance
    });
    
    return pkPass.getAsBuffer();
    
  } catch (error) {
    const duration = Date.now() - startTime;
    await recordMetrics('pass_generation', duration, false, {
      error: error.message,
      passId: pass.id
    });
    throw error;
  }
}

/**
 * Create production-quality icon
 */
async function createProductionIcon() {
  const svg = `
    <svg width="87" height="87" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="87" height="87" fill="url(#grad)" rx="12"/>
      <text x="43.5" y="35" font-family="Arial, sans-serif" font-size="16" font-weight="bold" fill="white" text-anchor="middle">FT</text>
      <text x="43.5" y="50" font-family="Arial, sans-serif" font-size="8" fill="#94a3b8" text-anchor="middle">GUEST</text>
      <text x="43.5" y="62" font-family="Arial, sans-serif" font-size="8" fill="#64748b" text-anchor="middle">ACCESS</text>
      <text x="43.5" y="74" font-family="Arial, sans-serif" font-size="6" fill="#475569" text-anchor="middle">PRODUCTION</text>
    </svg>
  `;
  
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/**
 * Main API endpoint
 */
export async function POST(request) {
  const requestId = uuidv4();
  const startTime = Date.now();
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';
  const userAgent = request.headers.get('user-agent') || 'unknown';
  
  try {
    // System validation
    const systemIssues = await validateSystemPrerequisites();
    if (systemIssues.length > 0) {
      await logSecurityIncident(
        'system_configuration_error',
        4,
        'System prerequisites not met',
        null,
        clientIP,
        { issues: systemIssues, requestId }
      );
      
      return NextResponse.json({
        error: 'System configuration error',
        message: 'Service temporarily unavailable',
        requestId
      }, { status: 503 });
    }
    
    // Rate limiting
    const rateLimitOk = await checkRateLimit(clientIP);
    if (!rateLimitOk) {
      await logSecurityIncident(
        'rate_limit_exceeded',
        2,
        'Rate limit exceeded for Apple Wallet generation',
        null,
        clientIP,
        { requestId }
      );
      
      return NextResponse.json({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        requestId
      }, { status: 429 });
    }
    
    // Parse request
    const { passId } = await request.json();
    
    if (!passId) {
      await logSecurityIncident(
        'invalid_request',
        1,
        'Missing passId in Apple Wallet request',
        null,
        clientIP,
        { requestId }
      );
      
      return NextResponse.json({
        error: 'Invalid request',
        message: 'Pass ID is required',
        requestId
      }, { status: 400 });
    }
    
    const supabase = getSupa();
    
    // Get pass with comprehensive data
    const { data: pass, error: passError } = await supabase
      .from('guest_passes')
      .select(`
        *,
        resident:resident_id (
          name,
          email,
          phone,
          unit_number
        )
      `)
      .eq('id', passId)
      .single();
    
    if (passError || !pass) {
      await logSecurityIncident(
        'pass_not_found',
        3,
        'Requested pass not found',
        passId,
        clientIP,
        { error: passError, requestId }
      );
      
      return NextResponse.json({
        error: 'Pass not found',
        message: 'The requested guest pass does not exist',
        requestId
      }, { status: 404 });
    }
    
    // Security validation
    if (pass.status !== 'scheduled' && pass.status !== 'active') {
      await logSecurityIncident(
        'invalid_pass_status',
        3,
        `Attempt to generate wallet pass for ${pass.status} pass`,
        passId,
        clientIP,
        { status: pass.status, requestId }
      );
      
      return NextResponse.json({
        error: 'Invalid pass status',
        message: `Cannot generate wallet pass for ${pass.status} pass`,
        requestId
      }, { status: 403 });
    }
    
    // Check expiration
    const now = new Date();
    const expiresAt = new Date(pass.expires_at || pass.visit_date);
    if (now > expiresAt) {
      return NextResponse.json({
        error: 'Pass expired',
        message: 'This guest pass has expired',
        requestId
      }, { status: 410 });
    }
    
    // Generate security data
    const securityData = generateProductionSecurityHash({
      id: pass.id,
      guest_email: pass.guest_email,
      resident_id: pass.resident_id
    });
    
    // Generate comprehensive QR data
    const qrData = await generateEnterpriseQRData(pass, pass.resident, securityData);
    
    // Generate unique identifiers
    const serialNumber = uuidv4();
    const authToken = crypto.randomBytes(32).toString('hex');
    
    // Generate the pass
    const walletPassBuffer = await generateProductionPass(
      pass, 
      pass.resident, 
      qrData, 
      serialNumber, 
      authToken
    );
    
    // Store comprehensive tracking data
    await supabase.from('apple_wallet_passes').upsert({
      guest_pass_id: pass.id,
      serial_number: serialNumber,
      auth_token: authToken,
      security_hash: securityData.hash,
      certificate_fingerprint: await getCertificateFingerprint(),
      encryption_key_version: 1,
      compliance_version: '2.0',
      creation_ip: clientIP,
      creation_user_agent: userAgent,
      metadata: {
        requestId,
        securityLevel: pass.security_clearance_level || 1,
        riskScore: pass.risk_assessment_score || 0,
        apiVersion: '2.0',
        generatedVia: 'production_api'
      }
    }, {
      onConflict: 'guest_pass_id'
    });
    
    // Record successful generation
    const duration = Date.now() - startTime;
    await recordMetrics('api_request', duration, true, {
      passId: pass.id,
      securityLevel: pass.security_clearance_level || 1,
      clientIP
    });
    
    const filename = `FrontierTower_${(pass.guest_name || 'Guest').replace(/\s+/g, '_')}_Production_${pass.id.slice(0, 8)}.pkpass`;
    
    return new NextResponse(walletPassBuffer, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Request-ID': requestId,
        'X-Security-Level': (pass.security_clearance_level || 1).toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
  } catch (error) {
    console.error('Production Apple Wallet generation error:', error);
    
    const duration = Date.now() - startTime;
    await recordMetrics('api_request', duration, false, {
      error: error.message,
      clientIP
    });
    
    await logSecurityIncident(
      'system_error',
      5,
      'Critical error in Apple Wallet generation',
      null,
      clientIP,
      { 
        error: error.message,
        stack: error.stack,
        requestId
      }
    );
    
    return NextResponse.json({
      error: 'Internal server error',
      message: 'Failed to generate Apple Wallet pass',
      requestId,
      support: 'Contact security desk at (510) 974-6838'
    }, { status: 500 });
  }
}