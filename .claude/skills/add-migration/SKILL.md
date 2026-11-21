---
name: add-migration
description: Thêm thay đổi schema/function Supabase cho Thai Tu Fashion: migration mới, RLS, grant, seed, kiểm thử trên Postgres local.
---
# Thêm migration Supabase

1. Tạo file `supabase/migrations/<YYYYMMDDHHMMSS>_<ten>.sql` (không sửa file cũ).
2. Bảng mới: `enable row level security` + policy + `grant` cho `authenticated`/`anon` đúng ma trận RLS trong `docs/04-database-erd.md`.
3. Function nghiệp vụ: `security definer set search_path = public`, kiểm tra `auth.uid()`/`is_admin()`, lỗi dùng `errcode 'P0001'` + `hint`. `grant execute` cho role cần thiết.
4. Cần dữ liệu mẫu → sửa `scripts/gen-seed.mjs`, chạy `node scripts/gen-seed.mjs`.
5. `scripts/db-reset.sh` phải chạy sạch; thêm integration test; cập nhật ERD.
6. Production: `supabase db push`.
