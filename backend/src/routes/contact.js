import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { parse } from '../lib/validate.js';
import { HttpError } from '../lib/errors.js';
import { toContact } from '../lib/mappers.js';

export const CONTACT_TOPICS = ['order', 'product', 'size', 'return', 'partner', 'other'];
const UUID = /^[0-9a-f-]{36}$/i;

export const contactSchema = z.object({
  name: z.string({ error: 'Nhập họ tên.' }).trim().min(2, { error: 'Nhập họ tên.' }).max(80, { error: 'Họ tên tối đa 80 ký tự.' }),
  email: z.string({ error: 'Email chưa đúng định dạng, ví dụ: ten@email.com' }).trim().regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, { error: 'Email chưa đúng định dạng, ví dụ: ten@email.com' }),
  phone: z
    .string()
    .trim()
    .transform((s) => s.replace(/\s/g, ''))
    .refine((s) => s === '' || /^0\d{9}$/.test(s), { error: 'Số điện thoại gồm 10 số, bắt đầu bằng 0.' })
    .optional(),
  topic: z.enum(CONTACT_TOPICS, { error: 'Chọn chủ đề cần hỗ trợ.' }).default('other'),
  orderCode: z
    .string()
    .trim()
    .toUpperCase()
    .refine((s) => s === '' || /^TT\d{4,}$/.test(s), { error: 'Mã đơn có dạng TT1234.' })
    .optional(),
  message: z.string({ error: 'Nội dung cần ít nhất 10 ký tự.' }).trim().min(10, { error: 'Nội dung cần ít nhất 10 ký tự.' }).max(2000, { error: 'Nội dung tối đa 2000 ký tự.' }),
});
const listFilter = z.object({ status: z.enum(['new', 'read', 'replied'], { error: 'Trạng thái không hợp lệ.' }).optional() });
const patchSchema = z.object({ status: z.enum(['new', 'read', 'replied'], { error: 'Trạng thái không hợp lệ.' }) });

/** AC-CON-01 — công khai: khách gửi tin nhắn liên hệ. */
export function contactRoutes({ rateLimitContact = 10 } = {}) {
  const r = Router();
  const limiter = rateLimit({
    windowMs: 10 * 60_000,
    limit: rateLimitContact,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Bạn đã gửi nhiều tin nhắn, vui lòng thử lại sau.' } },
  });
  r.post('/contact', limiter, async (req, res) => {
    const b = parse(contactSchema, req.body);
    const id = await req.db(
      async (c) =>
        (await c.query('select public.submit_contact($1, $2, $3, $4, $5, $6) as id', [b.name, b.email, b.phone || null, b.topic, b.orderCode || null, b.message])).rows[0].id,
    );
    res.status(201).json({ id, ok: true });
  });
  return r;
}

/** AC-CON-02 — quản trị tin nhắn liên hệ (đã qua requireAdmin, RLS chỉ cho admin). */
export function adminContactRoutes() {
  const r = Router();
  r.get('/', async (req, res) => {
    const f = parse(listFilter, req.query);
    const { rows, unread } = await req.db(async (c) => ({
      rows: f.status
        ? (await c.query('select * from public.contact_messages where status = $1 order by created_at desc limit 500', [f.status])).rows
        : (await c.query('select * from public.contact_messages order by created_at desc limit 500')).rows,
      unread: (await c.query("select count(*)::int as n from public.contact_messages where status = 'new'")).rows[0].n,
    }));
    res.json({ items: rows.map(toContact), unread });
  });
  r.patch('/:id', async (req, res) => {
    const b = parse(patchSchema, req.body);
    if (!UUID.test(req.params.id)) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy tin nhắn.');
    const row = await req.db(async (c) => (await c.query('update public.contact_messages set status = $2 where id = $1 returning *', [req.params.id, b.status])).rows[0]);
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy tin nhắn.');
    res.json(toContact(row));
  });
  r.delete('/:id', async (req, res) => {
    if (!UUID.test(req.params.id)) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy tin nhắn.');
    const n = await req.db(async (c) => (await c.query('delete from public.contact_messages where id = $1', [req.params.id])).rowCount);
    if (!n) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy tin nhắn.');
    res.status(204).end();
  });
  return r;
}
