/** Truy vấn dùng lại giữa các route. Tất cả chạy trong client của req.db (RLS áp dụng). */
import { toOrder, toProduct, toCartItem } from './mappers.js';

export const PRODUCT_SELECT = `
  select p.*, coalesce(s.rating_avg, 0) as rating_avg, coalesce(s.rating_count, 0) as rating_count,
         coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'color', v.color_code, 'size', v.size, 'stock', v.stock))
                     from public.product_variants v where v.product_id = p.id), '[]'::jsonb) as variants
    from public.products p
    left join public.product_rating_stats s on s.product_id = p.id`;

export async function getProduct(c, id) {
  const { rows } = await c.query(`${PRODUCT_SELECT} where p.id = $1`, [id]);
  return rows[0] ? toProduct(rows[0]) : null;
}

export const ORDER_SELECT = `
  select o.*,
         coalesce((select jsonb_agg(jsonb_build_object('pid', i.product_id, 'name', i.product_name, 'color', i.color_code,
                                                       'size', i.size, 'qty', i.quantity, 'price', i.unit_price) order by i.id)
                     from public.order_items i where i.order_id = o.id), '[]'::jsonb) as items,
         coalesce((select jsonb_agg(jsonb_build_object('from', h.from_status, 'to', h.to_status, 'at', h.created_at, 'note', h.note)
                                    order by h.created_at, h.id)
                     from public.order_status_history h where h.order_id = o.id), '[]'::jsonb) as history
    from public.orders o`;

export async function getOrder(c, id) {
  const { rows } = await c.query(`${ORDER_SELECT} where o.id = $1`, [id]);
  return rows[0] ? toOrder(rows[0]) : null;
}

export async function listCart(c, userId) {
  const { rows } = await c.query(
    `select ci.variant_id, ci.quantity, v.product_id, v.color_code, v.size
       from public.cart_items ci join public.product_variants v on v.id = ci.variant_id
      where ci.user_id = $1 order by ci.added_at, ci.variant_id`,
    [userId],
  );
  return rows.map(toCartItem);
}
