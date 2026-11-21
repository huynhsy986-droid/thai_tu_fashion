/**
 * Bản sao máy trạng thái đơn hàng để trả `allowedNext` cho UI.
 * Nguồn sự thật: SQL public.order_next_statuses() — contract test đảm bảo hai bên khớp (ADR-03).
 */
export const ORDER_STATUSES = Object.freeze(['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled']);

export const NEXT = Object.freeze({
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered'],
  delivered: [],
  cancelled: [],
});

export const STATUS_LABEL = Object.freeze({
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  delivered: 'Đã giao',
  cancelled: 'Đã huỷ',
});

export const nextStatuses = (s) => [...(NEXT[s] || [])];
export const canTransition = (from, to) => (NEXT[from] || []).includes(to);
export const isTerminal = (s) => (NEXT[s] || []).length === 0;
