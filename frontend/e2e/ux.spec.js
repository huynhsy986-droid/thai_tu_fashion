const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test('AC-UI-01 khung tải (skeleton) hiện ngay khi chờ dữ liệu, biến mất khi trang sẵn sàng', async ({ page }) => {
  let release;
  const gate = new Promise((r) => { release = r; });
  await page.route('**/api/catalog', async (r) => { await gate; await r.continue(); });
  await page.goto('/#home');
  const boot = page.locator('.boot[role=status]');
  await expect(boot).toBeVisible();
  await expect(boot.locator('.sk-card')).toHaveCount(4);
  await expect(boot).toContainText('Đang tải Thai Tu Fashion…'); // cho trình đọc màn hình
  release();
  await expect(boot).toHaveCount(0);
  await expect(page.locator('#main')).toBeVisible();
});

test('AC-UI-02 tiêu đề tab đổi theo trang: sản phẩm, danh mục, tài khoản, quản trị, 404', async ({ page }) => {
  await gotoApp(page, 'home');
  await expect(page).toHaveTitle('Thai Tu Fashion — Thời trang unisex phong cách Seoul');
  const cases = [
    ['product-k01', 'Hoodie oversize Cloud | Thai Tu Fashion'],
    ['shop-outer', 'Áo khoác | Thai Tu Fashion'],
    ['contact', 'Liên hệ | Thai Tu Fashion'],
    ['info-returns', 'Đổi trả | Thai Tu Fashion'],
    ['forgot', 'Quên mật khẩu | Thai Tu Fashion'],
    ['admin-orders', 'Đơn hàng · Quản trị | Thai Tu Fashion'],
    ['khong-co-trang-nay', 'Không tìm thấy trang | Thai Tu Fashion'],
  ];
  for (const [h, title] of cases) {
    await page.evaluate((x) => { location.hash = x; }, h);
    await expect(page, h).toHaveTitle(title);
  }
});
