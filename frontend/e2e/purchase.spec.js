const { test, expect } = require('@playwright/test');
const { waitFor, gotoApp, register, login, addToCart, settle, sql, DEMO, watchErrors } = require('./helpers');

test.describe('Mua hàng đầu-cuối', () => {
  test('AC-AUTH-01 AC-CART-03 AC-CART-04 AC-ORD-01 AC-ORD-04 AC-ORD-05 đăng ký → gộp giỏ → mã giảm giá → đặt hàng → huỷ', async ({ page }) => {
    const errors = watchErrors(page);
    // giỏ của khách vãng lai
    await gotoApp(page, 'product-k15');
    await page.click('[data-a=pdpSize][data-size="M"]');
    await page.click('[data-a=pdpAdd]');
    await expect(page.locator('[data-c=cart]').first()).toHaveText('1');

    const user = await register(page, 'Lê Thị E2E');
    await expect(page.locator('.toast').last()).toContainText('Đã chuyển 1 món');
    expect(await page.evaluate(() => S.cart.map((i) => i.pid))).toEqual(['k15']);

    // mã giảm giá sai rồi đúng (server kiểm tra)
    await gotoApp(page, 'cart');
    await page.fill('#cp', 'KHONGCO');
    await page.locator('form[data-form=coupon] button').click();
    await expect(page.locator('[data-err=cp]')).toHaveText('Mã này không tồn tại.');
    await page.fill('#cp', 'SUMMER25');
    await page.locator('form[data-form=coupon] button').click();
    await expect(page.locator('[data-err=cp]')).toHaveText('Mã này đã hết hạn.');
    await page.fill('#cp', 'thaitu10');
    await page.locator('form[data-form=coupon] button').click();
    await expect(page.locator('.toast').last()).toContainText('Đã áp dụng mã giảm giá');

    await gotoApp(page, 'checkout');
    await page.fill('#co-name', user.name);
    await page.fill('#co-phone', '0912 345 678');
    await page.fill('#co-addr', '99 Nguyễn Trãi, Quận 5, TP. Hồ Chí Minh');
    await expect(page.locator('#co-sum')).toContainText('651.000₫'); // 690.000 − 69.000 (THAITU10) + 30.000 phí giao, do server tính
    await settle(page);
    await page.locator('#co-sum button.btn.block').click();
    await page.waitForURL(/#confirm-TT\d+/);
    await expect(page.locator('.confirm')).toContainText('Đặt hàng thành công');
    const orderId = (await page.evaluate(() => location.hash)).replace('#confirm-', '');

    const [o] = await sql('select total, discount, shipping_fee, status from public.orders where id = $1', [orderId]);
    expect(o).toEqual({ total: 651000, discount: 69000, shipping_fee: 30000, status: 'pending' });
    await expect(page.locator('[data-c=cart]').first()).toHaveText('0');

    // xem đơn trong tài khoản & huỷ
    await gotoApp(page, `order-${orderId}`);
    await page.click('[data-a=orderCancelAsk]');
    await page.click('[data-a=orderCancel]');
    await expect(page.locator('.toast').last()).toContainText('Đã huỷ đơn hàng');
    const [o2] = await sql('select status from public.orders where id = $1', [orderId]);
    expect(o2.status).toBe('cancelled');
    expect(errors).toEqual([]);
  });

  test('AC-ORD-01 kiểm tra dữ liệu người nhận ngay trên form', async ({ page }) => {
    await register(page);
    await addToCart(page, 'k06', 'M', 'mint');
    await gotoApp(page, 'checkout');
    await page.fill('#co-name', 'A');
    await page.fill('#co-phone', '12345');
    await page.fill('#co-addr', 'Q1');
    await page.locator('#co-sum button.btn.block').click();
    await expect(page.locator('[data-err="co-phone"]')).toContainText('10 chữ số');
    await expect(page.locator('[data-err="co-addr"]')).toContainText('địa chỉ đầy đủ');
    expect(await page.evaluate(() => location.hash)).toBe('#checkout');
  });

  test('AC-ORD-06 thanh toán online: mô phỏng thất bại không tạo đơn, thành công → đã thanh toán', async ({ page }) => {
    const u = await register(page, 'Khách Online');
    await addToCart(page, 'k20', 'One size', 'black');
    await gotoApp(page, 'checkout');
    await page.fill('#co-name', u.name);
    await page.fill('#co-phone', '0987654321');
    await page.fill('#co-addr', '1 Lê Duẩn, Hải Châu, Đà Nẵng');
    await page.locator('input[data-co=pay][value=online]').check();
    await page.locator('#co-sum button.btn.block').click();
    await page.click('[data-a=payFail]');
    await expect(page.locator('#pay-msg')).toContainText('không thành công');
    expect((await sql("select count(*)::int as n from public.orders o join public.profiles p on p.id = o.user_id where p.email = $1", [u.email]))[0].n).toBe(0);
    await page.click('[data-a=payOk]');
    await page.waitForURL(/#confirm-/);
    const [o] = await sql('select o.payment_status from public.orders o join public.profiles p on p.id = o.user_id where p.email = $1', [u.email]);
    expect(o.payment_status).toBe('paid');
  });

  test('AC-REV-01 khách đã mua viết đánh giá → nhãn đã mua do server gắn', async ({ page }) => {
    await login(page, DEMO);
    await gotoApp(page, 'product-k05');
    await page.locator('.star-in button').nth(4).click();
    await page.fill('#rv-name', 'Minh Anh');
    await page.fill('#rv-text', 'Áo mặc mát, đúng màu, giặt không nhăn.');
    await page.locator('form[data-form=review] button[type=submit], form[data-form=review] .btn').last().click();
    await expect(page.locator('.toast').last()).toContainText('Đã mua hàng');
    const [r] = await sql("select verified from public.reviews where product_id = 'k05' and display_name = 'Minh Anh' order by created_at desc limit 1");
    expect(r.verified).toBe(true);
  });

  test('AC-ACC-01 AC-AUTH-05 sửa hồ sơ được lưu trên server, đăng xuất', async ({ page }) => {
    await register(page, 'Tên Cũ');
    await gotoApp(page, 'account');
    await page.fill('#u-name', 'Tên Mới E2E');
    await page.fill('#u-phone', '0901 999 888');
    await page.locator('form[data-form=profile] button').click();
    await expect(page.locator('.toast').last()).toContainText('Đã lưu hồ sơ');
    await page.reload();
    await waitFor(page, () => SYNC.ready);
    await expect(page.locator('#u-name')).toHaveValue('Tên Mới E2E');
    await page.click('#main [data-a=logout]'); // nút trong khối phiên (menu header có nút riêng)
    await expect(page.locator('.toast').last()).toContainText('Đã đăng xuất');
    expect(await page.evaluate(() => API.session())).toBeNull();
    await expect(page.locator('a[aria-label="Đăng nhập"]')).toBeVisible();
  });
});
