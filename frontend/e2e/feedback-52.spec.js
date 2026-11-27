// Peer review — issue #52 (Nhóm 2): khu quản trị, gợi ý, nhận tin, biểu tượng giỏ
const { test, expect } = require('@playwright/test');
const { gotoApp, login, ADMIN } = require('./helpers');

test.describe('Góp ý #52', () => {
  test('AC-AUTH-04 #52 khách không thấy "Khu quản trị" ở chân trang, admin thì thấy', async ({ page }) => {
    await gotoApp(page, 'home');
    await expect(page.locator('footer a[href="#admin"]')).toHaveCount(0);
    await login(page, ADMIN);
    await gotoApp(page, 'home');
    await expect(page.locator('footer a[href="#admin"]')).toHaveCount(1);
  });

  test('AC-CAT-01 #52 khách mới vẫn thấy 4 món trong "Gợi ý cho bạn"', async ({ page }) => {
    await gotoApp(page, 'home');
    const sec = page.locator('section', { has: page.locator('h2', { hasText: 'Gợi ý cho bạn' }) });
    await expect(sec.locator('.pc')).toHaveCount(4);
    await expect(sec).toContainText('đang bán chạy');
  });

  test('AC-ACC-05 #52 đã đăng ký nhận tin thì ô đăng ký không hiện lại', async ({ page }) => {
    await gotoApp(page, 'home');
    await page.fill('#news-mail', `fb52.${Date.now()}@email.com`);
    await page.locator('form[data-form=news] button').click();
    await expect(page.locator('#news-ok')).toContainText('Đã đăng ký nhận tin');
    await page.reload();
    await gotoApp(page, 'home');
    await expect(page.locator('.ftr-news-done')).toBeVisible();
    await expect(page.locator('#news-mail')).toHaveCount(0);
  });

  test('AC-CART-01 #52 cửa sổ hẹp vẫn thấy biểu tượng giỏ hàng trên thanh đầu trang', async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 900 });
    await gotoApp(page, 'home');
    await expect(page.locator('.hdr-r a[href="#cart"]')).toBeVisible();
  });

  test('NFR-QA-01 #58 menu ☰ ở cửa sổ hẹp: các nhóm mục không chồng lên nhau', async ({ page }) => {
    await page.setViewportSize({ width: 420, height: 900 });
    await gotoApp(page, 'home');
    await page.click('[data-a=menu]');
    const boxes = await page.locator('.menu-list a').evaluateAll((as) => as.map((a) => a.getBoundingClientRect()).map((r) => [r.top, r.bottom]));
    for (let i = 1; i < boxes.length; i++) expect(boxes[i][0]).toBeGreaterThanOrEqual(boxes[i - 1][1] - 1);
  });
});
