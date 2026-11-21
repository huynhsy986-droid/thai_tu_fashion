import fs from 'node:fs';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { authenticate, requireAdmin } from './auth/middleware.js';
import { errorHandler, notFoundHandler } from './lib/errors.js';
import { authRoutes } from './routes/auth.js';
import { catalogRoutes } from './routes/catalog.js';
import { cartRoutes } from './routes/cart.js';
import { orderRoutes } from './routes/orders.js';
import { wishlistRoutes } from './routes/wishlist.js';
import { meRoutes } from './routes/me.js';
import { adminProductRoutes } from './routes/admin/products.js';
import { adminOrderRoutes } from './routes/admin/orders.js';
import { adminMiscRoutes } from './routes/admin/misc.js';

const limitBody = (code) => ({ error: { code: 'RATE_LIMITED', message: code } });

/**
 * Tạo Express app. Phụ thuộc được truyền vào để test thay thế dễ dàng.
 * @param {{config: object, db: object, tokens: object, authProvider: object, logger?: Console}} deps
 */
export function createApp({ config, db, tokens, authProvider, logger = console }) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  // NFR-SEC-03: Helmet + CSP, CORS theo danh sách, rate-limit, giới hạn body
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          connectSrc: ["'self'", ...(config.supabaseUrl ? [config.supabaseUrl] : [])],
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
  app.use(express.json({ limit: '300kb' }));

  if (config.logRequests) {
    app.use('/api', (req, res, next) => {
      const t = process.hrtime.bigint();
      res.on('finish', () => logger.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Number(process.hrtime.bigint() - t) / 1e6 | 0}ms`));
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

  app.use('/api', authenticate(tokens, db));
  app.use('/api/auth', authLimiter, authRoutes({ db, authProvider }));
  app.use('/api', catalogRoutes());
  app.use('/api/cart', cartRoutes());
  app.use('/api/orders', orderRoutes());
  app.use('/api', wishlistRoutes());
  app.use('/api', meRoutes());
  app.use('/api/admin', requireAdmin);
  app.use('/api/admin/products', adminProductRoutes());
  app.use('/api/admin/orders', adminOrderRoutes());
  app.use('/api/admin', adminMiscRoutes());
  app.use('/api', notFoundHandler);

  if (config.staticDir && fs.existsSync(config.staticDir)) {
    // Ảnh cache 7 ngày; HTML/JS/CSS không có hash trong tên nên luôn kiểm tra lại (ETag) để deploy mới có hiệu lực ngay
    app.use(express.static(config.staticDir, {
      index: 'index.html',
      setHeaders: (res, file) => res.setHeader('Cache-Control', /\.(webp|png|jpe?g|svg)$/.test(file) && config.isProd ? 'public, max-age=604800' : 'no-cache'),
    }));
  }

  app.use(errorHandler(logger));
  return app;
}
