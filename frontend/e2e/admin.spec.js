const { test, expect } = require('@playwright/test');
const { waitFor, gotoApp, login, register, addToCart, settle, sql, ADMIN, DEMO, watchErrors } = require('./helpers');

test.describe('Quản trị', () => {
  test('AC-AUTH-04 khách hàng không vào được trang quản trị', async ({ page }) => {
    await login(page, DEMO);
    await gotoApp(page, 'admin');
    await expect(page.locator('#au-note')).toContainText('không có quyền quản trị');
  });

  test('AC-ADM-01 AC-ADM-05 admin đổi trạng thái đơn theo luồng → khách nhận thông báo', async ({ browser }) => {
    // khách đặt một đơn
    const cctx = await browser.newContext();
    const cp = await cctx.newPage();
    const u = await register(cp, 'Khách Theo Dõi');
    await addToCart(cp, 'k18', '40', 'white');
    await settle(cp);
    await gotoApp(cp, 'checkout');
    await cp.fill('#co-name', u.name);
    await cp.fill('#co-phone', '0933444555');
    await cp.fill('#co-addr', '20 Pasteur, Quận 3, TP. Hồ Chí Minh');
    await cp.locator('#co-sum button.btn.block').click();
    await cp.waitForURL(/#confirm-/);
    const orderId = (await cp.evaluate(() => location.hash)).replace('#confirm-', '');

    const actx = await browser.newContext();
    const ap = await actx.newPage();
    const errors = watchErrors(ap);
    await login(ap, ADMIN);
    await gotoApp(ap, 'admin');
    await expect(ap.locator('h1')).toContainText('Tổng quan');
    await gotoApp(ap, 'admin-orders');
    const sel = ap.locator(`select[data-ost="${orderId}"]`);
    await sel.selectOption('confirmed');
    await expect(ap.locator('.toast').last()).toContainText(`Đơn ${orderId}: Đã xác nhận`);
    // chỉ bước hợp lệ được bật (confirmed → processing | cancelled); nhảy cóc bị khoá trên UI và server cũng từ chối
    await expect(ap.locator(`select[data-ost="${orderId}"] option[value=delivered]`)).toBeDisabled();
    await expect(ap.locator(`select[data-ost="${orderId}"] option[value=processing]`)).toBeEnabled();
    const jump = await ap.evaluate((id) => API.patch(`/api/admin/orders/${id}/status`, { status: 'delivered' }).then(() => 0, (e) => e.status), orderId);
    expect(jump).toBe(422);
    await expect(ap.locator(`select[data-ost="${orderId}"]`)).toHaveValue('confirmed');
    expect((await sql('select status from public.orders where id = $1', [orderId]))[0].status).toBe('confirmed');

    await cp.reload();
    await waitFor(cp, () => SYNC.ready);
    await gotoApp(cp, 'notifications');
    await expect(cp.locator('#main')).toContainText(`Đơn ${orderId}: Đã xác nhận`);
    expect(errors).toEqual([]);
    await cctx.close();
    await actx.close();
  });

  test('AC-ADM-02 AC-WISH-02 admin sửa giá sale → khách đã thích nhận thông báo giảm giá', async ({ browser }) => {
    const cctx = await browser.newContext();
    const cp = await cctx.newPage();
    await register(cp, 'Khách Săn Sale');
    await gotoApp(cp, 'product-k10');
    await cp.locator('[data-a=wish][data-id=k10]').first().click();
    await cp.evaluate(() => chain);
    expect((await sql("select count(*)::int as n from public.wishlist_items where product_id = 'k10'"))[0].n).toBeGreaterThan(0);

    const actx = await browser.newContext();
    const ap = await actx.newPage();
    await login(ap, ADMIN);
    await gotoApp(ap, 'admin-products');
    await ap.locator('[data-a=admPEdit][data-id=k10]').first().click();
    await ap.fill('#p-sale', '1590000');
    await ap.locator('#modal form[data-form=product] button', { hasText: 'Lưu thay đổi' }).click();
    await expect(ap.locator('.toast').last()).toContainText('Đã lưu sản phẩm');
    expect((await sql("select sale_price from public.products where id = 'k10'"))[0].sale_price).toBe(1590000);

    await cp.reload();
    await waitFor(cp, () => SYNC.ready);
    await gotoApp(cp, 'notifications');
    await expect(cp.locator('#main')).toContainText('Măng tô dáng dài Seoul vừa giảm giá');
    await cctx.close();
    await actx.close();
  });

  test('AC-ADM-04 AC-WISH-03 admin nhập kho biến thể hết hàng → người đăng ký nhận thông báo có hàng', async ({ browser }) => {
    const cctx = await browser.newContext();
    const cp = await cctx.newPage();
    await register(cp, 'Khách Chờ Hàng');
    await gotoApp(cp, 'product-k08');
    await cp.click('[data-a=pdpColor][data-color=sky]');
    await cp.click('[data-a=pdpSize][data-size="L"]');
    await cp.click('[data-a=notifyRestock]');
    await cp.evaluate(() => chain);
    expect((await sql("select count(*)::int as n from public.restock_subscriptions s join public.product_variants v on v.id = s.variant_id where v.product_id = 'k08' and v.color_code = 'sky' and v.size = 'L'"))[0].n).toBeGreaterThan(0);

    const actx = await browser.newContext();
    const ap = await actx.newPage();
    await login(ap, ADMIN);
    await gotoApp(ap, 'admin-inventory');
    await ap.selectOption('select[data-invp]', 'k08').catch(() => {});
    const input = ap.locator('input[data-stock="k08|sky|L"]');
    await input.fill('7');
    await input.dispatchEvent('change');
    await expect(ap.locator('.toast').last()).toContainText('Đã cập nhật');

    await cp.reload();
    await waitFor(cp, () => SYNC.ready);
    await gotoApp(cp, 'notifications');
    await expect(cp.locator('#main')).toContainText('Áo phao ngắn Marshmallow đã có hàng trở lại');
    await cctx.close();
    await actx.close();
  });

  test('AC-ADM-07 admin ẩn đánh giá → khách không còn thấy', async ({ page }) => {
    const [r] = await sql("select id, body from public.reviews where product_id = 'k02' and status = 'visible' order by created_at desc limit 1");
    await login(page, ADMIN);
    await gotoApp(page, 'admin-reviews');
    await page.locator(`[data-a=admRT][data-id="${r.id}"]`).click();
    await expect(page.locator('.toast').last()).toContainText('Đã ẩn đánh giá');
    expect((await sql('select status from public.reviews where id = $1', [r.id]))[0].status).toBe('hidden');
    const res = await page.request.get('/api/products/k02/reviews');
    expect((await res.json()).items.map((x) => x.id)).not.toContain(r.id);
  });
});
