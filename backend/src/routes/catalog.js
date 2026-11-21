import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../lib/validate.js';
import { HttpError } from '../lib/errors.js';
import { requireAuth } from '../auth/middleware.js';
import { PRODUCT_SELECT, getProduct } from '../lib/queries.js';
import { toCategory, toProduct, toReview } from '../lib/mappers.js';

const CATEGORY_SQL = `
  select c.*, (select count(*) from public.products p where p.category_id = c.id and p.status = 'active') as count
    from public.categories c order by c.sort_order, c.name`;
const REVIEW_SELECT = 'select * from public.reviews';

const listSchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(40).optional(),
  gender: z.enum(['unisex', 'nu', 'nam'], { error: 'Giới tính không hợp lệ.' }).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  sort: z.enum(['new', 'price_asc', 'price_desc', 'best'], { error: 'Kiểu sắp xếp không hợp lệ.' }).default('best'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(24),
});

const ORDER_BY = {
  new: 'p.created_at desc, p.id',
  price_asc: 'public.effective_price(p.price, p.sale_price) asc, p.id',
  price_desc: 'public.effective_price(p.price, p.sale_price) desc, p.id',
  best: 'p.sold_count desc, p.id',
};

const reviewSchema = z.object({
  rating: z.coerce.number({ error: 'Hãy chọn số sao.' }).int().min(1, { error: 'Hãy chọn số sao.' }).max(5, { error: 'Hãy chọn số sao.' }),
  name: z.string({ error: 'Nhập tên hiển thị.' }).trim().min(2, { error: 'Nhập tên hiển thị.' }).max(60),
  text: z.string({ error: 'Nhận xét cần ít nhất 10 ký tự.' }).trim().min(10, { error: 'Nhận xét cần ít nhất 10 ký tự.' }).max(2000),
  size: z.string().trim().max(20).optional(),
  color: z.string().trim().max(20).optional(),
  img: z
    .string()
    .max(200_000, { error: 'Ảnh quá lớn (tối đa ~150 KB sau khi thu nhỏ).' })
    .regex(/^data:image\/(jpeg|png|webp);base64,/, { error: 'Ảnh không hợp lệ.' })
    .nullish(),
});

