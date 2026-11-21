const { expect } = require('@playwright/test');
const { Client } = require('pg');

const PG = (process.env.TEST_PG_URL || 'postgres://postgres:postgres@localhost:5432').replace(/\/$/, '');
const DEMO = { email: 'minhanh@demo.thaitu.vn', password: 'Demo@1234' };
const ADMIN = { email: 'admin@thaitu.vn', password: 'Admin@1234' };

/** Đợi điều kiện trong trang (không dùng waitForFunction vì CSP script-src 'self' chặn eval). */
async function waitFor(page, fn, timeout = 15000) {
  await expect.poll(() => page.evaluate(fn).catch(() => false), { timeout, intervals: [100, 200, 300] }).toBeTruthy();
}

/** Chạy SQL trực tiếp trên DB e2e (chuẩn bị dữ liệu / kiểm tra kết quả). */
async function sql(text, params) {
  const c = new Client({ connectionString: `${PG}/thaitu_e2e` });
  await c.connect();
  try { return (await c.query(text, params)).rows; } finally { await c.end(); }
}

/** Ghi lại lỗi console / lỗi trang để kiểm tra trang "sạch". */
function watchErrors(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (/fonts\.(googleapis|gstatic)\.com|ERR_NAME_NOT_RESOLVED|ERR_INTERNET_DISCONNECTED/.test(t)) return; // CI không có mạng ngoài
    if (/status of (401|402|404|409|422)/.test(t)) return; // lỗi nghiệp vụ được UI xử lý
    errors.push(t);
  });
  return errors;
}

async function gotoApp(page, hash = 'home') {
  await page.goto(`/#${hash}`);
  await waitFor(page, () => typeof SYNC !== 'undefined' && SYNC.ready === true);
}

async function login(page, { email, password }) {
  await gotoApp(page, 'login');
  await page.fill('#au-email', email);
  await page.fill('#au-pass', password);
  await page.click('#au-submit');
  await waitFor(page, () => Boolean(API.session()) && S.meId && !SYNC.authBusy && location.hash !== '#login' && location.hash !== '#register');
}

async function register(page, name = 'Khách E2E') {
  const email = `e2e.${Date.now()}.${Math.floor(Math.random() * 1e6)}@test.thaitu.vn`;
  await gotoApp(page, 'register');
  await page.fill('#au-name', name);
  await page.fill('#au-email', email);
  await page.fill('#au-pass', 'Matkhau123');
  await page.click('#au-submit');
  await waitFor(page, () => Boolean(API.session()) && S.meId && !SYNC.authBusy && location.hash !== '#login' && location.hash !== '#register');
  return { email, password: 'Matkhau123', name };
}

async function addToCart(page, pid, size, color) {
  await gotoApp(page, `product-${pid}`);
  if (color) await page.click(`[data-a=pdpColor][data-color="${color}"]`);
  await page.click(`[data-a=pdpSize][data-size="${size}"]`);
  await page.click('[data-a=pdpAdd]');
  await expect(page.locator('.toast').last()).toContainText('Đã thêm');
}

/** Đợi hàng đợi ghi API của sync.js chạy xong. */
const settle = (page) => page.evaluate(() => chain);

module.exports = { waitFor, DEMO, ADMIN, sql, watchErrors, gotoApp, login, register, addToCart, settle };
