# Thai Tu Fashion · Backend API

Express 5 + Supabase (Postgres, Auth). Chủ sở hữu: **TV2 – nguyen06-vn**.
Kiến trúc: `../docs/03-solution-architecture.md` · API: `../docs/05-api-docs.md`, `../docs/openapi.yaml`.

## Chạy nhanh (Postgres local, không cần Docker)

```bash
# 1. DB: shim Supabase → migrations → seed
DATABASE_URL=postgres://postgres:postgres@localhost:5432/thaitu ../scripts/db-reset.sh
# 2. API + frontend tĩnh ở http://localhost:4000
cp .env.example .env && npm install && npm start
```

## Chạy với Supabase Cloud (không cần Docker)

```bash
# .env: AUTH_PROVIDER=supabase, SUPABASE_URL, SUPABASE_ANON_KEY,
#       DATABASE_URL=<Supabase → Connect → Session pooler>, DATABASE_SSL=true
npm start
```
Dự án Supabase mới: `SUPABASE_DB_URL=... ../scripts/supabase-setup.sh --catalog` để chạy migrations + nạp dữ liệu thật.

## Cấu trúc

```
src/
  app.js            createApp(): middleware, routes, static, error handler
  server.js         khởi động + graceful shutdown
  config.js         đọc env bằng zod
  db/index.js       withUser() = SET LOCAL ROLE + JWT claims → RLS; asOwner()
  auth/             tokens (jose HS256/JWKS), providers (local | supabase), middleware
  domain/           orderStatus (bản sao máy trạng thái cho UI)
  lib/              errors (P0001+hint → HTTP), validate (zod), mappers (DTO), queries
  routes/           auth, catalog, cart, orders, wishlist, me, admin/*
tests/
  unit/             errors, validate, tokens, orderStatus, mappers, config, providers
  integration/      auth, catalog, cart, orders, wishlist, account, admin, rls, contract, security
  helpers/          template DB + clone riêng cho từng file test
```

## Test

| Lệnh | Nội dung |
|---|---|
| `npm run test:unit` | 60 unit test, không cần DB |
| `npm run test:integration` | 98 test trên Postgres thật (tự tạo DB mẫu `thaitu_test_tpl`, mỗi file clone 1 DB) |
| `npm test` | tất cả |
| `npm run test:coverage` | độ phủ (≈99% dòng) |

Biến `TEST_PG_URL` (mặc định `postgres://postgres:postgres@localhost:5432`) trỏ tới máy chủ Postgres dùng cho test.

## Production (Supabase Cloud)

| Việc | Lệnh / tài liệu |
|---|---|
| Biến môi trường | `.env.production.example` · `../docs/08-deployment.md` |
| Đưa schema + dữ liệu thật lên dự án mới | `SUPABASE_DB_URL=... ../scripts/supabase-setup.sh --catalog` |
| Cấp / thu hồi admin | `npm run make-admin -- <email> [--revoke]` |
| Smoke test sau deploy | `node scripts/smoke.js https://<địa-chỉ>` |
