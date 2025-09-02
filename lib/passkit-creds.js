export function getPasskitCreds() {
  const p12b64 = process.env.PASSKIT_CERT_P12_BASE64;
  const wwdrPem = process.env.APPLE_WWDR_PEM;
  if (!p12b64) throw new Error("PASSKIT_CERT_P12_BASE64 missing");
  if (!wwdrPem) throw new Error("APPLE_WWDR_PEM missing");
  
  return {
    passTypeIdentifier: process.env.PASS_TYPE_IDENTIFIER || 'pass.com.frontiertower.guestpass',
    teamIdentifier: process.env.APPLE_TEAM_ID || '3UP2HQ3A3J',
    signerP12: Buffer.from(p12b64, "base64"),
    signerP12Password: process.env.PASSKIT_CERT_PASSWORD || '',
    wwdr: wwdrPem,
  };
}