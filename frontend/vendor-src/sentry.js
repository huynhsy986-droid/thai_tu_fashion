// Bundle Sentry Browser tự host (CSP script-src 'self'), chỉ bắt lỗi (không tracing) cho nhẹ.
// Build: npm run build:vendor → vendor/sentry.min.js. Chỉ được tải khi /api/config có sentryDsn.
import { init, captureException, setUser, setTag, addBreadcrumb } from '@sentry/browser';
window.Sentry = { init, captureException, setUser, setTag, addBreadcrumb };
