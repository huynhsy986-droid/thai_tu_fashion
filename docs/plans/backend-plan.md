# Plan · Backend (Step 3) — đầu vào ② PRD + ③ Architecture + ④ ERD + ⑤ API Docs

**Người viết:** TV2 – nguyen06-vn · **Review:** TV1 (đối chiếu AC), TV3 (hợp đồng API)

Mỗi phase chỉ "xong" khi 100% checklist đạt và test của phase xanh.

## Phase 0 · Init
- [ ] Khung `backend/` (Node 22, ESM, Express 5), `package.json` scripts: `start`, `dev`, `test`, `test:unit`, `test:integration`
- [ ] `src/config.js` đọc env bằng zod (`DATABASE_URL`, `AUTH_PROVIDER`, `JWT_SECRET`, `SUPABASE_*`, `CORS_ORIGINS`, `STATIC_DIR`)
- [ ] `.env.example`, `scripts/db-reset.sh` cho Postgres local
- [ ] `GET /api/health`

## Phase 1 · Nền tảng
- [ ] `db/index.js`: `pool`, `withUser(user, fn)` (SET LOCAL ROLE + claims), `asOwner(fn)`
- [ ] `lib/errors.js`: `HttpError`, map lỗi Postgres (`P0001`+hint, `23505`, `23503`, `23514`) → HTTP
- [ ] `lib/validate.js` (zod → 422 với `details` theo field)
- [ ] `auth/tokens.js` (jose: ký HS256, xác minh HS256/JWKS), `auth/providers.js` (local, supabase), `auth/middleware.js`
- [ ] Unit test: errors, validate, tokens, orderStatus, mappers

## Phase 2 · API khách hàng
- [ ] Auth: register / login / logout / me — AC-AUTH-01..03, 05
- [ ] Catalog: catalog, categories, colors, shipping, products (lọc/tìm/sort/trang), product detail — AC-CAT-01..04
- [ ] Reviews: list, create (verified do DB) — AC-REV-01/02
- [ ] Cart: get, add, patch, delete, clear, quote — AC-CART-01..04
- [ ] Orders: place, list, detail+history, cancel — AC-ORD-01..06
- [ ] Wishlist, restock toggle — AC-WISH-01..03
- [ ] Me: profile, measurements, outfits, notifications, newsletter — AC-ACC-01..05

## Phase 3 · API quản trị
- [ ] `requireAdmin` + RLS `is_admin()` — AC-AUTH-04
- [ ] Dashboard, products CRUD + stock, categories, orders + status, customers, reviews, coupons — AC-ADM-01..08

## Phase 4 · Chất lượng
- [ ] Integration test với Postgres thật cho mọi nhóm route (DB được reset trước mỗi lần chạy)
- [ ] Test đồng thời: 2 đơn tranh món cuối — AC-ORD-03
- [ ] Contract test: route Express ⇔ `openapi.yaml`; bảng trạng thái JS ⇔ SQL
- [ ] RLS test trực tiếp bằng SQL (anon/khách/admin)
- [ ] Helmet, CORS, rate-limit, giới hạn body
- [ ] Phục vụ `frontend/` tĩnh để chạy 1 lệnh

## Rủi ro & cách xử lý
| Rủi ro | Xử lý |
|---|---|
| Không có Docker để chạy `supabase start` trong CI | Shim `supabase/local/00_supabase_shim.sql` tái tạo `auth` schema + roles; migrations chạy y nguyên |
| Token Supabase dự án mới dùng khoá bất đối xứng | Xác minh bằng JWKS khi không cấu hình `SUPABASE_JWT_SECRET` |
| Deadlock khi nhiều đơn cùng lúc | Khoá biến thể theo thứ tự `id` |

---

## Review plan

**TV1 – lequangkhanh6002-pixel (PO/BA):** ✅ Duyệt.
- Đã đối chiếu: mỗi AC của F1–F8 có ít nhất một hạng mục trong plan.
- Yêu cầu thêm: AC-ORD-06 (thanh toán online thất bại không tạo đơn) phải có test riêng → *đã thêm vào Phase 2/4 (`paymentOk=false` → 402)*.
- Yêu cầu thêm: thông báo lỗi giữ đúng câu chữ prototype (số điện thoại, địa chỉ, mã giảm giá) → *đưa vào Rule 4 trong CLAUDE.md*.

**TV3 – huynhsy986-droid (Frontend):** ✅ Duyệt có điều kiện.
- DTO phải giữ hình dạng `S.products`/`S.orders` để không phải sửa code render → *đồng ý, thêm `lib/mappers.js` + unit test*.
- Cần `variants[color][size] → variantId` trong Product DTO để gọi PATCH/DELETE giỏ → *đã thêm vào schema `Product`*.
- Cần `GET /api/catalog` gom một lần cho SPA khởi động nhanh → *đã thêm*.
- Order DTO cần `allowedNext` để dropdown trạng thái admin chỉ hiện bước hợp lệ → *đã thêm*.
