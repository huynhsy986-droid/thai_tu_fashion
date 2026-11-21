import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config.js';

describe('loadConfig (NFR-SEC-02)', () => {
  it('mặc định local + secret dev khi không phải production', () => {
    const c = loadConfig({ NODE_ENV: 'development' });
    expect(c.authProvider).toBe('local');
    expect(c.jwtSecret.length).toBeGreaterThanOrEqual(32);
    expect(c.corsOrigins.length).toBeGreaterThan(0);
  });

  it('NFR-SEC-02 production + local mà thiếu JWT_SECRET → lỗi', () => {
    expect(() => loadConfig({ NODE_ENV: 'production', AUTH_PROVIDER: 'local' })).toThrow(/JWT_SECRET/);
  });

  it('JWT_SECRET quá ngắn → lỗi', () => {
    expect(() => loadConfig({ JWT_SECRET: 'short' })).toThrow(/32/);
  });

  it('supabase cần URL + anon key; JWT secret tuỳ chọn (JWKS)', () => {
    expect(() => loadConfig({ AUTH_PROVIDER: 'supabase' })).toThrow(/SUPABASE_URL/);
    const c = loadConfig({ AUTH_PROVIDER: 'supabase', SUPABASE_URL: 'https://x.supabase.co', SUPABASE_ANON_KEY: 'k' });
    expect(c.jwtSecret).toBeUndefined();
  });

  it('PORT không hợp lệ → lỗi', () => {
    expect(() => loadConfig({ PORT: 'abc' })).toThrow();
  });
});
