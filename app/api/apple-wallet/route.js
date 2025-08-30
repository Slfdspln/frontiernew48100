import { NextResponse } from 'next/server';
import { PKPass } from 'passkit-generator';
import { getSupa } from '@/utils/supabaseAdmin';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import QRCode from 'qrcode';
import sharp from 'sharp';

const CERT_PATHS = {
  wwdr: path.join(process.cwd(), 'certificates/AppleWWDRCAG4.cer'),
  signerCert: path.join(process.cwd(), 'certificates/FrontierTowerPassV3.cer'),
  signerKey: path.join(process.cwd(), 'certificates/FrontierTowerPassV3_private.key'),
  signerKeyPassphrase: ''
};

const PASS_CONFIG = {
  passTypeIdentifier: 'pass.com.frontiertower.guestpass',
  teamIdentifier: '3UP2HQ3A3J',
  organizationName: 'Frontier Tower',
  description: 'Guest Access Pass',
  formatVersion: 1,
  backgroundColor: 'rgb(25, 25, 25)',
  foregroundColor: 'rgb(255, 255, 255)',
  labelColor: 'rgb(255, 255, 255)'
};

// Generate unique, permanent QR code for each guest pass
function generateUniqueQRData(passData) {
  const securityHash = crypto
    .createHash('sha256')
    .update(`${passData.id}_${passData.guest_email}_${passData.resident_id}_${process.env.APPLE_WALLET_SECRET}`)
    .digest('hex')
    .substring(0, 16);
  
  return {
    passId: passData.id,
    guestName: passData.guest_name,
    guestEmail: passData.guest_email,
    guestPhone: passData.guest_phone || 'Not provided',
    hostName: passData.host_name,
    hostUnit: passData.unit_number || passData.floor,
    visitDate: passData.visit_date,
    validUntil: passData.expires_at || passData.visit_date,
    residentId: passData.resident_id,
    securityHash: securityHash,
    buildingCode: 'FT001',
    passType: 'apple_wallet'
  };
}

export async function POST(request) {
  try {
    const { passId } = await request.json();
    
    if (!passId) {
      return NextResponse.json({ error: 'Pass ID required' }, { status: 400 });
    }

    const supabase = getSupa();
    
    // Get pass data with resident info
    const { data: pass, error } = await supabase
      .from('guest_passes')
      .select(`
        *,
        resident:resident_id (
          name,
          email,
          unit_number
        )
      `)
      .eq('id', passId)
      .single();

    if (error || !pass) {
      return NextResponse.json({ error: 'Pass not found' }, { status: 404 });
    }

    // Generate unique QR code data for this pass
    const qrData = generateUniqueQRData({
      id: pass.id,
      guest_name: pass.guest_name || 'Guest',
      guest_email: pass.guest_email || 'guest@example.com',
      guest_phone: pass.guest_phone,
      host_name: pass.resident?.name || pass.host_name || 'Resident',
      unit_number: pass.resident?.unit_number || pass.unit_number || pass.floor || 'Lobby',
      visit_date: pass.visit_date,
      expires_at: pass.expires_at,
      resident_id: pass.resident_id
    });

    // Generate unique serial number and auth token for this wallet pass
    const serialNumber = uuidv4();
    const authToken = crypto.randomBytes(32).toString('hex');

    // Create Apple Wallet pass
    const walletPassBuffer = await generateEnhancedAppleWalletPass(pass, qrData, serialNumber, authToken);

    // Store wallet pass info in database
    await supabase.from('apple_wallet_passes').upsert({
      guest_pass_id: pass.id,
      serial_number: serialNumber,
      auth_token: authToken,
      security_hash: qrData.securityHash,
      created_at: new Date().toISOString()
    }, {
      onConflict: 'guest_pass_id'
    });

    return new NextResponse(walletPassBuffer, {
      headers: {
        'Content-Type': 'application/vnd.apple.pkpass',
        'Content-Disposition': `attachment; filename="FrontierTower_${(pass.guest_name || 'Guest').replace(/\s+/g, '_')}_${pass.id.slice(0, 8)}.pkpass"`
      }
    });

  } catch (error) {
    console.error('Apple Wallet pass generation error:', error);
    return NextResponse.json({ 
      error: 'Failed to generate pass', 
      details: error.message 
    }, { status: 500 });
  }
}

