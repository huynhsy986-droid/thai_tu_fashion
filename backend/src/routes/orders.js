import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { ORDER_SELECT, getOrder } from '../lib/queries.js';
import { toOrder } from '../lib/mappers.js';

export const placeOrderSchema = z.object({
  name: z.string({ error: 'Nhập họ tên người nhận.' }).trim().min(2, { error: 'Nhập họ tên người nhận.' }).max(120),
  phone: z
    .string({ error: 'Số điện thoại cần có 10 chữ số và bắt đầu bằng 0.' })
    .transform((v) => v.replace(/\s/g, ''))
    .pipe(z.string().regex(/^0\d{9}$/, { error: 'Số điện thoại cần có 10 chữ số và bắt đầu bằng 0.' })),
  address: z
    .string({ error: 'Nhập địa chỉ đầy đủ, gồm số nhà, đường và tỉnh/thành.' })
    .trim()
    .min(10, { error: 'Nhập địa chỉ đầy đủ, gồm số nhà, đường và tỉnh/thành.' })
    .max(300),
  note: z.string().trim().max(500, { error: 'Ghi chú tối đa 500 ký tự.' }).optional().default(''),
  ship: z.enum(['std', 'exp'], { error: 'Phương thức giao hàng không hợp lệ.' }).default('std'),
  pay: z.enum(['cod', 'online'], { error: 'Phương thức thanh toán không hợp lệ.' }).default('cod'),
  coupon: z.string().trim().max(20).optional().nullable(),
  paymentOk: z.boolean().default(true),
});

export function orderRoutes() {
  const r = Router();
  r.use(requireAuth);

  // AC-ORD-04 — RLS chỉ trả đơn của chính người dùng
  r.get('/', async (req, res) => {
    const rows = await req.db(async (c) => (await c.query(`${ORDER_SELECT} where o.user_id = $1 order by o.created_at desc`, [req.user.id])).rows);
    res.json({ items: rows.map(toOrder) });
  });

  // AC-ORD-01/02/03/06 — toàn bộ trong function place_order (1 transaction)
  r.post('/', async (req, res) => {
    const b = parse(placeOrderSchema, req.body);
    const order = await req.db(async (c) => {
      const { rows } = await c.query('select public.place_order($1, $2, $3, $4, $5, $6, $7, $8) as id', [
        b.name, b.phone, b.address, b.note, b.ship, b.pay, b.coupon || null, b.paymentOk,
      ]);
      return getOrder(c, rows[0].id);
    });
    res.status(201).json(order);
  });

  r.get('/:id', async (req, res) => {
    const order = await req.db((c) => getOrder(c, req.params.id));
    if (!order || order.cid !== req.user.id) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
    res.json(order);
  });

  // AC-ORD-05
  r.post('/:id/cancel', async (req, res) => {
    const order = await req.db(async (c) => {
      await c.query('select public.cancel_my_order($1)', [req.params.id]);
      return getOrder(c, req.params.id);
    });
    res.json(order);
  });

  return r;
}
