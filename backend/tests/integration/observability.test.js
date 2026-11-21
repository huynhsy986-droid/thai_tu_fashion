import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { makeTestApp } from '../helpers/app.js';
import { createApp } from '../../src/app.js';
import { loadConfig } from '../../src/config.js';

let t;
beforeAll(async () => {
  t = await makeTestApp('obs', { GA_MEASUREMENT_ID: 'G-TEST12345', SENTRY_DSN_BROWSER: 'https://abc@o1.ingest.sentry.io/2', RELEASE: 'abc1234' });
});
afterAll(async () => t?.close());

describe('NFR-OBS-01 · Request id, cấu hình tracking, nén', () => {
  it('NFR-OBS-01 mọi phản hồi API có X-Request-Id; nhận lại id hợp lệ từ proxy', async () => {
    const a = await t.api().get('/api/categories');
    expect(a.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect((await t.api().get('/api/categories').set('X-Request-Id', 'render-req-12345')).headers['x-request-id']).toBe('render-req-12345');
    expect((await t.api().get('/api/categories').set('X-Request-Id', 'x"; drop')).headers['x-request-id']).not.toContain('drop');
  });

  it('NFR-OBS-01 GET /api/config trả cấu hình công khai, không lộ secret', async () => {
    const r = await t.api().get('/api/config');
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ gaMeasurementId: 'G-TEST12345', sentryDsn: 'https://abc@o1.ingest.sentry.io/2', environment: 'test', release: 'abc1234' });
    expect(JSON.stringify(r.body)).not.toMatch(/secret|DATABASE|postgres/i);
  });

  it('NFR-OBS-01 CSP chỉ mở domain Google Analytics / Sentry khi đã cấu hình', async () => {
    const csp = (await t.api().get('/api/health')).headers['content-security-policy'];
    expect(csp).toContain('https://www.googletagmanager.com');
    expect(csp).toContain('https://o1.ingest.sentry.io');
    const plain = await makeTestApp('obs2');
    try {
      expect((await plain.api().get('/api/health')).headers['content-security-policy']).not.toContain('googletagmanager');
      expect((await plain.api().get('/api/config')).body).toMatchObject({ gaMeasurementId: null, sentryDsn: null });
    } finally {
      await plain.close();
    }
  });

  it('NFR-PERF-01 phản hồi lớn được nén gzip', async () => {
    const r = await t.api().get('/api/catalog').set('Accept-Encoding', 'gzip');
    expect(r.status).toBe(200);
    expect(r.headers['content-encoding']).toBe('gzip');
  });

  it('NFR-OBS-01 lỗi 500 không lộ stack, có requestId, được log và gửi Sentry', async () => {
    const logs = []; const captured = [];
    const logger = { info() {}, warn() {}, log() {}, error: (m, f) => logs.push({ m, f }) };
    const monitor = { enabled: true, captureException: (e, ctx) => captured.push({ e, ctx }), async flush() {} };
    const broken = { asOwner: async () => { throw new Error('db down'); }, withUser: async () => { throw new Error('kết nối hỏng'); } };
    const config = loadConfig({ NODE_ENV: 'test', AUTH_PROVIDER: 'local', JWT_SECRET: 'x'.repeat(40), STATIC_DIR: '', LOG_REQUESTS: 'false' });
    const app = createApp({ config, db: broken, tokens: t.tokens, authProvider: { name: 'local' }, logger, monitor });
    const r = await request(app).get('/api/categories').set('X-Request-Id', 'trace-500-abcdef');
    expect(r.status).toBe(500);
    expect(r.body).toEqual({ error: { code: 'INTERNAL', message: 'Có lỗi xảy ra, vui lòng thử lại sau.', requestId: 'trace-500-abcdef' } });
    expect(JSON.stringify(r.body)).not.toContain('kết nối hỏng');
    expect(logs[0]).toMatchObject({ m: 'unhandled error', f: { reqId: 'trace-500-abcdef', path: '/api/categories' } });
    expect(captured[0].ctx).toMatchObject({ reqId: 'trace-500-abcdef', method: 'GET' });
  });
});
