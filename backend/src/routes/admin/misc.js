import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../../lib/validate.js';
import { HttpError } from '../../lib/errors.js';
import { toCategory, toCoupon, toCustomer, toReview } from '../../lib/mappers.js';

const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/gi, 'd').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30) || 'danh-muc';

const catCreate = z.object({
  name: z.string({ error: 'Nhập tên danh mục.' }).trim().min(1, { error: 'Nhập tên danh mục.' }).max(80),
  sub: z.string().trim().max(200).optional(),
  id: z.string().trim().regex(/^[a-z0-9-]{2,40}$/, { error: 'Mã danh mục chỉ gồm chữ thường, số và dấu gạch.' }).optional(),
});
const catPatch = z.object({
  name: z.string().trim().min(1, { error: 'Nhập tên danh mục.' }).max(80).optional(),
  sub: z.string().trim().max(200).optional(),
});
const reviewFilter = z.object({ status: z.enum(['visible', 'hidden'], { error: 'Trạng thái không hợp lệ.' }).optional() });
const reviewPatch = z.object({ status: z.enum(['visible', 'hidden'], { error: 'Trạng thái không hợp lệ.' }) });
const couponBase = {
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/, { error: 'Mã gồm 3–20 chữ in hoa hoặc số.' }),
  type: z.enum(['pct', 'amt', 'ship'], { error: 'Loại mã không hợp lệ.' }),
  value: z.coerce.number().int().min(0),
  minSubtotal: z.coerce.number().int().min(0),
  label: z.string().trim().min(3).max(200),
  active: z.boolean(),
  expiresAt: z.iso.datetime({ offset: true }).nullable(),
  usageLimit: z.coerce.number().int().positive().nullable(),
};
const couponCreate = z
  .object({ ...couponBase, value: couponBase.value.default(0), minSubtotal: couponBase.minSubtotal.default(0), active: couponBase.active.default(true), expiresAt: couponBase.expiresAt.optional(), usageLimit: couponBase.usageLimit.optional() })
  .refine((c) => c.type !== 'pct' || (c.value >= 1 && c.value <= 100), { error: 'Mã phần trăm cần giá trị 1–100.', path: ['value'] });
const { code: _code, type: _type, ...patchable } = couponBase;
const couponPatch = z.object(patchable).partial();

