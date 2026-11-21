/**
 * Điểm vào cho Vercel (Issue #31). Vercel tìm file `index.js` ở thư mục gốc dự án (Root Directory = backend),
 * file phải import `express` và export default app; toàn bộ app chạy thành 1 Vercel Function.
 * - Giao diện được Vercel phát từ `public/` qua CDN (express.static bị bỏ qua trên Vercel) — xem scripts/copy-frontend.mjs.
 * - Local/Render vẫn chạy `node src/server.js` như cũ.
 */
import express from 'express';
import { loadConfig } from './src/config.js';
import { createDb } from './src/db/index.js';
import { createTokenService } from './src/auth/tokens.js';
import { createAuthProvider } from './src/auth/providers.js';
import { createApp } from './src/app.js';
import { createLogger } from './src/lib/logger.js';
import { createMonitor } from './src/lib/monitoring.js';

const config = loadConfig({ ...process.env, STATIC_DIR: '' });
const logger = createLogger({ level: config.logLevel, format: config.logFormat });
const monitor = await createMonitor(config, logger);
const db = createDb(config);
const tokens = createTokenService(config);
const authProvider = createAuthProvider(config, db, tokens);

const app = express();
app.disable('x-powered-by');
app.use(createApp({ config, db, tokens, authProvider, logger, monitor }));

export default app;
