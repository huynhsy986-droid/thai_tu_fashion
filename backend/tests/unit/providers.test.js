import { describe, it, expect, vi, beforeEach } from 'vitest';

const auth = { signUp: vi.fn(), signInWithPassword: vi.fn() };
vi.mock('@supabase/supabase-js', () => ({ createClient: vi.fn(() => ({ auth })) }));
const { createAuthProvider } = await import('../../src/auth/providers.js');

const cfg = { authProvider: 'supabase', supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' };
const session = { access_token: 'jwt', expires_at: 123 };
const user = { id: 'u1', email: 'a@b.vn' };

describe('Supabase Auth provider (ADR-05, AUTH_PROVIDER=supabase)', () => {
  beforeEach(() => vi.clearAllMocks());
  const p = createAuthProvider(cfg);

  it('AC-AUTH-01 signUp gửi full_name vào user metadata và trả phiên', async () => {
    auth.signUp.mockResolvedValue({ data: { session, user }, error: null });
    await expect(p.register({ email: 'a@b.vn', password: 'Matkhau123', fullName: 'An' })).resolves.toEqual({ accessToken: 'jwt', expiresAt: 123, userId: 'u1', email: 'a@b.vn' });
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
});
