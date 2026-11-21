import { describe, it, expect } from 'vitest';
import { toProduct, toOrder, toProfile, toReview, toNotification, toMeasurements, toCustomer, toCoupon } from '../../src/lib/mappers.js';

const now = new Date();
const row = {
  id: 'k01', name: 'Hoodie', kor_name: null, category_id: 'tops', sub_type: 'top', gender: 'unisex', template: 'hoodie', texture: 'fleece',
  price: 690000, sale_price: null, sizes: ['S', 'M'], colors: ['lav', 'black'], badge: 'best', fit: 'oversized', fabric: [3, 2, 1, 1],
  occasions: ['weekend'], styles: ['casual'], is_photo: false, status: 'active', sold_count: 10, likes_count: 5, description: 'd',
  material: 'm', care: 'c', base_image: 'k01', image_colors: ['lav'], created_at: new Date(now - 3 * 864e5 - 1000),
  rating_avg: '4.5', rating_count: 2, variants: [{ id: 7, color: 'lav', size: 'M', stock: 6 }],
};

describe('mappers — DTO giữ hình dạng prototype', () => {
  it('AC-CAT-01 toProduct: stock đủ mọi màu × size (thiếu = 0), variantId, rating, added', () => {
    const p = toProduct(row);
    expect(p.stock).toEqual({ lav: { S: 0, M: 6 }, black: { S: 0, M: 0 } });
    expect(p.variants.lav.M).toBe(7);
    expect(p.sale).toBe(0);
    expect(p.added).toBe(3);
    expect(p.rating).toEqual({ avg: 4.5, count: 2 });
    expect(p).toMatchObject({ cat: 'tops', tpl: 'hoodie', base: 'k01', baseColors: ['lav'], kor: '' });
  });

  it('toProduct bỏ qua biến thể của màu đã gỡ', () => {
    const p = toProduct({ ...row, variants: [{ id: 1, color: 'mint', size: 'S', stock: 3 }] });
    expect(p.stock.mint).toBeUndefined();
  });

  it('AC-ORD-04 toOrder: allowedNext + lịch sử có thời gian ms', () => {
    const o = toOrder({
      id: 'TT1', user_id: 'u', recipient_name: 'A', phone: '0900000000', address: 'x', note: null, shipping_method: 'std',
      payment_method: 'cod', payment_status: 'unpaid', items: [{ pid: 'k01', name: 'H', color: 'lav', size: 'M', qty: 1, price: 1 }],
      subtotal: 1, discount: 0, coupon_code: null, shipping_fee: 0, total: 1, status: 'pending', created_at: now,
      history: [{ from: null, to: 'pending', at: now.toISOString(), note: 'x' }],
    });
    expect(o.allowedNext).toEqual(['confirmed', 'cancelled']);
    expect(o.history[0].at).toBe(now.getTime());
    expect(o.coupon).toBe('');
    expect(o.note).toBe('');
  });

  it('toProfile định dạng ngày sinh YYYY-MM-DD', () => {
    expect(toProfile({ id: 'u', full_name: 'A', birthday: new Date(1998, 4, 14), role: 'customer' }).birthday).toBe('1998-05-14');
    expect(toProfile({ id: 'u', full_name: 'A', birthday: null, role: 'customer' }).birthday).toBe('');
  });

  it('toReview đánh dấu "mine", toNotification id dạng chuỗi', () => {
    const r = toReview({ id: 'r', product_id: 'k01', user_id: 'u1', display_name: 'A', rating: 5, body: 'x', created_at: now, verified: true, status: 'visible' }, 'u1');
    expect(r.mine).toBe(true);
    expect(r.daysAgo).toBe(0);
    expect(toNotification({ id: 5, type: 'info', title: 't', body: 'b', link: null, created_at: now, is_read: false }).id).toBe('5');
  });

  it('toMeasurements null-safe, toCustomer/toCoupon', () => {
    expect(toMeasurements(null)).toBeNull();
    expect(toMeasurements({ height_cm: 165, weight_kg: 54, chest_cm: 86, waist_cm: 68, hip_cm: 93, fit_pref: 'regular' })).toEqual({ height: 165, weight: 54, chest: 86, waist: 68, hip: 93, fit: 'regular' });
    expect(toCustomer({ id: 'c', full_name: 'A', created_at: new Date(now - 10 * 864e5), orders: 2, spent: 100 })).toMatchObject({ joined: 10, orders: 2, spent: 100 });
    expect(toCoupon({ code: 'X', type: 'pct', value: 10, min_subtotal: 0, label: 'l', active: true, expires_at: null, usage_limit: null, used_count: 0 }).expiresAt).toBeNull();
  });
});
