import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { listCart } from '../lib/queries.js';

const addSchema = z.object({
  productId: z.string({ error: 'Thiếu mã sản phẩm.' }).trim().min(1, { error: 'Thiếu mã sản phẩm.' }),
  color: z.string({ error: 'Hãy chọn màu.' }).trim().min(1, { error: 'Hãy chọn màu.' }),
  size: z.string({ error: 'Hãy chọn size trước khi tiếp tục.' }).trim().min(1, { error: 'Hãy chọn size trước khi tiếp tục.' }),
  quantity: z.coerce.number().int().min(1, { error: 'Số lượng tối thiểu là 1.' }).max(99, { error: 'Số lượng tối đa là 99.' }).default(1),
});
const qtySchema = z.object({ quantity: z.coerce.number().int().min(1, { error: 'Số lượng tối thiểu là 1.' }).max(99, { error: 'Số lượng tối đa là 99.' }) });
const quoteSchema = z.object({
  shipping: z.enum(['std', 'exp'], { error: 'Phương thức giao hàng không hợp lệ.' }).default('std'),
  coupon: z.string().trim().max(20).optional().nullable(),
});
const variantIdOf = (req) => {
  const id = Number.parseInt(req.params.variantId, 10);
  if (!Number.isFinite(id) || id <= 0) throw new HttpError(422, 'VALIDATION', 'Mã biến thể không hợp lệ.');
  return id;
};

/** Kiểm tra tồn kho cho số lượng mong muốn (AC-CART-01). */
function assertStock(v, wanted) {
  if (v.status !== 'active' || v.stock <= 0) {
    throw new HttpError(409, 'OUT_OF_STOCK', `${v.name} màu ${v.color_name} size ${v.size} đã hết hàng.`, { available: 0 });
  }
  if (wanted > v.stock) {
    throw new HttpError(409, 'OUT_OF_STOCK', `Chỉ còn ${v.stock} sản phẩm size ${v.size} trong kho.`, { available: v.stock });
  }
}

const VARIANT_SQL = `
  select v.id, v.stock, v.size, v.color_code, p.name, p.status, col.name as color_name
    from public.product_variants v
    join public.products p on p.id = v.product_id
    join public.colors col on col.code = v.color_code`;

export function cartRoutes() {
  const r = Router();
  r.use(requireAuth);

  r.get('/', async (req, res) => {
    res.json({ items: await req.db((c) => listCart(c, req.user.id)) });
  });

  r.delete('/', async (req, res) => {
    await req.db((c) => c.query('delete from public.cart_items where user_id = $1', [req.user.id]));
    res.status(204).end();
  });

  // AC-CART-01 — cộng dồn, không vượt tồn kho
  r.post('/items', async (req, res) => {
    const b = parse(addSchema, req.body);
    const items = await req.db(async (c) => {
      const v = (await c.query(`${VARIANT_SQL} where v.product_id = $1 and v.color_code = $2 and v.size = $3`, [b.productId, b.color, b.size])).rows[0];
      if (!v) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm với màu/size này.');
      const have = (await c.query('select quantity from public.cart_items where user_id = $1 and variant_id = $2 for update', [req.user.id, v.id])).rows[0];
      const next = (have ? have.quantity : 0) + b.quantity;
      assertStock(v, next);
      await c.query(
        `insert into public.cart_items (user_id, variant_id, quantity) values ($1, $2, $3)
         on conflict (user_id, variant_id) do update set quantity = excluded.quantity`,
        [req.user.id, v.id, next],
      );
      return listCart(c, req.user.id);
    });
    res.status(201).json({ items });
  });

  // AC-CART-02
  r.patch('/items/:variantId', async (req, res) => {
    const id = variantIdOf(req);
    const b = parse(qtySchema, req.body);
    const items = await req.db(async (c) => {
      const line = (await c.query('select quantity from public.cart_items where user_id = $1 and variant_id = $2 for update', [req.user.id, id])).rows[0];
      if (!line) throw new HttpError(404, 'NOT_FOUND', 'Sản phẩm không có trong giỏ.');
      const v = (await c.query(`${VARIANT_SQL} where v.id = $1`, [id])).rows[0];
      if (!v) throw new HttpError(404, 'NOT_FOUND', 'Sản phẩm không còn bán.');
      assertStock(v, b.quantity);
      await c.query('update public.cart_items set quantity = $3 where user_id = $1 and variant_id = $2', [req.user.id, id, b.quantity]);
      return listCart(c, req.user.id);
    });
    res.json({ items });
  });

  r.delete('/items/:variantId', async (req, res) => {
    const id = variantIdOf(req);
    const items = await req.db(async (c) => {
      await c.query('delete from public.cart_items where user_id = $1 and variant_id = $2', [req.user.id, id]);
      return listCart(c, req.user.id);
    });
    res.json({ items });
  });

  // AC-CART-03, AC-CART-04 — server tính tiền
  r.post('/quote', async (req, res) => {
    const b = parse(quoteSchema, req.body);
    const quote = await req.db(async (c) => (await c.query('select public.cart_quote($1, $2) as q', [b.shipping, b.coupon || null])).rows[0].q);
    res.json(quote);
  });

  return r;
}
