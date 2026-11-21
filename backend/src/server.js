import { loadConfig } from './config.js';
import { createDb } from './db/index.js';
import { createTokenService } from './auth/tokens.js';
import { createAuthProvider } from './auth/providers.js';
import { createApp } from './app.js';

const config = loadConfig();
const db = createDb(config);
const tokens = createTokenService(config);
const authProvider = createAuthProvider(config, db, tokens);
const app = createApp({ config, db, tokens, authProvider });

const server = app.listen(config.port, () => {
  console.log(`Thai Tu Fashion API · http://localhost:${config.port} · auth=${config.authProvider} · static=${config.staticDir || 'off'}`);
});

const shutdown = (sig) => {
  console.log(`${sig}: đang dừng…`);
  server.close(() => db.close().finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
