import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    env: { NODE_ENV: 'test' },
    coverage: { provider: 'v8', include: ['src/**'], exclude: ['src/server.js'], reporter: ['text-summary', 'json-summary'] },
    projects: [
      { extends: true, test: { name: 'unit', include: ['tests/unit/**/*.test.js'] } },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['tests/integration/**/*.test.js'],
          globalSetup: ['tests/helpers/global-setup.js'],
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
