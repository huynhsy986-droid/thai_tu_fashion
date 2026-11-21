/* Thai Tu Fashion: Google Analytics 4 + Sentry trình duyệt (Issue #7, NFR-OBS-01) — TV3 huynhsy986-droid
   - Cấu hình lấy từ GET /api/config (biến môi trường GA_MEASUREMENT_ID, SENTRY_DSN_BROWSER trên server).
     Chưa cấu hình / chế độ demo → không tải gì, không gửi gì.
   - GA4: page_view theo route #hash (SPA), sự kiện thương mại điện tử: view_item, add_to_cart, begin_checkout,
     purchase, sign_up, login, generate_lead (form Liên hệ), search.
   - Sentry: tải bundle tự host vendor/sentry.min.js (CSP script-src 'self'), bắt lỗi JS + lỗi API 5xx kèm requestId.
   Nạp sau sync.js. */
const TRACK = { ga: null, sentry: false, lastPath: '' };

/** Gửi sự kiện GA4 (bỏ qua nếu GA chưa bật). */
function track(name, params) {
  if (!TRACK.ga || typeof window.gtag !== 'function') return;
  try { window.gtag('event', name, params || {}); } catch (e) {}
}

function gaItem(pid, extra) {
  const p = typeof P === 'function' ? P(pid) : null;
  if (!p) return { item_id: pid, ...extra };
  const cat = (S.categories.find((c) => c.id === p.cat) || {}).name || p.cat;
  return { item_id: p.id, item_name: p.name, item_category: cat, price: typeof pr === 'function' ? pr(p) : p.price, ...extra };
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src; s.async = true; s.onload = resolve; s.onerror = reject;
    document.head.appendChild(s);
  });
}

function pageView() {
  const h = location.hash.slice(1) || 'home';
  const path = '/' + h;
  if (path === TRACK.lastPath) return;
  TRACK.lastPath = path;
  track('page_view', { page_path: path, page_location: location.origin + path, page_title: document.title });
  if (h.startsWith('product-')) {
    const p = P(h.slice(8));
    if (p) track('view_item', { currency: 'VND', value: pr(p), items: [gaItem(p.id)] });
  }
  if (h === 'checkout') track('begin_checkout', { currency: 'VND', value: (S.cart || []).reduce((s, i) => s + (P(i.pid) ? pr(P(i.pid)) * i.qty : 0), 0), items: (S.cart || []).map((i) => gaItem(i.pid, { quantity: i.qty, item_variant: `${i.color}/${i.size}` })) });
  if (h.startsWith('confirm-')) {
    const id = h.slice(8);
    const o = (S.orders || []).find((x) => x.id === id);
    let sent = [];
    try { sent = JSON.parse(sessionStorage.getItem('thaitu-ga-orders') || '[]'); } catch (e) {}
    if (o && !sent.includes(id)) {
      track('purchase', { transaction_id: id, currency: 'VND', value: o.total, shipping: o.shipFee, coupon: o.coupon || undefined, items: (o.items || []).map((i) => gaItem(i.pid, { quantity: i.qty, price: i.price, item_variant: `${i.color}/${i.size}` })) });
      try { sessionStorage.setItem('thaitu-ga-orders', JSON.stringify([...sent, id].slice(-20))); } catch (e) {}
    }
  }
  if (TRACK.sentry && window.Sentry) window.Sentry.addBreadcrumb({ category: 'navigation', message: path });
}

