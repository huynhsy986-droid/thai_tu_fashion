import { describe, it, expect } from 'vitest';
import { parse } from '../../src/lib/validate.js';
import { contactSchema } from '../../src/routes/contact.js';
import { toContact } from '../../src/lib/mappers.js';
import { fromPgError } from '../../src/lib/errors.js';

const ok = { name: 'Lê Hoà', email: 'hoa@mail.vn', message: 'Cho mình hỏi về chính sách đổi trả.' };

describe('contactSchema — form Liên hệ (AC-CON-01)', () => {
  it('AC-CON-01 điền mặc định, chuẩn hoá điện thoại và mã đơn', () => {
    expect(parse(contactSchema, { ...ok, phone: '0912 345 678', orderCode: ' tt1203 ' })).toEqual({ ...ok, phone: '0912345678', orderCode: 'TT1203', topic: 'other' });
    expect(parse(contactSchema, { ...ok, phone: '', orderCode: '' })).toMatchObject({ phone: '', orderCode: '' });
  });

  it.each([
    [{ name: ' ' }, 'Nhập họ tên.'],
    [{ email: 'hoa@mail' }, 'Email chưa đúng định dạng, ví dụ: ten@email.com'],
    [{ phone: '0912' }, 'Số điện thoại gồm 10 số, bắt đầu bằng 0.'],
    [{ message: 'x'.repeat(2001) }, 'Nội dung tối đa 2000 ký tự.'],
  ])('AC-CON-01 từ chối %j', (patch, msg) => {
    expect(() => parse(contactSchema, { ...ok, ...patch })).toThrow(msg);
  });

  it('AC-CON-01 lỗi RATE_LIMITED từ SQL → 429', () => {
    expect(fromPgError({ code: 'P0001', hint: 'RATE_LIMITED', message: 'x' }).status).toBe(429);
  });

  it('AC-CON-02 toContact trả DTO camelCase', () => {
    const d = new Date('2026-11-21T10:00:00Z');
    expect(toContact({ id: 'u', name: 'A B', email: 'a@b.vn', phone: null, topic: 'order', order_code: 'TT1100', message: 'm', status: 'new', user_id: null, created_at: d }))
      .toEqual({ id: 'u', name: 'A B', email: 'a@b.vn', phone: '', topic: 'order', orderCode: 'TT1100', message: 'm', status: 'new', userId: null, createdAt: '2026-11-21T10:00:00.000Z' });
  });
});
