import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp, bearer } from '../helpers/app.js';
import { DEMO } from '../helpers/env.js';

let t;
beforeAll(async () => {
  t = await makeTestApp('orders');
  await t.sql("update public.product_variants set stock = 50 where stock > 0 and not (product_id = 'k01' and color_code = 'lav')");
});
afterAll(async () => t?.close());

const RECIPIENT = { name: 'Trần Văn Test', phone: '0912 345 678', address: '99 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh' };
const add = (token, body) => t.api().post('/api/cart/items').set(bearer(token)).send(body);
const place = (token, body = {}) => t.api().post('/api/orders').set(bearer(token)).send({ ...RECIPIENT, ...body });
const stock = async (pid, color, size) =>
  (await t.sql('select stock from public.product_variants where product_id = $1 and color_code = $2 and size = $3', [pid, color, size])).rows[0].stock;

describe('F5 · Đặt hàng', () => {
  it('AC-ORD-01 đặt hàng: server tính tiền, trừ kho, tăng đã bán, xoá giỏ, mã TTxxxx, pending, có thông báo', async () => {
    const c = await t.newCustomer();
    const before = await stock('k15', 'black', 'M');
    const sold = (await t.sql("select sold_count from public.products where id = 'k15'")).rows[0].sold_count;
    await add(c.token, { productId: 'k15', color: 'black', size: 'M', quantity: 2 }); // 2 × 690.000
    const res = await place(c.token, { coupon: 'THAITU10', ship: 'std', pay: 'cod', note: 'Giao giờ hành chính' });
    expect(res.status).toBe(201);
    expect(res.body.id).toMatch(/^TT\d{4,}$/);
    expect(res.body).toMatchObject({
      status: 'pending', sub: 1380000, discount: 138000, shipFee: 30000, total: 1272000, coupon: 'THAITU10',
      phone: '0912345678', payStatus: 'unpaid', note: 'Giao giờ hành chính', allowedNext: ['confirmed', 'cancelled'],
    });
    expect(res.body.items).toEqual([{ pid: 'k15', name: 'Quần tây ống rộng ly đôi', color: 'black', size: 'M', qty: 2, price: 690000 }]);
    expect(res.body.history).toHaveLength(1);
    expect(await stock('k15', 'black', 'M')).toBe(before - 2);
    expect((await t.sql("select sold_count from public.products where id = 'k15'")).rows[0].sold_count).toBe(sold + 2);
    expect((await t.api().get('/api/cart').set(bearer(c.token))).body.items).toEqual([]);
    const n = await t.api().get('/api/me/notifications').set(bearer(c.token));
    expect(n.body.items[0].title).toBe(`Đã nhận đơn hàng ${res.body.id}`);
    expect((await t.sql("select used_count from public.coupons where code = 'THAITU10'")).rows[0].used_count).toBe(1);
  });

  it('AC-ORD-01 client gửi tổng tiền/giá giả bị bỏ qua', async () => {
    const c = await t.newCustomer();
    await add(c.token, { productId: 'k06', color: 'white', size: 'M' });
    const res = await place(c.token, { total: 1, sub: 1, price: 1, discount: 999999 });
    expect(res.body.total).toBe(290000 + 30000);
  });

  it('AC-ORD-01 dữ liệu người nhận sai → 422 với thông báo của prototype; giỏ trống → 422', async () => {
    const c = await t.newCustomer();
    expect((await place(c.token, { phone: '12345' })).body.error.message).toBe('Số điện thoại cần có 10 chữ số và bắt đầu bằng 0.');
    expect((await place(c.token, { address: 'Q1' })).body.error.message).toBe('Nhập địa chỉ đầy đủ, gồm số nhà, đường và tỉnh/thành.');
    const empty = await place(c.token);
    expect(empty.status).toBe(422);
    expect(empty.body.error).toMatchObject({ code: 'CART_EMPTY', message: 'Giỏ hàng đang trống.' });
  });

  it('AC-ORD-02 thiếu hàng ở 1 dòng → 409, không trừ kho dòng nào, giỏ giữ nguyên', async () => {
    const c = await t.newCustomer();
    await add(c.token, { productId: 'k06', color: 'white', size: 'XL' });
    await add(c.token, { productId: 'k01', color: 'lav', size: 'L', quantity: 2 }); // còn 2
    await t.sql("update public.product_variants set stock = 1 where product_id = 'k01' and color_code = 'lav' and size = 'L'"); // admin bán ngoài
    const s1 = await stock('k06', 'white', 'XL');
    const res = await place(c.token);
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('OUT_OF_STOCK');
    expect(res.body.error.details).toEqual([{ productId: 'k01', name: 'Hoodie oversize Cloud', color: 'lav', size: 'L', requested: 2, available: 1 }]);
    expect(await stock('k06', 'white', 'XL')).toBe(s1);
    expect((await t.api().get('/api/cart').set(bearer(c.token))).body.items).toHaveLength(2);
  });

  it('AC-ORD-02 sản phẩm bị ẩn sau khi thêm vào giỏ → 409', async () => {
    const c = await t.newCustomer();
    await add(c.token, { productId: 'k23', color: 'cream', size: 'One size' });
    await t.sql("update public.products set status = 'hidden' where id = 'k23'");
    const res = await place(c.token);
    expect(res.status).toBe(409);
    expect(res.body.error.details[0]).toMatchObject({ productId: 'k23', available: 0 });
    await t.sql("update public.products set status = 'active' where id = 'k23'");
  });

  it('AC-ORD-03 hai đơn đồng thời tranh món cuối: chỉ 1 thành công, tồn kho = 0 không âm', async () => {
    await t.sql("update public.product_variants set stock = 1 where product_id = 'k17' and color_code = 'black' and size = '40'");
    const buyers = await Promise.all([t.newCustomer('Khách A'), t.newCustomer('Khách B'), t.newCustomer('Khách C')]);
    for (const b of buyers) expect((await add(b.token, { productId: 'k17', color: 'black', size: '40' })).status).toBe(201);
    const results = await Promise.all(buyers.map((b) => place(b.token)));
    const codes = results.map((r) => r.status).sort();
    expect(codes).toEqual([201, 409, 409]);
    expect(await stock('k17', 'black', '40')).toBe(0);
  });

  it('AC-ORD-04 khách chỉ thấy đơn của mình; đơn người khác → 404', async () => {
    const demo = await t.login(DEMO);
    const mine = await t.api().get('/api/orders').set(bearer(demo));
    expect(mine.body.items.length).toBeGreaterThanOrEqual(4);
    expect(mine.body.items.every((o) => o.cid === DEMO.id)).toBe(true);
    const other = await t.newCustomer();
    expect((await t.api().get(`/api/orders/${mine.body.items[0].id}`).set(bearer(other.token))).status).toBe(404);
    const detail = await t.api().get(`/api/orders/${mine.body.items[0].id}`).set(bearer(demo));
    expect(detail.status).toBe(200);
    expect(detail.body.history.length).toBeGreaterThan(0);
  });

  it('AC-ORD-05 khách huỷ đơn pending → hoàn kho; huỷ lần 2/đơn đã xác nhận → 422', async () => {
    const c = await t.newCustomer();
    const before = await stock('k12', 'grey', 'M');
    await add(c.token, { productId: 'k12', color: 'grey', size: 'M', quantity: 2 });
    const o = (await place(c.token)).body;
    expect(await stock('k12', 'grey', 'M')).toBe(before - 2);
    const res = await t.api().post(`/api/orders/${o.id}/cancel`).set(bearer(c.token));
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
    expect(res.body.history.map((h) => h.to)).toEqual(['pending', 'cancelled']);
    expect(await stock('k12', 'grey', 'M')).toBe(before);
    expect((await t.api().post(`/api/orders/${o.id}/cancel`).set(bearer(c.token))).status).toBe(422);
    const demoOrder = (await t.api().get('/api/orders').set(bearer(await t.login(DEMO)))).body.items.find((x) => x.status === 'processing');
    const r2 = await t.api().post(`/api/orders/${demoOrder.id}/cancel`).set(bearer(await t.login(DEMO)));
    expect(r2.status).toBe(422);
    expect(r2.body.error.message).toBe('Chỉ huỷ được đơn đang chờ xác nhận.');
  });

  it('AC-ORD-05 không huỷ được đơn của người khác', async () => {
    const a = await t.newCustomer();
    const b = await t.newCustomer();
    await add(a.token, { productId: 'k06', color: 'black', size: 'M' });
    const o = (await place(a.token)).body;
    expect((await t.api().post(`/api/orders/${o.id}/cancel`).set(bearer(b.token))).status).toBe(404);
  });

  it('AC-ORD-06 thanh toán online thành công → paid; thất bại → 402 và không tạo đơn', async () => {
    const c = await t.newCustomer();
    await add(c.token, { productId: 'k06', color: 'white', size: 'S' });
    const fail = await place(c.token, { pay: 'online', paymentOk: false });
    expect(fail.status).toBe(402);
    expect(fail.body.error.code).toBe('PAYMENT_FAILED');
    expect((await t.api().get('/api/orders').set(bearer(c.token))).body.items).toHaveLength(0);
    expect((await t.api().get('/api/cart').set(bearer(c.token))).body.items).toHaveLength(1);
    const ok = await place(c.token, { pay: 'online', paymentOk: true });
    expect(ok.status).toBe(201);
    expect(ok.body.payStatus).toBe('paid');
  });
});
