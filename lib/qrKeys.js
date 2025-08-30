// Server-only QR key management (no 'use server' needed for utilities)
const KEYSET = {
  k1: process.env.QR_KEY_K1, // active
  k0: process.env.QR_KEY_K0, // previous (verify-only during rotation window)
};

export const ACTIVE_KID = process.env.QR_ACTIVE_KID || 'k1';

export function getSigningKey(kid) {
  const s = KEYSET[kid];
  if (!s) throw new Error(`Unknown kid ${kid}`);
  return new TextEncoder().encode(s);
}
