import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import express from 'express';
import compression from 'compression';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authenticate, requireAdmin } from './auth/middleware.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { noopMonitor } from './lib/monitoring.js';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { cartRoutes } from './routes/cart.js';
import { orderRoutes } from './routes/orders.js';
import { wishlistRoutes } from './routes/wishlist.js';
import { meRoutes } from './routes/me.js';
import { adminProductRoutes } from './routes/admin/products.js';
import { adminOrderRoutes } from './routes/admin/orders.js';
import { adminMiscRoutes } from './routes/admin/misc.js';
import { contactRoutes, adminContactRoutes } from './routes/contact.js';

// Domain Google Analytics 4 (gtag.js) — chỉ thêm vào CSP khi có GA_MEASUREMENT_ID
const GA_SCRIPT = ['https://www.googletagmanager.com'];
const GA_CONNECT = ['https://www.google-analytics.com', 'https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://www.googletagmanager.com'];
const REQ_ID = /^[\w-]{8,64}$/;

const limitBody = (code) => ({ error: { code: 'RATE_LIMITED', message: code } });

/**
 * Tạo Express app. Phụ thuộc được truyền vào để test thay thế dễ dàng.
 * @param {{config: object, db: object, tokens: object, authProvider: object, logger?: object, monitor?: object}} deps
 */
export function createApp({ config, db, tokens, authProvider, logger = console, monitor = noopMonitor }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  // NFR-SEC-03: Helmet + CSP, CORS theo danh sách, rate-limit, giới hạn body
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", ...(config.gaMeasurementId ? GA_SCRIPT : [])],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:', ...(config.gaMeasurementId ? GA_CONNECT : [])],
          connectSrc: [
            "'self'",
            ...(config.supabaseUrl ? [config.supabaseUrl] : []),
            ...(config.gaMeasurementId ? GA_CONNECT : []),
            ...(config.sentryDsnBrowser ? [new URL(config.sentryDsnBrowser).origin] : []),
          ],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );
  app.use(
    '/api',
    cors({
      origin: (origin, cb) => cb(null, !origin || config.corsOrigins.includes(origin)),
      allowedHeaders: ['Content-Type', 'Authorization'],
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      maxAge: 600,
    }),
  );
  // Lighthouse: nén gzip/brotli cho HTML/JS/CSS/JSON (Issue #4)
  app.use(compression({ threshold: 1024 }));
  app.use(express.json({ limit: '300kb' }));

  // Request id: nhận từ proxy nếu hợp lệ, không thì tự sinh; trả lại ở header để đối chiếu log/Sentry
  app.use('/api', (req, res, next) => {
    const incoming = req.get('x-request-id');
    req.id = incoming && REQ_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', req.id);
    next();
  });

  if (config.logRequests) {
    app.use('/api', (req, res, next) => {
      const t = process.hrtime.bigint();
      res.on('finish', () => {
        const fields = { reqId: req.id, method: req.method, path: req.originalUrl.split('?')[0], status: res.statusCode, ms: Math.round(Number(process.hrtime.bigint() - t) / 1e6), userId: req.user?.id, ip: req.ip };
        if (res.statusCode >= 500) logger.error('request', fields);
        else if (res.statusCode >= 400) logger.warn('request', fields);
        else logger.info('request', fields);
      });
      next();
    });
  }

  app.use('/api', rateLimit({ windowMs: 60_000, limit: config.rateLimitApi, standardHeaders: 'draft-7', legacyHeaders: false, message: limitBody('Bạn thao tác quá nhanh, vui lòng thử lại sau ít phút.') }));
  const authLimiter = rateLimit({ windowMs: 60_000, limit: config.rateLimitAuth, standardHeaders: 'draft-7', legacyHeaders: false, message: limitBody('Bạn thử đăng nhập quá nhiều lần, vui lòng đợi 1 phút.') });

  app.get('/api/health', async (req, res) => {
    let dbState = 'ok';
    try {
      await db.asOwner((c) => c.query('select 1'));
    } catch {
      dbState = 'down';
    }
    res.status(dbState === 'ok' ? 200 : 503).json({ ok: dbState === 'ok', db: dbState, authProvider: authProvider.name });
  });

  // Cấu hình công khai cho frontend (GA, Sentry trình duyệt). Không chứa secret.
  app.get('/api/config', (req, res) => {
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.json({
      gaMeasurementId: config.gaMeasurementId || null,
      sentryDsn: config.sentryDsnBrowser || null,
      environment: config.sentryEnvironment,
      release: config.release || null,
    });
  });

  app.use('/api', authenticate(tokens, db));
  app.use('/api/auth', authLimiter, authRoutes({ db, authProvider }));
  app.use('/api', catalogRoutes());
  app.use('/api/cart', cartRoutes());
  app.use('/api/orders', orderRoutes());
  app.use('/api', wishlistRoutes());
  app.use('/api', meRoutes());
  app.use('/api', contactRoutes({ rateLimitContact: config.rateLimitContact }));
  app.use('/api/admin', requireAdmin);
  app.use('/api/admin/products', adminProductRoutes());
  app.use('/api/admin/orders', adminOrderRoutes());
  app.use('/api/admin/contacts', adminContactRoutes());
  app.use('/api/admin', adminMiscRoutes());
  app.use('/api', notFoundHandler);

  if (config.staticDir && fs.existsSync(config.staticDir)) {
    // Ảnh cache 7 ngày; HTML/JS/CSS không có hash trong tên nên luôn kiểm tra lại (ETag) để deploy mới có hiệu lực ngay
    app.use(express.static(config.staticDir, {
      index: 'index.html',
      setHeaders: (res, file) => res.setHeader('Cache-Control', /\.(webp|png|jpe?g|svg)$/.test(file) && config.isProd ? 'public, max-age=604800' : 'no-cache'),
    }));
  }

  app.use(errorHandler(logger, monitor));
  return app;
}
