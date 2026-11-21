import { HttpError } from './errors.js';

/** Validate bằng zod; lỗi → 422 VALIDATION với message của field đầu tiên và danh sách details. */
export function parse(schema, data) {
  const r = schema.safeParse(data ?? {});
  if (r.success) return r.data;
  const details = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  throw new HttpError(422, 'VALIDATION', details[0]?.message || 'Dữ liệu không hợp lệ.', details);
}
