/* Thai Tu Fashion: client gọi REST API + phiên đăng nhập (Bearer JWT của Supabase Auth).
   AC-AUTH-06: access token sống 1 giờ; tự gia hạn bằng refresh token trước khi hết hạn và khi gặp 401. */
const API = (() => {
  const SKEY = 'thaitu-session';
  const cfg = window.THAITU_CONFIG || {};
  const base = String(cfg.apiBase || '').replace(/\/$/, '');
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { session = null; }
  // Hết hạn mà không có refresh token (phiên cũ) → bỏ; có refresh token → giữ để gia hạn ở request đầu tiên
  if (session && session.expiresAt && session.expiresAt * 1000 < Date.now() && !session.refreshToken) session = null;
  const listeners = [];
  let refreshing = null;
  let configP = null;
  const REFRESH_EARLY_MS = 60_000;

  class ApiError extends Error {
    constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
  }

  function persist() {
    try { session ? localStorage.setItem(SKEY, JSON.stringify(session)) : localStorage.removeItem(SKEY); } catch (e) {}
  }

  function expire() {
    session = null;
    persist();
    listeners.forEach((fn) => { try { fn('expired'); } catch (x) {} });
  }

  /** Gia hạn phiên — một lần cho mọi request đang chờ (single-flight). Trả true nếu thành công. */
  function refreshSession() {
    if (!session || !session.refreshToken) return Promise.resolve(false);
    if (refreshing) return refreshing;
    const rt = session.refreshToken;
    refreshing = (async () => {
      try {
        const r = await request('POST', '/api/auth/refresh', { refreshToken: rt }, { anonymous: true, noRefresh: true, timeout: 10000 });
        if (session && session.refreshToken !== rt) return true; // tab khác đã gia hạn trước
        session = { ...(session || {}), accessToken: r.accessToken, refreshToken: r.refreshToken || rt, expiresAt: r.expiresAt, user: { ...((session && session.user) || {}), ...r.user } };
        persist();
        return true;
      } catch (e) {
        if (e.status === 401 || e.status === 422) { if (session && session.refreshToken === rt) expire(); return false; }
        throw e; // lỗi mạng: giữ phiên, thử lại lần sau
      } finally { refreshing = null; }
    })();
    return refreshing;
  }

  async function request(method, path, body, opts = {}) {
    if (!opts.anonymous && !opts.noRefresh && session && session.refreshToken && session.expiresAt && session.expiresAt * 1000 - REFRESH_EARLY_MS < Date.now()) {
      await refreshSession().catch(() => {});
    }
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (session && session.accessToken && !opts.anonymous) headers.Authorization = 'Bearer ' + session.accessToken;
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), opts.timeout || 15000);
    let res;
    try {
      res = await fetch(base + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body), signal: ctl.signal });
    } catch (e) {
      throw new ApiError(0, 'NETWORK', 'Không kết nối được máy chủ. Kiểm tra mạng và thử lại.');
    } finally {
      clearTimeout(timer);
    }
    if (res.status === 204) return null;
    let data = null;
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) data = await res.json().catch(() => null);
    if (!res.ok || !ct.includes('application/json')) {
      const err = (data && data.error) || {};
      const e = new ApiError(res.status, err.code || (ct.includes('json') ? 'INTERNAL' : 'NO_API'), err.message || 'Có lỗi xảy ra, vui lòng thử lại.', err.details);
      e.requestId = err.requestId || res.headers.get('x-request-id') || undefined; // đối chiếu log/Sentry backend
      e.method = method; e.path = path;
      if (res.status === 401 && session && !opts.anonymous) {
        // Token bị từ chối: thử gia hạn đúng 1 lần rồi gọi lại
        if (!opts.retried && session.refreshToken && (await refreshSession().catch(() => false))) {
          return request(method, path, body, { ...opts, retried: true });
        }
        if (session && !session.refreshToken) expire();
      }
      throw e;
    }
    return data;
  }

  return {
    ApiError,
    base,
    get: (p, o) => request('GET', p, undefined, o),
    post: (p, b, o) => request('POST', p, b === undefined ? {} : b, o),
    put: (p, b, o) => request('PUT', p, b === undefined ? {} : b, o),
    patch: (p, b, o) => request('PATCH', p, b === undefined ? {} : b, o),
    del: (p, o) => request('DELETE', p, undefined, o),
    session: () => session,
    user: () => (session && session.user) || null,
    isAdmin: () => Boolean(session && session.user && session.user.role === 'admin'),
    setSession(s) { session = s; persist(); },
    /** Nhận phiên do tab khác ghi (không ghi lại localStorage) */
    adopt(s) { session = s; },
    clear() { session = null; persist(); },
    refresh: refreshSession,
    /** Cấu hình công khai của server (GA, Sentry, tài khoản dùng thử) — gọi 1 lần, lỗi → {} */
    config() {
      if (!configP) configP = request('GET', '/api/config', undefined, { anonymous: true, timeout: 4000 }).catch(() => ({}));
      return configP;
    },
    onSessionChange(fn) { listeners.push(fn); },
  };
})();

/* Đồng bộ phiên giữa các tab: tab khác đăng nhập/đăng xuất/gia hạn → tab này cập nhật theo */
window.addEventListener('storage', (e) => {
  if (e.key !== 'thaitu-session') return;
  let next = null;
  try { next = JSON.parse(e.newValue || 'null'); } catch (x) {}
  const before = API.session();
  API.adopt(next);
  if (Boolean(before) !== Boolean(next) && typeof onSignedOut === 'function' && !next) onSignedOut().then(() => typeof render === 'function' && render());
});
