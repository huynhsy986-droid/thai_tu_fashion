/**
 * Sentry cho backend (Issue #4). Chỉ bật khi có SENTRY_DSN; không có DSN → no-op, không tải SDK.
 * Lỗi 4xx (nghiệp vụ) KHÔNG gửi; chỉ lỗi 5xx không mong đợi, kèm request id + user id để đối chiếu log.
 * Tác giả: TV2 – nguyen06-vn
 */
export const noopMonitor = Object.freeze({ enabled: false, captureException() {}, async flush() {} });

export async function createMonitor(config, logger) {
  if (!config.sentryDsn) return noopMonitor;
  try {
    const Sentry = await import('@sentry/node');
    Sentry.init({
      dsn: config.sentryDsn,
      environment: config.sentryEnvironment,
      release: config.release,
      tracesSampleRate: config.sentryTracesSampleRate,
      sendDefaultPii: false,
      beforeSend(event) {
        if (event.request?.headers) {
          delete event.request.headers.authorization;
          delete event.request.headers.cookie;
        }
        return event;
      },
    });
    logger?.info('sentry enabled', { environment: config.sentryEnvironment });
    return {
      enabled: true,
      captureException(err, { reqId, userId, method, path } = {}) {
        Sentry.withScope((scope) => {
          if (reqId) scope.setTag('request_id', reqId);
          if (method) scope.setTag('method', method);
          if (path) scope.setTag('path', path);
          if (userId) scope.setUser({ id: userId });
          Sentry.captureException(err);
        });
      },
      flush: (ms = 2000) => Sentry.flush(ms),
    };
  } catch (e) {
    logger?.warn('sentry init failed', { err: e });
    return noopMonitor;
  }
}
