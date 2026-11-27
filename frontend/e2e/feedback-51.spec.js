// Peer review — issue #51 (nhóm Let's Talk): thanh thông báo & nhãn giảm giá
const { test, expect } = require('@playwright/test');
const { gotoApp } = require('./helpers');

test.describe('Góp ý #51', () => {
  test('NFR-QA-01 #51 thanh thông báo: mỗi dòng dẫn đúng trang, bản sao chạy vòng bị ẩn với trình đọc màn hình', async ({ page }) => {
    await gotoApp(page, 'home');
    const sets = page.locator('.ann .ann-set');
    await expect(sets).toHaveCount(2);
    await expect(sets.nth(0)).not.toHaveAttribute('aria-hidden', 'true');
    await expect(sets.nth(1)).toHaveAttribute('aria-hidden', 'true');
    expect(await sets.nth(1).locator('a[tabindex="-1"]').count()).toBe(4);
    const hrefs = await sets.nth(0).locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
    expect(hrefs).toEqual(['#info-shipping', '#shop-new', '#info-returns', '#shop']);
  });

  test('AC-CAT-01 #51 nhãn giảm giá có dấu trừ (−19%)', async ({ page }) => {
    await gotoApp(page, 'shop');
    await expect(page.locator('.pc .pct').first()).toHaveText(/^−\d+%$/);
  });
});
