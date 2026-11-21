import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { toProfile } from '../lib/mappers.js';

const email = z.string({ error: 'Nhập email.' }).trim().toLowerCase().pipe(z.email({ error: 'Email chưa đúng định dạng, ví dụ: ten@email.com' }));
export const passwordSchema = z
  .string({ error: 'Nhập mật khẩu.' })
  .min(8, { error: 'Mật khẩu cần ít nhất 8 ký tự.' })
  .max(72, { error: 'Mật khẩu tối đa 72 ký tự.' })
  .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { error: 'Mật khẩu cần có cả chữ và số.' });
const registerSchema = z.object({
  email,
  password: passwordSchema,
  fullName: z.string({ error: 'Nhập họ tên.' }).trim().min(2, { error: 'Nhập họ tên.' }).max(120),
});
const refreshSchema = z.object({ refreshToken: z.string({ error: 'Thiếu refresh token.' }).min(10, { error: 'Thiếu refresh token.' }).max(4096) });
const forgotSchema = z.object({ email });
const resetSchema = z.object({
  token: z.string({ error: 'Liên kết đặt lại mật khẩu không hợp lệ.' }).min(10, { error: 'Liên kết đặt lại mật khẩu không hợp lệ.' }).max(4096),
  password: passwordSchema,
});
export const FORGOT_MESSAGE = 'Nếu email này đã đăng ký, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu. Hãy kiểm tra hộp thư (cả mục Spam).';
const loginSchema = z.object({
  email,
  password: z.string({ error: 'Nhập mật khẩu.' }).min(1, { error: 'Nhập mật khẩu.' }),
});

async function loadUser(db, user) {
  return db.withUser(user, async (c) => {
    const { rows } = await c.query('select * from public.profiles where id = $1', [user.id]);
    if (!rows[0]) throw new HttpError(401, 'AUTH_REQUIRED', 'Tài khoản không còn tồn tại.');
    const p = toProfile(rows[0]);
    return { id: p.id, email: p.email || user.email, name: p.name, role: p.role };
  });
}

/** Phiên trả về client: access token ngắn hạn + refresh token để gia hạn (AC-AUTH-06). */
const sessionBody = (s, user) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken || null, expiresAt: s.expiresAt, user });

export function authRoutes({ db, authProvider, config = {} }) {
  const r = Router();
  const siteUrl = (req) => (config.publicUrl || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');

  // AC-AUTH-01
  r.post('/register', async (req, res) => {
    const body = parse(registerSchema, req.body);
    const s = await authProvider.register(body);
    if (!s.accessToken) return res.status(201).json({ accessToken: null, needsConfirmation: true, user: { id: s.userId, email: s.email } });
    const user = await loadUser(db, { id: s.userId, email: s.email });
    return res.status(201).json(sessionBody(s, user));
  });

  // AC-AUTH-02
  r.post('/login', async (req, res) => {
    const body = parse(loginSchema, req.body);
    const s = await authProvider.login(body);
    const user = await loadUser(db, { id: s.userId, email: s.email });
    res.json(sessionBody(s, user));
  });

  // AC-AUTH-06 — đổi refresh token lấy phiên mới (refresh token được xoay vòng)
  r.post('/refresh', async (req, res) => {
    const { refreshToken } = parse(refreshSchema, req.body);
    const s = await authProvider.refresh(refreshToken);
    const user = await loadUser(db, { id: s.userId, email: s.email });
    res.json(sessionBody(s, user));
  });

  // AC-AUTH-07 — luôn trả cùng một câu, không tiết lộ email có tồn tại hay không
  r.post('/forgot', async (req, res) => {
    const { email: e } = parse(forgotSchema, req.body);
    const out = await authProvider.forgot({ email: e, redirectTo: `${siteUrl(req)}/` });
    const body = { ok: true, message: FORGOT_MESSAGE };
    // Local/dev không có email: trả link để mở trực tiếp. Không bao giờ trả ở production.
    if (out.devResetLink && !config.isProd) body.devResetLink = out.devResetLink;
    res.json(body);
  });

  r.post('/reset', async (req, res) => {
    const b = parse(resetSchema, req.body);
    await authProvider.reset({ token: b.token, password: b.password });
    res.json({ ok: true, message: 'Đã đổi mật khẩu. Hãy đăng nhập bằng mật khẩu mới.' });
  });

  // AC-AUTH-05 — client xoá phiên; Supabase: thu hồi refresh token
  r.post('/logout', requireAuth, async (req, res) => {
    await authProvider.logout((req.get('authorization') || '').slice(7).trim());
    res.status(204).end();
  });

  // AC-AUTH-03
  r.get('/me', requireAuth, async (req, res) => {
    res.json({ user: await loadUser(db, req.user) });
  });

  return r;
}
