// Checks a Supabase Auth session token against the project's public signing keys (JWKS),
// so nothing here holds a secret that could mint a token (from Crew Clock). Needed only in
// functions with verify_jwt = false; with the gateway check on, use userClient() in db.ts.
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyGetKey } from 'jsr:@panva/jose@6';
import { HttpError } from './http.ts';

// Only asymmetric algorithms: a token "signed" with HS256 or alg none is refused outright.
// Rotate the project to asymmetric keys first (Project Settings > JWT Keys).
const ALGORITHMS = ['ES256', 'RS256'];

export async function verifyToken(token: string, keys: JWTVerifyGetKey, issuer: string): Promise<JWTPayload & { sub: string }> {
  try {
    const { payload } = await jwtVerify(token, keys, { algorithms: ALGORITHMS, issuer, audience: 'authenticated' });
    if (!payload.sub) throw new Error('no subject');
    return payload as JWTPayload & { sub: string };
  } catch (_e) {
    throw new HttpError(401, 'Sign in again');
  }
}

let jwks: JWTVerifyGetKey | null = null;

// The signed-in user making this request.
export function session(req: Request) {
  const url = Deno.env.get('SUPABASE_URL')!;
  // Keys are fetched once per instance and refetched when an unknown key id shows up (after a rotation).
  jwks = jwks || createRemoteJWKSet(new URL(`${url}/auth/v1/.well-known/jwks.json`));
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  return verifyToken(token, jwks, Deno.env.get('AUTH_ISSUER') || `${url}/auth/v1`);
}
