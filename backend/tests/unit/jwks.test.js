import http from 'node:http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';
import { createTokenService } from '../../src/auth/tokens.js';

/**
 * Dự án Supabase mới ký access token bằng khoá bất đối xứng (ES256) và công bố khoá công khai tại
 * <SUPABASE_URL>/auth/v1/.well-known/jwks.json. Test dựng một máy chủ JWKS giả để kiểm đường xác minh này.
 */
let server;
let url;
let priv;
let other;
const KID = 'test-key-1';

beforeAll(async () => {
  const kp = await generateKeyPair('ES256');
  priv = kp.privateKey;
  other = (await generateKeyPair('ES256')).privateKey;
  const jwk = { ...(await exportJWK(kp.publicKey)), kid: KID, alg: 'ES256', use: 'sig' };
  server = http.createServer((req, res) => {
    if (req.url === '/auth/v1/.well-known/jwks.json') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ keys: [jwk] }));
    } else { res.writeHead(404); res.end(); }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  url = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise((r) => server.close(r)));

const supabaseToken = (key, claims = {}, kid = KID) =>
  new SignJWT({ email: 'khach@thaitu.vn', role: 'authenticated', aal: 'aal1', ...claims })
    .setProtectedHeader({ alg: 'ES256', kid, typ: 'JWT' })
    .setSubject('11111111-2222-4333-8444-555555555555')
    .setAudience('authenticated')
    .setIssuer(`${url}/auth/v1`)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(key);

describe('AC-AUTH-03 xác minh token Supabase bằng JWKS (ES256)', () => {
  it('AC-AUTH-03 token do Supabase ký hợp lệ được chấp nhận', async () => {
    const svc = createTokenService({ supabaseUrl: url });
    await expect(svc.verify(await supabaseToken(priv))).resolves.toMatchObject({ id: '11111111-2222-4333-8444-555555555555', email: 'khach@thaitu.vn' });
  });

  it('AC-AUTH-03 token ký bằng khoá khác bị từ chối', async () => {
    const svc = createTokenService({ supabaseUrl: url });
    await expect(svc.verify(await supabaseToken(other))).rejects.toThrow();
  });

  it('AC-AUTH-03 token anon key (role anon) không được coi là người dùng', async () => {
    const svc = createTokenService({ supabaseUrl: url });
    await expect(svc.verify(await supabaseToken(priv, { role: 'anon' }))).rejects.toThrow();
  });

  it('AC-AUTH-03 cấu hình cả JWT secret (legacy) lẫn SUPABASE_URL: nhận cả token HS256 và ES256', async () => {
    const svc = createTokenService({ supabaseUrl: url, jwtSecret: 'legacy-secret-0123456789-abcdefghijklmnop' });
    await expect(svc.verify(await supabaseToken(priv))).resolves.toBeTruthy();
    const { accessToken } = await svc.sign({ id: 'u1', email: 'a@b.vn' });
    await expect(svc.verify(accessToken)).resolves.toMatchObject({ id: 'u1' });
  });

  it('AC-AUTH-03 chỉ có secret (không JWKS) thì token ES256 bị từ chối, token rác báo lỗi', async () => {
    const svc = createTokenService({ jwtSecret: 'legacy-secret-0123456789-abcdefghijklmnop' });
    await expect(svc.verify(await supabaseToken(priv))).rejects.toThrow(/ES256/);
    await expect(svc.verify('khong-phai-jwt')).rejects.toThrow();
  });

  it('AC-AUTH-03 dự án còn dùng JWT secret cũ mà backend không có secret: xác minh qua Supabase Auth /auth/v1/user', async () => {
    const { SignJWT: Sign } = await import('jose');
    const key = new TextEncoder().encode('supabase-side-secret-0123456789-abcdefghij');
    const mk = (sub, exp = '1h') => new Sign({ email: 'k@thaitu.vn', role: 'authenticated' }).setProtectedHeader({ alg: 'HS256' })
      .setSubject(sub).setAudience('authenticated').setExpirationTime(exp).sign(key);
    const good = await mk('11111111-2222-4333-8444-555555555555');
    let calls = 0;
    const fakeFetch = async (u, opts) => {
      calls += 1;
      expect(String(u)).toBe(`${url}/auth/v1/user`);
      expect(opts.headers.apikey).toBe('sb_publishable_test');
      const ok = opts.headers.Authorization === `Bearer ${good}`;
      return { ok, json: async () => ({ id: '11111111-2222-4333-8444-555555555555', email: 'k@thaitu.vn' }) };
    };
    const svc = createTokenService({ supabaseUrl: url, supabaseAnonKey: 'sb_publishable_test', fetchImpl: fakeFetch });
    await expect(svc.verify(good)).resolves.toMatchObject({ id: '11111111-2222-4333-8444-555555555555' });
    await svc.verify(good);
    expect(calls).toBe(1); // lần 2 lấy từ cache
    await expect(svc.verify(await mk('22222222-2222-4333-8444-555555555555'))).rejects.toThrow();
    await expect(svc.verify(await mk('33333333-2222-4333-8444-555555555555', '-1m'))).rejects.toThrow(/hết hạn/);
  });
});
