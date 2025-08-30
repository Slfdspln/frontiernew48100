// utils/frontierClient.js - server-only (no 'use server' needed for utilities)
const BASE = 'https://webfront-service-staging-221047034374.us-central1.run.app';
const API_KEY = process.env.FRONTIER_API_KEY;

async function svc(path, method='GET', body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${API_KEY}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Frontier ${method} ${path} ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

async function xApiKey(path, method='GET', body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  if (!r.ok) throw new Error(`Frontier(X-API-Key) ${method} ${path} ${r.status}: ${await r.text()}`);
  return r.status === 204 ? null : r.json();
}

async function bearer(path, access, method='GET', body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type':'application/json', Authorization: `Bearer ${access}` },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  if (!r.ok) throw new Error(`Frontier(Bearer) ${method} ${path} ${r.status}: ${await r.text()}`);
  return r.json();
}

export const Frontier = {
  sendLoginCode: (email) => svc('/auth/login/code/', 'POST', { email }),
  verifyLoginCode: (code)  => svc('/auth/login/code/', 'PUT',  { code }),
  refresh: (refresh)       => svc('/auth/login/refresh/', 'POST', { refresh }),
  meProfile: (access)      => bearer('/auth/profiles/me/', access),
  getUserDetails: (userId) => svc(`/auth/users/${userId}/`),
  getAllUsers: () => svc('/auth/users/'),
  getAllProfiles: () => svc('/auth/profiles/'),
  getProfile: (profileId) => svc(`/auth/profiles/${profileId}/`),
  getAllCommunities: () => svc('/communities/'),
  // Subscription checking with Bearer token
  getUserSubscriptions: (access) => bearer('/auth/subscriptions/', access),
  // Try X-API-Key format as shown in documentation
  getMeWithXApiKey: () => xApiKey('/auth/users/me/'),
  getUsersWithXApiKey: () => xApiKey('/auth/users/'),
  getProfilesWithXApiKey: () => xApiKey('/auth/profiles/'),
  // if you later get perms for access passes:
  // listAccessPasses: (qs='') => svc(`/offices/access-passes/${qs ? '?' + qs : ''}`)
};
