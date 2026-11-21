#!/usr/bin/env node
/**
 * Smoke test một môi trường đã deploy (chỉ đọc, trừ khi có tài khoản test).
 *   node scripts/smoke.js https://thai-tu-fashion.onrender.com
 *   SMOKE_EMAIL=... SMOKE_PASSWORD=... node scripts/smoke.js <url>   # thêm kiểm tra đăng nhập + giỏ + báo giá
 */
const base = (process.argv[2] || process.env.SMOKE_URL || 'http://localhost:4000').replace(/\/$/, '');
let fails = 0;
const check = async (name, fn) => {
  const t = Date.now();
  try { const info = await fn(); console.log(`✓ ${name} (${Date.now() - t} ms)${info ? ' · ' + info : ''}`); }
  catch (e) { fails += 1; console.log(`✗ ${name}: ${e.message}`); }
};
const j = async (path, opts = {}) => {
  const r = await fetch(base + path, { ...opts, headers: { 'content-type': 'application/json', ...(opts.headers || {}) } });
  const body = r.headers.get('content-type')?.includes('json') ? await r.json() : await r.text();
  return { r, body };
};
const must = (c, m) => { if (!c) throw new Error(m); };

await check('health + database', async () => { const { r, body } = await j('/api/health'); must(r.ok && body.db === 'ok', JSON.stringify(body)); return `auth=${body.authProvider}`; });
await check('trang chủ (frontend tĩnh)', async () => { const r = await fetch(base + '/'); const t = await r.text(); must(r.ok && t.includes('js/sync.js'), 'không thấy index.html'); return r.headers.get('content-security-policy') ? 'có CSP' : 'THIẾU CSP'; });
await check('catalogue công khai', async () => { const { r, body } = await j('/api/catalog'); must(r.ok && body.products.length > 0, 'không có sản phẩm'); return `${body.products.length} SP, ${body.categories.length} danh mục`; });
await check('tìm kiếm không dấu', async () => { const { body } = await j('/api/products?q=ao&pageSize=5'); must(body.total > 0, 'không có kết quả'); return `${body.total} kết quả`; });
await check('chặn API khi chưa đăng nhập', async () => { const { r } = await j('/api/cart'); must(r.status === 401, `trả ${r.status}`); });
await check('chặn API quản trị', async () => { const { r } = await j('/api/admin/dashboard'); must(r.status === 401, `trả ${r.status}`); });

if (process.env.SMOKE_EMAIL) {
  let token;
  await check('đăng nhập tài khoản test', async () => {
    const { r, body } = await j('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: process.env.SMOKE_EMAIL, password: process.env.SMOKE_PASSWORD }) });
    must(r.ok, body.error?.message); token = body.accessToken; return body.user.role;
  });
  const auth = () => ({ authorization: `Bearer ${token}` });
  await check('giỏ hàng + báo giá server', async () => {
    const { body: cat } = await j('/api/catalog');
    const p = cat.products.find((x) => Object.values(x.stock).some((s) => Object.values(s).some((n) => n > 0)));
    const color = Object.keys(p.stock).find((c) => Object.values(p.stock[c]).some((n) => n > 0));
    const size = Object.keys(p.stock[color]).find((s) => p.stock[color][s] > 0);
    const add = await j('/api/cart/items', { method: 'POST', headers: auth(), body: JSON.stringify({ productId: p.id, color, size }) });
    must(add.r.ok, add.body.error?.message);
    const q = await j('/api/cart/quote', { method: 'POST', headers: auth(), body: JSON.stringify({ shipping: 'std' }) });
    must(q.r.ok && q.body.total > 0, 'báo giá lỗi');
    const v = add.body.items.find((i) => i.pid === p.id && i.color === color && i.size === size).variantId;
    await j(`/api/cart/items/${v}`, { method: 'DELETE', headers: auth() });
    return `tổng ${q.body.total.toLocaleString('vi-VN')}₫ (đã xoá lại khỏi giỏ)`;
  });
}
console.log(fails ? `\n${fails} kiểm tra thất bại` : '\nTất cả kiểm tra đạt');
process.exit(fails ? 1 : 0);
