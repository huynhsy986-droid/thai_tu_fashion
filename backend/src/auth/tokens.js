import { SignJWT, jwtVerify, createRemoteJWKSet } from 'jose';

/**
 * Dịch vụ JWT. Định dạng token giống Supabase Auth: sub, email, role=authenticated, aud=authenticated.
 * - Có secret (JWT_SECRET hoặc SUPABASE_JWT_SECRET) → HS256.
 * - Không có secret mà có SUPABASE_URL → xác minh bằng JWKS của Supabase (khoá bất đối xứng).
 */
export function createTokenService({ jwtSecret, jwtTtl = 3600, supabaseUrl } = {}) {
  const secret = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;
  const jwks = !secret && supabaseUrl ? createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', supabaseUrl)) : null;
  if (!secret && !jwks) throw new Error('Cần JWT secret hoặc SUPABASE_URL để xác minh token.');

  return {
    canSign: Boolean(secret),
    async sign(user, ttl = jwtTtl) {
      if (!secret) throw new Error('Không có secret để ký token.');
      const now = Math.floor(Date.now() / 1000);
      const token = await new SignJWT({ email: user.email, role: 'authenticated', app_metadata: { provider: 'email' } })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(user.id)
        .setAudience('authenticated')
        .setIssuer('thai-tu-fashion')
        .setIssuedAt(now)
        .setExpirationTime(now + ttl)
        .sign(secret);
      return { accessToken: token, expiresAt: now + ttl };
    },
    async verify(token) {
      const { payload } = await jwtVerify(token, secret || jwks, { audience: 'authenticated' });
      if (!payload.sub || payload.role !== 'authenticated') throw new Error('Token không hợp lệ.');
      return { id: payload.sub, email: payload.email, exp: payload.exp };
    },
  };
}
