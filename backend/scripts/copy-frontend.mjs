#!/usr/bin/env node
/**
 * Bước build trên Vercel: chép phần giao diện cần phát ra web từ ../frontend sang ./public
 * (chỉ file chạy được, không chép test e2e, cấu hình Tailwind, node_modules).
 *   node scripts/copy-frontend.mjs [thư-mục-đích]   (mặc định backend/public; Vercel dùng dist/)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.resolve(here, '../../frontend');
const out = path.resolve(process.argv[2] || path.resolve(here, '../public'));
const ITEMS = ['index.html', 'favicon.svg', 'robots.txt', 'css', 'js', 'img', 'vendor'];

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error(`Không thấy giao diện ở ${src}. Trên Vercel hãy bật "Include files outside the Root Directory".`);
  process.exit(1);
}
fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });
let n = 0;
for (const item of ITEMS) {
  const from = path.join(src, item);
  if (!fs.existsSync(from)) continue;
  fs.cpSync(from, path.join(out, item), { recursive: true, filter: (f) => !f.endsWith('.src.css') });
  n += 1;
}
const count = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((s, e) => s + (e.isDirectory() ? count(path.join(d, e.name)) : 1), 0);
console.log(`✓ Đã chép ${n} mục giao diện (${count(out)} file) vào ${path.relative(process.cwd(), out) || out}`);
