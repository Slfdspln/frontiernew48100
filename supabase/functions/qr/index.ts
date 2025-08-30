// supabase/functions/qr/index.ts

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Types for our database tables
interface GuestPass {
  id: string;
  resident_id: string;
  guest_name: string;
  email?: string;
  visit_date: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  used_at?: string;
}

interface QRCode {
  id: string;
  token: string;
  pass_id: string;
  created_at: string;
  expires_at: string;
  used_at?: string;
  one_time_use: boolean;
}

// Environment variables
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const QR_JWT_SECRET = Deno.env.get("QR_JWT_SECRET") ?? "frontier_tower_secret";
const PUBLIC_BASE = Deno.env.get("QR_PUBLIC_BASE") ?? "https://frontiertower.vercel.app/verify";

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

// Generate a secure JWT token
async function generateToken(payload: Record<string, unknown>, expiryHours = 24): Promise<string> {
  const encoder = new TextEncoder();
  const expirySeconds = expiryHours * 60 * 60;
  
  // Create header and payload
  const header = { alg: "HS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expirySeconds;
  const fullPayload = { ...payload, iat: now, exp };
  
  // Base64 encode header and payload
  const base64Encode = (obj: Record<string, unknown>): string => {
    return btoa(JSON.stringify(obj))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");
  };
  
  const headerBase64 = base64Encode(header);
  const payloadBase64 = base64Encode(fullPayload);
  
  // Create signature
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(QR_JWT_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${headerBase64}.${payloadBase64}`)
  );
  
  // Convert signature to base64
  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  
  // Return the complete JWT token
  return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
}

// Verify a JWT token
interface TokenVerificationResult {
  valid: boolean;
  expired?: boolean;
  message?: string;
  payload?: Record<string, unknown>;
}

async function verifyToken(token: string): Promise<TokenVerificationResult> {
  try {
    const [headerBase64, payloadBase64, signatureBase64] = token.split(".");
    
    if (!headerBase64 || !payloadBase64 || !signatureBase64) {
      throw new Error("Invalid token format");
    }
    
    // Decode payload
    const payload = JSON.parse(
      atob(payloadBase64.replace(/-/g, "+").replace(/_/g, "/"))
    );
    
    // Check if token has expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return { valid: false, expired: true, message: "Token has expired" };
    }
    
    // Verify signature
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(QR_JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const signatureBytes = Uint8Array.from(
      atob(signatureBase64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );
    
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(`${headerBase64}.${payloadBase64}`)
    );
    
    if (!isValid) {
      return { valid: false, message: "Invalid token signature" };
    }
    
    return { valid: true, payload };
  } catch (error) {
    return { valid: false, message: (error as Error).message };
  }
}

// Helper function for JSON responses
function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization"
    }
  });
}

// Request handler types
interface GenerateQRRequest {
  passId: string;
  guestName: string;
  expiryHours?: number;
  oneTimeUse?: boolean;
}

interface VerifyQRRequest {
  token: string;
}

// Main handler function
serve(async (req: Request) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  
  const url = new URL(req.url);
  const path = url.pathname.split("/").pop() || "";
  
  try {
    // Generate QR code
    if (req.method === "POST" && path === "generate") {
      const { passId, guestName, expiryHours = 24, oneTimeUse = true } = await req.json() as GenerateQRRequest;
      
      if (!passId) {
        return jsonResponse({ error: "Pass ID is required" }, 400);
      }
      
      // Get user info from auth header (optional)
      let userId: string | null = null;
      const authHeader = req.headers.get("Authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        try {
          const token = authHeader.replace("Bearer ", "");
          const { data } = await supabase.auth.getUser(token);
          userId = data.user?.id || null;
        } catch (error) {
          console.error("Auth error:", error);
        }
      }
      
      // Generate token with pass information
      const token = await generateToken({
        passId,
        guestName,
        oneTimeUse
      }, expiryHours);
      
      // Calculate expiry time
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + expiryHours);
      
      // Store token in database
      const { error } = await supabase
        .from("qr_codes")
        .insert({
          token,
          pass_id: passId,
          expires_at: expiresAt.toISOString(),
          one_time_use: oneTimeUse
        });
      
      if (error) {
        console.error("Database error:", error);
        return jsonResponse({ error: "Failed to store QR code" }, 500);
      }
      
      // Create verification URL
      const scanUrl = `${PUBLIC_BASE}?token=${token}`;
      
      return jsonResponse({
        token,
        scanUrl,
        expiresAt: expiresAt.toISOString(),
        oneTimeUse
      });
    }
    
    // Verify QR code
    if (req.method === "POST" && path === "verify") {
      const { token } = await req.json() as VerifyQRRequest;
      
      if (!token) {
        return jsonResponse({ valid: false, message: "Token is required" }, 400);
      }
      
      // Verify the token
      const tokenVerification = await verifyToken(token);
      if (!tokenVerification.valid) {
        return jsonResponse(tokenVerification);
      }
      
      // Check if token exists in database
      const { data: qrCode, error: qrError } = await supabase
        .from("qr_codes")
        .select("*")
        .eq("token", token)
        .single();
      
      if (qrError || !qrCode) {
        return jsonResponse({ valid: false, message: "Invalid QR code" });
      }
      
      // Check if QR code has expired
      if (new Date(qrCode.expires_at) < new Date()) {
        return jsonResponse({ valid: false, expired: true, message: "QR code has expired" });
      }
      
      // Check if one-time use QR code has been used
      if (qrCode.one_time_use && qrCode.used_at) {
        return jsonResponse({ valid: false, message: "QR code has already been used" });
      }
      
      // Get guest pass details
      const { data: guestPass, error: passError } = await supabase
        .from("guest_passes")
        .select("*")
        .eq("id", qrCode.pass_id)
        .single();
      
      if (passError || !guestPass) {
        return jsonResponse({ valid: false, message: "Guest pass not found" });
      }
      
      // Mark QR code as used if it's one-time use
      if (qrCode.one_time_use) {
        await supabase
          .from("qr_codes")
          .update({ used_at: new Date().toISOString() })
          .eq("id", qrCode.id);
      }
      
      return jsonResponse({
        valid: true,
        guestData: guestPass,
        message: "QR code verified successfully"
      });
    }
    
    // Health check endpoint
    if (req.method === "GET" && path === "health") {
      return jsonResponse({ status: "ok" });
    }
    
    return jsonResponse({ error: "Endpoint not found" }, 404);
  } catch (error) {
    console.error("Error:", error);
    return jsonResponse({ error: (error as Error).message || "Internal server error" }, 500);
  }
});
