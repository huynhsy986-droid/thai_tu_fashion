import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DEV_SECRET = 'dev-only-secret-change-me-0123456789abcdef';

const schema = z.object({
  NODE_ENV: z.string().default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().default('postgres://postgres:postgres@localhost:5432/thaitu'),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().default(10),
  AUTH_PROVIDER: z.enum(['local', 'supabase']).default('local'),
  JWT_SECRET: z.string().optional(),
  JWT_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_JWT_SECRET: z.string().optional(),
  CORS_ORIGINS: z.string().default('http://localhost:4000,http://localhost:8080,http://127.0.0.1:4000'),
  STATIC_DIR: z.string().default(path.resolve(HERE, '../../frontend')),
  RATE_LIMIT_AUTH: z.coerce.number().int().positive().default(20),
  RATE_LIMIT_API: z.coerce.number().int().positive().default(600),
  RATE_LIMIT_CONTACT: z.coerce.number().int().positive().default(10),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  LOG_REQUESTS: z.enum(['true', 'false']).optional(),
});

/** NFR-SEC-02: secret chỉ đến từ biến môi trường. Đọc & kiểm tra cấu hình từ biến môi trường. Ném lỗi rõ ràng nếu thiếu cấu hình bắt buộc. */
export function loadConfig(env = process.env) {
  const e = schema.parse(env);
  const isProd = e.NODE_ENV === 'production';
  let jwtSecret;
  if (e.AUTH_PROVIDER === 'local') {
    jwtSecret = e.JWT_SECRET || (isProd ? undefined : DEV_SECRET);
    if (!jwtSecret) throw new Error('AUTH_PROVIDER=local cần JWT_SECRET khi chạy production.');
    if (jwtSecret.length < 32) throw new Error('JWT_SECRET cần ít nhất 32 ký tự.');
  } else {
    if (!e.SUPABASE_URL || !e.SUPABASE_ANON_KEY) throw new Error('AUTH_PROVIDER=supabase cần SUPABASE_URL và SUPABASE_ANON_KEY.');
    jwtSecret = e.SUPABASE_JWT_SECRET || undefined; // tuỳ chọn: token HS256 (legacy); ES256 luôn qua JWKS
  }
  return Object.freeze({
    env: e.NODE_ENV,
    isProd,
    isTest: e.NODE_ENV === 'test',
    port: e.PORT,
    databaseUrl: e.DATABASE_URL,
    databaseSsl: e.DATABASE_SSL === 'true',
    poolMax: e.DATABASE_POOL_MAX,
    authProvider: e.AUTH_PROVIDER,
    jwtSecret,
    jwtTtl: e.JWT_TTL_SECONDS,
    supabaseUrl: e.SUPABASE_URL,
    supabaseAnonKey: e.SUPABASE_ANON_KEY,
    corsOrigins: e.CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean),
    staticDir: e.STATIC_DIR,
    rateLimitAuth: e.RATE_LIMIT_AUTH,
    rateLimitApi: e.RATE_LIMIT_API,
    rateLimitContact: e.RATE_LIMIT_CONTACT,
    trustProxy: e.TRUST_PROXY,
    logRequests: e.LOG_REQUESTS ? e.LOG_REQUESTS === 'true' : e.NODE_ENV !== 'test',
  });
}
