// E2E: trình duyệt thật (Chrome) + backend thật + Postgres (schema Supabase) thật.
// DB riêng `thaitu_e2e` được tạo lại (migrations + seed) mỗi lần chạy, trước khi bật backend. Backend chạy ở cổng 4100 và phục vụ luôn frontend.
const { defineConfig, devices } = require('@playwright/test');

const PORT = Number(process.env.E2E_PORT || 4100);
const PG = (process.env.TEST_PG_URL || 'postgres://postgres:postgres@localhost:5432').replace(/\/$/, '');
// CHROME_PATH='' (CI) → dùng Chromium của Playwright; không đặt → dùng Chrome hệ thống nếu có
const chromePath = process.env.CHROME_PATH !== undefined ? process.env.CHROME_PATH || undefined : require('node:fs').existsSync('/usr/bin/google-chrome') ? '/usr/bin/google-chrome' : undefined;

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: { timeout: 8_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    locale: 'vi-VN',
    launchOptions: chromePath ? { executablePath: chromePath, args: ['--no-sandbox'] } : {},
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 860 } }, testIgnore: /mobile\.spec/ },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: /mobile\.spec/ },
  ],
  webServer: {
    // Playwright khởi động webServer trước globalSetup → tạo lại DB ngay trong lệnh này
    command: 'bash ../scripts/db-reset.sh > /dev/null && node ../backend/src/server.js',
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      NODE_ENV: 'test',
      PORT: String(PORT),
      DATABASE_URL: `${PG}/thaitu_e2e`,
      AUTH_PROVIDER: 'local',
      JWT_SECRET: 'e2e-secret-0123456789-abcdefghijklmnopqrstuvwxyz',
      RATE_LIMIT_AUTH: '1000',
      RATE_LIMIT_API: '100000',
      LOG_REQUESTS: 'false',
    },
  },
});
