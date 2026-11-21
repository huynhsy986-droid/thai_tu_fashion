import { SignJWT, jwtVerify, createRemoteJWKSet, decodeProtectedHeader, decodeJwt } from 'jose';

/**
 * Dịch vụ JWT. Định dạng token giống Supabase Auth: sub, email, role=authenticated, aud=authenticated.
 * - Có secret (JWT_SECRET hoặc SUPABASE_JWT_SECRET) → HS256.
 * - Có SUPABASE_URL → token ký bất đối xứng (ES256/RS256, mặc định của dự án Supabase mới) được xác minh bằng JWKS.
 *   Có cả hai thì chọn theo `alg` trong header: HS256 → secret, còn lại → JWKS.
 * - Token HS256 mà không cấu hình secret (dự án Supabase còn dùng JWT secret cũ) → hỏi Supabase Auth
 *   GET /auth/v1/user để xác minh, kết quả được nhớ tạm 60 s để không gọi mạng mỗi request.
 */
export function createTokenService({ jwtSecret, jwtTtl = 3600, supabaseUrl, supabaseAnonKey, fetchImpl = globalThis.fetch } = {}) {
  const secret = jwtSecret ? new TextEncoder().encode(jwtSecret) : null;
  const jwks = supabaseUrl ? createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', supabaseUrl)) : null;
  if (!secret && !jwks) throw new Error('Cần JWT secret hoặc SUPABASE_URL để xác minh token.');
  const cache = new Map();

  /** Xác minh token HS256 bằng chính Supabase Auth (không cần lộ JWT secret cho backend). */
  async function verifyRemote(token) {
    const hit = cache.get(token);
    if (hit && hit.until > Date.now()) return hit.user;
    const claims = decodeJwt(token);
    if (claims.aud !== 'authenticated' || claims.role !== 'authenticated' || !claims.sub) throw new Error('Token không hợp lệ.');
    if (claims.exp && claims.exp * 1000 < Date.now()) throw new Error('Token hết hạn.');
    const res = await fetchImpl(new URL('/auth/v1/user', supabaseUrl), { headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Supabase từ chối token.');
    const u = await res.json();
    if (u.id !== claims.sub) throw new Error('Token không hợp lệ.');
    const user = { id: u.id, email: u.email, exp: claims.exp };
    if (cache.size > 5000) cache.clear();
    cache.set(token, { user, until: Math.min(Date.now() + 60_000, (claims.exp || 0) * 1000) });
    return user;
  }

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
    /** Token phụ (local/CI): refresh 30 ngày, đặt lại mật khẩu 30 phút. Audience riêng → không dùng được thay access token. */
    async signAux(kind, user, extra = {}) {
      if (!secret) throw new Error('Không có secret để ký token.');
      const ttl = kind === 'refresh' ? 30 * 86400 : 1800;
      const now = Math.floor(Date.now() / 1000);
      return new SignJWT({ email: user.email, ...extra })
        .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
        .setSubject(user.id)
        .setAudience(`thaitu-${kind}`)
        .setIssuer('thai-tu-fashion')
        .setIssuedAt(now)
        .setExpirationTime(now + ttl)
        .setJti(crypto.randomUUID())
        .sign(secret);
    },
    async verifyAux(kind, token) {
      if (!secret) throw new Error('Không có secret.');
      const { payload } = await jwtVerify(token, secret, { audience: `thaitu-${kind}`, issuer: 'thai-tu-fashion', algorithms: ['HS256'] });
      if (!payload.sub) throw new Error('Token không hợp lệ.');
      return payload;
    },
    async verify(token) {
      let alg;
      try { alg = decodeProtectedHeader(token).alg; } catch { throw new Error('Token không hợp lệ.'); }
      if (alg === 'HS256' && !secret && supabaseUrl && supabaseAnonKey) return verifyRemote(token);
      const key = alg === 'HS256' ? secret : jwks;
      if (!key) throw new Error(`Không xác minh được token ${alg}.`);
      const { payload } = await jwtVerify(token, key, { audience: 'authenticated', algorithms: alg === 'HS256' ? ['HS256'] : ['ES256', 'RS256'] });
      if (!payload.sub || payload.role !== 'authenticated') throw new Error('Token không hợp lệ.');
      return { id: payload.sub, email: payload.email, exp: payload.exp };
    },
  };
}
