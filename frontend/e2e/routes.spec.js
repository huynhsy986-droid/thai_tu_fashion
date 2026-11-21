const { test, expect } = require('@playwright/test');
const { gotoApp, login, watchErrors, ADMIN } = require('./helpers');

const STORE = ['home', 'shop', 'shop-new', 'shop-tops', 'shop-dresses', 'shop-jewelry', 'product-k01', 'product-t11', 'wishlist', 'notifications', 'cart',
  'account', 'account-orders', 'account-outfits', 'account-wishlist', 'account-measure', 'account-notifs',
  'studio', 'outfit', 'size', 'stylist', 'visual', 'tryon', 'info-shipping', 'khong-ton-tai'];
const ADMIN_ROUTES = ['admin', 'admin-products', 'admin-categories', 'admin-inventory', 'admin-orders', 'admin-customers', 'admin-reviews'];

test('NFR-QA-01 mọi trang (cửa hàng, Smart Studio, tài khoản, quản trị) hiển thị không lỗi JS/CSP với dữ liệu từ API', async ({ page }) => {
  const errors = watchErrors(page);
  await login(page, ADMIN);
  for (const h of [...STORE, ...ADMIN_ROUTES]) {
    await gotoApp(page, h);
    await expect(page.locator('#root'), h).not.toBeEmpty();
    expect(await page.locator('#root').innerText(), h).not.toContain('undefined');
  }
  // Smart Studio: tìm bằng ảnh mẫu dùng canvas → kiểm tra CSP img/blob
  await gotoApp(page, 'visual');
  await page.click('[data-a=vsSample]');
  await expect(page.locator('#vs-out')).not.toBeEmpty();
  expect(errors).toEqual([]);
});
