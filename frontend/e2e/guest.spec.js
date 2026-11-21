const { test, expect } = require('@playwright/test');
const { waitFor, watchErrors, gotoApp } = require('./helpers');

test.describe('Khách vãng lai', () => {
  test('AC-CAT-01 trang chủ & cửa hàng tải từ API Supabase, không lỗi console', async ({ page }) => {
    const errors = watchErrors(page);
    await gotoApp(page, 'home');
    expect(await page.evaluate(() => SYNC.mode)).toBe('api');
    await expect(page.locator('.hdr .logo')).toBeVisible();
    await gotoApp(page, 'shop');
    await expect(page.locator('h1')).toContainText('Tất cả sản phẩm');
    await expect(page.locator('#shop-n')).toHaveText('66 sản phẩm');
    await gotoApp(page, 'product-k01');
    await expect(page.locator('h1')).toContainText('Hoodie oversize Cloud');
    expect(errors).toEqual([]);
  });

  test('AC-CAT-02 tìm kiếm không dấu từ header', async ({ page }) => {
    await gotoApp(page, 'home');
    await page.click('[data-a=search]');
    await page.fill('#s-q', 'ao khoac');
    await page.press('#s-q', 'Enter');
    // đợi danh sách đã lọc xong (tránh đọc lưới sản phẩm cũ trước khi vẽ lại)
    await expect(page.locator('#shop-n')).not.toHaveText('66 sản phẩm');
    await expect.poll(async () => (await page.locator('.pc').allInnerTexts()).some((n) => /áo khoác/i.test(n.toLowerCase()))).toBe(true);
  });

  test('AC-CART-01 khách vãng lai thêm vào giỏ, thanh toán thì phải đăng nhập (AC-AUTH-03)', async ({ page }) => {
    await gotoApp(page, 'product-k06');
    await page.click('[data-a=pdpSize][data-size="M"]');
    await page.click('[data-a=pdpAdd]');
    await expect(page.locator('[data-c=cart]').first()).toHaveText('1');
    await gotoApp(page, 'checkout');
    await expect(page.locator('form[data-form=login]')).toBeVisible();
    await expect(page.locator('#au-note')).toContainText('Đăng nhập để thanh toán');
    // giỏ khách vãng lai còn sau khi tải lại trang
    await page.reload();
    await waitFor(page, () => SYNC.ready);
    expect(await page.evaluate(() => S.cart.length)).toBe(1);
  });

  test('AC-AUTH-04 vào trang quản trị khi chưa đăng nhập → màn đăng nhập', async ({ page }) => {
    await gotoApp(page, 'admin-orders');
    await expect(page.locator('form[data-form=login]')).toBeVisible();
    await expect(page.locator('#au-note')).toContainText('quản trị viên');
    expect(await page.evaluate(() => document.body.classList.contains('admin-mode'))).toBe(false);
  });

  test('AC-ACC-05 đăng ký nhận tin ở footer', async ({ page }) => {
    await gotoApp(page, 'home');
    await page.fill('#news-mail', 'sai-email');
    await page.locator('form[data-form=news] button').click();
    await expect(page.locator('[data-err="news-mail"]')).toContainText('Email chưa đúng định dạng');
    await page.fill('#news-mail', `nhan.tin.${Date.now()}@email.com`);
    await page.locator('form[data-form=news] button').click();
    await expect(page.locator('#news-ok')).toContainText('Đã đăng ký nhận tin');
  });
});
