/** Lỗi HTTP có mã nghiệp vụ, trả về client dạng { error: { code, message, details } }. */
export class HttpError extends Error {
  constructor(status, code, message, details) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/** Mã lỗi trong HINT của function SQL → HTTP status (ADR-07). */
export const HINT_STATUS = Object.freeze({
  AUTH_REQUIRED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  OUT_OF_STOCK: 409,
  CONFLICT: 409,
  VALIDATION: 422,
  CART_EMPTY: 422,
  COUPON_INVALID: 422,
  INVALID_TRANSITION: 422,
  PAYMENT_FAILED: 402,
  RATE_LIMITED: 429,
});

function parseDetail(detail) {
  if (!detail) return undefined;
  try {
    return JSON.parse(detail);
  } catch {
    return detail;
  }
}

/** Chuyển lỗi Postgres thành HttpError; trả null nếu không nhận diện được. */
export function fromPgError(err) {
  if (!err || err instanceof HttpError) return err || null;
  switch (err.code) {
    case 'P0001':
      if (err.hint && HINT_STATUS[err.hint]) return new HttpError(HINT_STATUS[err.hint], err.hint, err.message, parseDetail(err.detail));
      return new HttpError(422, 'VALIDATION', err.message);
    case '23505':
      return new HttpError(409, 'CONFLICT', 'Dữ liệu đã tồn tại.');
    case '23503':
      return new HttpError(409, 'CONFLICT', 'Dữ liệu đang được sử dụng hoặc tham chiếu không tồn tại.');
    case '23514':
    case '22P02':
    case '22003':
    case '22007':
    case '22008':
      return new HttpError(422, 'VALIDATION', 'Dữ liệu không hợp lệ.');
    case '42501':
      return new HttpError(403, 'FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này.');
    default:
      return null;
  }
}

export function notFoundHandler(req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Không có API ${req.method} ${req.path}.` } });
}

/** Middleware lỗi cuối cùng của Express. */
export function errorHandler(logger = console, monitor = { captureException() {} }) {
  // eslint-disable-next-line no-unused-vars
  return (err, req, res, next) => {
    if (err?.type === 'entity.parse.failed') {
      return res.status(400).json({ error: { code: 'VALIDATION', message: 'Body JSON không hợp lệ.' } });
    }
    if (err?.type === 'entity.too.large') {
      return res.status(413).json({ error: { code: 'VALIDATION', message: 'Dữ liệu gửi lên quá lớn.' } });
    }
    const e = fromPgError(err);
    if (e) {
      const body = { error: { code: e.code, message: e.message } };
      if (e.details !== undefined) body.error.details = e.details;
      return res.status(e.status).json(body);
    }
    const ctx = { reqId: req.id, userId: req.user?.id, method: req.method, path: req.originalUrl?.split('?')[0] };
    logger.error('unhandled error', { ...ctx, err });
    monitor.captureException(err, ctx);
    // Không lộ stack trace; trả mã tham chiếu để người dùng báo lại
    return res.status(500).json({ error: { code: 'INTERNAL', message: 'Có lỗi xảy ra, vui lòng thử lại sau.', requestId: req.id } });
  };
}
