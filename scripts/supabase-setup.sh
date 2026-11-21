#!/usr/bin/env bash
# =====================================================================
# Đưa schema Thai Tu Fashion lên một dự án Supabase THẬT (không cần Docker/Supabase CLI).
#   SUPABASE_DB_URL="postgresql://postgres:<mật-khẩu>@db.<ref>.supabase.co:5432/postgres" \
#     scripts/supabase-setup.sh [--catalog] [--verify-only]
# - Chạy các file supabase/migrations/*.sql chưa áp dụng (ghi vào supabase_migrations.schema_migrations,
#   cùng bảng mà `supabase db push` dùng → có thể chuyển qua lại giữa script này và CLI).
# - --catalog : nạp dữ liệu thật ban đầu (supabase/catalog.sql: danh mục, sản phẩm, tồn kho; không có tài khoản demo).
# - Cuối cùng kiểm tra: đủ bảng, RLS bật, function nghiệp vụ, trigger auth.users.
# KHÔNG chạy supabase/local/* và supabase/seed.sql (dữ liệu demo) lên production.
# =====================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
URL="${SUPABASE_DB_URL:-${DATABASE_URL:-}}"
[ -n "$URL" ] || { echo "Thiếu SUPABASE_DB_URL"; exit 1; }
CATALOG=0; VERIFY_ONLY=0
for a in "$@"; do case "$a" in --catalog) CATALOG=1;; --verify-only) VERIFY_ONLY=1;; *) echo "Tham số lạ: $a"; exit 1;; esac; done
export PGOPTIONS="-c client_min_messages=warning"
PSQL=(psql "$URL" -v ON_ERROR_STOP=1 -q -X)

# Bảo vệ: phải là DB có schema auth (Supabase hoặc shim), và không phải DB đang chứa dữ liệu demo
"${PSQL[@]}" -At -c "select 1 from information_schema.schemata where schema_name = 'auth'" | grep -q 1 \
  || { echo "✗ Không thấy schema auth — đây không phải database Supabase."; exit 1; }

if [ "$VERIFY_ONLY" = 0 ]; then
  "${PSQL[@]}" -c "create schema if not exists supabase_migrations;
    create table if not exists supabase_migrations.schema_migrations (version text primary key, statements text[], name text);"
  for f in supabase/migrations/*.sql; do
    base=$(basename "$f" .sql); ver="${base%%_*}"; name="${base#*_}"
    if "${PSQL[@]}" -At -c "select 1 from supabase_migrations.schema_migrations where version = '$ver'" | grep -q 1; then
      echo "  · đã có  $base"
    else
      "${PSQL[@]}" -1 -f "$f" >/dev/null
      "${PSQL[@]}" -c "insert into supabase_migrations.schema_migrations (version, name) values ('$ver', '$name')"
      echo "  ✓ áp dụng $base"
    fi
  done
  if [ "$CATALOG" = 1 ]; then
    if [ "$("${PSQL[@]}" -At -c 'select count(*) from public.products')" != "0" ]; then
      echo "  · catalogue đã có dữ liệu — bỏ qua (không ghi đè tồn kho thật)"
    else
      "${PSQL[@]}" -f supabase/catalog.sql >/dev/null && echo "  ✓ nạp catalogue thật (supabase/catalog.sql)"
    fi
  fi
fi

echo "→ Kiểm tra"
"${PSQL[@]}" -At -F ' ' <<'SQL'
select '  bảng public           :', count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r';
select '  bảng CHƯA bật RLS     :', count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
select '  function nghiệp vụ    :', count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname in ('place_order','cart_quote','cancel_my_order','admin_set_order_status','admin_dashboard','subscribe_newsletter','is_admin');
select '  trigger auth.users    :', count(*) from pg_trigger where tgname = 'on_auth_user_created';
select '  sản phẩm / biến thể   :', (select count(*) from public.products) || ' / ' || (select count(*) from public.product_variants);
select '  tài khoản (profiles)  :', count(*) || ' (admin: ' || count(*) filter (where role = 'admin') || ')' from public.profiles;
SQL
bad=$("${PSQL[@]}" -At -c "select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity")
[ "$bad" = "0" ] || { echo "✗ Có bảng chưa bật RLS"; exit 1; }
echo "✓ Database sẵn sàng"
