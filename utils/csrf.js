// utils/csrf.js
import crypto from 'crypto';

export function issueCsrf() { 
  return crypto.randomBytes(16).toString('hex'); 
}

export function checkCsrf(req, cookieStore) {
  const token = req.headers.get('x-csrf-token');
  const cookie = cookieStore.get('csrf')?.value;
  return token && cookie && token === cookie;
}
