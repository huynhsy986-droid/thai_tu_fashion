import { describe, it, expect } from 'vitest';
import { NEXT, ORDER_STATUSES, canTransition, nextStatuses, isTerminal, STATUS_LABEL } from '../../src/domain/orderStatus.js';

describe('máy trạng thái đơn hàng (AC-ADM-05)', () => {
  it('AC-ADM-05 luồng chính pending → confirmed → processing → shipping → delivered', () => {
    const flow = ['pending', 'confirmed', 'processing', 'shipping', 'delivered'];
    for (let i = 0; i < flow.length - 1; i += 1) expect(canTransition(flow[i], flow[i + 1])).toBe(true);
  });

  it('AC-ADM-05 được huỷ từ pending/confirmed/processing, không huỷ khi đang giao', () => {
    expect(['pending', 'confirmed', 'processing'].every((s) => canTransition(s, 'cancelled'))).toBe(true);
    expect(canTransition('shipping', 'cancelled')).toBe(false);
  });

  it('AC-ADM-05 delivered/cancelled là trạng thái cuối, không đi lùi', () => {
    expect(isTerminal('delivered')).toBe(true);
    expect(isTerminal('cancelled')).toBe(true);
    expect(canTransition('delivered', 'pending')).toBe(false);
    expect(canTransition('shipping', 'confirmed')).toBe(false);
  });

  it('đủ nhãn tiếng Việt cho mọi trạng thái; nextStatuses trả bản sao', () => {
    expect(Object.keys(NEXT).sort()).toEqual([...ORDER_STATUSES].sort());
    ORDER_STATUSES.forEach((s) => expect(STATUS_LABEL[s]).toBeTruthy());
    const a = nextStatuses('pending');
    a.push('x');
    expect(nextStatuses('pending')).toEqual(['confirmed', 'cancelled']);
    expect(nextStatuses('unknown')).toEqual([]);
  });
});
