#!/usr/bin/env node
/**
 * Ma trận truy vết: AC trong PRD → nơi cài đặt (code) → test (unit / integration / e2e).
 *   node scripts/trace.mjs          ghi docs/traceability.md
 *   node scripts/trace.mjs --check  thoát lỗi nếu có AC chưa có test nào
 * Tác giả: TV3 – huynhsy986-droid
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');
const walk = (dir, re) => (fs.existsSync(dir) ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? (d.name === 'node_modules' ? [] : walk(path.join(dir, d.name), re)) : re.test(d.name) ? [path.join(dir, d.name)] : [])) : []);

const prd = fs.readFileSync(path.join(ROOT, 'docs/02-PRD.md'), 'utf8');
const acs = [...prd.matchAll(/^- \*\*(AC-[A-Z]+-\d+)\*\* (?:\*\((P\d)\)\* )?(.+)$/gm)].map((m) => ({ id: m[1], prio: m[2] || 'P0', text: m[3] }));
const nfrs = [...prd.matchAll(/^\| (NFR-[A-Z]+-\d+) \| (.+) \|$/gm)].map((m) => ({ id: m[1], prio: 'NFR', text: m[2] }));
const items = [...acs, ...nfrs];

const layers = {
  unit: walk(path.join(ROOT, 'backend/tests/unit'), /\.test\.js$/),
  integration: walk(path.join(ROOT, 'backend/tests/integration'), /\.test\.js$/),
  e2e: walk(path.join(ROOT, 'frontend/e2e'), /\.spec\.js$/),
};
const codeFiles = [
  ...walk(path.join(ROOT, 'backend/src'), /\.js$/),
  ...walk(path.join(ROOT, 'supabase/migrations'), /\.sql$/),
  ...['api.js', 'auth.js', 'sync.js'].map((f) => path.join(ROOT, 'frontend/js', f)),
];

/** Đếm số test (it/test) có nhắc AC-ID trong tên. it.each được tính 1. */
function testsFor(id, files) {
  let n = 0;
  const where = new Set();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const hits = [...src.matchAll(/\b(?:it|test)(?:\.each\([\s\S]*?\))?\(\s*(['"`])([^'"`]*)\1/g)].filter((m) => m[2].split(/\s+/).includes(id) || m[2].includes(`${id} `) || m[2].endsWith(id));
    const describeHit = [...src.matchAll(/describe\(\s*(['"`])([^'"`]*)\1/g)].some((m) => m[2].includes(id));
    if (hits.length) { n += hits.length; where.add(path.basename(f)); } else if (describeHit) { n += 1; where.add(path.basename(f)); }
  }
  return { n, where: [...where] };
}
const codeFor = (id) => codeFiles.filter((f) => fs.existsSync(f) && fs.readFileSync(f, 'utf8').includes(id)).map(rel);

const rows = items.map((a) => {
  const t = Object.fromEntries(Object.entries(layers).map(([k, files]) => [k, testsFor(a.id, files)]));
  const total = t.unit.n + t.integration.n + t.e2e.n;
  return { ...a, t, total, code: codeFor(a.id) };
});

const short = (s) => (s.length > 70 ? `${s.slice(0, 67).replace(/\s+\S*$/, '')}…` : s).replace(/\|/g, '\\|');
const cell = (x) => (x.n ? `${x.n} · ${x.where.map((w) => w.replace(/\.(test|spec)\.js$/, '')).join(', ')}` : '—');
const totals = Object.fromEntries(Object.keys(layers).map((k) => [k, rows.reduce((a, r) => a + r.t[k].n, 0)]));
const missing = rows.filter((r) => r.total === 0);

const md = [
  '# Ma trận truy vết AC → Code → Test',
  '',
  '> Sinh tự động bởi `node scripts/trace.mjs` (TV3). Quét mã AC trong PRD, tên test (unit/integration/e2e) và chú thích trong mã nguồn.',
  '> Số trong ô = số test có nhắc mã AC trong tên · tên file test.',
  '',
  `**Tổng:** ${acs.length} AC + ${nfrs.length} NFR · ${rows.length - missing.length}/${rows.length} mục có test · số lần được test: unit ${totals.unit}, integration ${totals.integration}, e2e ${totals.e2e}.`,
  '',
  '| Mã | Ưu tiên | Mô tả | Code | Unit | Integration | E2E |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => `| ${r.id} | ${r.prio} | ${short(r.text.replace(/\*\*/g, ''))} | ${r.code.length ? r.code.map((c) => '`' + c.replace(/^(backend\/src|supabase\/migrations|frontend\/js)\//, '') + '`').slice(0, 3).join(' ') : '—'} | ${cell(r.t.unit)} | ${cell(r.t.integration)} | ${cell(r.t.e2e)} |`),
  '',
  missing.length ? `**Chưa có test:** ${missing.map((m) => m.id).join(', ')}` : '**Mọi AC và NFR đều có ít nhất một test.**',
  '',
].join('\n');

fs.writeFileSync(path.join(ROOT, 'docs/traceability.md'), md);
console.log(`traceability: ${rows.length - missing.length}/${rows.length} có test · unit ${totals.unit} · integration ${totals.integration} · e2e ${totals.e2e}`);
if (missing.length) console.log('Thiếu test:', missing.map((m) => m.id).join(', '));
if (process.argv.includes('--check') && missing.length) process.exit(1);
