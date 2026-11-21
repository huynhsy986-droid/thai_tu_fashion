import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp, bearer } from '../helpers/app.js';
import { ADMIN, DEMO } from '../helpers/env.js';

let t;
let admin;
const A = () => bearer(admin);
beforeAll(async () => {
  t = await makeTestApp('admin');
  admin = await t.login(ADMIN);
  await t.sql("update public.product_variants set stock = 50 where stock > 0");
});
afterAll(async () => t?.close());

const stock = async (pid, color, size) =>
  (await t.sql('select stock from public.product_variants where product_id = $1 and color_code = $2 and size = $3', [pid, color, size])).rows[0].stock;

async function newOrder() {
  const c = await t.newCustomer();
  await t.api().post('/api/cart/items').set(bearer(c.token)).send({ productId: 'k05', color: 'sky', size: 'M', quantity: 2 });
  const o = await t.api().post('/api/orders').set(bearer(c.token)).send({ name: 'Khách Admin Test', phone: '0987654321', address: '10 Hai Bà Trưng, Hoàn Kiếm, Hà Nội' });
  return { c, order: o.body };
}

describe('F8 · Quản trị', () => {
  it('AC-AUTH-04 khách gọi API quản trị → 403, chưa đăng nhập → 401', async () => {
    const demo = await t.login(DEMO);
    for (const path of ['/api/admin/dashboard', '/api/admin/orders', '/api/admin/customers', '/api/admin/products', '/api/admin/reviews', '/api/admin/coupons']) {
      expect((await t.api().get(path).set(bearer(demo))).status).toBe(403);
      expect((await t.api().get(path)).status).toBe(401);
    }
    expect((await t.api().patch('/api/admin/products/k01').set(bearer(demo)).send({ price: 1 })).status).toBe(403);
  });

  it('AC-ADM-01 dashboard: 8 tuần doanh thu (không tính huỷ), đếm theo trạng thái, SP, khách, sắp hết', async () => {
    await t.sql("update public.product_variants set stock = 1 where product_id = 'k22' and color_code = 'lav'");
    const d = (await t.api().get('/api/admin/dashboard').set(A())).body;
    expect(d.revenueWeeks).toHaveLength(8);
    const { rows } = await t.sql(`select coalesce(sum(total),0)::int as s from public.orders where status <> 'cancelled' and created_at >= date_trunc('week', now()) - interval '7 weeks'`);
    expect(d.revenue8w).toBe(rows[0].s);
    expect(d.revenueWeeks.reduce((a, w) => a + w.revenue, 0)).toBe(rows[0].s);
    expect(Object.keys(d.statusCounts).sort()).toEqual(['cancelled', 'confirmed', 'delivered', 'pending', 'processing', 'shipping']);
    expect(d.activeProducts).toBe(66);
    expect(d.customers).toBeGreaterThanOrEqual(13);
    const low = (await t.sql("select count(*)::int as n from public.product_variants v join public.products p on p.id = v.product_id where p.status = 'active' and v.stock <= 2")).rows[0].n;
    expect(d.lowStockCount).toBe(low);
    expect(d.lowStock.length).toBe(Math.min(50, low));
    expect(d.lowStock.every((x, i, a) => x.stock <= 2 && (i === 0 || a[i - 1].stock <= x.stock))).toBe(true);
  });

  it('AC-ADM-02 tạo sản phẩm kế thừa ảnh từ SP mẫu, biến thể mặc định 10, xuất hiện ở cửa hàng', async () => {
    const res = await t.api().post('/api/admin/products').set(A()).send({ name: 'Áo thun test admin', cat: 'tops', price: 350000, sale: 0, sizes: ['S', 'M'], colors: ['white', 'black'], base: 'k06', badge: 'new' });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Áo thun test admin', base: 'k06', tpl: 'boxytee', stock: { white: { S: 10, M: 10 }, black: { S: 10, M: 10 } } });
    const pub = await t.api().get(`/api/products/${res.body.id}`);
    expect(pub.status).toBe(200);
  });

  it.each([
    [{ name: 'Ao' }, 'Tên cần ít nhất 3 ký tự.'],
    [{ price: 0 }, 'Nhập giá lớn hơn 0.'],
    [{ sale: 500000 }, 'Giá khuyến mãi phải thấp hơn giá gốc.'],
    [{ sizes: [] }, 'Nhập ít nhất một size.'],
    [{ colors: [] }, 'Chọn ít nhất một màu.'],
    [{ colors: ['tim-than'] }, 'Màu không tồn tại: tim-than.'],
    [{ cat: 'khongco' }, 'Danh mục không tồn tại.'],
  ])('AC-ADM-02 dữ liệu sai %j → 422 "%s"', async (patch, msg) => {
    const res = await t.api().post('/api/admin/products').set(A()).send({ name: 'Sản phẩm hợp lệ', cat: 'tops', price: 400000, sizes: ['M'], colors: ['white'], base: 'k06', ...patch });
    expect(res.status).toBe(422);
    expect(res.body.error.message).toBe(msg);
  });

  it('AC-ADM-02 sửa màu/size: biến thể giữ lại giữ tồn kho, biến thể mới = 10, bị bỏ thì xoá', async () => {
    await t.sql("update public.product_variants set stock = 7 where product_id = 'k12' and color_code = 'grey' and size = 'M'");
    const res = await t.api().patch('/api/admin/products/k12').set(A()).send({ colors: ['grey', 'white'], sizes: ['M', 'L'] });
    expect(res.status).toBe(200);
    expect(res.body.stock).toEqual({ grey: { M: 7, L: 50 }, white: { M: 10, L: 10 } });
    const n = (await t.sql("select count(*)::int as n from public.product_variants where product_id = 'k12'")).rows[0].n;
    expect(n).toBe(4);
  });

  it('AC-ADM-02 sale ≥ giá gốc sau khi gộp → 422; ẩn sản phẩm → khách không thấy', async () => {
    expect((await t.api().patch('/api/admin/products/k13').set(A()).send({ sale: 450000 })).status).toBe(422);
    expect((await t.api().patch('/api/admin/products/k13').set(A()).send({ status: 'hidden' })).body.status).toBe('hidden');
    expect((await t.api().get('/api/products/k13')).status).toBe(404);
    expect((await t.api().get('/api/admin/products').set(A())).body.items.find((p) => p.id === 'k13').status).toBe('hidden');
    await t.api().patch('/api/admin/products/k13').set(A()).send({ status: 'active' });
    expect((await t.api().patch('/api/admin/products/khongco').set(A()).send({ name: 'Tên mới đây' })).status).toBe(404);
  });

  it('AC-ADM-03 danh mục: thêm (sinh mã từ tên), đổi tên, xoá; không xoá được khi còn SP', async () => {
    const c = await t.api().post('/api/admin/categories').set(A()).send({ name: 'Đồ bơi Hè' });
    expect(c.status).toBe(201);
    expect(c.body).toMatchObject({ id: 'do-boi-he', name: 'Đồ bơi Hè', count: 0 });
    const dup = await t.api().post('/api/admin/categories').set(A()).send({ name: 'Đồ bơi Hè' });
    expect(dup.body.id).toBe('do-boi-he-2');
    expect((await t.api().patch('/api/admin/categories/do-boi-he').set(A()).send({ name: 'Đồ bơi' })).body.name).toBe('Đồ bơi');
    expect((await t.api().delete('/api/admin/categories/do-boi-he').set(A())).status).toBe(204);
    const used = await t.api().delete('/api/admin/categories/tops').set(A());
    expect(used.status).toBe(409);
    expect(used.body.error.message).toMatch(/đang có \d+ sản phẩm/);
    expect((await t.api().post('/api/admin/categories').set(A()).send({ name: '' })).body.error.message).toBe('Nhập tên danh mục.');
  });

  it('AC-ADM-04 đặt tồn kho biến thể; số âm/không nguyên → 422; biến thể không có → 404', async () => {
    const r = await t.api().put('/api/admin/products/k04/stock').set(A()).send({ color: 'pink', size: 'One size', stock: 33 });
    expect(r.body.stock.pink['One size']).toBe(33);
    expect((await t.api().put('/api/admin/products/k04/stock').set(A()).send({ color: 'pink', size: 'One size', stock: -1 })).status).toBe(422);
    expect((await t.api().put('/api/admin/products/k04/stock').set(A()).send({ color: 'pink', size: 'One size', stock: 1.5 })).status).toBe(422);
    expect((await t.api().put('/api/admin/products/k04/stock').set(A()).send({ color: 'pink', size: 'XXL', stock: 1 })).status).toBe(404);
  });

  it('AC-ADM-05 đi hết luồng trạng thái, mỗi bước có lịch sử + thông báo cho khách; COD giao xong → paid', async () => {
    const { c, order } = await newOrder();
    for (const s of ['confirmed', 'processing', 'shipping', 'delivered']) {
      const r = await t.api().patch(`/api/admin/orders/${order.id}/status`).set(A()).send({ status: s });
      expect(r.status).toBe(200);
      expect(r.body.status).toBe(s);
    }
    const o = (await t.api().get(`/api/admin/orders/${order.id}`).set(A())).body;
    expect(o.history.map((h) => h.to)).toEqual(['pending', 'confirmed', 'processing', 'shipping', 'delivered']);
    expect(o.payStatus).toBe('paid');
    expect(o.allowedNext).toEqual([]);
    const n = (await t.api().get('/api/me/notifications').set(bearer(c.token))).body.items;
    expect(n[0].title).toBe(`Đơn ${order.id}: Đã giao`);
  });

  it('AC-ADM-05 chuyển sai luồng → 422; huỷ → hoàn kho', async () => {
    const { order } = await newOrder();
    const before = await stock('k05', 'sky', 'M');
    const bad = await t.api().patch(`/api/admin/orders/${order.id}/status`).set(A()).send({ status: 'delivered' });
    expect(bad.status).toBe(422);
    expect(bad.body.error).toMatchObject({ code: 'INVALID_TRANSITION', message: 'Không thể chuyển đơn từ "Chờ xác nhận" sang "Đã giao".' });
    await t.api().patch(`/api/admin/orders/${order.id}/status`).set(A()).send({ status: 'confirmed' });
    const cancel = await t.api().patch(`/api/admin/orders/${order.id}/status`).set(A()).send({ status: 'cancelled', note: 'Khách gọi huỷ' });
    expect(cancel.body.status).toBe('cancelled');
    expect(await stock('k05', 'sky', 'M')).toBe(before + 2);
    expect((await t.api().patch(`/api/admin/orders/${order.id}/status`).set(A()).send({ status: 'pending' })).status).toBe(422);
    expect((await t.api().patch(`/api/admin/orders/${order.id}/status`).set(A()).send({ status: 'lost' })).status).toBe(422);
    expect((await t.api().patch('/api/admin/orders/TT0000/status').set(A()).send({ status: 'confirmed' })).status).toBe(404);
  });

  it('AC-ADM-05 lọc đơn theo trạng thái', async () => {
    const r = await t.api().get('/api/admin/orders').query({ status: 'delivered' }).set(A());
    expect(r.body.items.length).toBeGreaterThan(0);
    expect(r.body.items.every((o) => o.status === 'delivered')).toBe(true);
    expect((await t.api().get('/api/admin/orders').query({ status: 'x' }).set(A())).status).toBe(422);
  });

  it('AC-ADM-06 khách hàng kèm số đơn và tổng chi (không tính đơn huỷ)', async () => {
    const r = await t.api().get('/api/admin/customers').set(A());
    const demo = r.body.items.find((c) => c.id === DEMO.id);
    const { rows } = await t.sql("select count(*)::int as n, coalesce(sum(total),0)::int as s from public.orders where user_id = $1 and status <> 'cancelled'", [DEMO.id]);
    expect(demo).toMatchObject({ name: 'Nguyễn Minh Anh', orders: rows[0].n, spent: rows[0].s });
    expect(r.body.items.every((c) => c.id !== ADMIN.id)).toBe(true);
  });

  it('AC-ADM-07 kiểm duyệt đánh giá: lọc, ẩn/hiện, xoá', async () => {
    const all = (await t.api().get('/api/admin/reviews').set(A())).body.items;
    const id = all[0].id;
    expect((await t.api().patch(`/api/admin/reviews/${id}`).set(A()).send({ status: 'hidden' })).body.status).toBe('hidden');
    const hidden = (await t.api().get('/api/admin/reviews').query({ status: 'hidden' }).set(A())).body.items;
    expect(hidden.map((r) => r.id)).toContain(id);
    expect((await t.api().get(`/api/products/${all[0].pid}/reviews`)).body.items.map((r) => r.id)).not.toContain(id);
    expect((await t.api().delete(`/api/admin/reviews/${id}`).set(A())).status).toBe(204);
    expect((await t.api().delete(`/api/admin/reviews/${id}`).set(A())).status).toBe(404);
  });

  it('AC-ADM-08 mã giảm giá: xem, tạo, tắt → khách không dùng được', async () => {
    expect((await t.api().get('/api/admin/coupons').set(A())).body.items.map((c) => c.code)).toEqual(expect.arrayContaining(['THAITU10', 'NEW50K', 'FREESHIP']));
    const c = await t.api().post('/api/admin/coupons').set(A()).send({ code: 'tet2027', type: 'pct', value: 15, label: 'Giảm 15% dịp Tết' });
    expect(c.status).toBe(201);
    expect(c.body.code).toBe('TET2027');
    expect((await t.api().post('/api/admin/coupons').set(A()).send({ code: 'TET2027', type: 'pct', value: 15, label: 'Trùng mã' })).status).toBe(409);
    expect((await t.api().post('/api/admin/coupons').set(A()).send({ code: 'BAD', type: 'pct', value: 150, label: 'Sai phần trăm' })).status).toBe(422);
    const cust = await t.newCustomer();
    await t.api().post('/api/cart/items').set(bearer(cust.token)).send({ productId: 'k06', color: 'mint', size: 'M' });
    expect((await t.api().post('/api/cart/quote').set(bearer(cust.token)).send({ coupon: 'TET2027' })).body.discount).toBe(43500);
    expect((await t.api().patch('/api/admin/coupons/tet2027').set(A()).send({ active: false })).body.active).toBe(false);
    expect((await t.api().post('/api/cart/quote').set(bearer(cust.token)).send({ coupon: 'TET2027' })).status).toBe(422);
    expect((await t.api().patch('/api/admin/coupons/NOPE').set(A()).send({ active: false })).status).toBe(404);
  });
});
