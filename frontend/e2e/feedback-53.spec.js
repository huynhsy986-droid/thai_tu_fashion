// Peer review — issue #53 (Nhóm 4): nút "+" ở hero, thông báo thêm giỏ, lỗi chưa chọn size
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test.describe('Góp ý #53', () => {
  test('AC-CAT-01 #53 rê chuột vào nút "+" trên ảnh trang chủ thấy tên và giá', async ({ page }) => {
    await gotoApp(page, 'home');
    const hot = page.locator('.hot.hs-d').first();
    await hot.hover();
    const tip = hot.locator('.hot-tip');
    await expect(tip).toBeVisible();
    await expect(tip).toContainText('Hoodie oversize Cloud');
    await expect(tip).toContainText('₫');
  });

  test('AC-CART-01 #53 chưa chọn size: hàng size viền đỏ và báo lỗi rõ', async ({ page }) => {
    await gotoApp(page, 'product-k01');
    await page.click('[data-a=pdpAdd]');
    await expect(page.locator('#pdp-msg')).toContainText('Hãy chọn size');
    await expect(page.locator('#pdp-msg')).toHaveClass(/need-msg/);
    await expect(page.locator('.sizes.need')).toHaveCount(1);
  });

  test('AC-CART-01 #53 thêm vào giỏ: thông báo có ảnh, size, nút "Xem giỏ" và còn hiện sau 4 giây', async ({ page }) => {
    await gotoApp(page, 'product-k01');
    await page.click('[data-a=pdpSize][data-size="M"]');
    await page.click('[data-a=pdpAdd]');
    const t = page.locator('.toast.cart-t').last();
    await expect(t).toContainText('Đã thêm vào giỏ');
    await expect(t).toContainText('M');
    await expect(t.locator('img')).toHaveCount(1);
    await expect(t.locator('a[href="#cart"]')).toHaveText('Xem giỏ');
    await page.waitForTimeout(4000);
    await expect(t).toBeVisible();
  });
});
