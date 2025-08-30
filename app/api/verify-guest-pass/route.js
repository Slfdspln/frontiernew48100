import { NextResponse } from 'next/server';
import { getSupa } from '@/utils/supabaseAdmin';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { qrCodeData } = await request.json();
    
    let parsedData;
    try {
      parsedData = JSON.parse(qrCodeData);
    } catch (parseError) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid QR code format',
        displayError: 'Invalid guest pass QR code'
      }, { status: 400 });
    }
    
    // Verify required fields for enhanced security
    const requiredFields = ['passId', 'guestName', 'guestEmail', 'securityHash', 'residentId'];
    const missingFields = requiredFields.filter(field => !parsedData[field]);
    
    if (missingFields.length > 0) {
      return NextResponse.json({ 
        valid: false, 
        error: `Missing: ${missingFields.join(', ')}`,
        displayError: 'Incomplete guest pass data'
      }, { status: 400 });
    }
    
    const supabase = getSupa();
    
    // Get pass from database with resident info
    const { data: passRecord, error: passError } = await supabase
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
      .eq('id', parsedData.passId)
      .single();
    
    if (passError || !passRecord) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Pass not found',
        displayError: 'Guest pass not found in system'
      }, { status: 404 });
    }
    
    // Check if pass was already used (prevent reuse)
    const { data: usageCheck } = await supabase
      .from('pass_usage_log')
      .select('used_at')
      .eq('guest_pass_id', parsedData.passId)
      .eq('security_hash', parsedData.securityHash)
      .single();
    
    if (usageCheck) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Pass already used',
        displayError: 'This guest pass was already used for entry'
      }, { status: 409 });
    }
    
    // Verify guest information matches exactly
    const guestName = passRecord.guest_name || 'Guest';
    const guestEmail = passRecord.guest_email || passRecord.guests?.email;
    const guestPhone = passRecord.guest_phone || passRecord.guests?.phone;
    
    if (guestName !== parsedData.guestName ||
        guestEmail !== parsedData.guestEmail) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Guest info mismatch',
        displayError: 'Guest information does not match records'
      }, { status: 403 });
    }
    
    // Verify resident ID matches
    if (passRecord.resident_id !== parsedData.residentId) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Resident verification failed',
        displayError: 'Host verification failed'
      }, { status: 403 });
    }
    
    // Verify security hash
    const expectedHash = crypto
      .createHash('sha256')
      .update(`${parsedData.passId}_${parsedData.guestEmail}_${parsedData.residentId}_${process.env.APPLE_WALLET_SECRET}`)
      .digest('hex')
      .substring(0, 16);
    
    if (expectedHash !== parsedData.securityHash) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Invalid security code',
        displayError: 'Security verification failed'
      }, { status: 403 });
    }
    
    // Check expiration
    const now = new Date();
    const validUntil = new Date(parsedData.validUntil || passRecord.expires_at || passRecord.visit_date);
    if (now > validUntil) {
      return NextResponse.json({ 
        valid: false, 
        error: 'Pass expired',
        displayError: 'Guest pass has expired'
      }, { status: 410 });
    }
    
    // Check if pass is in correct status
    if (passRecord.status !== 'scheduled' && passRecord.status !== 'active') {
      return NextResponse.json({ 
        valid: false, 
        error: `Pass status: ${passRecord.status}`,
        displayError: `Pass is ${passRecord.status}`
      }, { status: 403 });
    }
    
    // Log the successful verification
    await supabase.from('pass_usage_log').insert({
      guest_pass_id: parsedData.passId,
      security_hash: parsedData.securityHash,
      used_at: new Date().toISOString(),
      verification_method: parsedData.passType === 'apple_wallet' ? 'apple_wallet' : 'web',
      verified_by: 'security_guard',
      ip_address: request.headers.get('x-forwarded-for') || 'unknown',
      user_agent: request.headers.get('user-agent') || 'unknown'
    });
    
    // Update pass status to checked_in
    await supabase
      .from('guest_passes')
      .update({ 
        status: 'checked_in',
        checked_in_at: new Date().toISOString()
      })
      .eq('id', parsedData.passId);
    
    // Return security guard display data
    return NextResponse.json({
      valid: true,
      securityGuardView: {
        // Primary info for security guard
        guestName: passRecord.guest_name || 'Guest',
        guestEmail: guestEmail || 'Not provided',
        guestPhone: guestPhone || 'Not provided',
        hostName: passRecord.resident?.name || 'Resident',
        hostUnit: passRecord.resident?.unit_number || passRecord.unit_number || passRecord.floor || 'Lobby',
        visitDate: passRecord.visit_date,
        validUntil: parsedData.validUntil || passRecord.expires_at,
        verificationTime: new Date().toISOString(),
        passStatus: 'APPROVED - ALLOW ENTRY'
      },
      adminView: {
        // Additional admin-only details
        passId: passRecord.id,
        createdAt: passRecord.created_at,
        residentEmail: passRecord.resident?.email,
        residentPhone: passRecord.resident?.phone,
        residentId: passRecord.resident_id,
        securityHash: parsedData.securityHash,
        verificationSource: parsedData.passType || 'web',
        buildingCode: parsedData.buildingCode || 'FT001'
      }
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ 
      valid: false, 
      error: 'System error',
      displayError: 'Verification system temporarily unavailable'
    }, { status: 500 });
  }
}