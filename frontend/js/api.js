/* Thai Tu Fashion: client gọi REST API + phiên đăng nhập (Bearer JWT của Supabase Auth). */
const API = (() => {
  const SKEY = 'thaitu-session';
  const cfg = window.THAITU_CONFIG || {};
  const base = String(cfg.apiBase || '').replace(/\/$/, '');
  let session = null;
  try { session = JSON.parse(localStorage.getItem(SKEY) || 'null'); } catch (e) { session = null; }
  if (session && session.expiresAt && session.expiresAt * 1000 < Date.now()) session = null;
  const listeners = [];

  class ApiError extends Error {
    constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
  }

  function persist() {
    try { session ? localStorage.setItem(SKEY, JSON.stringify(session)) : localStorage.removeItem(SKEY); } catch (e) {}
  }

  async function request(method, path, body, opts = {}) {
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
      if (res.status === 401 && session && !opts.anonymous) {
        session = null;
        persist();
        listeners.forEach((fn) => { try { fn('expired'); } catch (x) {} });
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
    clear() { session = null; persist(); },
    onSessionChange(fn) { listeners.push(fn); },
  };
})();
