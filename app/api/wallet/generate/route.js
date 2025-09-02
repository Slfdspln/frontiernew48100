import { NextResponse } from 'next/server';
import path from 'path';
import { PKPass } from 'passkit-generator';
import { getSupa } from '@/utils/supabaseAdmin';
import { getPasskitCreds } from '@/lib/passkit-creds';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { passId, guestName, hostName, unit, expiresAt } = await req.json();

    if (!passId || !guestName) {
      return NextResponse.json({ error: "passId and guestName are required" }, { status: 400 });
    }

    // Build the QR payload your scanners will validate
    const qrMessage = `${process.env.QR_PUBLIC_BASE || process.env.NEXT_PUBLIC_APP_URL}/verify?token=${encodeURIComponent(passId)}`;

    // Load credentials + model
    const creds = getPasskitCreds();
    const modelPath = path.join(process.cwd(), "passkit", "model.pass");

    console.log('Creating pass with model path:', modelPath);

    // Create a pass from the model, overriding template fields
    const pass = await PKPass.from(
      {
        model: modelPath,
        certificates: {
          wwdr: creds.wwdr,
          signerP12: creds.signerP12,
          signerP12Password: creds.signerP12Password || undefined,
        },
      },
      {
        // per-pass payload
        serialNumber: passId, // must be unique
        passTypeIdentifier: creds.passTypeIdentifier,
        teamIdentifier: creds.teamIdentifier,

        // Update visible fields
        barcode: { message: qrMessage },
        relevantLocations: [
          { 
            latitude: Number(process.env.BUILDING_LAT || 37.7749), 
            longitude: Number(process.env.BUILDING_LNG || -122.4194) 
          }
        ],
        generic: {
          primaryFields: [{ key: "guest", label: "GUEST", value: guestName }],
          secondaryFields: [
            { key: "unit", label: "UNIT", value: unit || "—" },
            { key: "expires", label: "EXPIRES", value: expiresAt ? new Date(expiresAt).toLocaleString() : "—" }
          ],
          auxiliaryFields: [{ key: "host", label: "HOST", value: hostName || "—" }]
        }
      }
    );

    const pkpassBuffer = await pass.getAsBuffer();

    const supa = getSupa();

    // Upload to Supabase Storage
    const filePath = `passes/${passId}.pkpass`;
    const { error: uploadErr } = await supa.storage
      .from("wallet")
      .upload(filePath, pkpassBuffer, {
        contentType: "application/vnd.apple.pkpass",
        upsert: true,
      });

    if (uploadErr) {
      console.error('Upload error:', uploadErr);
      throw uploadErr;
    }

    // Get a public URL (configure the bucket as public, or sign URLs)
    const { data: publicData } = supa.storage.from("wallet").getPublicUrl(filePath);
    const walletUrl = publicData?.publicUrl;

    // Save URL on the record
    const { error: updateErr } = await supa
      .from("guest_passes")
      .update({ 
        extended_data: { 
          wallet_url: walletUrl 
        }
      })
      .eq("id", passId);

    if (updateErr) {
      console.error('Database update error:', updateErr);
    }

    return NextResponse.json({ walletUrl });
  } catch (err) {
    console.error("Wallet generate error:", err);
    return NextResponse.json({ 
      error: err.message || "Failed to generate Wallet pass" 
    }, { status: 500 });
  }
}