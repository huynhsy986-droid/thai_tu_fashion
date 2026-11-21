import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp, bearer } from '../helpers/app.js';
import { DEMO, ADMIN } from '../helpers/env.js';

let t;
let admin;
beforeAll(async () => {
  t = await makeTestApp('wish');
  admin = await t.login(ADMIN);
});
afterAll(async () => t?.close());

const notifs = async (token) => (await t.api().get('/api/me/notifications').set(bearer(token))).body.items;

describe('F6 · Yêu thích, theo dõi giá, báo có hàng', () => {
  it('AC-WISH-01 thêm/sửa giá mong muốn/bỏ yêu thích, dữ liệu lưu server', async () => {
    const c = await t.newCustomer();
    let r = await t.api().put('/api/wishlist/k09').set(bearer(c.token)).send({});
    expect(r.body.items).toEqual([{ pid: 'k09', target: 0 }]);
    r = await t.api().put('/api/wishlist/k09').set(bearer(c.token)).send({ target: 1000000 });
    expect(r.body.items).toEqual([{ pid: 'k09', target: 1000000 }]);
    expect((await t.api().get('/api/wishlist').set(bearer(c.token))).body.items).toHaveLength(1);
    r = await t.api().delete('/api/wishlist/k09').set(bearer(c.token));
    expect(r.body.items).toEqual([]);
    expect((await t.api().put('/api/wishlist/khongco').set(bearer(c.token)).send({})).status).toBe(404);
  });

  it('AC-WISH-01 dữ liệu seed của khách demo', async () => {
    const r = await t.api().get('/api/wishlist').set(bearer(await t.login(DEMO)));
    expect(r.body.items.map((w) => w.pid).sort()).toEqual(['k03', 'k08', 'k16']);
  });

  it('AC-WISH-02 admin hạ giá → người thích nhận "vừa giảm giá"; đạt giá mong muốn → "đã đạt giá"', async () => {
    const a = await t.newCustomer();
    const b = await t.newCustomer();
    await t.api().put('/api/wishlist/k09').set(bearer(a.token)).send({});
    await t.api().put('/api/wishlist/k09').set(bearer(b.token)).send({ target: 1000000 });
    const res = await t.api().patch('/api/admin/products/k09').set(bearer(admin)).send({ sale: 990000 });
    expect(res.status).toBe(200);
    expect(res.body.sale).toBe(990000);
    const na = await notifs(a.token);
    expect(na[0]).toMatchObject({ type: 'price', title: 'Blazer len dáng boxy vừa giảm giá', body: 'Từ 1.190.000₫ xuống 990.000₫.', link: 'product-k09', read: false });
    const nb = await notifs(b.token);
    expect(nb[0]).toMatchObject({ title: 'Blazer len dáng boxy đã đạt giá bạn mong muốn', body: 'Giá mới 990.000₫, mong muốn 1.000.000₫.' });
  });

  it('AC-WISH-02 tăng giá không sinh thông báo', async () => {
    const c = await t.newCustomer();
    await t.api().put('/api/wishlist/k15').set(bearer(c.token)).send({});
    await t.api().patch('/api/admin/products/k15').set(bearer(admin)).send({ price: 790000 });
    expect((await notifs(c.token)).filter((n) => n.type === 'price')).toHaveLength(0);
  });

  it('AC-WISH-03 đăng ký báo có hàng; nhập kho 0→>0 → thông báo và tự huỷ đăng ký', async () => {
    const c = await t.newCustomer();
    const sub = await t.api().post('/api/restock-subscriptions').set(bearer(c.token)).send({ productId: 'k08', color: 'sky', size: 'XL' });
    expect(sub.status).toBe(200);
    expect(sub.body).toMatchObject({ subscribed: true, items: [{ productId: 'k08', color: 'sky', size: 'XL' }] });
    await t.api().put('/api/admin/products/k08/stock').set(bearer(admin)).send({ color: 'sky', size: 'XL', stock: 5 });
    const n = await notifs(c.token);
    expect(n[0]).toMatchObject({ type: 'stock', title: 'Áo phao ngắn Marshmallow đã có hàng trở lại', body: 'Màu Xanh da trời, size XL: còn 5 sản phẩm.' });
    expect((await t.api().get('/api/restock-subscriptions').set(bearer(c.token))).body.items).toEqual([]);
  });

  it('AC-WISH-03 toggle huỷ đăng ký; size còn hàng → 422', async () => {
    const c = await t.newCustomer();
    await t.api().post('/api/restock-subscriptions').set(bearer(c.token)).send({ productId: 'k08', color: 'sky', size: 'L' });
    const off = await t.api().post('/api/restock-subscriptions').set(bearer(c.token)).send({ productId: 'k08', color: 'sky', size: 'L' });
    expect(off.body.subscribed).toBe(false);
    const instock = await t.api().post('/api/restock-subscriptions').set(bearer(c.token)).send({ productId: 'k06', color: 'mint', size: 'L' });
    expect(instock.status).toBe(422);
  });
});
