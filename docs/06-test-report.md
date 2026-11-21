# 06 · Báo cáo kiểm thử & đánh giá hệ thống

**Người thực hiện:** TV3 – huynhsy986-droid (QA) · **Ngày:** 21/11/2026 · **Phiên bản:** v1.0 (`main`)

## 1. Môi trường

| Thành phần | Phiên bản |
|---|---|
| Node.js | 22.23 |
| Database | PostgreSQL 16.15 + shim Supabase (`supabase/local/00_supabase_shim.sql`: roles `anon/authenticated/service_role`, schema `auth`, `auth.uid()`) |
| Trình duyệt e2e | Google Chrome for Testing 153 (Playwright 1.48) |
| Test runner | Vitest 3.2 (unit, integration), Playwright Test (e2e) |

> **Supabase thật:** schema (4 migration) và dữ liệu thật đã được dựng trên project Supabase `thai-tu-fashion-v1` và đối chiếu md5 khớp 100% với repo; luồng đăng ký → giỏ → báo giá → đặt hàng → RLS đã chạy thử trực tiếp trên Supabase (xem `07-supabase-production.md`).
> Bộ test tự động chạy trên PostgreSQL 16 + shim Supabase (`supabase/local/00_supabase_shim.sql`) vì máy kiểm thử không truy cập mạng tới Supabase. Phần còn lại sau khi deploy: smoke test backend nối với Supabase thật (`backend/scripts/smoke.js`, mục 6).

## 2. Kết quả

| Tầng | Số test | Kết quả | Ghi chú |
|---|---|---|---|
| Unit (backend) | 60 | ✅ 60/60 | errors, validate, tokens, JWKS/ES256 + xác minh qua Supabase Auth, máy trạng thái, mappers, config, Supabase Auth provider (mock) |
| Integration (backend + Postgres thật) | 98 | ✅ 98/98 | mỗi file test clone 1 DB riêng từ template; gồm RLS trực tiếp, đặt hàng đồng thời, contract với OpenAPI |
| E2E (Chrome + backend + DB thật) | 20 | ✅ 20/20 | 19 desktop + 1 mobile (Pixel 7) |
| **Tổng** | **178** | ✅ | |

- **Độ ổn định:** e2e chạy liên tiếp 3 lần đều 20/20. Pipeline đầy đủ chạy lại trên **bản clone sạch** của repo (`npm ci` → seed → migrations → unit → integration → e2e → truy vết) cũng xanh.
- **Độ phủ backend:** 99,4% dòng · 90,6% nhánh · 100% hàm.
- **Truy vết:** 37 AC + 7 NFR = **44/44 mục có test** (`docs/traceability.md`, CI chặn khi có AC không có test).
- **Contract:** 57 operation trong `openapi.yaml` khớp 1-1 với route Express; bảng trạng thái đơn JS khớp SQL; mọi mã lỗi SQL có trong OpenAPI.
- **Hiệu năng:** `GET /api/catalog` (66 SP, 319 biến thể, 262 đánh giá) p95 < 300 ms (NFR-PERF-01).
- **Bảo mật:** RLS bật 18/18 bảng; anon không đọc được hồ sơ/đơn/coupon; khách không sửa được giá, không ghi đơn trực tiếp, không gọi được function nội bộ, không tự nâng quyền admin.

## 3. Lỗi phát hiện trong quá trình kiểm thử (đã sửa)