async function generateEnhancedAppleWalletPass(pass, qrData, serialNumber, authToken) {
  const currentDate = new Date();
  const expirationDate = new Date(pass.expires_at || pass.visit_date || Date.now() + 24 * 60 * 60 * 1000);

  const passData = {
    ...PASS_CONFIG,
    serialNumber: serialNumber,
    webServiceURL: `${process.env.NEXT_PUBLIC_SITE_URL}/api/apple-wallet/`,
    authenticationToken: authToken,
    relevantDate: currentDate.toISOString(),
    expirationDate: expirationDate.toISOString(),
    
    generic: {
      headerFields: [
        {
          key: 'header',
          label: 'GUEST ACCESS',
          value: 'FRONTIER TOWER'
        }
      ],
      primaryFields: [
        {
          key: 'guest',
          label: 'Guest',
          value: qrData.guestName
        }
      ],
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
        }
      ],
      auxiliaryFields: [
        {
          key: 'email',
          label: 'Contact',
          value: qrData.guestEmail
        },
        {
          key: 'security',
          label: 'Security',
          value: `Code: ${qrData.securityHash.substring(0, 8).toUpperCase()}`
        }
      ],
      backFields: [
        {
          key: 'instructions',
          label: 'Instructions',
          value: 'Present this pass to building security for verification.'
        },
        {
          key: 'phone',
          label: 'Guest Phone',
          value: qrData.guestPhone
        },
        {
          key: 'security_notice',
          label: 'Security Notice',
          value: 'This pass contains unique security codes. Each pass is single-use and person-specific.'
        },
        {
          key: 'contact',
          label: 'Emergency Contact',
          value: 'Security Desk: (510) 974-6838'
        }
      ]
    },

    // Enhanced QR code with unique security data
    barcodes: [
      {
        format: 'PKBarcodeFormatQR',
        message: JSON.stringify(qrData),
        messageEncoding: 'iso-8859-1'
      }
    ],

    locations: process.env.BUILDING_LAT && process.env.BUILDING_LNG ? [
      {
        latitude: parseFloat(process.env.BUILDING_LAT),
        longitude: parseFloat(process.env.BUILDING_LNG),
        relevantText: 'Welcome to Frontier Tower'
      }
    ] : undefined
  };

  // Check if certificates exist
  const certificatesExist = Object.values(CERT_PATHS).every(certPath => {
    try {
      return fs.existsSync(certPath);
    } catch {
      return false;
    }
  });

  if (!certificatesExist) {
    throw new Error('Apple certificates not found. Please add certificates to the /certificates directory.');
  }

  const pkPass = await PKPass.from({
    model: passData,
    certificates: {
      wwdr: fs.readFileSync(CERT_PATHS.wwdr),
      signerCert: fs.readFileSync(CERT_PATHS.signerCert),
      signerKey: fs.readFileSync(CERT_PATHS.signerKey),
      signerKeyPassphrase: CERT_PATHS.signerKeyPassphrase
    }
  });

  // Set enhanced visual styling
  pkPass.backgroundColor = 'rgb(15, 23, 42)';
  pkPass.foregroundColor = 'rgb(255, 255, 255)';
  pkPass.labelColor = 'rgb(148, 163, 184)';

  const defaultIcon = await createDefaultIcon();
  pkPass.addBuffer('icon.png', defaultIcon);
  pkPass.addBuffer('icon@2x.png', defaultIcon);
  pkPass.addBuffer('icon@3x.png', defaultIcon);

  return pkPass.getAsBuffer();
}

async function createDefaultIcon() {
  const svg = `
    <svg width="87" height="87" xmlns="http://www.w3.org/2000/svg">
      <rect width="87" height="87" fill="#0f172a" rx="12"/>
      <text x="43.5" y="45" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">FT</text>
      <text x="43.5" y="60" font-family="Arial, sans-serif" font-size="7" fill="#94a3b8" text-anchor="middle">GUEST</text>
      <text x="43.5" y="72" font-family="Arial, sans-serif" font-size="6" fill="#64748b" text-anchor="middle">PASS</text>
    </svg>
  `;
  
  return sharp(Buffer.from(svg)).png().toBuffer();
}