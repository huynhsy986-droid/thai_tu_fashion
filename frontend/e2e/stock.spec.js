const { test, expect } = require('@playwright/test');
const { gotoApp, register, addToCart, settle, sql } = require('./helpers');

test('AC-ORD-02 AC-ORD-03 hai khách tranh món cuối: người sau thấy báo hết hàng, kho không âm', async ({ browser }) => {
  await sql("update public.product_variants set stock = 1 where product_id = 'k19' and color_code = 'black' and size = '38'");
  const ctxA = await browser.newContext();
  const ctxB = await browser.newContext();
  const a = await ctxA.newPage();
  const b = await ctxB.newPage();
  const ua = await register(a, 'Khách Nhanh');
  const ub = await register(b, 'Khách Chậm');
  await addToCart(a, 'k19', '38');
  await addToCart(b, 'k19', '38');
  await settle(a);
  await settle(b);

  for (const [p, u] of [[a, ua], [b, ub]]) {
    await gotoApp(p, 'checkout');
    await p.fill('#co-name', u.name);
    await p.fill('#co-phone', '0911222333');
    await p.fill('#co-addr', '5 Trần Phú, Ba Đình, Hà Nội');
  }
  await a.locator('#co-sum button.btn.block').click();
  await a.waitForURL(/#confirm-/);

  await b.locator('#co-sum button.btn.block').click();
  await expect(b.locator('#co-stock')).toContainText('Không đủ hàng');
  await expect(b.locator('#co-stock')).toContainText('còn 0');
  expect(await b.evaluate(() => location.hash)).toBe('#checkout');

  const [v] = await sql("select stock from public.product_variants where product_id = 'k19' and color_code = 'black' and size = '38'");
  expect(v.stock).toBe(0);
  await ctxA.close();
  await ctxB.close();
});
