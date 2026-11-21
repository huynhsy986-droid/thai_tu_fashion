import { describe, it, expect } from 'vitest';
import { SignJWT } from 'jose';
import { createTokenService } from '../../src/auth/tokens.js';

const SECRET = 'unit-secret-0123456789-abcdefghijklmnop';
const svc = createTokenService({ jwtSecret: SECRET, jwtTtl: 60 });
const user = { id: '00000000-0000-4000-8000-000000000001', email: 'a@b.vn' };

describe('token service (ADR-05)', () => {
  it('AC-AUTH-02 ký và xác minh token định dạng Supabase', async () => {
    const { accessToken, expiresAt } = await svc.sign(user);
    expect(expiresAt).toBeGreaterThan(Date.now() / 1000);
    const payload = JSON.parse(Buffer.from(accessToken.split('.')[1], 'base64url').toString());
    expect(payload).toMatchObject({ sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated' });
    await expect(svc.verify(accessToken)).resolves.toMatchObject({ id: user.id, email: user.email });
  });

  it('AC-AUTH-03 từ chối token sai chữ ký', async () => {
    const other = createTokenService({ jwtSecret: 'another-secret-0123456789-abcdefghijkl' });
    const { accessToken } = await other.sign(user);
    await expect(svc.verify(accessToken)).rejects.toThrow();
  });

  it('AC-AUTH-03 từ chối token hết hạn', async () => {
    const { accessToken } = await svc.sign(user, -10);
    await expect(svc.verify(accessToken)).rejects.toThrow();
  });

  it('AC-AUTH-03 từ chối token anon/sai audience', async () => {
    const key = new TextEncoder().encode(SECRET);
    const anon = await new SignJWT({ role: 'anon' }).setProtectedHeader({ alg: 'HS256' }).setAudience('authenticated').setSubject('x').setExpirationTime('1h').sign(key);
    await expect(svc.verify(anon)).rejects.toThrow();
    const badAud = await new SignJWT({ role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' }).setAudience('other').setSubject('x').setExpirationTime('1h').sign(key);
    await expect(svc.verify(badAud)).rejects.toThrow();
  });

  it('không có secret lẫn SUPABASE_URL → lỗi cấu hình', () => {
    expect(() => createTokenService({})).toThrow();
  });

  it('chế độ JWKS (Supabase) không ký được token', async () => {
    const jwksSvc = createTokenService({ supabaseUrl: 'https://abc.supabase.co' });
    expect(jwksSvc.canSign).toBe(false);
    await expect(jwksSvc.sign(user)).rejects.toThrow();
  });
});
