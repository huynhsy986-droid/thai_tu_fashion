/**
 * Tạo DB mẫu (template) một lần cho cả lượt chạy integration:
 * shim Supabase → migrations → local auth → seed. Mỗi file test sẽ clone DB này.
 */
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMPLATE_DB, baseUrl } from './env.js';

export default function setup() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
  execFileSync('bash', [path.join(root, 'scripts/db-reset.sh')], {
    env: { ...process.env, DATABASE_URL: `${baseUrl()}/${TEMPLATE_DB}` },
    stdio: ['ignore', 'ignore', 'inherit'],
  });
}
