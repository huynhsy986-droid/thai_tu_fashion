import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../lib/errors.js';

const BAD_LOGIN = () => new HttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');
const SESSION_EXPIRED = () => new HttpError(401, 'SESSION_EXPIRED', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.');
const RESET_INVALID = () => new HttpError(400, 'RESET_INVALID', 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới.');

/** Supabase Auth (production): GoTrue lo mật khẩu, phát JWT. */
function supabaseProvider(config, fetchImpl = globalThis.fetch) {
  const sb = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const session = (s, user) => ({ accessToken: s.access_token, refreshToken: s.refresh_token, expiresAt: s.expires_at, userId: user.id, email: user.email });
  const gotrue = (path, token, init = {}) =>
    fetchImpl(new URL(`/auth/v1/${path}`, config.supabaseUrl), {
      ...init,
      headers: { apikey: config.supabaseAnonKey, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
  return {
    name: 'supabase',
    async register({ email, password, fullName }) {
      const { data, error } = await sb.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
      if (error) {
        if (error.code === 'user_already_exists' || /already|registered/i.test(error.message)) {
          throw new HttpError(409, 'CONFLICT', 'Email đã được đăng ký.');
        }
        throw new HttpError(422, 'VALIDATION', error.message);
      }
      if (!data.session) {
        // Dự án bật xác nhận email: chưa có phiên
        return { accessToken: null, expiresAt: null, userId: data.user?.id, email, needsConfirmation: true };
      }
      return session(data.session, data.user);
    },
    async login({ email, password }) {
      const { data, error } = await sb.auth.signInWithPassword({ email, password });
      if (error || !data.session) throw BAD_LOGIN();
      return session(data.session, data.user);
    },
    // AC-AUTH-06: Supabase xoay vòng refresh token (token cũ hết hiệu lực sau khi dùng)
    async refresh(refreshToken) {
      const { data, error } = await sb.auth.refreshSession({ refresh_token: refreshToken });
      if (error || !data.session) throw SESSION_EXPIRED();
      return session(data.session, data.user || data.session.user);
    },
    // AC-AUTH-07: Supabase gửi email chứa link về redirectTo#access_token=…&type=recovery
    async forgot({ email, redirectTo }) {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
      if (error && (error.status === 429 || /rate limit/i.test(error.message))) {
        throw new HttpError(429, 'RATE_LIMITED', 'Bạn đã yêu cầu quá nhiều lần, vui lòng thử lại sau ít phút.');
      }
      return {}; // lỗi khác (VD email không tồn tại) không báo ra ngoài
    },
    async reset({ token, password }) {
      const res = await gotrue('user', token, { method: 'PUT', body: JSON.stringify({ password }) });
      if (res.ok) return;
      const body = await res.json().catch(() => ({}));
      if (body.error_code === 'same_password' || /different from the old/i.test(body.msg || body.message || '')) {
        throw new HttpError(422, 'VALIDATION', 'Mật khẩu mới phải khác mật khẩu cũ.');
      }
      if (res.status === 422) throw new HttpError(422, 'VALIDATION', 'Mật khẩu chưa đủ mạnh.');
      throw RESET_INVALID();
    },
    // AC-AUTH-05: thu hồi refresh token trên Supabase (best-effort)
    async logout(accessToken) {
      await gotrue('logout', accessToken, { method: 'POST' }).catch(() => {});
    },
  };
}

/** Local (dev/CI): bcrypt trong auth.users như GoTrue, backend tự ký JWT cùng định dạng. */
function localProvider(db, tokens) {
  const q = async (sql, params) => (await db.asOwner((c) => c.query(sql, params))).rows;
  const issue = async (u) => ({ ...(await tokens.sign(u)), refreshToken: await tokens.signAux('refresh', u), userId: u.id, email: u.email });
  return {
    name: 'local',
    async register({ email, password, fullName }) {
      const [{ id }] = await q('select public.local_auth_signup($1, $2, $3) as id', [email, password, fullName]);
      return issue({ id, email });
    },
    async login({ email, password }) {
      const [row] = await q('select id, email from public.local_auth_login($1, $2)', [email, password]);
      if (!row) throw BAD_LOGIN();
      return issue(row);
    },
    async refresh(refreshToken) {
      let p;
      try { p = await tokens.verifyAux('refresh', refreshToken); } catch { throw SESSION_EXPIRED(); }
      const [u] = await q('select id, email::text as email from auth.users where id = $1', [p.sub]);
      if (!u) throw SESSION_EXPIRED();
      return issue(u);
    },
    /** Local không gửi email: trả link để dev/test mở trực tiếp (route chỉ lộ ra khi không phải production). */
    async forgot({ email, redirectTo }) {
      const [u] = await q('select id, email from public.local_auth_find($1)', [email]);
      if (!u) return {};
      const [{ fp }] = await q('select public.local_auth_password_fingerprint($1) as fp', [u.id]);
      const token = await tokens.signAux('reset', u, { pwv: fp });
      return { devResetLink: `${redirectTo}#type=recovery&access_token=${encodeURIComponent(token)}` };
    },
    async reset({ token, password }) {
      let p;
      try { p = await tokens.verifyAux('reset', token); } catch { throw RESET_INVALID(); }
      const [row] = await q('select public.local_auth_password_fingerprint($1) as fp', [p.sub]);
      if (!row || !row.fp || row.fp !== p.pwv) throw RESET_INVALID(); // đã dùng (mật khẩu đổi rồi) hoặc user không còn
      const [same] = await q('select id from public.local_auth_login($1, $2)', [p.email, password]);
      if (same) throw new HttpError(422, 'VALIDATION', 'Mật khẩu mới phải khác mật khẩu cũ.');
      await q('select public.local_auth_set_password($1, $2)', [p.sub, password]);
    },
    async logout() {},
  };
}

export function createAuthProvider(config, db, tokens, fetchImpl) {
  return config.authProvider === 'supabase' ? supabaseProvider(config, fetchImpl) : localProvider(db, tokens);
}
