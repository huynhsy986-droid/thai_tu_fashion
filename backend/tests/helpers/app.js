/**
 * Dựng app thật trên một DB riêng (clone từ template) cho mỗi file test → các file chạy song song không ảnh hưởng nhau.
 */
import pg from 'pg';
import request from 'supertest';
import { loadConfig } from '../../src/config.js';
import { createDb } from '../../src/db/index.js';
import { createTokenService } from '../../src/auth/tokens.js';
import { createAuthProvider } from '../../src/auth/providers.js';
import { createApp } from '../../src/app.js';
import { TEMPLATE_DB, baseUrl, JWT_SECRET } from './env.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function cloneDb(name) {
  const admin = new pg.Client({ connectionString: `${baseUrl()}/postgres` });
  await admin.connect();
  try {
    await admin.query(`drop database if exists "${name}" with (force)`);
    for (let i = 0; ; i += 1) {
      try {
        await admin.query(`create database "${name}" template "${TEMPLATE_DB}"`);
        return;
      } catch (e) {
        if (i > 40 || !/being accessed/.test(e.message)) throw e;
        await sleep(150 + Math.random() * 200); // file khác đang clone cùng template
      }
    }
  } finally {
    await admin.end();
  }
}

async function dropDb(name) {
  const admin = new pg.Client({ connectionString: `${baseUrl()}/postgres` });
  await admin.connect();
  await admin.query(`drop database if exists "${name}" with (force)`).catch(() => {});
  await admin.end();
}

export async function makeTestApp(label, envOverrides = {}) {
  const dbName = `thaitu_t_${label}_${process.pid}_${Math.floor(Math.random() * 1e6)}`.toLowerCase();
  await cloneDb(dbName);
  const config = loadConfig({
    NODE_ENV: 'test',
    DATABASE_URL: `${baseUrl()}/${dbName}`,
    AUTH_PROVIDER: 'local',
    JWT_SECRET,
    RATE_LIMIT_AUTH: '1000',
    RATE_LIMIT_API: '100000',
    STATIC_DIR: '',
    ...envOverrides,
  });
  const db = createDb(config);
  const tokens = createTokenService(config);
  const authProvider = createAuthProvider(config, db, tokens);
  const silent = { log() {}, error() {}, warn() {} };
  const app = createApp({ config, db, tokens, authProvider, logger: silent });
  const api = () => request(app);

  const login = async ({ email, password }) => {
    const res = await api().post('/api/auth/login').send({ email, password });
    if (res.status !== 200) throw new Error(`login failed ${res.status} ${JSON.stringify(res.body)}`);
    return res.body.accessToken;
  };
  /** Khách mới tinh (tránh đụng dữ liệu của khách demo). */
  let n = 0;
  const newCustomer = async (name = 'Khách Test') => {
    n += 1;
    const email = `t${n}.${Math.floor(Math.random() * 1e9)}@test.thaitu.vn`;
    const res = await api().post('/api/auth/register').send({ email, password: 'Matkhau123', fullName: name });
    if (res.status !== 201) throw new Error(`register failed ${res.status} ${JSON.stringify(res.body)}`);
    return { token: res.body.accessToken, user: res.body.user, email };
  };
  const sql = (text, params) => db.asOwner((c) => c.query(text, params));

  return {
    app,
    api,
    db,
    sql,
    login,
    newCustomer,
    tokens,
    config,
    async close() {
      await db.close();
      await dropDb(dbName);
    },
  };
}

export const bearer = (t) => ({ Authorization: `Bearer ${t}` });
