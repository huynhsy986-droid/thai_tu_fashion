# 08 · Deploy production

**Người thực hiện:** TV3 – huynhsy986-droid · **Database:** Supabase `thai-tu-fashion-v1` (xem `07-supabase-production.md`)

```
Trình duyệt ──► Render (Node 22: Express API + frontend tĩnh) ──► Supabase Postgres (pooler 6543)
                                  └──────────────────────────────► Supabase Auth (đăng ký / đăng nhập)
```

## 1. Biến môi trường

| Biến | Giá trị | Bí mật? |
|---|---|---|
| `NODE_ENV` | `production` | |
| `AUTH_PROVIDER` | `supabase` | |
| `SUPABASE_URL` | `https://ceryulbobrlyxckrezts.supabase.co` | |
| `SUPABASE_ANON_KEY` | `sb_publishable_JSzQ9dv_Ug9kPvi3qlxr_g_rfHCFc8F` | công khai |
| `DATABASE_URL` | Dashboard → **Connect** → *Transaction pooler* (cổng 6543), thay `[YOUR-PASSWORD]` | **có** |
| `DATABASE_SSL` | `true` | |
| `TRUST_PROXY` | `1` | |
| `SUPABASE_JWT_SECRET` | bỏ trống (token ES256 xác minh qua JWKS; token HS256 xác minh qua `/auth/v1/user`) | có |
| `CORS_ORIGINS` | địa chỉ web, VD `https://thai-tu-fashion.onrender.com` | |
| `PUBLIC_URL` | địa chỉ web công khai, VD `https://thai-tu-fashion.onrender.com` — dùng làm link trong email đặt lại mật khẩu | |
| `LOG_FORMAT` | `json` — mỗi dòng log là JSON có `reqId`, xem ở Render → Logs | |
| `SENTRY_DSN` | DSN project **Node.js** trên sentry.io (tuỳ chọn) | có |
| `SENTRY_DSN_BROWSER` | DSN project **Browser JavaScript** (tuỳ chọn) | công khai |
| `GA_MEASUREMENT_ID` | Google Analytics 4 → Data stream Web → `G-XXXXXXXXXX` (tuỳ chọn) | công khai |

**Giám sát:** người dùng gặp lỗi 500 sẽ thấy mã tham chiếu (`requestId`); tìm mã đó trong Render Logs hoặc Sentry (tag `request_id`) để ra đúng request. Để trống 3 biến Sentry/GA thì tính năng tắt hoàn toàn, CSP không mở thêm domain nào.

### Supabase Auth: phiên đăng nhập & quên mật khẩu (AC-AUTH-06, AC-AUTH-07)

1. **Authentication → URL Configuration**: *Site URL* = `PUBLIC_URL`; thêm `PUBLIC_URL/` (và `http://localhost:4000/` khi thử local với Supabase) vào *Redirect URLs*. Thiếu bước này, link trong email sẽ trỏ sai trang.
2. **Authentication → Emails → SMTP Settings**: SMTP mặc định của Supabase chỉ gửi vài email/giờ và chỉ tới thành viên dự án. Dùng SMTP riêng với người gửi `support@thaitufashion.vn` (VD Resend, Brevo, Google Workspace).
3. **Templates → Reset Password**: đổi tiêu đề/nội dung sang tiếng Việt; giữ biến `{{ .ConfirmationURL }}`.
4. Phiên: access token 1 giờ, frontend tự gia hạn bằng refresh token (Supabase xoay vòng refresh token mỗi lần dùng). Đăng xuất gọi `/auth/v1/logout` để thu hồi refresh token.

## 1b. Deploy lên Vercel (song song với Render) — Issue #31

Cấu trúc (cấu hình ở **thư mục gốc repo**, file `vercel.json`):

- **Web tĩnh:** lúc build, `backend/scripts/copy-frontend.mjs dist` chép giao diện `frontend/` → `dist/`, Vercel phát `dist/` qua CDN kèm header bảo mật/CSP.
- **API:** `api/index.mjs` → `backend/index.js` (app Express) thành 1 Vercel Function, region `sin1` gần Supabase Singapore; `rewrites` đưa mọi `/api/*` vào hàm này.
- Đã kiểm tra bằng `vercel build` (CLI 66.6.0) + chạy thử chính hàm đã build.

> Lần thử đầu (Root Directory = `backend`, preset Express) chỉ API chạy, trang chủ báo `Cannot GET /` vì preset Express không phát thư mục `public/` sinh ra lúc build → đổi sang cấu hình này.

