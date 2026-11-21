import { describe, it, expect } from 'vitest';
import { HttpError, fromPgError, errorHandler, HINT_STATUS } from '../../src/lib/errors.js';

const fakeRes = () => {
  const res = { statusCode: 0, body: null };
  res.status = (s) => ((res.statusCode = s), res);
  res.json = (b) => ((res.body = b), res);
  return res;
};

describe('fromPgError — map lỗi Postgres → HTTP (ADR-07)', () => {
  it('P0001 + hint dùng bảng HINT_STATUS, detail JSON được parse', () => {
    const e = fromPgError({ code: 'P0001', hint: 'OUT_OF_STOCK', message: 'Không đủ hàng', detail: '[{"size":"L"}]' });
    expect(e).toBeInstanceOf(HttpError);
    expect(e.status).toBe(409);
    expect(e.code).toBe('OUT_OF_STOCK');
    expect(e.details).toEqual([{ size: 'L' }]);
  });

  it.each(Object.entries(HINT_STATUS))('hint %s → %i', (hint, status) => {
    expect(fromPgError({ code: 'P0001', hint, message: 'x' }).status).toBe(status);
  });

  it('detail không phải JSON giữ nguyên chuỗi', () => {
    expect(fromPgError({ code: 'P0001', hint: 'COUPON_INVALID', message: 'x', detail: 'expired' }).details).toBe('expired');
  });

  it('P0001 không có hint → 422 VALIDATION', () => {
    expect(fromPgError({ code: 'P0001', message: 'x' })).toMatchObject({ status: 422, code: 'VALIDATION' });
  });

  it.each([
    ['23505', 409, 'CONFLICT'],
    ['23503', 409, 'CONFLICT'],
    ['23514', 422, 'VALIDATION'],
    ['22P02', 422, 'VALIDATION'],
    ['42501', 403, 'FORBIDDEN'],
  ])('SQLSTATE %s → %i %s', (code, status, c) => {
    expect(fromPgError({ code, message: 'x' })).toMatchObject({ status, code: c });
  });

  it('lỗi lạ → null; HttpError giữ nguyên', () => {
    expect(fromPgError(new Error('boom'))).toBeNull();
    const h = new HttpError(404, 'NOT_FOUND', 'x');
    expect(fromPgError(h)).toBe(h);
  });
});

describe('errorHandler', () => {
  const handler = errorHandler({ error() {} });

  it('trả body lỗi chuẩn kèm details', () => {
    const res = fakeRes();
    handler(new HttpError(422, 'VALIDATION', 'Sai', [{ field: 'a' }]), {}, res);
    expect(res.statusCode).toBe(422);
    expect(res.body).toEqual({ error: { code: 'VALIDATION', message: 'Sai', details: [{ field: 'a' }] } });
  });

  it('JSON hỏng → 400, body quá lớn → 413', () => {
    const a = fakeRes();
    handler({ type: 'entity.parse.failed' }, {}, a);
    expect(a.statusCode).toBe(400);
    const b = fakeRes();
    handler({ type: 'entity.too.large' }, {}, b);
    expect(b.statusCode).toBe(413);
  });

  it('lỗi không mong đợi → 500 không lộ chi tiết', () => {
    const res = fakeRes();
    handler(new Error('secret stack'), {}, res);
    expect(res.statusCode).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain('secret');
  });
});
