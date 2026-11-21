const { test, expect } = require('@playwright/test');
const { waitFor } = require('./helpers');

test.describe('NFR-REL-01 chế độ demo khi không có API', () => {
  test('NFR-REL-01 API không truy cập được → chạy chế độ demo như prototype và báo cho người dùng', async ({ page }) => {
    await page.goto('/?api=http://127.0.0.1:9#home');
    await waitFor(page, () => typeof SYNC !== 'undefined' && SYNC.ready);
    expect(await page.evaluate(() => SYNC.mode)).toBe('demo');
    await expect(page.locator('.toast').first()).toContainText('chế độ demo');
    // vẫn mua được bằng dữ liệu cục bộ
    await page.goto('/?api=http://127.0.0.1:9#product-k06');
    await waitFor(page, () => SYNC.ready);
    await page.click('[data-a=pdpSize][data-size="M"]');
    await page.click('[data-a=pdpAdd]');
    await expect(page.locator('[data-c=cart]').first()).toHaveText('1');
  });

  test('NFR-REL-01 ?demo ép chế độ demo, admin demo mở như prototype', async ({ page }) => {
    await page.goto('/?demo#admin');
    await waitFor(page, () => typeof SYNC !== 'undefined' && SYNC.ready);
    expect(await page.evaluate(() => SYNC.mode)).toBe('demo');
    await expect(page.locator('h1')).toContainText('Tổng quan');
  });
});
