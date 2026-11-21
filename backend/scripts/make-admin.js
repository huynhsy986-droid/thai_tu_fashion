#!/usr/bin/env node
/**
 * Cấp quyền quản trị cho một tài khoản ĐÃ ĐĂNG KÝ (qua trang #register hoặc Supabase Dashboard).
 *   npm run make-admin -- admin@cuahang.vn          (dùng DATABASE_URL trong .env)
 *   npm run make-admin -- admin@cuahang.vn --revoke  (thu hồi)
 */
import 'dotenv/config';
import pg from 'pg';

const [email, flag] = process.argv.slice(2);
if (!email) { console.error('Dùng: npm run make-admin -- <email> [--revoke]'); process.exit(1); }
const url = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;
if (!url) { console.error('Thiếu DATABASE_URL / SUPABASE_DB_URL'); process.exit(1); }
const role = flag === '--revoke' ? 'customer' : 'admin';
const client = new pg.Client({ connectionString: url, ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined });
await client.connect();
try {
  const { rows } = await client.query(
    `update public.profiles p set role = $2 from auth.users u
      where u.id = p.id and lower(u.email) = lower($1) returning p.id, u.email, p.role`,
    [email, role],
  );
  if (!rows.length) { console.error(`✗ Không có tài khoản ${email}. Hãy đăng ký trên trang web trước.`); process.exitCode = 1; }
  else console.log(`✓ ${rows[0].email} → ${rows[0].role}`);
} finally { await client.end(); }
