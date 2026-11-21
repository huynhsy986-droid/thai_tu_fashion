import { createClient } from '@supabase/supabase-js';
import { HttpError } from '../lib/errors.js';

const BAD_LOGIN = () => new HttpError(401, 'INVALID_CREDENTIALS', 'Email hoặc mật khẩu không đúng.');

/** Supabase Auth (production): GoTrue lo mật khẩu, phát JWT. */
function supabaseProvider(config) {
  const sb = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const session = (s, user) => ({ accessToken: s.access_token, expiresAt: s.expires_at, userId: user.id, email: user.email });
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
  };
}

/** Local (dev/CI): bcrypt trong auth.users như GoTrue, backend tự ký JWT cùng định dạng. */
function localProvider(db, tokens) {
  return {
    name: 'local',
    async register({ email, password, fullName }) {
      const id = await db.asOwner(async (c) => (await c.query('select public.local_auth_signup($1, $2, $3) as id', [email, password, fullName])).rows[0].id);
      const t = await tokens.sign({ id, email });
      return { ...t, userId: id, email };
    },
    async login({ email, password }) {
      const row = await db.asOwner(async (c) => (await c.query('select id, email from public.local_auth_login($1, $2)', [email, password])).rows[0]);
      if (!row) throw BAD_LOGIN();
      const t = await tokens.sign({ id: row.id, email: row.email });
      return { ...t, userId: row.id, email: row.email };
    },
  };
}

export function createAuthProvider(config, db, tokens) {
  return config.authProvider === 'supabase' ? supabaseProvider(config) : localProvider(db, tokens);
}
