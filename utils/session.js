import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

const NAME = 'session';

export async function setSession(residentId) {
  const cookiesStore = await cookies();
  cookiesStore.set(NAME, residentId, { httpOnly:true, sameSite:'lax', secure:true, path:'/' });
}

export async function getSession() {
  try {
    const cookiesStore = await cookies();
    const sessionCookie = cookiesStore.get(NAME);
    if (!sessionCookie?.value) {
      return null;
    }

    // Verify JWT token
    const { payload } = await jwtVerify(
      sessionCookie.value,
      new TextEncoder().encode(process.env.SESSION_SECRET)
    );

    // Check if token is from the correct issuer and audience
    if (payload.iss !== 'frontiertowerguest.com' || payload.aud !== 'resident-session') {
      return null;
    }

    return {
      residentId: payload.residentId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      frontierUserId: payload.frontierUserId
    };
  } catch (error) {
    console.error('Session verification error:', error);
    return null;
  }
}
