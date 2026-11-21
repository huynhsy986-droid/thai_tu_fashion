import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp, bearer } from '../helpers/app.js';
import { DEMO } from '../helpers/env.js';
import { FORGOT_MESSAGE } from '../../src/routes/auth.js';

let t;
beforeAll(async () => { t = await makeTestApp('session'); });
afterAll(async () => t?.close());

const tokenFrom = (link) => decodeURIComponent(new URL(link).hash.match(/access_token=([^&]+)/)[1]);

describe('F1 · Phiên đăng nhập bền & quên mật khẩu', () => {
  it('AC-AUTH-06 đăng nhập/đăng ký trả refreshToken; đổi lấy phiên mới, token được xoay vòng', async () => {
    const login = await t.api().post('/api/auth/login').send(DEMO);
    expect(login.body.refreshToken).toBeTruthy();
    const r1 = await t.api().post('/api/auth/refresh').send({ refreshToken: login.body.refreshToken });
    expect(r1.status).toBe(200);
    expect(r1.body).toMatchObject({ user: { email: DEMO.email, role: 'customer' } });
    expect(r1.body.refreshToken).not.toBe(login.body.refreshToken);
    expect((await t.api().get('/api/me/profile').set(bearer(r1.body.accessToken))).status).toBe(200);
    const reg = await t.newCustomer();
    expect(reg.token).toBeTruthy();
  });

  it('AC-AUTH-06 refresh token sai/giả → 401 SESSION_EXPIRED; không dùng lẫn access ↔ refresh', async () => {
    const login = await t.api().post('/api/auth/login').send(DEMO);
    const bad = await t.api().post('/api/auth/refresh').send({ refreshToken: 'xxxxxxxxxxxxxxxx' });
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('SESSION_EXPIRED');
    expect((await t.api().post('/api/auth/refresh').send({ refreshToken: login.body.accessToken })).status).toBe(401);
    expect((await t.api().get('/api/me/profile').set(bearer(login.body.refreshToken))).status).toBe(401);
    expect((await t.api().post('/api/auth/refresh').send({})).status).toBe(422);
  });

  it('AC-AUTH-07 quên mật khẩu: cùng một câu trả lời dù email có tồn tại hay không', async () => {
    const known = await t.api().post('/api/auth/forgot').send({ email: DEMO.email });
    const unknown = await t.api().post('/api/auth/forgot').send({ email: 'khong.ton.tai@test.vn' });
    expect(known.status).toBe(200);
    expect(unknown.status).toBe(200);
    expect(known.body.message).toBe(FORGOT_MESSAGE);
    expect(unknown.body).toEqual({ ok: true, message: FORGOT_MESSAGE });
    expect(known.body.devResetLink).toMatch(/#type=recovery&access_token=/); // chỉ có ở local, không phải production
    expect((await t.api().post('/api/auth/forgot').send({ email: 'sai' })).status).toBe(422);
  });

  it('AC-AUTH-07 đặt lại mật khẩu bằng link: mật khẩu mới dùng được, cũ hết hiệu lực, link chỉ dùng 1 lần', async () => {
    const c = await t.newCustomer();
    const { body } = await t.api().post('/api/auth/forgot').send({ email: c.email });
    const token = tokenFrom(body.devResetLink);
    const weak = await t.api().post('/api/auth/reset').send({ token, password: 'ngan1' });
    expect(weak.status).toBe(422);
    expect(weak.body.error.message).toBe('Mật khẩu cần ít nhất 8 ký tự.');
    const same = await t.api().post('/api/auth/reset').send({ token, password: 'Matkhau123' });
    expect(same.body.error.message).toBe('Mật khẩu mới phải khác mật khẩu cũ.');
    const ok = await t.api().post('/api/auth/reset').send({ token, password: 'MatKhauMoi456' });
    expect(ok.status).toBe(200);
    expect((await t.api().post('/api/auth/login').send({ email: c.email, password: 'Matkhau123' })).status).toBe(401);
    expect((await t.api().post('/api/auth/login').send({ email: c.email, password: 'MatKhauMoi456' })).status).toBe(200);
    const reuse = await t.api().post('/api/auth/reset').send({ token, password: 'LanNuaThoi789' });
    expect(reuse.status).toBe(400);
    expect(reuse.body.error.code).toBe('RESET_INVALID');
    expect((await t.api().post('/api/auth/reset').send({ token: c.token, password: 'LanNuaThoi789' })).status).toBe(400); // access token không phải link đặt lại
  });

  it('AC-AUTH-07 production không bao giờ trả devResetLink', async () => {
    const prod = await makeTestApp('session_prod', { NODE_ENV: 'production', JWT_SECRET: 'p'.repeat(40), PUBLIC_URL: 'https://shop.example.vn' });
    try {
      const r = await prod.api().post('/api/auth/forgot').send({ email: DEMO.email });
      expect(r.body).toEqual({ ok: true, message: FORGOT_MESSAGE });
      expect((await prod.api().get('/api/config')).body.demoAccounts).toBe(false);
    } finally { await prod.close(); }
  });
});