| ID | Mức | Phát hiện bởi | Mô tả | Cách sửa |
|---|---|---|---|---|
| D-01 | Trung bình | Integration `AC-ADM-01` | Danh sách "sắp hết hàng" của dashboard cắt ở 20 dòng nên mất các biến thể còn 1–2 | Migration mới `…0400_dashboard_low_stock.sql` (không sửa migration cũ): thêm `lowStockCount`, giới hạn 50 |
| D-02 | Trung bình | E2E `purchase` | Ô mã giảm giá bị xoá chữ khi giỏ được vẽ lại lúc dữ liệu server về | `sync.js` giữ giá trị ô đang gõ khi render lại |
| D-03 | Trung bình | E2E `stock` | Thông báo "Không đủ hàng" biến mất khi khung tổng tiền được báo giá lại | Lưu `ui.coStock`, chèn lại khi vẽ `coSummary` |
| D-04 | Thấp | Smoke test thủ công | Khách thường đăng nhập từ màn chặn admin bị đưa vào `#admin` | Không phải admin → chuyển về `#account` + thông báo |
| D-05 | Trung bình | E2E trên bản clone sạch | Điều hướng sau đăng nhập chạy sau khi người dùng đã chuyển trang khác (race) | Cờ `SYNC.authBusy`, hoàn tất đăng nhập trước khi điều hướng |
| D-06 | Thấp | E2E chạy lặp | Giỏ khách vãng lai có thể mất nếu tải lại trang trong 120 ms sau thao tác | Ghi ngay khi `pagehide` |
| D-07 | **Cao** | Review mã | Ảnh đánh giá chỉ kiểm tra tiền tố `data:image/…` nên có thể chèn thuộc tính HTML vào `<img src>` (XSS) | Server bắt buộc toàn chuỗi là base64 hợp lệ + test |
| D-08 | Trung bình | Review mã | `slots` của outfit nhận chuỗi tuỳ ý | Chỉ nhận mã `[a-z0-9-]` + test |
| D-09 | Trung bình | Review mã | Trình duyệt có thể dùng bản cache `/api/catalog` của khách cho admin | `Vary: Authorization` + test |
| D-10 | Thấp | Review UX | Dropdown trạng thái đơn cho chọn cả bước sai luồng (server từ chối nhưng UX kém) | Chỉ bật các bước trong `allowedNext` |
| D-11 | Trung bình | Chuẩn bị deploy | Dự án Supabase còn ký token bằng JWT secret cũ (HS256) mà backend không có secret thì không xác minh được người dùng | Xác minh qua Supabase Auth `GET /auth/v1/user` (cache 60 s) + test |
| D-12 | Thấp | E2E chạy lặp | Test tìm kiếm đọc lưới sản phẩm trước khi danh sách lọc vẽ lại (lỗi của test, không phải của hệ thống) | Đợi số kết quả đổi rồi mới đọc |

Không còn lỗi mở ở mức Cao/Trung bình.

## 4. Đánh giá theo PRD

| Nhóm | Kết luận |
|---|---|
| F1 Tài khoản & xác thực | ✅ Đăng ký/đăng nhập/đăng xuất, 401/403 đúng, chặn route trên UI |
| F2 Danh mục & sản phẩm | ✅ Tìm không dấu, lọc, sắp xếp, phân trang, SP ẩn → 404 |
| F3 Đánh giá | ✅ Nhãn "đã mua" do server tính; kiểm duyệt |
| F4 Giỏ & mã giảm giá | ✅ Giỏ trên server, gộp giỏ khách vãng lai; tiền do server tính; 5 tình huống mã sai |
| F5 Đặt hàng | ✅ Nguyên tử, không bán vượt kho khi đồng thời, huỷ hoàn kho, thanh toán online mô phỏng |
| F6 Yêu thích & thông báo | ✅ Trigger DB sinh thông báo giảm giá / có hàng, hiện ở UI (hỏi lại mỗi 60 s) |
| F7 Tài khoản cá nhân | ✅ Hồ sơ, số đo, outfit, thông báo, nhận tin |
| F8 Quản trị | ✅ Dashboard, sản phẩm, tồn kho, danh mục, đơn theo máy trạng thái, khách, đánh giá; coupon ở mức API (P1) |
| NFR | ✅ 7/7 có test tự động |

**Kết luận:** đạt Definition of Done (`00-team-workflow.md` §3). Hệ thống sẵn sàng cho môi trường staging trên Supabase.

## 5. Chạy lại

```bash
DATABASE_URL=postgres://postgres:postgres@localhost:5432/thaitu scripts/db-reset.sh
cd backend  && npm ci && npm test                  # 151 test
cd frontend && npm ci && npm run test:e2e          # 20 test
node scripts/trace.mjs --check                     # truy vết AC
```

## 6. Rủi ro còn lại & việc tiếp theo

| Hạng mục | Đề xuất |
|---|---|
| Backend chưa chạy nối Supabase thật (cần mật khẩu DB, chỉ chủ project lấy được) | Deploy theo `08-deployment.md`, chạy `node scripts/smoke.js <url>` với tài khoản test |
| Ảnh đánh giá lưu data URL trong DB (≤ 150 KB) | Chuyển sang bucket `review-images` (đã tạo trong migration 003) |
| Rate-limit lưu trong bộ nhớ (1 instance) | Dùng Redis/Upstash khi chạy nhiều instance |
| Thông báo dùng polling 60 s | Chuyển sang Supabase Realtime |
| Thanh toán, AI Stylist, Visual Search, Try-on là mô phỏng | Ngoài phạm vi v1 theo PRD |
| Chưa có giao diện quản lý coupon | API đã có (AC-ADM-08); thêm tab trong admin ở v1.1 |
