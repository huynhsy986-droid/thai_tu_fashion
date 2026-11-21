#!/usr/bin/env node
/**
 * Sinh supabase/seed.sql từ catalogue của prototype (frontend/js/data.js)
 * để dữ liệu giả lập trong DB khớp 100% với giao diện.
 *   node scripts/gen-seed.mjs
 * Tác giả: TV2 – nguyen06-vn
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FIXED_NOW = Date.parse('2026-11-21T03:00:00Z'); // mốc cố định → seed.sql ổn định giữa các lần sinh
const DAY = 864e5;

// ---- Chạy data.js trong sandbox để lấy dữ liệu gốc ----
const src = fs.readFileSync(path.join(ROOT, 'frontend/js/data.js'), 'utf8');
const ctx = vm.createContext({ Date: class extends Date { static now() { return FIXED_NOW; } }, Math, JSON });
vm.runInContext(
  src + '\n;globalThis.__out={RAW,COLORS,CATS0,COUPONS,SHIPPING,state:seedState()};',
  ctx,
  { filename: 'data.js' },
);
const { RAW, COLORS, CATS0, COUPONS, SHIPPING, state } = ctx.__out;

// ---- Helpers SQL ----
const q = (v) => (v === null || v === undefined ? 'null' : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (a && a.length ? `array[${a.map(q).join(',')}]::text[]` : `'{}'::text[]`);
const sarr = (a) => (a && a.length ? `array[${a.join(',')}]::smallint[]` : 'null');
const ago = (ms) => `now() - interval '${Math.max(0, Math.round(ms / 1000))} seconds'`;
const agoAt = (at) => ago(FIXED_NOW - at);

const uid = (cid) => `00000000-0000-4000-8000-${String(Number(cid.slice(1))).padStart(12, '0')}`;
const ADMIN_ID = '00000000-0000-4000-a000-000000000001';

const out = [];
const w = (s = '') => out.push(s);

w('-- =====================================================================');
w('-- Thai Tu Fashion · Dữ liệu giả lập (seed) — SINH TỰ ĐỘNG bởi scripts/gen-seed.mjs');
w('-- Nguồn: catalogue prototype frontend/js/data.js. Không sửa tay file này.');
w('-- Tài khoản demo: minhanh@demo.thaitu.vn / Demo@1234 · admin@thaitu.vn / Admin@1234');
w('-- Các khách khác: khach2..khach13@demo.thaitu.vn / Demo@1234');
w('-- =====================================================================');
w('set check_function_bodies = off;');
w('begin;');
w();

// ---- Người dùng (auth.users → trigger tạo profiles) ----
w('-- Người dùng');
const users = [
  { id: ADMIN_ID, email: 'admin@thaitu.vn', pass: 'Admin@1234', name: 'Quản trị Thai Tu', phone: '0909 000 111',
    address: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh', role: 'admin', joinedDays: 400 },
  ...state.customers.map((c) => ({
    id: uid(c.id), email: c.email, pass: 'Demo@1234', name: c.name, phone: c.phone, address: c.address,
    role: 'customer', joinedDays: c.joined, birthday: c.id === 'c1' ? state.user.birthday : null,
  })),
];
for (const u of users) {
  w(`insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token)`);
  w(`values ('00000000-0000-0000-0000-000000000000', ${q(u.id)}, 'authenticated', 'authenticated', ${q(u.email)}, extensions.crypt(${q(u.pass)}, extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', ${q(JSON.stringify({ full_name: u.name }))}::jsonb, ${ago(u.joinedDays * DAY)}, now(), '', '', '', '');`);
  w(`insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at) values (${q(u.id)}, ${q(u.id)}, ${q(JSON.stringify({ sub: u.id, email: u.email }))}::jsonb, 'email', now(), now());`);
  w(`update public.profiles set full_name = ${q(u.name)}, phone = ${q(u.phone)}, address = ${q(u.address)}, birthday = ${q(u.birthday)}, role = '${u.role}', created_at = ${ago(u.joinedDays * DAY)} where id = ${q(u.id)};`);
}
w();

// ---- Danh mục, màu, giao hàng, coupon ----
w('-- Danh mục');
CATS0.forEach((c, i) => w(`insert into public.categories (id, name, description, sort_order) values (${q(c.id)}, ${q(c.name)}, ${q(c.sub)}, ${i + 1});`));
w();
w('-- Màu');
Object.entries(COLORS).forEach(([code, [name, hex]]) => w(`insert into public.colors (code, name, hex) values (${q(code)}, ${q(name)}, ${q(hex)});`));
w();
w('-- Phương thức giao hàng');
Object.entries(SHIPPING).forEach(([code, s], i) =>
  w(`insert into public.shipping_methods (code, name, eta, fee, free_threshold, sort_order) values (${q(code)}, ${q(s.name)}, ${q(s.eta)}, ${s.fee}, ${code === 'std' ? 1500000 : 'null'}, ${i + 1});`));
w();
w('-- Mã giảm giá');
Object.entries(COUPONS).forEach(([code, c]) =>
  w(`insert into public.coupons (code, type, value, min_subtotal, label) values (${q(code)}, '${c.type}', ${c.v || 0}, ${c.min || 0}, ${q(c.label)});`));
w(`insert into public.coupons (code, type, value, min_subtotal, label, active, expires_at) values ('SUMMER25', 'pct', 25, 0, 'Giảm 25% mùa hè (đã hết hạn)', true, now() - interval '30 days');`);
w(`insert into public.coupons (code, type, value, min_subtotal, label, usage_limit) values ('VIP100K', 'amt', 100000, 1000000, 'Giảm 100.000₫ cho đơn từ 1.000.000₫ (giới hạn 50 lượt)', 50);`);
w();

// ---- Sản phẩm + biến thể ----
w('-- Sản phẩm');
const products = state.products;
for (const p of products) {
  w(`insert into public.products (id, name, kor_name, category_id, sub_type, gender, template, texture, base_image, image_colors, price, sale_price, sizes, colors, badge, fit, fabric, occasions, styles, description, material, care, is_photo, status, sold_count, likes_count, created_at) values (` +
    [q(p.id), q(p.name), q(p.kor), q(p.cat), q(p.sub), q(p.gender), q(p.tpl), q(p.tex), q(p.base), arr(p.baseColors),
      p.price, p.sale && p.sale < p.price ? p.sale : 'null', arr(p.sizes), arr(p.colors), q(p.badge || ''), q(p.fit),
      sarr(p.fabric), arr(p.occasions), arr(p.styles), q(p.desc), q(p.material), q(p.care), p.photo ? 'true' : 'false',
      q(p.status), p.sold, p.likes, ago(p.added * DAY)].join(', ') + ');');
}
w();
w('-- Tồn kho từng biến thể (màu × size)');
for (const p of products) {
  const rows = [];
  for (const c of p.colors) for (const s of p.sizes) rows.push(`(${q(p.id)}, ${q(c)}, ${q(s)}, ${p.stock[c][s] ?? 0})`);
  w(`insert into public.product_variants (product_id, color_code, size, stock) values ${rows.join(', ')} on conflict (product_id, color_code, size) do update set stock = excluded.stock;`);
}
w();

// ---- Đánh giá ----
w('-- Đánh giá');
for (const r of state.reviews) {
  w(`insert into public.reviews (product_id, display_name, rating, body, size, color_code, height_cm, weight_kg, fit_feel, verified, status, created_at) values (` +
    [q(r.pid), q(r.name), r.rating, q(r.text), q(r.size), q(r.color), r.h ?? 'null', r.w ?? 'null', q(r.fitFeel),
      r.verified ? 'true' : 'false', q(r.status), ago(r.daysAgo * DAY + 3600e3 * ((r.rating * 7) % 11))].join(', ') + ');');
}
w();

// ---- Đơn hàng + lịch sử ----
w('-- Đơn hàng');
const FLOW = ['pending', 'confirmed', 'processing', 'shipping', 'delivered'];
let maxNo = 0;
for (const o of [...state.orders].reverse()) {
  maxNo = Math.max(maxNo, Number(o.id.slice(2)));
  const payStatus = o.status === 'cancelled' ? (o.pay === 'online' ? 'refunded' : 'unpaid')
    : o.pay === 'online' ? 'paid' : o.status === 'delivered' ? 'paid' : 'unpaid';
  const phone = o.phone.replace(/\s/g, '');
  w(`insert into public.orders (id, user_id, recipient_name, phone, address, note, shipping_method, payment_method, payment_status, coupon_code, subtotal, discount, shipping_fee, total, status, created_at, updated_at) values (` +
    [q(o.id), q(uid(o.cid)), q(o.name), q(phone), q(o.address), q(o.note || ''), q(o.ship), q(o.pay), q(payStatus), 'null',
      o.sub, o.discount || 0, o.shipFee, o.total, q(o.status), agoAt(o.at), agoAt(o.at)].join(', ') + ');');
  for (const i of o.items) {
    w(`insert into public.order_items (order_id, product_id, variant_id, product_name, color_code, size, quantity, unit_price) values (${q(o.id)}, ${q(i.pid)}, (select id from public.product_variants where product_id = ${q(i.pid)} and color_code = ${q(i.color)} and size = ${q(i.size)}), ${q(i.name)}, ${q(i.color)}, ${q(i.size)}, ${i.qty}, ${i.price});`);
  }
  // Lịch sử trạng thái: đi theo luồng, mỗi bước cách nhau ~10 giờ
  const steps = o.status === 'cancelled' ? ['pending', 'cancelled'] : FLOW.slice(0, FLOW.indexOf(o.status) + 1);
  steps.forEach((s, k) => {
    const at = Math.min(FIXED_NOW - 60e3, o.at + k * 10 * 3600e3);
    w(`insert into public.order_status_history (order_id, from_status, to_status, changed_by, note, created_at) values (${q(o.id)}, ${k ? q(steps[k - 1]) : 'null'}, ${q(s)}, ${k ? q(ADMIN_ID) : q(uid(o.cid))}, ${k ? 'null' : q('Khách đặt hàng')}, ${agoAt(at)});`);
  });
}
w(`select setval('public.order_number_seq', ${Math.max(1100, maxNo + 1)}, false);`);
w();

// ---- Dữ liệu cá nhân của khách demo ----
const ME = uid('c1');
w('-- Khách demo: yêu thích, báo có hàng, thông báo, outfit, số đo, giỏ hàng');
for (const x of state.wish) w(`insert into public.wishlist_items (user_id, product_id, target_price) values (${q(ME)}, ${q(x.pid)}, ${x.target || 'null'});`);
for (const x of state.restock) w(`insert into public.restock_subscriptions (user_id, variant_id) values (${q(ME)}, (select id from public.product_variants where product_id = ${q(x.pid)} and color_code = ${q(x.color)} and size = ${q(x.size)}));`);
for (const n of [...state.notifs].reverse()) w(`insert into public.notifications (user_id, type, title, body, link, is_read, created_at) values (${q(ME)}, ${q(n.type)}, ${q(n.title)}, ${q(n.body)}, ${q(n.link)}, ${n.read}, ${agoAt(n.at)});`);
for (const o of state.outfits) w(`insert into public.outfits (user_id, name, slots, created_at) values (${q(ME)}, ${q(o.name)}, ${q(JSON.stringify(o.slots))}::jsonb, ${agoAt(o.at)});`);
const m = state.measures;
w(`insert into public.body_measurements (user_id, height_cm, weight_kg, chest_cm, waist_cm, hip_cm, fit_pref) values (${q(ME)}, ${m.height}, ${m.weight}, ${m.chest}, ${m.waist}, ${m.hip}, ${q(m.fit)});`);
w(`insert into public.newsletter_subscribers (email) values ('minhanh@demo.thaitu.vn');`);
w();
w('commit;');

fs.writeFileSync(path.join(ROOT, 'supabase/seed.sql'), out.join('\n') + '\n');
console.log(`seed.sql: ${users.length} users, ${products.length} products, ${state.reviews.length} reviews, ${state.orders.length} orders`);
