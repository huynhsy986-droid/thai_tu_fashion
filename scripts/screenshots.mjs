#!/usr/bin/env node
/** Chụp ảnh màn hình cho README: node scripts/screenshots.mjs [baseUrl]  (mặc định http://localhost:4000)
 *  Cần backend đang chạy với dữ liệu mẫu và Chrome (CHROME_PATH). Ảnh lưu ở docs/screenshots/. */
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('frontend/package.json'));
const { chromium } = require('@playwright/test');
const BASE = process.argv[2] || 'http://localhost:4000';
const OUT = path.resolve('docs/screenshots');
const b = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const ready = (p) => p.locator('.boot').waitFor({ state: 'detached', timeout: 15000 }).catch(() => p.waitForTimeout(2500)); // CSP chặn waitForFunction
async function shot(name, hash, { w = 1280, h = 800, full = false, before } = {}) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/#${hash}`); await ready(p); await p.waitForTimeout(900);
  if (before) await before(p);
  await p.screenshot({ path: path.join(OUT, `${name}.jpg`), type: 'jpeg', quality: 78, fullPage: full });
  await ctx.close(); console.log(name);
}
await shot('home-desktop', 'home');
await shot('home-tablet', 'home', { w: 820, h: 1180 });
await shot('home-mobile', 'home', { w: 390, h: 844 });
await shot('shop', 'shop-tops');
await shot('product', 'product-k01', { h: 900 });
await shot('cart-mobile', 'product-k06', { w: 390, h: 844, before: async (p) => { await p.click('[data-a=pdpSize][data-size="M"]'); await p.click('[data-a=pdpAdd]'); await p.evaluate(() => { location.hash = 'cart'; }); await p.waitForTimeout(1200); } });
await shot('about', 'about');
await shot('contact', 'contact', { h: 900, before: async (p) => { await p.fill('#ct-email', 'abc'); await p.fill('#ct-msg', 'ngắn'); await p.click('#ct-submit'); } });
await shot('size-advisor', 'size');
await shot('admin-dashboard', 'login', { h: 900, before: async (p) => { await p.click('[data-a=demoLogin][data-k=admin]'); await p.waitForURL(/#admin$/, { timeout: 15000 }); await p.waitForTimeout(1500); } });
await shot('admin-orders', 'login', { h: 900, before: async (p) => { await p.click('[data-a=demoLogin][data-k=admin]'); await p.waitForURL(/#admin$/, { timeout: 15000 }); await p.evaluate(() => { location.hash = 'admin-orders'; }); await p.waitForTimeout(1500); } });
// Lighthouse: phần điểm số ở đầu báo cáo
for (const f of ['before-home-mobile', 'after-home-mobile']) {
  const p = await b.newPage({ viewport: { width: 1000, height: 560 } });
  await p.goto('file://' + path.resolve('docs/lighthouse', f + '.html')); await p.waitForTimeout(1500);
  await p.screenshot({ path: path.join(OUT, `lighthouse-${f}.jpg`), type: 'jpeg', quality: 80 });
  await p.close(); console.log(f);
}
await b.close();