function initGA(id) {
  window.dataLayer = window.dataLayer || [];
  // gtag phải đẩy đúng đối tượng arguments (yêu cầu của gtag.js)
  window.gtag = function gtag() { window.dataLayer.push(arguments); }; // eslint-disable-line prefer-rest-params
  window.gtag('js', new Date());
  window.gtag('config', id, { send_page_view: false, anonymize_ip: true });
  TRACK.ga = id;
  loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`).catch(() => {});
  pageView();
}

async function initSentry(c) {
  try {
    await loadScript('vendor/sentry.min.js');
    window.Sentry.init({
      dsn: c.sentryDsn,
      environment: c.environment || 'production',
      release: c.release || undefined,
      sendDefaultPii: false,
      // Lỗi do tiện ích trình duyệt / mạng chập chờn không phải lỗi của web
      ignoreErrors: ['ResizeObserver loop', 'Non-Error promise rejection captured', 'NetworkError', 'Failed to fetch', 'Load failed'],
      beforeSend(ev) { if (ev.request && ev.request.headers) delete ev.request.headers.Authorization; return ev; },
    });
    TRACK.sentry = true;
    const u = API.user();
    if (u) window.Sentry.setUser({ id: u.id });
    window.Sentry.setTag('mode', typeof SYNC !== 'undefined' ? SYNC.mode : 'unknown');
  } catch (e) { /* không tải được Sentry: bỏ qua, web vẫn chạy */ }
}

/* ---------- gắn sự kiện vào luồng sẵn có (không sửa code prototype) ---------- */
(function hook() {
  const _addCart = addCart;
  addCart = function (pid, color, size, qty = 1, silent) {
    const ok = _addCart(pid, color, size, qty, silent);
    if (ok) { const p = P(pid); track('add_to_cart', { currency: 'VND', value: p ? pr(p) * qty : 0, items: [gaItem(pid, { quantity: qty, item_variant: `${color}/${size}` })] }); }
    return ok;
  };
  const _goSearch = typeof goSearch === 'function' ? goSearch : null;
  if (_goSearch) goSearch = function (q) { if (q) track('search', { search_term: q }); return _goSearch(q); };

  // Sự kiện tài khoản + lỗi API 5xx: bọc lớp gọi API
  ['get', 'post', 'put', 'patch', 'del'].forEach((m) => {
    const orig = API[m];
    API[m] = async function (path, ...rest) {
      try {
        const r = await orig(path, ...rest);
        if (m === 'post' && path === '/api/auth/register') track('sign_up', { method: 'email' });
        if (m === 'post' && path === '/api/auth/login') track('login', { method: 'email' });
        if (m === 'post' && (path === '/api/auth/register' || path === '/api/auth/login') && TRACK.sentry && r && r.user) window.Sentry.setUser({ id: r.user.id });
        return r;
      } catch (e) {
        if (TRACK.sentry && e && e.status >= 500) {
          window.Sentry.captureException(new Error(`API ${e.method || m.toUpperCase()} ${e.path || path} → ${e.status} ${e.code}`), { tags: { request_id: e.requestId || 'n/a', status: String(e.status) } });
        }
        throw e;
      }
    };
  });
  API.onSessionChange((why) => { if (why === 'expired' && TRACK.sentry) window.Sentry.setUser(null); });
})();

/* ---------- Tiêu đề tab theo trang (AC-UI-02): tốt cho SEO, lịch sử trình duyệt và báo cáo GA ---------- */
const SITE = 'Thai Tu Fashion';
const ROUTE_TITLES = {
  home: '', cart: 'Giỏ hàng', checkout: 'Thanh toán', login: 'Đăng nhập', register: 'Đăng ký', forgot: 'Quên mật khẩu', 'reset-password': 'Đặt mật khẩu mới',
  wishlist: 'Yêu thích', notifications: 'Thông báo', studio: 'Smart Studio', outfit: 'Outfit Builder', size: 'Size Advisor', stylist: 'AI Stylist',
  visual: 'Visual Search', tryon: 'Virtual Try-On', about: 'Giới thiệu', contact: 'Liên hệ',
};
function routeTitle(h) {
  if (h in ROUTE_TITLES) return ROUTE_TITLES[h];
  if (PRESET[h]) return PRESET[h].t;
  if (h.startsWith('product-')) { const p = P(h.slice(8)); return p ? p.name : 'Không tìm thấy sản phẩm'; }
  if (h.startsWith('size-')) return 'Size Advisor';
  if (h.startsWith('order-')) return `Đơn hàng ${h.slice(6)}`;
  if (h.startsWith('confirm-')) return 'Đặt hàng thành công';
  if (h.startsWith('info-')) return (INFO[h.slice(5)] || ['Thông tin'])[0];
  const acc = ACC.find((a) => a[0] === h);
  if (acc) return `${acc[1]} · Tài khoản`;
  const adm = ADM.find((a) => a[0] === h);
  if (adm) return `${adm[1]} · Quản trị`;
  return 'Không tìm thấy trang';
}
function setTitle() {
  const t = routeTitle(location.hash.slice(1) || 'home');
  document.title = t ? `${t} | ${SITE}` : `${SITE} — Thời trang unisex phong cách Seoul`;
}
const _renderT = render;
render = function (keep) { _renderT(keep); try { setTitle(); } catch (e) { /* không chặn giao diện */ } };
if (typeof SYNC !== 'undefined' && SYNC.ready) setTitle(); // ?demo khởi động đồng bộ trước khi file này nạp

window.addEventListener('hashchange', () => setTimeout(pageView, 0));

async function initTracking() {
  const cfg = window.THAITU_CONFIG || {};
  if (cfg.forceDemo) return;
  let c;
  c = await API.config();
  if (!c) return;
  if (c.sentryDsn) initSentry(c);
  if (c.gaMeasurementId && /^G-[A-Z0-9]{4,20}$/.test(c.gaMeasurementId)) {
    // đợi dữ liệu sẵn sàng để page_view đầu tiên có thông tin sản phẩm/đơn hàng
    if (typeof SYNC !== 'undefined' && SYNC.ready) initGA(c.gaMeasurementId);
    else document.addEventListener('thaitu:ready', () => initGA(c.gaMeasurementId), { once: true });
  }
}
initTracking();
