---
name: add-api-endpoint
description: Thêm một endpoint REST mới cho backend Thai Tu Fashion theo đúng quy ước (zod, withUser/RLS, DTO, OpenAPI, test có AC-ID).
---
# Thêm endpoint API

1. Xác định AC trong `docs/02-PRD.md` mà endpoint phục vụ.
2. Khai báo path trong `docs/openapi.yaml` (request, response, lỗi).
3. Viết route trong `backend/src/routes/<nhóm>.js`:
   - schema zod cho body/query (`parse(schema, req.body)`);
   - `requireAuth` / `requireAdmin` nếu cần;
   - truy vấn trong `req.db(async (c) => …)` để RLS áp dụng;
   - map kết quả qua `lib/mappers.js`.
4. Logic tiền/kho/trạng thái → viết function SQL (xem skill add-migration), route chỉ gọi.
5. Viết integration test `backend/tests/integration/<nhóm>.test.js`, tên test bắt đầu bằng AC-ID; thêm unit test nếu có logic thuần.
6. `npm test` xanh, `node scripts/trace.mjs` để cập nhật truy vết.
