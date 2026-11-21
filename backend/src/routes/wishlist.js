import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';

const targetSchema = z.object({ target: z.coerce.number().int().min(0, { error: 'Giá mong muốn không hợp lệ.' }).max(100_000_000).optional().nullable() });
const restockSchema = z.object({
  productId: z.string({ error: 'Thiếu mã sản phẩm.' }).min(1),
  color: z.string({ error: 'Hãy chọn màu.' }).min(1),
  size: z.string({ error: 'Hãy chọn size.' }).min(1),
});

const listWish = async (c, uid) =>
  (await c.query('select product_id, target_price from public.wishlist_items where user_id = $1 order by created_at', [uid])).rows.map((r) => ({
    pid: r.product_id,
    target: r.target_price || 0,
  }));

const listRestock = async (c, uid) =>
  (
    await c.query(
      `select v.product_id, v.color_code, v.size from public.restock_subscriptions s
         join public.product_variants v on v.id = s.variant_id where s.user_id = $1 order by s.created_at`,
      [uid],
    )
  ).rows.map((r) => ({ productId: r.product_id, color: r.color_code, size: r.size }));

export function wishlistRoutes() {
  const r = Router();
  // AC-WISH-01
  r.get('/wishlist', requireAuth, async (req, res) => {
    res.json({ items: await req.db((c) => listWish(c, req.user.id)) });
  });

  r.put('/wishlist/:productId', requireAuth, async (req, res) => {
    const b = parse(targetSchema, req.body);
    const items = await req.db(async (c) => {
      const p = (await c.query('select id from public.products where id = $1', [req.params.productId])).rows[0];
      if (!p) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm.');
      await c.query(
        `insert into public.wishlist_items (user_id, product_id, target_price) values ($1, $2, $3)
         on conflict (user_id, product_id) do update set target_price = coalesce(excluded.target_price, public.wishlist_items.target_price)`,
        [req.user.id, p.id, b.target ?? null],
      );
      return listWish(c, req.user.id);
    });
    res.json({ items });
  });

  r.delete('/wishlist/:productId', requireAuth, async (req, res) => {
    const items = await req.db(async (c) => {
      await c.query('delete from public.wishlist_items where user_id = $1 and product_id = $2', [req.user.id, req.params.productId]);
      return listWish(c, req.user.id);
    });
    res.json({ items });
  });

  // AC-WISH-03
  r.get('/restock-subscriptions', requireAuth, async (req, res) => {
    res.json({ items: await req.db((c) => listRestock(c, req.user.id)) });
  });

  r.post('/restock-subscriptions', requireAuth, async (req, res) => {
    const b = parse(restockSchema, req.body);
    const out = await req.db(async (c) => {
      const v = (await c.query('select id, stock from public.product_variants where product_id = $1 and color_code = $2 and size = $3', [b.productId, b.color, b.size])).rows[0];
      if (!v) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm với màu/size này.');
      const del = await c.query('delete from public.restock_subscriptions where user_id = $1 and variant_id = $2', [req.user.id, v.id]);
      let subscribed = false;
      if (!del.rowCount) {
        if (v.stock > 0) throw new HttpError(422, 'VALIDATION', 'Size này đang còn hàng, bạn có thể mua ngay.');
        await c.query('insert into public.restock_subscriptions (user_id, variant_id) values ($1, $2)', [req.user.id, v.id]);
        subscribed = true;
      }
      return { subscribed, items: await listRestock(c, req.user.id) };
    });
    res.json(out);
  });

  return r;
}
