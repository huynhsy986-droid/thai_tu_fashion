# CLAUDE.md — Rule · Skill · Constraint cho AI coding agent

Dự án: **Thai Tu Fashion** — SPA thời trang (frontend/) + Express API (backend/) + Supabase (supabase/).
Đọc trước khi code: `docs/02-PRD.md` (AC), `docs/03-solution-architecture.md`, `docs/04-database-erd.md`, `docs/openapi.yaml`.

## Lệnh

| Việc | Lệnh |
|---|---|
| Tạo lại DB local (Postgres thường) | `DATABASE_URL=postgres://postgres:postgres@localhost:5432/thaitu scripts/db-reset.sh` |
| Sinh lại seed từ prototype | `node scripts/gen-seed.mjs` |
| Chạy API + frontend | `cd backend && npm start` → http://localhost:4000 |
| Unit test | `cd backend && npm run test:unit` |
| Integration test (cần Postgres) | `cd backend && npm run test:integration` |
| E2E | `cd frontend && npm run test:e2e` |
| Ma trận truy vết | `node scripts/trace.mjs` |

## Rules (quy tắc)

1. **Một nguồn sự thật cho tiền & kho:** mọi tính tiền/trừ kho/hoàn kho nằm trong SQL (`cart_quote`, `place_order`, `_transition_order`). Không tính lại ở JS.
2. **RLS là lớp phân quyền thật:** query của người dùng chạy qua `db.withUser(user, fn)` (SET LOCAL ROLE + JWT claims). Chỉ dùng `db.asOwner` cho việc hệ thống (auth local, health).
3. **Lỗi nghiệp vụ** trong SQL: `raise exception using errcode='P0001', hint='<CODE>'`; JS ném `HttpError(status, code, message)`. Không trả stack trace ra client.
4. **Validate input** bằng zod ở route; thông báo lỗi tiếng Việt, cụ thể như prototype.
5. **DTO giữ hình dạng prototype** (`pid`, `qty`, `sale`, `stock[color][size]`…) — xem `backend/src/lib/mappers.js`.
6. **Test ghi AC-ID** trong tên (`it('AC-ORD-02 …')`). Mỗi endpoint mới cần ít nhất 1 integration test.
7. **Cập nhật `docs/openapi.yaml`** khi thêm/sửa route — `contract.test.js` sẽ fail nếu thiếu.
8. Commit: `type(scope): mô tả` (feat, fix, test, docs, chore), tiếng Việt được.

## Constraints (ràng buộc)

- Không commit `.env`, key Supabase, mật khẩu thật.
- Không sửa giao diện/câu chữ prototype trừ khi PRD yêu cầu; thêm màn hình mới phải dùng class CSS sẵn có.
- Không sửa tay `supabase/seed.sql` (sinh bằng script). Thay đổi schema = migration mới, không sửa migration đã merge.
- Không chạy `supabase/local/*.sql` trên dự án Supabase thật.
- Frontend phải chạy được khi API tắt (chế độ demo).

## Skills

- `.claude/skills/add-api-endpoint/` — quy trình thêm endpoint.
- `.claude/skills/add-migration/` — quy trình thêm migration + seed + test.
