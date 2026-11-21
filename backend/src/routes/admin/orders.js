import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../../lib/validate.js';
import { HttpError } from '../../lib/errors.js';
import { ORDER_SELECT, getOrder } from '../../lib/queries.js';
import { toOrder } from '../../lib/mappers.js';
import { ORDER_STATUSES } from '../../domain/orderStatus.js';

const filterSchema = z.object({ status: z.enum(ORDER_STATUSES, { error: 'Trạng thái không hợp lệ.' }).optional() });
const statusSchema = z.object({
  status: z.enum(ORDER_STATUSES, { error: 'Trạng thái không hợp lệ.' }),
  note: z.string().trim().max(300).optional(),
});

export function adminOrderRoutes() {
  const r = Router();

  r.get('/', async (req, res) => {
    const f = parse(filterSchema, req.query);
    const rows = await req.db(async (c) =>
      f.status
        ? (await c.query(`${ORDER_SELECT} where o.status = $1 order by o.created_at desc`, [f.status])).rows
        : (await c.query(`${ORDER_SELECT} order by o.created_at desc`)).rows,
    );
    res.json({ items: rows.map(toOrder) });
  });

  r.get('/:id', async (req, res) => {
    const o = await req.db((c) => getOrder(c, req.params.id));
    if (!o) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đơn hàng.');
    res.json(o);
  });

  // AC-ADM-05 — máy trạng thái trong DB
  r.patch('/:id/status', async (req, res) => {
    const b = parse(statusSchema, req.body);
    const o = await req.db(async (c) => {
      await c.query('select public.admin_set_order_status($1, $2, $3)', [req.params.id, b.status, b.note || null]);
      return getOrder(c, req.params.id);
    });
    res.json(o);
  });

  return r;
}
