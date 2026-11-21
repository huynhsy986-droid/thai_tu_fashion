import { describe, it, expect } from 'vitest';
import { createLogger, redact } from '../../src/lib/logger.js';
import { createMonitor, noopMonitor } from '../../src/lib/monitoring.js';

const sink = () => { const lines = []; return { lines, write: (s) => lines.push(s) }; };

describe('NFR-OBS-01 · Logging có cấu trúc', () => {
  it('NFR-OBS-01 mỗi dòng là JSON có ts, level, msg và trường phụ', () => {
    const out = sink(); const err = sink();
    const log = createLogger({ stream: out, errStream: err });
    log.info('request', { reqId: 'abc', status: 200 });
    log.error('boom', { status: 500 });
    const rec = JSON.parse(out.lines[0]);
    expect(rec).toMatchObject({ level: 'info', msg: 'request', reqId: 'abc', status: 200 });
    expect(new Date(rec.ts).toString()).not.toBe('Invalid Date');
    expect(JSON.parse(err.lines[0]).level).toBe('error');
  });

  it('NFR-OBS-01 lọc theo LOG_LEVEL và ẩn dữ liệu nhạy cảm', () => {
    const out = sink();
    const log = createLogger({ level: 'warn', stream: out, errStream: out });
    log.info('bỏ qua');
    log.warn('login', { email: 'a@b.vn', password: 'Secret123', headers: { Authorization: 'Bearer x' } });
    expect(out.lines).toHaveLength(1);
    expect(JSON.parse(out.lines[0])).toMatchObject({ password: '[redacted]', headers: { Authorization: '[redacted]' }, email: 'a@b.vn' });
    expect(redact(new Error('x'))).toMatchObject({ name: 'Error', message: 'x' });
  });

  it('NFR-OBS-01 không có SENTRY_DSN → monitor no-op', async () => {
    expect(await createMonitor({}, null)).toBe(noopMonitor);
    expect(() => noopMonitor.captureException(new Error('x'))).not.toThrow();
  });
});