1. vercel.com → *Add New → Project* → Import `huynhsy986-droid/thai_tu_fashion`. **Root Directory: để trống (`./`)**, Application Preset: **Other**. Không bật override nào trong *Build and Output Settings* (lấy từ `vercel.json`).
   Dự án đã tạo trước đó: *Settings → Build and Deployment* → Framework Preset **Other**, Root Directory để trống → *Save* → *Deployments → Redeploy*.
2. *Environment Variables* (bảng dưới), rồi **Deploy**.
3. Supabase → Authentication → URL Configuration: Site URL + Redirect URLs = `https://<tên-dự-án>.vercel.app/**`.
4. Kiểm tra: `/` hiện trang chủ; `/api/health` → `{"ok":true,"db":"ok","authProvider":"supabase"}`.

| Biến | Giá trị |
|---|---|
| `NODE_ENV` | `production` |
| `AUTH_PROVIDER` | `supabase` |
| `SUPABASE_URL` | `https://ceryulbobrlyxckrezts.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_JSzQ9dv_Ug9kPvi3qlxr_g_rfHCFc8F` |
| `DATABASE_URL` | Supabase → **Connect → Transaction pooler** (cổng **6543**), thay `[YOUR-PASSWORD]` — **bí mật** |
| `DATABASE_SSL` | `true` |
| `DATABASE_POOL_MAX` | `2` (serverless: mỗi instance ít kết nối) |
| `TRUST_PROXY` | `1` |
| `LOG_FORMAT` | `json` |
| `PUBLIC_URL`, `CORS_ORIGINS` | `https://<tên-dự-án>.vercel.app` |
| `GA_MEASUREMENT_ID`, `SENTRY_DSN`, `SENTRY_DSN_BROWSER` | tuỳ chọn |

Lưu ý: dùng **Transaction pooler** (IPv4) chứ không dùng *Direct connection* (chỉ IPv6, Vercel không kết nối được). Rate-limit lưu trong bộ nhớ nên tính riêng từng instance. CSP trong `vercel.json` đã mở sẵn domain Supabase, Google Analytics, Sentry.

## 2. Deploy lên Render (khuyên dùng)

1. Render → **New → Blueprint** → chọn repo này (đọc `render.yaml`).
2. Điền `DATABASE_URL` và `CORS_ORIGINS` khi được hỏi → **Apply**. Render chạy `cd backend && npm ci --omit=dev` rồi `node src/server.js` (không dùng Docker), health check `/api/health`.
3. Supabase → Authentication → URL Configuration → *Site URL* = địa chỉ Render.
4. Kiểm tra:
   ```bash
   cd backend && node scripts/smoke.js https://<tên-app>.onrender.com
   # có tài khoản test: SMOKE_EMAIL=... SMOKE_PASSWORD=... node scripts/smoke.js <url>
   ```
5. Đăng ký tài khoản chủ shop trên web → cấp quyền admin (`npm run make-admin -- <email>` với `DATABASE_URL` production).

Nơi khác (Railway, VPS, máy chủ Windows/Linux): cài Node.js ≥ 20, chạy 2 lệnh build/start ở trên với các biến ở mục 1 (VPS nên chạy kèm `pm2` hoặc `systemd` để tự khởi động lại).

## 3. Chạy bản production ở máy (không cần Docker)

```bash
cd backend
npm ci --omit=dev
cp .env.production.example .env.production   # điền DATABASE_URL (mật khẩu DB), CORS_ORIGINS
node --env-file=.env.production src/server.js  # → http://localhost:4000
```

## 4. Đã kiểm chứng trước khi giao

| Hạng mục | Kết quả |
|---|---|
| Chạy như Render: clone sạch → `npm ci --omit=dev` → `node src/server.js` với `NODE_ENV=production` | khởi động, phục vụ frontend, smoke test đạt |
| DB trống kiểu production (migrations + `catalog.sql`, không tài khoản demo) | đăng ký → cấp admin → đăng nhập → giỏ → báo giá → dashboard: đạt |
| Production thiếu secret | backend từ chối khởi động với thông báo rõ ràng |
| Cache | ảnh 7 ngày; HTML/JS/CSS `no-cache` để bản deploy mới có hiệu lực ngay |
| CI GitHub Actions | seed · migrations · unit · integration · e2e · truy vết chạy mỗi lần push |
