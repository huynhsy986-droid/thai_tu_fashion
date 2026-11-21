import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp, bearer } from '../helpers/app.js';

let t;
beforeAll(async () => {
  t = await makeTestApp('cart');
  // Nạp đủ hàng cho kịch bản test; giữ nguyên các biến thể dùng để kiểm tra hết hàng/sắp hết (k08 sky L = 0, k01 lav L = 2)
  await t.sql("update public.product_variants set stock = 50 where stock > 0 and not (product_id = 'k01' and color_code = 'lav')");
});
afterAll(async () => t?.close());

const add = (token, body) => t.api().post('/api/cart/items').set(bearer(token)).send(body);
const quote = (token, body = {}) => t.api().post('/api/cart/quote').set(bearer(token)).send(body);

describe('F4 · Giỏ hàng & mã giảm giá', () => {
  it('AC-CART-01 thêm vào giỏ và cộng dồn số lượng', async () => {
    const c = await t.newCustomer();
    expect((await add(c.token, { productId: 'k11', color: 'ltdenim', size: 'M' })).status).toBe(201);
    const res = await add(c.token, { productId: 'k11', color: 'ltdenim', size: 'M', quantity: 2 });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toMatchObject({ pid: 'k11', color: 'ltdenim', size: 'M', qty: 3 });
    expect(res.body.items[0].variantId).toBeTypeOf('number');
  });

  it('AC-CART-01 hết hàng → 409 nêu rõ màu/size; vượt tồn kho → 409 "Chỉ còn N"', async () => {
    const c = await t.newCustomer();
    const out = await add(c.token, { productId: 'k08', color: 'sky', size: 'L' }); // seed: hết hàng
    expect(out.status).toBe(409);
    expect(out.body.error.code).toBe('OUT_OF_STOCK');
    expect(out.body.error.message).toBe('Áo phao ngắn Marshmallow màu Xanh da trời size L đã hết hàng.');
    const over = await add(c.token, { productId: 'k01', color: 'lav', size: 'L', quantity: 3 }); // còn 2
    expect(over.status).toBe(409);
    expect(over.body.error.message).toBe('Chỉ còn 2 sản phẩm size L trong kho.');
  });

  it('AC-CART-01 biến thể không tồn tại → 404; số lượng sai → 422', async () => {
    const c = await t.newCustomer();
    expect((await add(c.token, { productId: 'k01', color: 'red', size: 'M' })).status).toBe(404);
    expect((await add(c.token, { productId: 'k01', color: 'lav', size: 'M', quantity: 0 })).status).toBe(422);
    expect((await add(c.token, { productId: 'k01', color: 'lav' })).body.error.message).toBe('Hãy chọn size trước khi tiếp tục.');
  });

  it('AC-CART-02 đổi số lượng, xoá dòng, xoá giỏ; giỏ lưu trên server (đăng nhập lại vẫn còn)', async () => {
    const c = await t.newCustomer();
    const a = await add(c.token, { productId: 'k06', color: 'white', size: 'M' });
    const vid = a.body.items[0].variantId;
    await add(c.token, { productId: 'k20', color: 'lav', size: 'One size' });
    const p = await t.api().patch(`/api/cart/items/${vid}`).set(bearer(c.token)).send({ quantity: 2 });
    expect(p.body.items.find((i) => i.variantId === vid).qty).toBe(2);
    const relog = await t.login({ email: c.email, password: 'Matkhau123' });
    expect((await t.api().get('/api/cart').set(bearer(relog))).body.items).toHaveLength(2);
    const d = await t.api().delete(`/api/cart/items/${vid}`).set(bearer(c.token));
    expect(d.body.items).toHaveLength(1);
    expect((await t.api().delete('/api/cart').set(bearer(c.token))).status).toBe(204);
    expect((await t.api().get('/api/cart').set(bearer(c.token))).body.items).toEqual([]);
  });

  it('AC-CART-02 PATCH vượt tồn kho → 409, dòng không có trong giỏ → 404', async () => {
    const c = await t.newCustomer();
    const a = await add(c.token, { productId: 'k01', color: 'lav', size: 'L' });
    const vid = a.body.items[0].variantId;
    expect((await t.api().patch(`/api/cart/items/${vid}`).set(bearer(c.token)).send({ quantity: 5 })).status).toBe(409);
    expect((await t.api().patch('/api/cart/items/999999').set(bearer(c.token)).send({ quantity: 1 })).status).toBe(404);
    expect((await t.api().patch('/api/cart/items/abc').set(bearer(c.token)).send({ quantity: 1 })).status).toBe(422);
  });

  it('AC-CART-02 giỏ của người khác không đọc/ghi được', async () => {
    const a = await t.newCustomer();
    const b = await t.newCustomer();
    const r = await add(a.token, { productId: 'k06', color: 'white', size: 'XL' });
    const vid = r.body.items[0].variantId;
    await t.api().delete(`/api/cart/items/${vid}`).set(bearer(b.token));
    expect((await t.api().get('/api/cart').set(bearer(a.token))).body.items).toHaveLength(1);
  });

  it('AC-CART-03 báo giá: phí ship 30.000₫ dưới ngưỡng, miễn phí từ 1.500.000₫, giao nhanh 55.000₫', async () => {
    const c = await t.newCustomer();
    await add(c.token, { productId: 'k11', color: 'ltdenim', size: 'M' }); // 690.000
    let q = await quote(c.token);
    expect(q.body).toMatchObject({ subtotal: 690000, discount: 0, shippingFee: 30000, total: 720000 });
    q = await quote(c.token, { shipping: 'exp' });
    expect(q.body).toMatchObject({ shippingFee: 55000, total: 745000 });
    await add(c.token, { productId: 'k10', color: 'oat', size: 'M' }); // +1.890.000
    q = await quote(c.token);
    expect(q.body).toMatchObject({ subtotal: 2580000, shippingFee: 0, total: 2580000 });
  });

  it('AC-CART-03 giá sale được ưu tiên', async () => {
    const c = await t.newCustomer();
    await add(c.token, { productId: 'k02', color: 'mint', size: 'M' }); // 590.000 → sale 490.000
    expect((await quote(c.token)).body.subtotal).toBe(490000);
  });

  it('AC-CART-04 THAITU10 giảm 10%, NEW50K cần đơn ≥ 500.000₫, FREESHIP miễn phí giao', async () => {
    const c = await t.newCustomer();
    await add(c.token, { productId: 'k06', color: 'white', size: 'M' }); // 290.000
    let q = await quote(c.token, { coupon: 'thaitu10' });
    expect(q.body).toMatchObject({ coupon: 'THAITU10', discount: 29000, total: 290000 - 29000 + 30000 });
    q = await quote(c.token, { coupon: 'NEW50K' });
    expect(q.status).toBe(422);
    expect(q.body.error).toMatchObject({ code: 'COUPON_INVALID', message: 'Mã này cần đơn từ 500.000₫.', details: 'min_subtotal' });
    q = await quote(c.token, { coupon: 'FREESHIP' });
    expect(q.body).toMatchObject({ shippingFee: 0, total: 290000 });
    await add(c.token, { productId: 'k06', color: 'white', size: 'M' });
    q = await quote(c.token, { coupon: 'NEW50K' });
    expect(q.body).toMatchObject({ discount: 50000, total: 580000 - 50000 + 30000 });
  });

  it.each([
    ['KHONGCO', 'Mã này không tồn tại.'],
    ['SUMMER25', 'Mã này đã hết hạn.'],
  ])('AC-CART-04 mã %s → 422 "%s"', async (code, msg) => {
    const c = await t.newCustomer();
    await add(c.token, { productId: 'k06', color: 'white', size: 'M' });
    const q = await quote(c.token, { coupon: code });
    expect(q.status).toBe(422);
    expect(q.body.error.message).toBe(msg);
  });

  it('AC-CART-04 mã ngưng áp dụng và hết lượt', async () => {
    const c = await t.newCustomer();
    await add(c.token, { productId: 'k10', color: 'oat', size: 'M' });
    await t.sql("insert into public.coupons (code, type, value, label, active) values ('OFFNOW', 'pct', 5, 'tắt', false)");
    await t.sql("update public.coupons set used_count = usage_limit where code = 'VIP100K'");
    expect((await quote(c.token, { coupon: 'OFFNOW' })).body.error.message).toBe('Mã này đã ngưng áp dụng.');
    expect((await quote(c.token, { coupon: 'VIP100K' })).body.error.message).toBe('Mã này đã hết lượt sử dụng.');
  });
});