export function adminMiscRoutes() {
  const r = Router();

  // AC-ADM-01
  r.get('/dashboard', async (req, res) => {
    res.json(await req.db(async (c) => (await c.query('select public.admin_dashboard() as d')).rows[0].d));
  });

  // AC-ADM-06
  r.get('/customers', async (req, res) => {
    const rows = await req.db(
      async (c) =>
        (
          await c.query(
            `select pr.id, pr.full_name, pr.email, pr.phone, pr.address, pr.created_at,
                    count(o.id) filter (where o.status <> 'cancelled')::int as orders,
                    coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::int as spent
               from public.profiles pr left join public.orders o on o.user_id = pr.id
              where pr.role = 'customer'
              group by pr.id order by spent desc, pr.full_name`,
          )
        ).rows,
    );
    res.json({ items: rows.map(toCustomer) });
  });

  // AC-ADM-03
  r.post('/categories', async (req, res) => {
    const b = parse(catCreate, req.body);
    const row = await req.db(async (c) => {
      let id = b.id || slug(b.name);
      if (id.length < 2) id = `dm-${id}`;
      for (let i = 2; (await c.query('select 1 from public.categories where id = $1', [id])).rowCount; i += 1) id = `${slug(b.name)}-${i}`;
      const max = (await c.query('select coalesce(max(sort_order), 0) + 1 as n from public.categories')).rows[0].n;
      return (await c.query('insert into public.categories (id, name, description, sort_order) values ($1, $2, $3, $4) returning *', [id, b.name, b.sub || 'Danh mục mới', max])).rows[0];
    });
    res.status(201).json(toCategory({ ...row, count: 0 }));
  });

  r.patch('/categories/:id', async (req, res) => {
    const b = parse(catPatch, req.body);
    const row = await req.db(
      async (c) =>
        (
          await c.query('update public.categories set name = coalesce($2, name), description = coalesce($3, description) where id = $1 returning *', [
            req.params.id,
            b.name ?? null,
            b.sub ?? null,
          ])
        ).rows[0],
    );
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy danh mục.');
    res.json(toCategory(row));
  });

  r.delete('/categories/:id', async (req, res) => {
    const n = await req.db(async (c) => {
      const used = (await c.query('select count(*)::int as n from public.products where category_id = $1', [req.params.id])).rows[0].n;
      if (used) throw new HttpError(409, 'CONFLICT', `Không xoá được: danh mục đang có ${used} sản phẩm.`);
      return (await c.query('delete from public.categories where id = $1', [req.params.id])).rowCount;
    });
    if (!n) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy danh mục.');
    res.status(204).end();
  });

  // AC-ADM-07
  r.get('/reviews', async (req, res) => {
    const f = parse(reviewFilter, req.query);
    const rows = await req.db(async (c) =>
      f.status
        ? (await c.query('select * from public.reviews where status = $1 order by created_at desc', [f.status])).rows
        : (await c.query('select * from public.reviews order by created_at desc')).rows,
    );
    res.json({ items: rows.map((x) => toReview(x)) });
  });

  r.patch('/reviews/:id', async (req, res) => {
    const b = parse(reviewPatch, req.body);
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá.');
    const row = await req.db(async (c) => (await c.query('update public.reviews set status = $2 where id = $1 returning *', [req.params.id, b.status])).rows[0]);
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá.');
    res.json(toReview(row));
  });

  r.delete('/reviews/:id', async (req, res) => {
    if (!/^[0-9a-f-]{36}$/i.test(req.params.id)) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá.');
    const n = await req.db(async (c) => (await c.query('delete from public.reviews where id = $1', [req.params.id])).rowCount);
    if (!n) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy đánh giá.');
    res.status(204).end();
  });

  // AC-ADM-08
  r.get('/coupons', async (req, res) => {
    const rows = await req.db(async (c) => (await c.query('select * from public.coupons order by created_at, code')).rows);
    res.json({ items: rows.map(toCoupon) });
  });

  r.post('/coupons', async (req, res) => {
    const b = parse(couponCreate, req.body);
    const row = await req.db(async (c) => {
      if ((await c.query('select 1 from public.coupons where code = $1', [b.code])).rowCount) throw new HttpError(409, 'CONFLICT', 'Mã này đã tồn tại.');
      return (
        await c.query(
          `insert into public.coupons (code, type, value, min_subtotal, label, active, expires_at, usage_limit)
           values ($1, $2, $3, $4, $5, $6, $7, $8) returning *`,
          [b.code, b.type, b.value, b.minSubtotal, b.label, b.active, b.expiresAt ?? null, b.usageLimit ?? null],
        )
      ).rows[0];
    });
    res.status(201).json(toCoupon(row));
  });

  r.patch('/coupons/:code', async (req, res) => {
    const b = parse(couponPatch, req.body);
    const map = { value: 'value', minSubtotal: 'min_subtotal', label: 'label', active: 'active', expiresAt: 'expires_at', usageLimit: 'usage_limit' };
    const keys = Object.keys(map).filter((k) => b[k] !== undefined);
    const row = await req.db(async (c) => {
      if (!keys.length) return (await c.query('select * from public.coupons where code = $1', [req.params.code.toUpperCase()])).rows[0];
      return (
        await c.query(`update public.coupons set ${keys.map((k, i) => `${map[k]} = $${i + 2}`).join(', ')} where code = $1 returning *`, [
          req.params.code.toUpperCase(),
          ...keys.map((k) => b[k]),
        ])
      ).rows[0];
    });
    if (!row) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy mã giảm giá.');
    res.json(toCoupon(row));
  });

  return r;
}
