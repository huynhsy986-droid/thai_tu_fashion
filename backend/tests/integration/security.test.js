import { describe, it, expect, afterAll } from 'vitest';
import { makeTestApp } from '../helpers/app.js';

const apps = [];
afterAll(async () => Promise.all(apps.map((a) => a.close())));

describe('NFR-SEC-03 · Bảo vệ API', () => {
  it('NFR-SEC-03 header bảo mật (Helmet) và không lộ X-Powered-By', async () => {
    const t = await makeTestApp('sec1');
    apps.push(t);
    const res = await t.api().get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true, db: 'ok', authProvider: 'local' });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['content-security-policy']).toContain("default-src 'self'");
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('NFR-SEC-03 rate-limit đăng nhập trả 429 RATE_LIMITED', async () => {
    const t = await makeTestApp('sec2', { RATE_LIMIT_AUTH: '3' });
    apps.push(t);
    const tries = [];
    for (let i = 0; i < 5; i += 1) tries.push((await t.api().post('/api/auth/login').send({ email: 'x@y.vn', password: 'sai' })).status);
    expect(tries.slice(0, 3)).toEqual([401, 401, 401]);
    expect(tries[4]).toBe(429);
  });

  it('NFR-SEC-03 CORS chỉ cho origin trong danh sách', async () => {
    const t = await makeTestApp('sec3', { CORS_ORIGINS: 'http://localhost:8080' });
    apps.push(t);
    const ok = await t.api().get('/api/categories').set('Origin', 'http://localhost:8080');
    expect(ok.headers['access-control-allow-origin']).toBe('http://localhost:8080');
    const bad = await t.api().get('/api/categories').set('Origin', 'https://evil.example');
    expect(bad.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('NFR-SEC-03 JSON hỏng → 400, body quá lớn → 413, API không tồn tại → 404 JSON', async () => {
    const t = await makeTestApp('sec4');
    apps.push(t);
    const bad = await t.api().post('/api/auth/login').set('Content-Type', 'application/json').send('{"email":');
    expect(bad.status).toBe(400);
    const big = await t.api().post('/api/newsletter').send({ email: 'x'.repeat(400_000) });
    expect(big.status).toBe(413);
    const nf = await t.api().get('/api/khong-co');
    expect(nf.status).toBe(404);
    expect(nf.body.error.code).toBe('NOT_FOUND');
  });

  it('NFR-PERF-01 /api/catalog phản hồi < 300 ms (p95, 20 lần)', async () => {
    const t = await makeTestApp('perf');
    apps.push(t);
    await t.api().get('/api/catalog');
    const times = [];
    for (let i = 0; i < 20; i += 1) {
      const s = performance.now();
      await t.api().get('/api/catalog').expect(200);
      times.push(performance.now() - s);
    }
    times.sort((a, b) => a - b);
    expect(times[Math.ceil(times.length * 0.95) - 1]).toBeLessThan(300);
  });

  it('NFR-SEC-03 phục vụ frontend tĩnh: HTML/JS luôn kiểm tra lại, ảnh cache dài (production)', async () => {
    const path = await import('node:path');
    const dir = path.resolve(import.meta.dirname, '../../../frontend');
    const t = await makeTestApp('static', { STATIC_DIR: dir, NODE_ENV: 'production', JWT_SECRET: 'prod-secret-0123456789-abcdefghijklmnop' });
    apps.push(t);
    const html = await t.api().get('/');
    expect(html.status).toBe(200);
    expect(html.text).toContain('js/sync.js');
    expect(html.headers['cache-control']).toBe('no-cache');
    expect((await t.api().get('/js/sync.js')).headers['cache-control']).toBe('no-cache');
    expect((await t.api().get('/img/k01-lav-a.webp')).headers['cache-control']).toBe('public, max-age=604800');
  });
});