export function catalogRoutes() {
  const r = Router();

  // Gói catalogue cho SPA khởi động (AC-CAT-01). RLS quyết định phạm vi: admin thấy cả SP/đánh giá ẩn.
  r.get('/catalog', async (req, res) => {
    const data = await req.db(async (c) => {
      // node-postgres xếp hàng các query trên cùng một kết nối nên chạy tuần tự trong transaction
      const cats = await c.query(CATEGORY_SQL);
      const colors = await c.query('select * from public.colors order by code');
      const ship = await c.query('select * from public.shipping_methods order by sort_order');
      const products = await c.query(`${PRODUCT_SELECT} order by p.created_at desc, p.id`);
      const reviews = await c.query(`${REVIEW_SELECT} order by created_at desc`);
      return {
        categories: cats.rows.map(toCategory),
        colors: colors.rows,
        shipping: ship.rows.map((s) => ({ code: s.code, name: s.name, eta: s.eta, fee: s.fee, freeThreshold: s.free_threshold })),
        products: products.rows.map(toProduct),
        reviews: reviews.rows.map((x) => toReview(x, req.user?.id)),
      };
    });
    res.set('Cache-Control', req.user ? 'private, no-store' : 'public, max-age=30').json(data);
  });

  r.get('/categories', async (req, res) => {
    const rows = await req.db(async (c) => (await c.query(CATEGORY_SQL)).rows);
    res.json({ items: rows.map(toCategory) });
  });

  r.get('/colors', async (req, res) => {
    const rows = await req.db(async (c) => (await c.query('select * from public.colors order by code')).rows);
    res.json({ items: rows });
  });

  r.get('/shipping-methods', async (req, res) => {
    const rows = await req.db(async (c) => (await c.query('select * from public.shipping_methods order by sort_order')).rows);
    res.json({ items: rows.map((s) => ({ code: s.code, name: s.name, eta: s.eta, fee: s.fee, freeThreshold: s.free_threshold })) });
  });

  // AC-CAT-01, AC-CAT-02
  r.get('/products', async (req, res) => {
    const f = parse(listSchema, req.query);
    if (f.minPrice != null && f.maxPrice != null && f.minPrice > f.maxPrice) {
      throw new HttpError(422, 'VALIDATION', 'Giá thấp nhất phải nhỏ hơn giá cao nhất.');
    }
    const where = ["p.status = 'active'"];
    const args = [];
    const add = (sql, v) => { args.push(v); where.push(sql.replace('$?', `$${args.length}`)); };
    if (f.q) {
      add(`extensions.unaccent('extensions.unaccent'::regdictionary, lower(p.name || ' ' || coalesce(p.kor_name, '') || ' ' || p.sub_type || ' ' || p.category_id))
           like '%' || extensions.unaccent('extensions.unaccent'::regdictionary, lower($?)) || '%'`, f.q);
    }
    if (f.category) add('p.category_id = $?', f.category);
    if (f.gender) add("(p.gender = $? or p.gender = 'unisex')", f.gender);
    if (f.minPrice != null) add('public.effective_price(p.price, p.sale_price) >= $?', f.minPrice);
    if (f.maxPrice != null) add('public.effective_price(p.price, p.sale_price) <= $?', f.maxPrice);
    const base = `${PRODUCT_SELECT} where ${where.join(' and ')}`;
    const order = ORDER_BY[f.sort].replace(/p\./g, 'x.');
    const { rows, total } = await req.db(async (c) => {
      const n = (await c.query(`select count(*)::int as n from (${base}) x`, args)).rows[0].n;
      const list = await c.query(`select x.* from (${base}) x order by ${order} limit $${args.length + 1} offset $${args.length + 2}`,
        [...args, f.pageSize, (f.page - 1) * f.pageSize]);
      return { rows: list.rows, total: n };
    });
    res.json({ items: rows.map(toProduct), total, page: f.page, pageSize: f.pageSize });
  });

  // AC-CAT-03 — SP ẩn bị RLS lọc → 404
  r.get('/products/:id', async (req, res) => {
    const p = await req.db((c) => getProduct(c, req.params.id));
    if (!p || (p.status !== 'active' && !(await isAdmin(req)))) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm.');
    res.json(p);
  });

  // AC-REV-02
  r.get('/products/:id/reviews', async (req, res) => {
    const rows = await req.db(async (c) => (await c.query(`${REVIEW_SELECT} where product_id = $1 and status = 'visible' order by created_at desc`, [req.params.id])).rows);
    res.json({ items: rows.map((x) => toReview(x, req.user?.id)) });
  });

  // AC-REV-01 — "đã mua" do trigger DB quyết định
  r.post('/products/:id/reviews', requireAuth, async (req, res) => {
    const b = parse(reviewSchema, req.body);
    const review = await req.db(async (c) => {
      const p = (await c.query("select id, sizes, colors from public.products where id = $1 and status = 'active'", [req.params.id])).rows[0];
      if (!p) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm.');
      const size = b.size && p.sizes.includes(b.size) ? b.size : p.sizes[0];
      const color = b.color && p.colors.includes(b.color) ? b.color : p.colors[0];
      const m = (await c.query('select height_cm, weight_kg from public.body_measurements where user_id = $1', [req.user.id])).rows[0];
      const { rows } = await c.query(
        `insert into public.reviews (product_id, user_id, display_name, rating, body, size, color_code, height_cm, weight_kg, image_url)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) returning *`,
        [p.id, req.user.id, b.name, b.rating, b.text, size, color, m ? Math.round(m.height_cm) : null, m ? Math.round(m.weight_kg) : null, b.img || null],
      );
      return rows[0];
    });
    res.status(201).json(toReview(review, req.user.id));
  });

  return r;
}

async function isAdmin(req) {
  if (!req.user) return false;
  return req.db(async (c) => (await c.query('select public.is_admin() as ok')).rows[0].ok);
}
