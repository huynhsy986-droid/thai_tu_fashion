const { test, expect } = require('@playwright/test');
const { gotoApp, login, DEMO } = require('./helpers');

test.describe('Mobile (Pixel 7)', () => {
  test('AC-AUTH-02 đăng nhập và xem giỏ trên điện thoại, không tràn ngang', async ({ page }) => {
    await gotoApp(page, 'home');
    await expect(page.locator('.mnav')).toBeVisible();
    await login(page, DEMO);
    for (const h of ['home', 'shop', 'product-k01', 'account', 'login']) {
      await gotoApp(page, h);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, h).toBeLessThanOrEqual(1);
    }
  });
});
