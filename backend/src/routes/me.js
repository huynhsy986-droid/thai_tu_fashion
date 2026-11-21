import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { toMeasurements, toNotification, toOutfit, toProfile } from '../lib/mappers.js';

const profileSchema = z.object({
  name: z.string({ error: 'Nhập họ tên.' }).trim().min(2, { error: 'Nhập họ tên.' }).max(120),
  phone: z.string().trim().max(20).regex(/^[0-9 +().-]*$/, { error: 'Số điện thoại không hợp lệ.' }).optional().default(''),
  email: z.union([z.literal(''), z.email({ error: 'Email chưa đúng định dạng, ví dụ: ten@email.com' })]).optional().default(''),
  address: z.string().trim().max(300).optional().default(''),
  birthday: z.union([z.literal(''), z.iso.date({ error: 'Ngày sinh không hợp lệ.' })]).optional().nullable(),
});

const range = (label, a, b) =>
  z.coerce.number({ error: `Hãy nhập ${label.toLowerCase()}.` }).min(a, { error: `${label} cần trong khoảng ${a}–${b}.` }).max(b, { error: `${label} cần trong khoảng ${a}–${b}.` });
const measureSchema = z.object({
  height: range('Chiều cao', 130, 210),
  weight: range('Cân nặng', 35, 150),
  chest: range('Vòng ngực', 60, 150),
  waist: range('Vòng eo', 50, 140),
  hip: range('Vòng mông', 70, 160),
  fit: z.enum(['oversized', 'relaxed', 'regular', 'slim'], { error: 'Hãy chọn dáng mặc.' }).default('regular'),
});
const CODE = /^[a-z0-9-]{1,40}$/;
const slotSchema = z.object({ pid: z.string().regex(CODE, { error: 'Outfit không hợp lệ.' }), color: z.string().regex(CODE, { error: 'Outfit không hợp lệ.' }) });
const outfitSchema = z.object({
  name: z.string({ error: 'Đặt tên để dễ tìm lại.' }).trim().min(1, { error: 'Đặt tên để dễ tìm lại.' }).max(80),
  slots: z.record(z.string().regex(/^[a-z]{2,10}$/, { error: 'Outfit không hợp lệ.' }), slotSchema),
});
const newsSchema = z.object({ email: z.string({ error: 'Email chưa đúng định dạng, ví dụ: ten@email.com' }).trim() });

export function meRoutes() {
  const r = Router();

  // AC-ACC-05 — công khai
  r.post('/newsletter', async (req, res) => {
    const b = parse(newsSchema, req.body);
    await req.db((c) => c.query('select public.subscribe_newsletter($1)', [b.email]));
    res.status(201).json({ ok: true });
  });

  const me = Router();
  me.use(requireAuth);

  // AC-ACC-01
  me.get('/profile', async (req, res) => {
    const row = await req.db(async (c) => (await c.query('select * from public.profiles where id = $1', [req.user.id])).rows[0]);
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy hồ sơ.');
    res.json(toProfile(row));
  });

  me.patch('/profile', async (req, res) => {
    const b = parse(profileSchema, req.body);
    const row = await req.db(
      async (c) =>
        (
          await c.query(
            `update public.profiles set full_name = $2, phone = nullif($3, ''), email = coalesce(nullif($4, ''), email),
                    address = nullif($5, ''), birthday = nullif($6, '')::date
              where id = $1 returning *`,
            [req.user.id, b.name, b.phone, b.email, b.address, b.birthday || ''],
          )
        ).rows[0],
    );
    res.json(toProfile(row));
  });

  // AC-ACC-02
  me.get('/measurements', async (req, res) => {
    const row = await req.db(async (c) => (await c.query('select * from public.body_measurements where user_id = $1', [req.user.id])).rows[0]);
    res.json(toMeasurements(row));
  });

  me.put('/measurements', async (req, res) => {
    const m = parse(measureSchema, req.body);
    const row = await req.db(
      async (c) =>
        (
          await c.query(
            `insert into public.body_measurements (user_id, height_cm, weight_kg, chest_cm, waist_cm, hip_cm, fit_pref, updated_at)
             values ($1, $2, $3, $4, $5, $6, $7, now())
             on conflict (user_id) do update set height_cm = excluded.height_cm, weight_kg = excluded.weight_kg, chest_cm = excluded.chest_cm,
               waist_cm = excluded.waist_cm, hip_cm = excluded.hip_cm, fit_pref = excluded.fit_pref, updated_at = now()
             returning *`,
            [req.user.id, m.height, m.weight, m.chest, m.waist, m.hip, m.fit],
          )
        ).rows[0],
    );
    res.json(toMeasurements(row));
  });

  // AC-ACC-03
  me.get('/outfits', async (req, res) => {
    const rows = await req.db(async (c) => (await c.query('select * from public.outfits where user_id = $1 order by created_at desc', [req.user.id])).rows);
    res.json({ items: rows.map(toOutfit) });
  });

  me.post('/outfits', async (req, res) => {
    const b = parse(outfitSchema, req.body);
    const row = await req.db(
      async (c) => (await c.query('insert into public.outfits (user_id, name, slots) values ($1, $2, $3) returning *', [req.user.id, b.name, b.slots])).rows[0],
    );
    res.status(201).json(toOutfit(row));
  });

  me.delete('/outfits/:id', async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy outfit.');
    const n = await req.db(async (c) => (await c.query('delete from public.outfits where id = $1 and user_id = $2', [req.params.id, req.user.id])).rowCount);
    if (!n) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy outfit.');
    res.status(204).end();
  });

  // AC-ACC-04
  me.get('/notifications', async (req, res) => {
    const rows = await req.db(
      async (c) => (await c.query('select * from public.notifications where user_id = $1 order by created_at desc, id desc limit 100', [req.user.id])).rows,
    );
    res.json({ items: rows.map(toNotification) });
  });

  me.post('/notifications/read-all', async (req, res) => {
    await req.db((c) => c.query('update public.notifications set is_read = true where user_id = $1 and not is_read', [req.user.id]));
    res.status(204).end();
  });

  me.post('/notifications/:id/read', async (req, res) => {
    const id = Number.parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy thông báo.');
    await req.db((c) => c.query('update public.notifications set is_read = true where id = $1 and user_id = $2', [id, req.user.id]));
    res.status(204).end();
  });

  r.use('/me', me);
  return r;
}
