const { test, expect } = require('@playwright/test');
const { gotoApp, register, addToCart, waitFor } = require('./helpers');

/** Giả lập server đã cấu hình GA4 + Sentry; chặn mạng ra Google/Sentry (CI không có mạng ngoài). */
async function withTracking(page) {
  await page.route('**/api/config', (r) => r.fulfill({ json: { gaMeasurementId: 'G-E2ETEST01', sentryDsn: 'https://pub@o1.ingest.sentry.io/1', environment: 'e2e', release: 'test' } }));
  await page.route(/googletagmanager\.com|google-analytics\.com|sentry\.io/, (r) => r.abort());
}
const events = (page) => page.evaluate(() => (window.dataLayer || []).filter((a) => a[0] === 'event').map((a) => ({ name: a[1], p: a[2] })));

test('NFR-OBS-01 GA4 nhận page_view theo route, view_item, add_to_cart, sign_up; Sentry được khởi tạo', async ({ page }) => {
  await withTracking(page);
  await gotoApp(page, 'home');
  await waitFor(page, () => TRACK.ga === 'G-E2ETEST01' && TRACK.sentry === true && typeof Sentry.captureException === 'function');
  expect(await page.evaluate(() => window.dataLayer.some((a) => a[0] === 'config' && a[1] === 'G-E2ETEST01'))).toBe(true);
  await page.evaluate(() => { location.hash = 'product-k06'; });
  await expect.poll(async () => (await events(page)).map((e) => e.name)).toEqual(expect.arrayContaining(['page_view', 'view_item']));
  const pv = (await events(page)).filter((e) => e.name === 'page_view').map((e) => e.p.page_path);
  expect(pv).toEqual(['/home', '/product-k06']);

  // mỗi lần gotoApp là tải lại trang → dataLayer mới
  await register(page);
  await expect.poll(async () => (await events(page)).map((e) => e.name)).toContain('sign_up');
  await addToCart(page, 'k06', 'M', 'white');
  await expect.poll(async () => (await events(page)).map((e) => e.name)).toContain('add_to_cart');
  const ev = await events(page);
  expect(ev.find((e) => e.name === 'add_to_cart').p).toMatchObject({ currency: 'VND', items: [expect.objectContaining({ item_id: 'k06', item_name: 'Áo thun boxy dày dặn' })] });
});

test('NFR-OBS-01 chưa cấu hình GA/Sentry hoặc chế độ demo → không tải script theo dõi', async ({ page }) => {
  const external = [];
  page.on('request', (r) => { if (/googletagmanager|sentry/.test(r.url())) external.push(r.url()); });
  await gotoApp(page, 'home');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => [TRACK.ga, TRACK.sentry, typeof window.gtag])).toEqual([null, false, 'undefined']);
  await page.goto('/?demo#home');
  await page.waitForTimeout(500);
  expect(external).toEqual([]);
});
