import { HttpError } from '../lib/errors.js';

/**
 * Đọc Bearer token (nếu có), gắn req.user và req.db(fn) — fn chạy dưới RLS của người dùng.
 * Token sai/hết hạn → 401 (AC-AUTH-03).
 */
export function authenticate(tokens, db) {
  return async (req, res, next) => {
    req.user = null;
    const h = req.get('authorization') || '';
    if (h.startsWith('Bearer ')) {
      try {
        const u = await tokens.verify(h.slice(7).trim());
        req.user = { id: u.id, email: u.email };
      } catch {
        return next(new HttpError(401, 'AUTH_REQUIRED', 'Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.'));
      }
    }
    req.db = (fn) => db.withUser(req.user, fn);
    return next();
  };
}

export function requireAuth(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập.'));
  return next();
}

/** Admin = profiles.role = 'admin' (kiểm tra qua is_admin() dưới RLS) — AC-AUTH-04. */
export async function requireAdmin(req, res, next) {
  if (!req.user) return next(new HttpError(401, 'AUTH_REQUIRED', 'Bạn cần đăng nhập.'));
  const ok = await req.db(async (c) => (await c.query('select public.is_admin() as ok')).rows[0].ok);
  if (!ok) return next(new HttpError(403, 'FORBIDDEN', 'Chỉ quản trị viên được truy cập.'));
  req.user.role = 'admin';
  return next();
}
