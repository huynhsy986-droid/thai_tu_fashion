import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { toProfile } from '../lib/mappers.js';

const email = z.string({ error: 'Nhập email.' }).trim().toLowerCase().pipe(z.email({ error: 'Email chưa đúng định dạng, ví dụ: ten@email.com' }));
const registerSchema = z.object({
  email,
  password: z
    .string({ error: 'Nhập mật khẩu.' })
    .min(8, { error: 'Mật khẩu cần ít nhất 8 ký tự.' })
    .max(72, { error: 'Mật khẩu tối đa 72 ký tự.' })
    .refine((v) => /[A-Za-z]/.test(v) && /\d/.test(v), { error: 'Mật khẩu cần có cả chữ và số.' }),
  fullName: z.string({ error: 'Nhập họ tên.' }).trim().min(2, { error: 'Nhập họ tên.' }).max(120),
});
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

export function authRoutes({ db, authProvider }) {
  const r = Router();

  // AC-AUTH-01
  r.post('/register', async (req, res) => {
    const body = parse(registerSchema, req.body);
    const s = await authProvider.register(body);
    if (!s.accessToken) return res.status(201).json({ accessToken: null, needsConfirmation: true, user: { id: s.userId, email: s.email } });
    const user = await loadUser(db, { id: s.userId, email: s.email });
    return res.status(201).json({ accessToken: s.accessToken, expiresAt: s.expiresAt, user });
  });

  // AC-AUTH-02
  r.post('/login', async (req, res) => {
    const body = parse(loginSchema, req.body);
    const s = await authProvider.login(body);
    const user = await loadUser(db, { id: s.userId, email: s.email });
    res.json({ accessToken: s.accessToken, expiresAt: s.expiresAt, user });
  });

  // AC-AUTH-05 — JWT không trạng thái: client xoá token; server không giữ phiên
  r.post('/logout', requireAuth, (req, res) => res.status(204).end());

  // AC-AUTH-03
  r.get('/me', requireAuth, async (req, res) => {
    res.json({ user: await loadUser(db, req.user) });
  });

  return r;
}
