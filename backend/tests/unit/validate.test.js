import { describe, it, expect } from 'vitest';
import { parse } from '../../src/lib/validate.js';
import { placeOrderSchema } from '../../src/routes/orders.js';

const ok = { name: 'Nguyễn Minh Anh', phone: '0901 234 567', address: '24 Lý Tự Trọng, Quận 1, TP. HCM' };

describe('placeOrderSchema — kiểm tra đầu vào đặt hàng (AC-ORD-01)', () => {
  it('AC-ORD-01 chuẩn hoá số điện thoại và điền mặc định', () => {
    const v = parse(placeOrderSchema, ok);
    expect(v).toMatchObject({ phone: '0901234567', ship: 'std', pay: 'cod', note: '', paymentOk: true });
  });

  it.each([
    [{ name: 'A' }, 'Nhập họ tên người nhận.'],
    [{ phone: '901234567' }, 'Số điện thoại cần có 10 chữ số và bắt đầu bằng 0.'],
    [{ phone: '09012345678' }, 'Số điện thoại cần có 10 chữ số và bắt đầu bằng 0.'],
    [{ address: 'Q1 HCM' }, 'Nhập địa chỉ đầy đủ, gồm số nhà, đường và tỉnh/thành.'],
    [{ ship: 'drone' }, 'Phương thức giao hàng không hợp lệ.'],
    [{ pay: 'crypto' }, 'Phương thức thanh toán không hợp lệ.'],
  ])('AC-ORD-01 từ chối %j với thông báo tiếng Việt', (patch, msg) => {
    try {
      parse(placeOrderSchema, { ...ok, ...patch });
      throw new Error('should fail');
    } catch (e) {
      expect(e.status).toBe(422);
      expect(e.code).toBe('VALIDATION');
      expect(e.message).toBe(msg);
      expect(e.details[0].message).toBe(msg);
    }
  });

  it('body rỗng → 422', () => {
    expect(() => parse(placeOrderSchema, undefined)).toThrow(/họ tên/);
  });
});
