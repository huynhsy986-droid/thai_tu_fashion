# 07 · Supabase production — biên bản dựng database thật

**Người thực hiện:** TV2 – nguyen06-vn · **Ngày:** 21/11/2026

## 1. Dự án

| | |
|---|---|
| Tổ chức | Thai Tu (gói Free) |
| Project | `thai-tu-fashion-v1` · ref `ceryulbobrlyxckrezts` |
| Region | `ap-southeast-1` (Singapore) |
| Postgres | 17.12 |
| API URL | `https://ceryulbobrlyxckrezts.supabase.co` |
| Publishable key | `sb_publishable_JSzQ9dv_Ug9kPvi3qlxr_g_rfHCFc8F` (khoá công khai, an toàn khi đưa vào cấu hình) |

> Project cũ "thai-tu-fashion Project" có schema khác hệ thống nên **không dùng và không chỉnh sửa**.
> Mật khẩu database và service role key **không** nằm trong repo: lấy ở Dashboard, chỉ đặt vào biến môi trường nơi deploy.

## 2. Đã áp dụng

| Bước | Nội dung | Kết quả |
|---|---|---|
| Migration 001–004 | `supabase/migrations/*.sql` (version trong `supabase_migrations.schema_migrations` khớp tên file → `supabase db push` / `scripts/supabase-setup.sh` coi là đã chạy) | ✅ |
| Dữ liệu thật | Nội dung `supabase/catalog.sql`: 7 danh mục, 23 màu, 2 cách giao hàng, 3 mã giảm giá, 66 sản phẩm, 319 biến thể (tồn kho 2.949) | ✅ |
| Dữ liệu demo | **Không nạp** (`seed.sql` chỉ dùng cho local) | — |

## 3. Kiểm chứng

**Schema khớp repo 100%** — so md5 giữa Postgres local (chạy đúng các migration) và Supabase:

| Thành phần | md5 (local = Supabase) |
|---|---|
| Function `public` | `9f187f2e1b1505fe8c485409aa450647` |
| Policy RLS | `194a75af4d1f0768dd0afa047cee1ede` |
| Cột các bảng | `71eedf360cb10d19847c9f0368adf7fa` |
| Sản phẩm | `3833262bb4e1033535f8cc3c5a1b2c31` |
| Biến thể + tồn kho | `4d31d9ddda8d55d18391284fd926eac4` |
| Danh mục, màu, giao hàng, coupon | `e2b0fe9e97e5fb4570a268dd4d97b2fd` |

**Chạy thử luồng thật trên Supabase** (trong 1 transaction rồi hoàn tác, DB vẫn sạch):

| Kiểm tra | Kết quả |
|---|---|
| Tạo user trong `auth.users` → trigger tạo `profiles` | 1 hồ sơ |
| `anon` đọc sản phẩm / đọc coupon | 66 / bị từ chối (`insufficient_privilege`) |
| Khách: giỏ 2 × k11 → `cart_quote('std','THAITU10')` | 1.380.000 − 138.000 + 30.000 = **1.272.000₫** |
| `place_order` | đơn `TT1100`, tồn kho 6 → 4, 1 thông báo |
| Khách xem coupon / gọi `admin_dashboard()` | 0 dòng / "Chỉ quản trị viên được thực hiện." |
| RLS | 18/18 bảng bật, trigger `on_auth_user_created` có mặt |

**Security Advisor:** 12 cảnh báo "SECURITY DEFINER function executable". Đã rà: `place_order`, `cart_quote`, `cancel_my_order`, `admin_*`, `subscribe_newsletter`, `is_admin` là RPC có chủ đích và tự kiểm tra `auth.uid()` / `is_admin()` bên trong; các hàm `tg_*` là trigger function, gọi trực tiếp qua RPC sẽ bị Postgres từ chối. Không cần thay đổi.

## 4. Việc cần làm trên Dashboard (cần quyền chủ project)

1. **Authentication → URL Configuration:** đặt *Site URL* = địa chỉ web sau khi deploy (VD `https://thai-tu-fashion.onrender.com`) để link xác nhận email trỏ đúng.
2. **Authentication → Providers → Email:** mặc định bật *Confirm email* — khách đăng ký phải bấm link trong email rồi mới đăng nhập (giao diện đã báo việc này). Email mặc định của Supabase giới hạn vài email/giờ; khi chạy thật nên cấu hình SMTP riêng.
3. **Project Settings → Database:** *Reset database password* → dùng cho `DATABASE_URL` của backend (xem `08-deployment.md`).
4. **Tạo admin:** đăng ký tài khoản trên trang web → `cd backend && DATABASE_URL=... npm run make-admin -- <email>`
   (hoặc SQL Editor: `update public.profiles set role = 'admin' where email = '<email>';`).
5. Gói Free tự tạm dừng project sau 7 ngày không có truy cập — bật lại trong Dashboard nếu bị dừng.

## 5. Dựng lại / dự án mới

```bash
SUPABASE_DB_URL="postgresql://postgres:<mật-khẩu>@db.<ref>.supabase.co:5432/postgres" scripts/supabase-setup.sh --catalog
```
Script chạy các migration chưa áp dụng, nạp `catalog.sql` nếu bảng sản phẩm trống, rồi kiểm tra RLS/function/trigger.
