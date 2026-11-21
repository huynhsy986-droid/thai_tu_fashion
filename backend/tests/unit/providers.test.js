import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = { signUp: vi.fn(), signInWithPassword: vi.fn(), refreshSession: vi.fn(), resetPasswordForEmail: vi.fn() };
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ auth })) }));
const { createAuthProvider } = await import('../../src/auth/providers.js');

const cfg = { authProvider: 'supabase', supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' };
const session = { access_token: 'jwt', refresh_token: 'rt', expires_at: 123 };
const user = { id: 'u1', email: 'a@b.vn' };

describe('Supabase Auth provider (ADR-05, AUTH_PROVIDER=supabase)', () => {
  beforeEach(() => vi.clearAllMocks());
  const p = createAuthProvider(cfg);

  it('AC-AUTH-01 signUp gửi full_name vào user metadata và trả phiên', async () => {
    auth.signUp.mockResolvedValue({ data: { session, user }, error: null });
    await expect(p.register({ email: 'a@b.vn', password: 'Matkhau123', fullName: 'An' })).resolves.toEqual({ accessToken: 'jwt', refreshToken: 'rt', expiresAt: 123, userId: 'u1', email: 'a@b.vn' });
    expect(auth.signUp).toHaveBeenCalledWith({ email: 'a@b.vn', password: 'Matkhau123', options: { data: { full_name: 'An' } } });
  });

  it('AC-AUTH-01 email đã tồn tại → 409; lỗi khác → 422; dự án bật xác nhận email → chưa có phiên', async () => {
    auth.signUp.mockResolvedValueOnce({ data: {}, error: { code: 'user_already_exists', message: 'User already registered' } });
    await expect(p.register({ email: 'a@b.vn', password: 'x', fullName: 'An' })).rejects.toMatchObject({ status: 409 });
    auth.signUp.mockResolvedValueOnce({ data: {}, error: { message: 'Password should be stronger' } });
    await expect(p.register({ email: 'a@b.vn', password: 'x', fullName: 'An' })).rejects.toMatchObject({ status: 422 });
    auth.signUp.mockResolvedValueOnce({ data: { session: null, user }, error: null });
    await expect(p.register({ email: 'a@b.vn', password: 'x', fullName: 'An' })).resolves.toMatchObject({ accessToken: null, needsConfirmation: true });
  });

  it('AC-AUTH-02 signInWithPassword: đúng → phiên; sai → 401 INVALID_CREDENTIALS', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: { session, user }, error: null });
    await expect(p.login({ email: 'a@b.vn', password: 'x' })).resolves.toMatchObject({ accessToken: 'jwt', userId: 'u1' });
    auth.signInWithPassword.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid login credentials' } });
    await expect(p.login({ email: 'a@b.vn', password: 'y' })).rejects.toMatchObject({ status: 401, code: 'INVALID_CREDENTIALS' });
  });

  it('AC-AUTH-06 refreshSession: thành công → phiên mới kèm refresh token mới; lỗi → 401 SESSION_EXPIRED', async () => {
    auth.refreshSession.mockResolvedValueOnce({ data: { session: { ...session, access_token: 'jwt2', refresh_token: 'rt2' }, user }, error: null });
    await expect(p.refresh('rt')).resolves.toMatchObject({ accessToken: 'jwt2', refreshToken: 'rt2', userId: 'u1' });
    expect(auth.refreshSession).toHaveBeenCalledWith({ refresh_token: 'rt' });
    auth.refreshSession.mockResolvedValueOnce({ data: {}, error: { message: 'Invalid Refresh Token' } });
    await expect(p.refresh('old')).rejects.toMatchObject({ status: 401, code: 'SESSION_EXPIRED' });
  });

  it('AC-AUTH-07 resetPasswordForEmail: gửi redirectTo; lỗi thường bị nuốt, quá giới hạn → 429', async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: null });
    await expect(p.forgot({ email: 'a@b.vn', redirectTo: 'https://shop.vn/' })).resolves.toEqual({});
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.vn', { redirectTo: 'https://shop.vn/' });
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { message: 'User not found' } });
    await expect(p.forgot({ email: 'x@b.vn', redirectTo: 'https://shop.vn/' })).resolves.toEqual({});
    auth.resetPasswordForEmail.mockResolvedValueOnce({ error: { status: 429, message: 'email rate limit exceeded' } });
    await expect(p.forgot({ email: 'a@b.vn', redirectTo: 'https://shop.vn/' })).rejects.toMatchObject({ status: 429 });
  });

  it('AC-AUTH-07 đặt lại mật khẩu: PUT /auth/v1/user bằng token recovery; token hỏng → 400; trùng mật khẩu cũ → 422', async () => {
    const calls = [];
    const fake = (responses) => async (url, init) => { calls.push({ url: String(url), init }); return responses.shift(); };
    const resp = (status, body) => ({ ok: status < 300, status, json: async () => body });
    const q = createAuthProvider(cfg, null, null, fake([resp(200, {}), resp(401, { msg: 'invalid JWT' }), resp(422, { error_code: 'same_password' })]));
    await expect(q.reset({ token: 'rec', password: 'MatKhau123' })).resolves.toBeUndefined();
    expect(calls[0].url).toBe('https://x.supabase.co/auth/v1/user');
    expect(calls[0].init).toMatchObject({ method: 'PUT', body: JSON.stringify({ password: 'MatKhau123' }) });
    expect(calls[0].init.headers).toMatchObject({ apikey: 'anon', Authorization: 'Bearer rec' });
    await expect(q.reset({ token: 'bad', password: 'MatKhau123' })).rejects.toMatchObject({ status: 400, code: 'RESET_INVALID' });
    await expect(q.reset({ token: 'rec', password: 'MatKhau123' })).rejects.toMatchObject({ status: 422, message: 'Mật khẩu mới phải khác mật khẩu cũ.' });
  });

  it('AC-AUTH-05 đăng xuất thu hồi phiên Supabase (lỗi mạng không làm hỏng đăng xuất)', async () => {
    const seen = [];
    const q = createAuthProvider(cfg, null, null, async (url, init) => { seen.push([String(url), init.method]); throw new Error('offline'); });
    await expect(q.logout('jwt')).resolves.toBeUndefined();
    expect(seen).toEqual([['https://x.supabase.co/auth/v1/logout', 'POST']]);
  });
});
