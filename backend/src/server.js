import { loadConfig } from './config.js';
import { createDb } from './db/index.js';
import { createTokenService } from './auth/tokens.js';
import { createAuthProvider } from './auth/providers.js';
import { createApp } from './app.js';
import { createLogger } from './lib/logger.js';
import { createMonitor } from './lib/monitoring.js';

const config = loadConfig();
const logger = createLogger({ level: config.logLevel, format: config.logFormat });
const monitor = await createMonitor(config, logger);
const db = createDb(config);
const tokens = createTokenService(config);
const authProvider = createAuthProvider(config, db, tokens);
const app = createApp({ config, db, tokens, authProvider, logger, monitor });

const server = app.listen(config.port, () => {
  logger.info(`Thai Tu Fashion API · http://localhost:${config.port}`, { auth: config.authProvider, static: config.staticDir || 'off', sentry: monitor.enabled, ga: Boolean(config.gaMeasurementId), release: config.release });
});

process.on('unhandledRejection', (err) => {
  logger.error('unhandledRejection', { err });
  monitor.captureException(err);
});

const shutdown = (sig) => {
  logger.info(`${sig}: đang dừng…`);
  server.close(() => Promise.allSettled([db.close(), monitor.flush()]).finally(() => process.exit(0)));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
