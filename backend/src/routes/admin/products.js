import { Router } from 'express';
import { z } from 'zod';
import { parse } from '../../lib/validate.js';
import { HttpError } from '../../lib/errors.js';
import { PRODUCT_SELECT, getProduct } from '../../lib/queries.js';
import { toProduct } from '../../lib/mappers.js';

const sizeList = z
  .array(z.string().trim().min(1).max(20), { error: 'Nhập ít nhất một size.' })
  .min(1, { error: 'Nhập ít nhất một size.' })
  .max(20)
  .transform((a) => [...new Set(a)]);
const colorList = z
  .array(z.string().trim().min(1).max(20), { error: 'Chọn ít nhất một màu.' })
  .min(1, { error: 'Chọn ít nhất một màu.' })
  .max(12)
  .transform((a) => [...new Set(a)]);

const fields = {
  name: z.string({ error: 'Tên cần ít nhất 3 ký tự.' }).trim().min(3, { error: 'Tên cần ít nhất 3 ký tự.' }).max(160),
  cat: z.string({ error: 'Chọn danh mục.' }).trim().min(1, { error: 'Chọn danh mục.' }),
  sub: z.string().trim().min(1).max(30),
  gender: z.enum(['unisex', 'nu', 'nam'], { error: 'Giới tính không hợp lệ.' }),
  badge: z.enum(['', 'new', 'best', 'sale'], { error: 'Nhãn không hợp lệ.' }),
  price: z.coerce.number({ error: 'Nhập giá lớn hơn 0.' }).int().positive({ error: 'Nhập giá lớn hơn 0.' }).max(1_000_000_000),
  sale: z.coerce.number().int().min(0).max(1_000_000_000),
  sizes: sizeList,
  colors: colorList,
  desc: z.string().trim().max(2000),
  base: z.string().trim().min(1),
  status: z.enum(['active', 'hidden']),
};
const createSchema = z.object({ ...fields, sub: fields.sub.optional(), gender: fields.gender.default('unisex'), badge: fields.badge.default(''), sale: fields.sale.default(0), desc: fields.desc.optional(), status: fields.status.default('active') });
const patchSchema = z.object(fields).partial();
const stockSchema = z.object({
  color: z.string().min(1),
  size: z.string().min(1),
  stock: z.coerce.number({ error: 'Tồn kho phải là số nguyên ≥ 0.' }).int({ error: 'Tồn kho phải là số nguyên ≥ 0.' }).min(0, { error: 'Tồn kho phải là số nguyên ≥ 0.' }).max(100000),
});

/** Kiểm tra ràng buộc liên trường (AC-ADM-02) với giá trị sau khi gộp. */
function checkMerged(v) {
  if (v.sale && v.sale >= v.price) throw new HttpError(422, 'VALIDATION', 'Giá khuyến mãi phải thấp hơn giá gốc.', [{ field: 'sale', message: 'Giá khuyến mãi phải thấp hơn giá gốc.' }]);
}

async function assertRefs(c, { cat, colors }) {
  if (cat) {
    const ok = (await c.query('select 1 from public.categories where id = $1', [cat])).rowCount;
    if (!ok) throw new HttpError(422, 'VALIDATION', 'Danh mục không tồn tại.', [{ field: 'cat', message: 'Danh mục không tồn tại.' }]);
  }
  if (colors) {
    const known = (await c.query('select code from public.colors where code = any($1)', [colors])).rows.map((r) => r.code);
    const bad = colors.filter((x) => !known.includes(x));
    if (bad.length) throw new HttpError(422, 'VALIDATION', `Màu không tồn tại: ${bad.join(', ')}.`, [{ field: 'colors', message: 'Màu không tồn tại.' }]);
  }
}

export function adminProductRoutes() {
  const r = Router();

  r.get('/', async (req, res) => {
    const rows = await req.db(async (c) => (await c.query(`${PRODUCT_SELECT} order by p.created_at desc, p.id`)).rows);
    res.json({ items: rows.map(toProduct) });
  });

  // AC-ADM-02 — tạo mới, kế thừa ảnh/mô tả từ sản phẩm mẫu (base)
  r.post('/', async (req, res) => {
    const b = parse(createSchema, req.body);
    checkMerged(b);
    const product = await req.db(async (c) => {
      await assertRefs(c, b);
      const base = (await c.query('select * from public.products where id = $1', [b.base])).rows[0];
      if (!base) throw new HttpError(422, 'VALIDATION', 'Sản phẩm mẫu (ảnh) không tồn tại.', [{ field: 'base', message: 'Sản phẩm mẫu không tồn tại.' }]);
      const id = `n${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`;
      await c.query(
        `insert into public.products (id, name, kor_name, category_id, sub_type, gender, template, texture, base_image, image_colors,
                                      price, sale_price, sizes, colors, badge, fit, fabric, occasions, styles, description, material, care,
                                      is_photo, status)
         values ($1, $2, null, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)`,
        [id, b.name, b.cat, b.sub || base.sub_type, b.gender, base.template, base.texture, base.base_image, base.image_colors,
          b.price, b.sale || null, b.sizes, b.colors, b.badge, base.fit, base.fabric, base.occasions, base.styles,
          b.desc || base.description, base.material, base.care, base.is_photo, b.status],
      );
      return getProduct(c, id);
    });
    res.status(201).json(product);
  });

  // AC-ADM-02 — sửa/ẩn; đổi giá → trigger báo giảm giá; đổi màu/size → trigger đồng bộ biến thể
  r.patch('/:id', async (req, res) => {
    const b = parse(patchSchema, req.body);
    const product = await req.db(async (c) => {
      const cur = (await c.query('select * from public.products where id = $1 for update', [req.params.id])).rows[0];
      if (!cur) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy sản phẩm.');
      const merged = { price: b.price ?? cur.price, sale: b.sale ?? (cur.sale_price || 0) };
      checkMerged(merged);
      await assertRefs(c, b);
      let baseCols = {};
      if (b.base && b.base !== cur.base_image) {
        const base = (await c.query('select base_image, image_colors from public.products where id = $1', [b.base])).rows[0];
        if (!base) throw new HttpError(422, 'VALIDATION', 'Sản phẩm mẫu (ảnh) không tồn tại.');
        baseCols = { base_image: base.base_image, image_colors: base.image_colors };
      }
      const set = {
        name: b.name, category_id: b.cat, sub_type: b.sub, gender: b.gender, badge: b.badge, price: b.price,
        sale_price: b.sale === undefined ? undefined : b.sale || null, sizes: b.sizes, colors: b.colors,
        description: b.desc, status: b.status, ...baseCols,
      };
      const keys = Object.keys(set).filter((k) => set[k] !== undefined);
      if (keys.length) {
        await c.query(`update public.products set ${keys.map((k, i) => `${k} = $${i + 2}`).join(', ')} where id = $1`, [cur.id, ...keys.map((k) => set[k])]);
      }
      return getProduct(c, cur.id);
    });
    res.json(product);
  });

  // AC-ADM-04 — tồn kho 0 → >0 kích hoạt trigger báo có hàng (AC-WISH-03)
  r.put('/:id/stock', async (req, res) => {
    const b = parse(stockSchema, req.body);
    const product = await req.db(async (c) => {
      const n = (await c.query('update public.product_variants set stock = $4 where product_id = $1 and color_code = $2 and size = $3', [req.params.id, b.color, b.size, b.stock])).rowCount;
      if (!n) throw new HttpError(404, 'NOT_FOUND', 'Không tìm thấy biến thể.');
      return getProduct(c, req.params.id);
    });
    res.json(product);
  });

  return r;
}
