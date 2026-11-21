import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp, bearer } from '../helpers/app.js';
import { DEMO, ADMIN } from '../helpers/env.js';

let t;
beforeAll(async () => { t = await makeTestApp('catalog'); });
afterAll(async () => t?.close());

describe('F2 · Danh mục & sản phẩm', () => {
  it('AC-CAT-01 /api/catalog trả đủ catalogue cho SPA, khách vãng lai chỉ thấy SP đang bán', async () => {
    await t.sql("update public.products set status = 'hidden' where id = 'k24'");
    const res = await t.api().get('/api/catalog');
    expect(res.status).toBe(200);
    expect(res.body.categories).toHaveLength(7);
    expect(res.body.shipping.map((s) => s.code)).toEqual(['std', 'exp']);
    expect(res.body.products).toHaveLength(65);
    expect(res.body.products.find((p) => p.id === 'k24')).toBeUndefined();
    const k01 = res.body.products.find((p) => p.id === 'k01');
    expect(k01.stock.lav).toMatchObject({ M: 6, L: 2 });
    expect(k01.rating.count).toBeGreaterThan(0);
    expect(res.body.reviews.every((r) => r.status === 'visible')).toBe(true);
  });

  it('AC-CAT-01 admin nhận cả sản phẩm ẩn trong catalogue', async () => {
    const res = await t.api().get('/api/catalog').set(bearer(await t.login(ADMIN)));
    expect(res.body.products.find((p) => p.id === 'k24')?.status).toBe('hidden');
  });

  it('AC-CAT-02 tìm không dấu: "ao khoac" khớp "Áo khoác…"', async () => {
    const res = await t.api().get('/api/products').query({ q: 'ao khoac', pageSize: 100 });
    expect(res.status).toBe(200);
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.some((p) => p.name.startsWith('Áo khoác'))).toBe(true);
    const viet = await t.api().get('/api/products').query({ q: 'ĐẦM', pageSize: 100 });
    expect(viet.body.items.every((p) => p.cat === 'dresses' || /đầm/i.test(p.name))).toBe(true);
  });

  it('AC-CAT-02 lọc danh mục + khoảng giá + sắp xếp giá tăng dần', async () => {
    const res = await t.api().get('/api/products').query({ category: 'bottoms', minPrice: 400000, maxPrice: 700000, sort: 'price_asc', pageSize: 100 });
    const eff = (p) => p.sale || p.price;
    expect(res.body.items.length).toBeGreaterThan(0);
    expect(res.body.items.every((p) => p.cat === 'bottoms' && eff(p) >= 400000 && eff(p) <= 700000)).toBe(true);
    const prices = res.body.items.map(eff);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });

  it('AC-CAT-02 lọc giới tính gồm cả unisex; sort best theo số đã bán', async () => {
    const res = await t.api().get('/api/products').query({ gender: 'nam', sort: 'best', pageSize: 100 });
    expect(res.body.items.every((p) => ['nam', 'unisex'].includes(p.gender))).toBe(true);
    const sold = res.body.items.map((p) => p.sold);
    expect(sold).toEqual([...sold].sort((a, b) => b - a));
  });

  it('AC-CAT-02 phân trang ổn định và total đúng', async () => {
    const p1 = await t.api().get('/api/products').query({ pageSize: 10, page: 1, sort: 'new' });
    const p2 = await t.api().get('/api/products').query({ pageSize: 10, page: 2, sort: 'new' });
    expect(p1.body.total).toBe(65);
    expect(p1.body.items).toHaveLength(10);
    const ids = new Set([...p1.body.items, ...p2.body.items].map((p) => p.id));
    expect(ids.size).toBe(20);
    const far = await t.api().get('/api/products').query({ page: 99 });
    expect(far.body).toMatchObject({ items: [], total: 65 });
  });

  it('AC-CAT-02 tham số sai → 422', async () => {
    expect((await t.api().get('/api/products').query({ sort: 'random' })).status).toBe(422);
    expect((await t.api().get('/api/products').query({ minPrice: 900000, maxPrice: 100000 })).status).toBe(422);
  });

  it('AC-CAT-03 chi tiết SP; SP ẩn/không tồn tại → 404 với khách, admin vẫn xem được', async () => {
    expect((await t.api().get('/api/products/k01')).body.name).toBe('Hoodie oversize Cloud');
    expect((await t.api().get('/api/products/k24')).status).toBe(404);
    expect((await t.api().get('/api/products/khong-co')).status).toBe(404);
    const admin = await t.api().get('/api/products/k24').set(bearer(await t.login(ADMIN)));
    expect(admin.status).toBe(200);
  });

  it('AC-CAT-04 danh mục kèm số SP đang bán', async () => {
    const res = await t.api().get('/api/categories');
    const acc = res.body.items.find((c) => c.id === 'accessories');
    const { rows } = await t.sql("select count(*)::int as n from public.products where category_id = 'accessories' and status = 'active'");
    expect(acc.count).toBe(rows[0].n);
  });

  it('màu và phương thức giao hàng công khai', async () => {
    expect((await t.api().get('/api/colors')).body.items.find((c) => c.code === 'lav').hex).toMatch(/^#/);
    expect((await t.api().get('/api/shipping-methods')).body.items[0]).toMatchObject({ code: 'std', fee: 30000, freeThreshold: 1500000 });
  });
});

describe('F3 · Đánh giá', () => {
  it('AC-REV-01 khách chưa mua: đánh giá được tạo, verified = false (server quyết định)', async () => {
    const c = await t.newCustomer();
    const res = await t.api().post('/api/products/k03/reviews').set(bearer(c.token)).send({ rating: 4, name: 'Khách Mới', text: 'Len mềm, màu đẹp như ảnh.', verified: true });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ pid: 'k03', rating: 4, verified: false, status: 'visible', mine: true });
  });

  it('AC-REV-01 khách đã có đơn đã giao chứa SP → verified = true', async () => {
    // seed: khách demo có đơn đã giao với k05
    const res = await t.api().post('/api/products/k05/reviews').set(bearer(await t.login(DEMO))).send({ rating: 5, name: 'Minh Anh', text: 'Sơ mi mặc rất mát, đúng size.' });
    expect(res.status).toBe(201);
    expect(res.body.verified).toBe(true);
    expect(res.body.h).toBe(165);
  });

  it('AC-REV-01 kiểm tra dữ liệu và yêu cầu đăng nhập', async () => {
    const c = await t.newCustomer();
    expect((await t.api().post('/api/products/k03/reviews').send({ rating: 5, name: 'AA', text: '1234567890' })).status).toBe(401);
    const bad = await t.api().post('/api/products/k03/reviews').set(bearer(c.token)).send({ rating: 0, name: 'A', text: 'ngắn' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.details.map((d) => d.field).sort()).toEqual(['name', 'rating', 'text']);
    expect((await t.api().post('/api/products/khongco/reviews').set(bearer(c.token)).send({ rating: 5, name: 'AA', text: '1234567890ab' })).status).toBe(404);
  });

  it('AC-REV-02 đánh giá bị ẩn không xuất hiện với khách', async () => {
    const { rows } = await t.sql("update public.reviews set status = 'hidden' where id = (select id from public.reviews where product_id = 'k06' limit 1) returning id");
    const res = await t.api().get('/api/products/k06/reviews');
    expect(res.body.items.find((r) => r.id === rows[0].id)).toBeUndefined();
    expect(res.body.items.every((r) => r.status === 'visible')).toBe(true);
  });
});
