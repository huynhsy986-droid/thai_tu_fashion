import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp } from '../helpers/app.js';
import { NEXT, ORDER_STATUSES } from '../../src/domain/orderStatus.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const spec = YAML.parse(fs.readFileSync(path.resolve(here, '../../../docs/openapi.yaml'), 'utf8'));
const METHODS = ['get', 'post', 'put', 'patch', 'delete'];

let t;
beforeAll(async () => { t = await makeTestApp('contract'); });
afterAll(async () => t?.close());

/** Duyệt router Express 5 để lấy danh sách METHOD path (dạng OpenAPI). */
function expressRoutes(stack, prefix = '') {
  const out = [];
  for (const layer of stack) {
    if (layer.route) {
      const p = (prefix + (layer.route.path === '/' ? '' : layer.route.path)).replace(/:(\w+)/g, '{$1}') || '/';
      for (const m of Object.keys(layer.route.methods)) if (METHODS.includes(m)) out.push(`${m.toUpperCase()} ${p}`);
    } else if (layer.name === 'router' && layer.handle?.stack) {
      const raw = layer.rawPath && layer.rawPath !== '/' ? layer.rawPath : '';
      out.push(...expressRoutes(layer.handle.stack, prefix + raw));
    }
  }
  return out;
}

describe('Contract · API ⇔ tài liệu', () => {
  it('mọi route Express đều có trong docs/openapi.yaml và ngược lại', () => {
    const impl = new Set(expressRoutes(t.app.router.stack));
    const documented = new Set(
      Object.entries(spec.paths).flatMap(([p, ops]) => Object.keys(ops).filter((m) => METHODS.includes(m)).map((m) => `${m.toUpperCase()} ${p}`)),
    );
    const undocumented = [...impl].filter((r) => !documented.has(r)).sort();
    const unimplemented = [...documented].filter((r) => !impl.has(r)).sort();
    expect({ undocumented, unimplemented }).toEqual({ undocumented: [], unimplemented: [] });
    expect(impl.size).toBeGreaterThanOrEqual(45);
  });

  it('mọi operation cần đăng nhập đều khai báo bearerAuth và trả 401 khi thiếu token', async () => {
    const pub = new Set(['/api/health', '/api/auth/register', '/api/auth/login', '/api/catalog', '/api/categories', '/api/colors', '/api/shipping-methods', '/api/products', '/api/products/{id}', '/api/newsletter', '/api/contact']);
    for (const [p, ops] of Object.entries(spec.paths)) {
      for (const m of Object.keys(ops).filter((x) => METHODS.includes(x))) {
        const isPublic = pub.has(p) || (p === '/api/products/{id}/reviews' && m === 'get');
        if (isPublic) continue;
        expect(ops[m].security, `${m} ${p} thiếu security`).toEqual([{ bearerAuth: [] }]);
        const url = p.replace('{id}', 'k01').replace('{productId}', 'k01').replace('{variantId}', '1').replace('{code}', 'X');
        const res = await t.api()[m](url).send({});
        expect(res.status, `${m.toUpperCase()} ${url}`).toBe(401);
      }
    }
  });

  it('ADR-03 bảng trạng thái JS khớp hoàn toàn với SQL order_next_statuses()', async () => {
    for (const s of ORDER_STATUSES) {
      const { rows } = await t.sql('select public.order_next_statuses($1::public.order_status)::text[] as n', [s]);
      expect(rows[0].n, s).toEqual(NEXT[s]);
    }
    const { rows } = await t.sql('select enum_range(null::public.order_status)::text[] as e');
    expect(rows[0].e).toEqual(ORDER_STATUSES);
  });

  it('mã lỗi trong openapi bao phủ mọi hint SQL được dùng', () => {
    const sql = fs.readdirSync(path.resolve(here, '../../../supabase/migrations')).map((f) => fs.readFileSync(path.resolve(here, '../../../supabase/migrations', f), 'utf8')).join('\n');
    const hints = new Set([...sql.matchAll(/hint = '([A-Z_]+)'/g)].map((m) => m[1]));
    const codes = spec.components.schemas.Error.properties.error.properties.code.enum;
    expect([...hints].filter((h) => !codes.includes(h))).toEqual([]);
  });

  it('NFR-DATA-01 tiền là số nguyên VND, thời gian là timestamptz trên mọi bảng', async () => {
    const { rows: money } = await t.sql(`select table_name, column_name, data_type from information_schema.columns
      where table_schema = 'public' and column_name ~ '(price|subtotal|discount|fee|total|value|min_subtotal|threshold)$'
        and table_name not like 'product_rating%'`);
    expect(money.length).toBeGreaterThanOrEqual(10);
    expect(money.filter((c) => c.data_type !== 'integer')).toEqual([]);
    const { rows: times } = await t.sql(`select table_name, column_name, data_type from information_schema.columns
      where table_schema = 'public' and column_name ~ '_at$'`);
    expect(times.length).toBeGreaterThanOrEqual(15);
    expect(times.filter((c) => c.data_type !== 'timestamp with time zone')).toEqual([]);
  });
});
