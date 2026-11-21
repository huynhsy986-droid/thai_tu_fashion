import pg from 'pg';

// bigint/count → number, numeric → number (giá trị trong hệ thống nhỏ hơn 2^53)
pg.types.setTypeParser(20, (v) => Number.parseInt(v, 10));
pg.types.setTypeParser(1700, (v) => Number.parseFloat(v));

const ROLES = new Set(['anon', 'authenticated']);

/**
 * Lớp DB. Mỗi request chạy trong 1 transaction, với role + JWT claims như PostgREST,
 * để Row Level Security của Supabase áp dụng y hệt (ADR-01).
 */
export function createDb(config) {
  const pool = new pg.Pool({
    connectionString: config.databaseUrl,
    ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
    max: config.poolMax,
    idleTimeoutMillis: 30_000,
  });

  async function tx(fn, role, claims) {
    const client = await pool.connect();
    try {
      await client.query('begin');
      if (role) {
        if (!ROLES.has(role)) throw new Error(`role không hợp lệ: ${role}`);
        await client.query(`set local role ${role}`);
        await client.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(claims)]);
      }
      const result = await fn(client);
      await client.query('commit');
      return result;
    } catch (err) {
      await client.query('rollback').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  }

  return {
    pool,
    /** Chạy dưới quyền người dùng (authenticated) hoặc khách vãng lai (anon) — RLS áp dụng. */
    withUser(user, fn) {
      if (user) return tx(fn, 'authenticated', { sub: user.id, email: user.email, role: 'authenticated', aud: 'authenticated' });
      return tx(fn, 'anon', { role: 'anon' });
    },
    /** Chạy với quyền của role đăng nhập DB (chỉ cho tác vụ hệ thống). */
    asOwner(fn) {
      return tx(fn, null, null);
    },
    close: () => pool.end(),
  };
}
