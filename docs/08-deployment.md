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
