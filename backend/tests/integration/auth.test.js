import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp, bearer } from '../helpers/app.js';
import { DEMO, ADMIN } from '../helpers/env.js';

let t;
beforeAll(async () => { t = await makeTestApp('auth'); });
afterAll(async () => t?.close());

describe('F1 · Tài khoản & xác thực', () => {
  it('AC-AUTH-01 đăng ký tạo tài khoản + profile vai trò customer và trả phiên', async () => {
    const res = await t.api().post('/api/auth/register').send({ email: 'New.User@Test.vn', password: 'Matkhau123', fullName: 'Người Mới' });
    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTruthy();
    expect(res.body.user).toMatchObject({ email: 'new.user@test.vn', name: 'Người Mới', role: 'customer' });
    const { rows } = await t.sql('select role, full_name from public.profiles where id = $1', [res.body.user.id]);
    expect(rows[0]).toEqual({ role: 'customer', full_name: 'Người Mới' });
  });

  it('AC-AUTH-01 email trùng → 409', async () => {
    const res = await t.api().post('/api/auth/register').send({ email: DEMO.email, password: 'Matkhau123', fullName: 'Ai Đó' });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatchObject({ code: 'CONFLICT', message: 'Email đã được đăng ký.' });
  });

  it.each([
    [{ password: 'short1' }, 'Mật khẩu cần ít nhất 8 ký tự.'],
    [{ password: 'chichuthoi' }, 'Mật khẩu cần có cả chữ và số.'],
    [{ email: 'khong-phai-email' }, 'Email chưa đúng định dạng, ví dụ: ten@email.com'],
    [{ fullName: 'A' }, 'Nhập họ tên.'],
  ])('AC-AUTH-01 dữ liệu sai %j → 422', async (patch, msg) => {
    const res = await t.api().post('/api/auth/register').send({ email: 'x1@test.vn', password: 'Matkhau123', fullName: 'Tên Đủ', ...patch });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe(msg);
  });

  it('AC-AUTH-02 đăng nhập đúng trả token + vai trò', async () => {
    const res = await t.api().post('/api/auth/login').send({ email: DEMO.email, password: DEMO.password });
    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ id: DEMO.id, role: 'customer', name: 'Nguyễn Minh Anh' });
    const admin = await t.api().post('/api/auth/login').send(ADMIN);
    expect(admin.body.user.role).toBe('admin');
  });

  it('AC-AUTH-02 sai mật khẩu và email không tồn tại trả cùng một thông báo 401', async () => {
    const a = await t.api().post('/api/auth/login').send({ email: DEMO.email, password: 'SaiMatKhau1' });
    const b = await t.api().post('/api/auth/login').send({ email: 'khongco@test.vn', password: 'SaiMatKhau1' });
    expect(a.status).toBe(401);
    expect(b.status).toBe(401);
    expect(a.body.error).toEqual(b.body.error);
    expect(a.body.error.message).toBe('Email hoặc mật khẩu không đúng.');
  });

  it('AC-AUTH-03 API cần đăng nhập: thiếu token → 401, token rác → 401', async () => {
    expect((await t.api().get('/api/cart')).status).toBe(401);
    expect((await t.api().get('/api/auth/me')).status).toBe(401);
    const bad = await t.api().get('/api/cart').set(bearer('abc.def.ghi'));
    expect(bad.status).toBe(401);
    expect(bad.body.error.code).toBe('AUTH_REQUIRED');
  });

  it('AC-AUTH-03 token hợp lệ → /me trả người dùng', async () => {
    const token = await t.login(DEMO);
    const res = await t.api().get('/api/auth/me').set(bearer(token));
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(DEMO.email);
  });

  it('AC-AUTH-05 logout trả 204', async () => {
    const token = await t.login(DEMO);
    expect((await t.api().post('/api/auth/logout').set(bearer(token))).status).toBe(204);
  });
});
