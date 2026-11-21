#!/usr/bin/env bash
# Tạo lại DB local (Postgres thường, không cần Docker/Supabase CLI):
#   shim Supabase → migrations → local auth helpers → seed
# Dùng: DATABASE_URL=postgres://postgres:postgres@localhost:5432/thaitu scripts/db-reset.sh
# Với Supabase thật: dùng `supabase db reset` (tự chạy migrations + seed, không cần shim).
set -euo pipefail
cd "$(dirname "$0")/.."
URL="${DATABASE_URL:-postgres://postgres:postgres@localhost:5432/thaitu}"
DB="${URL##*/}"; DB="${DB%%\?*}"
ADMIN_URL="${URL%/*}/postgres"
PGOPTIONS="-c client_min_messages=warning" psql "$ADMIN_URL" -v ON_ERROR_STOP=1 -q -c "drop database if exists \"$DB\" with (force);" -c "create database \"$DB\";"
run() { PGOPTIONS="-c client_min_messages=warning" psql "$URL" -v ON_ERROR_STOP=1 -q -f "$1" >/dev/null; echo "  ✓ $1"; }
echo "→ $DB"
run supabase/local/00_supabase_shim.sql
for f in supabase/migrations/*.sql; do run "$f"; done
run supabase/local/01_local_auth.sql
run supabase/seed.sql
