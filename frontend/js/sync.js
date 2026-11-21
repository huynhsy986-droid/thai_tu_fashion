/* Thai Tu Fashion: lớp đồng bộ với REST API trên Supabase (ADR-06). Nạp cuối cùng.
   - Khởi động: GET /api/catalog → S; đã đăng nhập thì tải giỏ, yêu thích, đơn, thông báo…
   - Bọc thao tác ghi của prototype: cập nhật giao diện ngay (optimistic) rồi gọi API theo hàng đợi,
     lấy kết quả server làm chuẩn; lỗi → toast + tải lại dữ liệu từ server.
   - API không truy cập được → chế độ demo y như prototype (localStorage) — NFR-REL-01. */
const SYNC = { mode: 'boot', ready: false };
const UIKEY = 'thaitu-ui-v1';
const UI_KEYS = ['viewed', 'draftOutfit', 'tryons', 'dropAlert', 'news'];
const GUEST_KEYS = ['cart', 'wish'];
const isApi = () => SYNC.mode === 'api';
const loggedIn = () => Boolean(API.session());
const BLANK_USER = { name: 'Khách', phone: '', email: '', address: '', birthday: '' };

/* ---------- hàng đợi ghi tuần tự ---------- */
let chain = Promise.resolve();
function enqueue(fn) { const p = chain.then(fn); chain = p.catch(() => {}); return p; }

function apiFail(e, fallback) {
  if (e && e.status === 401) return; // API.onSessionChange xử lý
  toast(esc((e && e.message) || fallback || 'Có lỗi xảy ra, vui lòng thử lại.'), { bad: true });
}
function needLogin(note) {
  ui.after = cur();
  ui.authNote = note;
  if (cur() === 'login') render(); else location.hash = 'login';
  return false;
}
const enc = encodeURIComponent;
const variantOf = (pid, color, size) => { const p = P(pid); return p && p.variants && p.variants[color] && p.variants[color][size]; };

/* ---------- lưu cục bộ: chỉ dữ liệu giao diện (+ giỏ/yêu thích của khách vãng lai) ---------- */
const _save = save;
let uiSaveT;
function flushUi() {
  clearTimeout(uiSaveT);
  uiSaveT = null;
  const keep = {};
  UI_KEYS.forEach((k) => { keep[k] = S[k]; });
  if (!loggedIn()) GUEST_KEYS.forEach((k) => { keep[k] = S[k]; });
  try { localStorage.setItem(UIKEY, JSON.stringify(keep)); } catch (e) {}
}
save = function () {
  if (!isApi()) return _save();
  clearTimeout(uiSaveT);
  uiSaveT = setTimeout(flushUi, 120);
};
// Không mất giỏ của khách vãng lai khi tải lại/đóng tab ngay sau thao tác
window.addEventListener('pagehide', () => { if (isApi() && uiSaveT) flushUi(); });
function loadUiState() { try { return JSON.parse(localStorage.getItem(UIKEY) || '{}') || {}; } catch (e) { return {}; } }

/* ---------- áp dữ liệu server vào S ---------- */
function applyCatalog(cat) {
  cat.colors.forEach((c) => { COLORS[c.code] = [c.name, c.hex]; });
  cat.shipping.forEach((s) => { if (SHIPPING[s.code]) Object.assign(SHIPPING[s.code], { name: s.name, eta: s.eta, fee: s.fee }); });
  S.products = cat.products;
  S.categories = cat.categories.map((c) => ({ id: c.id, name: c.name, sub: c.sub }));
  S.reviews = cat.reviews;
  S.cart = S.cart.filter((i) => P(i.pid));
  S.wish = S.wish.filter((w) => P(w.pid));
}
const mapRestock = (items) => items.map((r) => ({ pid: r.productId, color: r.color, size: r.size }));
function setCart(items) {
  S.cart = items.map((i) => ({ pid: i.pid, color: i.color, size: i.size, qty: i.qty, variantId: i.variantId }));
  badges();
  if (cur() === 'cart') refresh();
  requote();
}
function replaceOrder(o) { const i = S.orders.findIndex((x) => x.id === o.id); if (i >= 0) S.orders[i] = o; else S.orders.unshift(o); }
function replaceProduct(p) { const i = S.products.findIndex((x) => x.id === p.id); if (i >= 0) S.products[i] = p; else S.products.unshift(p); }

async function loadUser() {
  const s = API.session();
  if (!s) {
    Object.assign(S, { meId: null, user: { ...BLANK_USER }, orders: [], notifs: [], outfits: [], restock: [], customers: [], quote: null });
    return;
  }
  try {
    const [me, prof, cart, wish, rs, orders, notifs, outfits, meas] = await Promise.all([
      API.get('/api/auth/me'), API.get('/api/me/profile'), API.get('/api/cart'), API.get('/api/wishlist'),
      API.get('/api/restock-subscriptions'), API.get('/api/orders'), API.get('/api/me/notifications'),
      API.get('/api/me/outfits'), API.get('/api/me/measurements'),
    ]);
    API.setSession({ ...API.session(), user: me.user });
    S.meId = me.user.id;
    S.user = { name: prof.name, phone: prof.phone, email: prof.email, address: prof.address, birthday: prof.birthday };
    S.cart = cart.items.map((i) => ({ pid: i.pid, color: i.color, size: i.size, qty: i.qty, variantId: i.variantId }));
    S.wish = wish.items;
    S.restock = mapRestock(rs.items);
    S.orders = orders.items;
    S.notifs = notifs.items;
    S.outfits = outfits.items;
    if (meas) S.measures = meas;
    S.customers = [];
    if (me.user.role === 'admin') {
      const [ao, cu] = await Promise.all([API.get('/api/admin/orders'), API.get('/api/admin/customers')]);
      S.orders = ao.items;
      S.customers = cu.items;
    }
  } catch (e) {
    if (e.status === 401) { API.clear(); return loadUser(); }
    apiFail(e);
  }
}

async function refreshCatalog(rerender = true) {
  try {
    applyCatalog(await API.get('/api/catalog'));
    if (rerender && !$('#modal').innerHTML && !/^(checkout|login|register)$/.test(cur())) refresh();
  } catch (e) { /* giữ dữ liệu hiện có */ }
}
async function reloadCart() { try { setCart((await API.get('/api/cart')).items); } catch (e) {} }
async function reloadWish() { try { S.wish = (await API.get('/api/wishlist')).items; badges(); } catch (e) {} }
async function reloadNotifs() { try { S.notifs = (await API.get('/api/me/notifications')).items; badges(); } catch (e) {} }

/* ---------- đăng nhập / đăng xuất ---------- */
async function afterAuth(r) {
  SYNC.authBusy = true;
  try { await completeAuth(r); } finally { SYNC.authBusy = false; }
}
async function completeAuth(r) {
  const guestCart = S.cart.slice();
  const guestWish = S.wish.slice();
  API.setSession({ accessToken: r.accessToken, expiresAt: r.expiresAt, user: r.user });
  let merged = 0;
  for (const i of guestCart) {
    try { await API.post('/api/cart/items', { productId: i.pid, color: i.color, size: i.size, quantity: i.qty }); merged += 1; } catch (e) {}
  }
  for (const w of guestWish) { try { await API.put(`/api/wishlist/${enc(w.pid)}`, w.target ? { target: w.target } : {}); } catch (e) {} }
  S.cart = []; S.wish = []; S.coupon = ''; S.quote = null;
  try { localStorage.setItem(UIKEY, JSON.stringify(Object.fromEntries(UI_KEYS.map((k) => [k, S[k]])))); } catch (e) {}
  if (r.user.role === 'admin') await refreshCatalog(false); // admin thấy cả SP/đánh giá đang ẩn
  await loadUser();
  toast(`Xin chào, ${esc(r.user.name)}.${merged ? ` Đã chuyển ${merged} món trong giỏ vào tài khoản.` : ''}`);
  let next = ui.after && ui.after !== 'login' && ui.after !== 'register' ? ui.after : r.user.role === 'admin' ? 'admin' : 'account';
  if (isAdminRoute(next) && r.user.role !== 'admin') { next = 'account'; toast('Tài khoản này không có quyền quản trị.', { bad: true }); }
  ui.after = null; ui.authNote = null;
  if (cur() === next) render(); else location.hash = next;
}
async function onSignedOut() {
  Object.assign(S, { cart: [], wish: [], coupon: '', quote: null });
  await loadUser();
  await refreshCatalog(false);
  badges();
}
API.onSessionChange(async () => {
  await onSignedOut();
  toast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', { bad: true, link: 'login', label: 'Đăng nhập' });
  if (NEED_LOGIN(cur()) || isAdminRoute(cur())) render();
});

/* ---------- chặn route: cần đăng nhập / cần admin ---------- */
const _resolve = resolve;
resolve = function (h) {
  if (h === 'login' || h === 'register') return viewLogin(h);
  if (isApi() && !loggedIn() && NEED_LOGIN(h)) {
    ui.after = h;
    ui.authNote = h === 'checkout' ? 'Đăng nhập để thanh toán. Giỏ hàng của bạn được giữ nguyên.' : 'Vui lòng đăng nhập để xem trang này.';
    return viewLogin('login');
  }
  return _resolve(h);
};
const _render = render;
render = function (keepScroll) {
  if (SYNC.mode === 'boot') return;
  const h = cur();
  if (isApi() && isAdminRoute(h) && !API.isAdmin()) {
    ui.after = h;
    ui.authNote = loggedIn() ? 'Tài khoản này không có quyền quản trị. Hãy đăng nhập bằng tài khoản quản trị viên.' : 'Đăng nhập bằng tài khoản quản trị viên để vào trang quản trị.';
    document.body.classList.remove('admin-mode');
    $('#root').innerHTML = Announcement() + Header(h) + `<main id="main">${viewLogin('login')}</main>` + Footer();
    badges();
    window.scrollTo({ top: 0, behavior: 'instant' });
    return;
  }
  if (h !== 'login' && h !== 'register' && !NEED_LOGIN(h)) ui.authNote = null;
  if (h !== 'checkout') ui.coStock = '';
  // Giữ nội dung người dùng đang gõ khi trang được vẽ lại do dữ liệu server về (VD: ô mã giảm giá)
  const typing = keepScroll ? ['cp'].map((id) => { const el = document.getElementById(id); return el && { id, v: el.value, f: document.activeElement === el }; }).filter(Boolean) : [];
  _render(keepScroll);
  lockStatusOptions();
  typing.forEach(({ id, v, f }) => { const el = document.getElementById(id); if (el && el.value !== v) { el.value = v; if (f) el.focus(); } });
  if (isApi() && loggedIn() && (h === 'cart' || h === 'checkout') && S.cart.length && (!S.quote || S.quote.sig !== quoteSig())) requote();
};

/* Dropdown trạng thái đơn của admin chỉ cho chọn bước hợp lệ theo máy trạng thái (allowedNext từ server) */
function lockStatusOptions(root = document) {
  if (!isApi()) return;
  $$('select[data-ost]', root).forEach((sel) => {
    const o = S.orders.find((x) => x.id === sel.dataset.ost);
    if (!o || !Array.isArray(o.allowedNext)) return;
    [...sel.options].forEach((op) => { op.disabled = op.value !== o.status && !o.allowedNext.includes(op.value); });
  });
}
const _openModal = openModal;
openModal = function (html, cls) { _openModal(html, cls); lockStatusOptions($('#modal')); };

/* ---------- báo giá server (AC-CART-03/04) ---------- */
const quoteSig = (ship) => JSON.stringify([S.cart.map((i) => [i.pid, i.color, i.size, i.qty]), S.coupon || '', ship || (ui.co && ui.co.ship) || 'std']);
const cartSig = () => JSON.stringify([S.cart.map((i) => [i.pid, i.color, i.size, i.qty]), S.coupon || '']);
function updateTotalsDom() {
  const box = $('#co-sum');
  if (box) box.innerHTML = coSummary();
  else if (cur() === 'cart') refresh();
}
function requote(ship) {
  if (!isApi() || !loggedIn() || !S.cart.length) { S.quote = null; return Promise.resolve(); }
  const s = ship || (ui.co && ui.co.ship) || 'std';
  const sig = quoteSig(s);
  return enqueue(() => API.post('/api/cart/quote', { shipping: s, coupon: S.coupon || null }))
    .then((q) => {
      if (quoteSig(s) !== sig) return;
      S.quote = { ...q, sig, cartSig: cartSig() };
      updateTotalsDom();
    })
    .catch((e) => {
      if (e.code === 'COUPON_INVALID' && S.coupon) {
        toast(`Mã ${esc(S.coupon)} không còn dùng được: ${esc(e.message)}`, { bad: true });
        S.coupon = '';
        commit();
        requote(s);
      } else apiFail(e);
    });
}
/* Giữ thông báo thiếu hàng của server khi khung tổng tiền được vẽ lại */
const _coSummary = coSummary;
coSummary = function () {
  const h = _coSummary();
  return ui.coStock ? h.replace('<div class="err" id="co-stock"></div>', `<div class="err" id="co-stock">${ui.coStock}</div>`) : h;
};
const _totals = totals;
totals = function (ship) {
  const t = _totals(ship);
  const q = S.quote;
  if (!isApi() || !q || q.cartSig !== cartSig()) return t;
  const fee = ship ? (q.shipping === ship ? q.shippingFee : t.fee) : 0;
  return { sub: q.subtotal, discount: q.discount, fee, total: Math.max(0, q.subtotal - q.discount + fee) };
};
document.addEventListener('change', (e) => {
  const t = e.target;
  if (isApi() && t.dataset && t.dataset.co === 'ship' && t.type === 'radio') requote(t.value);
});

/* ---------- giỏ hàng (AC-CART-01/02) ---------- */
const _addCart = addCart;
addCart = function (pid, color, size, qty = 1, silent) {
  const ok = _addCart(pid, color, size, qty, silent);
  if (ok && isApi() && loggedIn()) {
    enqueue(() => API.post('/api/cart/items', { productId: pid, color, size, quantity: qty }))
      .then((r) => setCart(r.items))
      .catch((e) => { apiFail(e); reloadCart(); });
  }
  return ok;
};
const _cQty = A.cQty;
A.cQty = function (el) {
  const it = S.cart[+el.dataset.i];
  const before = it && it.qty;
  _cQty(el);
  if (!isApi() || !loggedIn() || !it || it.qty === before) return;
  const vid = it.variantId || variantOf(it.pid, it.color, it.size);
  enqueue(() => API.patch(`/api/cart/items/${vid}`, { quantity: it.qty })).then((r) => setCart(r.items)).catch((e) => { apiFail(e); reloadCart(); });
};
const _cDel = A.cDel;
A.cDel = function (el) {
  const it = S.cart[+el.dataset.i];
  _cDel(el);
  if (!isApi() || !loggedIn() || !it) return;
  const vid = it.variantId || variantOf(it.pid, it.color, it.size);
  enqueue(() => API.del(`/api/cart/items/${vid}`)).then((r) => setCart(r.items)).catch((e) => { apiFail(e); reloadCart(); });
};
const _Fcoupon = F.coupon;
F.coupon = async function () {
  if (!isApi()) return _Fcoupon();
  const v = $('#cp').value.trim().toUpperCase();
  if (!v) { setErr('cp', 'Nhập mã giảm giá.'); return; }
  if (!loggedIn()) { setErr('cp', 'Đăng nhập để dùng mã giảm giá.'); return; }
  try {
    const ship = (ui.co && ui.co.ship) || 'std';
    const q = await enqueue(() => API.post('/api/cart/quote', { shipping: ship, coupon: v }));
    S.coupon = q.coupon || v;
    S.quote = { ...q, sig: quoteSig(ship), cartSig: cartSig() };
    setErr('cp', '');
    commit();
    refresh();
    toast('Đã áp dụng mã giảm giá.');
  } catch (e) {
    if (e.status === 422) setErr('cp', e.message); else apiFail(e);
  }
};

/* ---------- đặt hàng & huỷ đơn (AC-ORD-01/02/05/06) ---------- */
const _finishOrder = finishOrder;
let placing = false;
finishOrder = async function (paid) {
  if (!isApi()) return _finishOrder(paid);
  if (placing) return;
  placing = true;
  ui.coStock = '';
  const c = ui.co;
  const btns = $$('#main form[data-form=checkout] button, #co-sum button');
  btns.forEach((b) => { b.disabled = true; });
  try {
    await chain;
    const o = await enqueue(() => API.post('/api/orders', {
      name: c.name, phone: c.phone, address: c.address, note: c.note || '', ship: c.ship || 'std', pay: c.pay || 'cod',
      coupon: S.coupon || null, paymentOk: c.pay === 'online' ? Boolean(paid) : true,
    }));
    replaceOrder(o);
    S.cart = []; S.coupon = ''; S.quote = null;
    ui.co = { ship: 'std', pay: 'cod' };
    commit();
    closeModal();
    location.hash = 'confirm-' + o.id;
    refreshCatalog(false);
    reloadNotifs();
  } catch (e) {
    closeModal();
    if (e.code === 'OUT_OF_STOCK') {
      const box = $('#co-stock');
      const lines = (Array.isArray(e.details) ? e.details : []).map((d) => `${esc(d.name)} (${esc(colorName(d.color))}, size ${esc(d.size)}: còn ${d.available})`);
      ui.coStock = `Không đủ hàng: ${lines.join(', ')}. <a href="#cart" style="text-decoration:underline">Về giỏ hàng để chỉnh sửa</a>.`;
      if (box) box.innerHTML = ui.coStock;
      toast('Một số món vừa hết hàng. Hãy kiểm tra lại giỏ hàng.', { bad: true });
      await refreshCatalog(false);
      reloadCart();
    } else if (e.code === 'VALIDATION') {
      const map = { name: 'co-name', recipientName: 'co-name', phone: 'co-phone', address: 'co-addr' };
      if (Array.isArray(e.details)) e.details.forEach((d) => { if (map[d.field]) setErr(map[d.field], d.message); });
      else if (map[e.details]) setErr(map[e.details], e.message);
      toast(esc(e.message), { bad: true });
    } else if (e.code === 'COUPON_INVALID') {
      S.coupon = '';
      commit();
      refresh();
      toast(esc(e.message), { bad: true });
    } else apiFail(e);
  } finally {
    placing = false;
    btns.forEach((b) => { if (b.isConnected) b.disabled = false; });
  }
};
const _orderCancel = A.orderCancel;
A.orderCancel = async function (el) {
  if (!isApi()) return _orderCancel(el);
  try {
    const o = await API.post(`/api/orders/${enc(el.dataset.id)}/cancel`);
    replaceOrder(o);
    closeModal();
    refresh();
    toast('Đã huỷ đơn hàng.');
    refreshCatalog(false);
    reloadNotifs();
  } catch (e) { closeModal(); apiFail(e); }
};

/* ---------- yêu thích, giá mong muốn, báo có hàng (AC-WISH-01..03) ---------- */
const _wish = A.wish;
A.wish = function (el) {
  const id = el.dataset.id;
  const had = inWish(id);
  _wish(el);
  if (!isApi() || !loggedIn()) return;
  enqueue(() => (had ? API.del(`/api/wishlist/${enc(id)}`) : API.put(`/api/wishlist/${enc(id)}`, {})))
    .then((r) => { S.wish = r.items; badges(); })
    .catch((e) => { apiFail(e); reloadWish(); });
};
const _wishDel = A.wishDel;
A.wishDel = function (el) {
  _wishDel(el);
  if (isApi() && loggedIn()) enqueue(() => API.del(`/api/wishlist/${enc(el.dataset.id)}`)).catch((e) => { apiFail(e); reloadWish(); });
};
const _setTarget = A.setTarget;
A.setTarget = function (el) {
  _setTarget(el);
  const w = S.wish.find((x) => x.pid === el.dataset.id);
  if (isApi() && loggedIn() && w) enqueue(() => API.put(`/api/wishlist/${enc(w.pid)}`, { target: w.target || 0 })).catch((e) => { apiFail(e); reloadWish(); });
};
const _notifyRestock = A.notifyRestock;
A.notifyRestock = function () {
  if (!isApi()) return _notifyRestock();
  if (!loggedIn()) return needLogin('Đăng nhập để nhận thông báo khi có hàng.');
  const d = ui.pdp;
  const wasWish = inWish(d.id);
  _notifyRestock();
  enqueue(() => API.post('/api/restock-subscriptions', { productId: d.id, color: d.color, size: d.size }))
    .then((r) => { S.restock = mapRestock(r.items); })
    .catch((e) => { apiFail(e); API.get('/api/restock-subscriptions').then((r) => { S.restock = mapRestock(r.items); if (cur().startsWith('product-')) updatePdp(); }).catch(() => {}); });
  if (!wasWish && inWish(d.id)) enqueue(() => API.put(`/api/wishlist/${enc(d.id)}`, {})).catch(() => {});
};
const _simDrop = A.simDrop;
A.simDrop = async function (el) {
  if (!isApi()) return _simDrop(el);
  if (!API.isAdmin()) { toast('Giá do cửa hàng cập nhật. Bạn sẽ nhận thông báo ngay khi món này giảm giá.'); return; }
  const p = P(el.dataset.id);
  let sale = Math.round(pr(p) * 0.85 / 10000) * 10000;
  if (sale >= p.price) sale = 0;
  try {
    replaceProduct(await API.patch(`/api/admin/products/${enc(p.id)}`, { sale }));
    await reloadNotifs();
    refresh();
    toast('Đã giảm giá 15%. Khách đang theo dõi món này đã nhận thông báo.', { link: 'notifications', label: 'Thông báo' });
  } catch (e) { apiFail(e); }
};
const _simRestock = A.simRestock;
A.simRestock = async function (el) {
  if (!isApi()) return _simRestock(el);
  if (!API.isAdmin()) { toast('Bạn đã đăng ký báo có hàng. Chúng tôi sẽ thông báo ngay khi hàng về.'); return; }
  const subs = S.restock.filter((r) => r.pid === el.dataset.id);
  try {
    for (const r of subs) replaceProduct(await API.put(`/api/admin/products/${enc(r.pid)}/stock`, { color: r.color, size: r.size, stock: 5 }));
    S.restock = mapRestock((await API.get('/api/restock-subscriptions')).items);
    await reloadNotifs();
    refresh();
    toast('Đã nhập kho 5 sản phẩm.', { link: 'notifications', label: 'Thông báo' });
  } catch (e) { apiFail(e); }
};

/* ---------- thông báo (AC-ACC-04) ---------- */
const _readN = A.readN;
A.readN = function (el) {
  _readN(el);
  if (isApi() && loggedIn() && /^\d+$/.test(el.dataset.id)) API.post(`/api/me/notifications/${el.dataset.id}/read`).catch(() => {});
};
const _readAll = A.readAll;
A.readAll = function () {
  _readAll();
  if (isApi() && loggedIn()) API.post('/api/me/notifications/read-all').catch(apiFail);
};

/* ---------- tài khoản: hồ sơ, số đo, outfit, nhận tin, đánh giá (AC-ACC-*, AC-REV-01) ---------- */
const _Fprofile = F.profile;
F.profile = async function () {
  if (!isApi()) return _Fprofile();
  const name = $('#u-name').value.trim();
  setErr('u-name', name.length < 2 ? 'Nhập họ tên.' : '');
  if (name.length < 2) return;
  try {
    const p = await API.patch('/api/me/profile', { name, phone: $('#u-phone').value.trim(), email: $('#u-mail').value.trim(), address: $('#u-addr').value.trim(), birthday: $('#u-bd').value || '' });
    S.user = { name: p.name, phone: p.phone, email: p.email, address: p.address, birthday: p.birthday };
    const s = API.session();
    if (s && s.user) API.setSession({ ...s, user: { ...s.user, name: p.name } });
    refresh();
    toast('Đã lưu hồ sơ.');
  } catch (e) {
    const map = { name: 'u-name', phone: 'u-phone', email: 'u-mail', birthday: 'u-bd' };
    if (Array.isArray(e.details)) e.details.forEach((d) => map[d.field] && setErr(map[d.field], d.message));
    apiFail(e);
  }
};
const saveMeasures = () => {
  if (!isApi() || !loggedIn()) return;
  const m = S.measures;
  enqueue(() => API.put('/api/me/measurements', { height: m.height, weight: m.weight, chest: m.chest, waist: m.waist, hip: m.hip, fit: m.fit || 'regular' })).catch(apiFail);
};
const _Fmeasure = F.measure;
F.measure = function (form) { const before = JSON.stringify(S.measures); _Fmeasure(form); if (JSON.stringify(S.measures) !== before) saveMeasures(); };
const _Fadvisor = F.advisor;
F.advisor = function (form) { const before = JSON.stringify(S.measures); _Fadvisor(form); if (JSON.stringify(S.measures) !== before) saveMeasures(); };

const _FsaveOutfit = F.saveOutfit;
F.saveOutfit = async function () {
  if (!isApi()) return _FsaveOutfit();
  const n = $('#of-name').value.trim();
  setErr('of-name', n ? '' : 'Đặt tên để dễ tìm lại.');
  if (!n) return;
  if (!loggedIn()) { closeModal(); return needLogin('Đăng nhập để lưu outfit vào tài khoản.'); }
  try {
    const o = await API.post('/api/me/outfits', { name: n, slots: JSON.parse(JSON.stringify(obSlots())) });
    S.outfits.unshift(o);
    closeModal();
    toast('Đã lưu outfit.', { link: 'account-outfits', label: 'Xem' });
  } catch (e) { apiFail(e); }
};
const _ofDel = A.ofDel;
A.ofDel = async function (el) {
  if (!isApi()) return _ofDel(el);
  try { await API.del(`/api/me/outfits/${enc(el.dataset.id)}`); S.outfits = S.outfits.filter((o) => o.id !== el.dataset.id); refresh(); toast('Đã xoá outfit.'); } catch (e) { apiFail(e); }
};

const _Fnews = F.news;
F.news = async function () {
  if (!isApi()) return _Fnews();
  const v = $('#news-mail').value.trim();
  if (!EMAIL_RE.test(v)) { setErr('news-mail', 'Email chưa đúng định dạng, ví dụ: ten@email.com'); return; }
  setErr('news-mail', '');
  try {
    await API.post('/api/newsletter', { email: v });
    $('#news-mail').value = '';
    $('#news-ok').innerHTML = '<div class="msgbox ok">Đã đăng ký nhận tin. Cảm ơn bạn.</div>';
  } catch (e) { if (e.status === 422) setErr('news-mail', e.message); else apiFail(e); }
};

const _Freview = F.review;
F.review = async function () {
  if (!isApi()) return _Freview();
  if (!loggedIn()) { keepRv(); return needLogin('Đăng nhập để viết đánh giá.'); }
  const p = P(ui.pdp.id);
  const st = ui.pdp.rvStar || 0;
  const name = $('#rv-name').value.trim();
  const text = $('#rv-text').value.trim();
  let ok = true;
  $('[data-err="rv-star"]').textContent = st ? '' : 'Hãy chọn số sao.';
  if (!st) ok = false;
  setErr('rv-name', name.length < 2 ? 'Nhập tên hiển thị.' : '');
  if (name.length < 2) ok = false;
  setErr('rv-text', text.length < 10 ? 'Nhận xét cần ít nhất 10 ký tự.' : '');
  if (text.length < 10) ok = false;
  if (!ok) return;
  try {
    const r = await API.post(`/api/products/${enc(p.id)}/reviews`, { rating: st, name, text, size: ui.pdp.size || p.sizes[0], color: ui.pdp.color, img: ui.pdp.rvImg || null });
    S.reviews.push(r);
    ui.pdp.rvStar = 0; ui.pdp.rvImg = null; ui.pdp.rvSort = 'new';
    rvDraft = {};
    updateRv();
    toast(r.verified ? 'Cảm ơn bạn đã đánh giá. Đánh giá có nhãn "Đã mua hàng".' : 'Cảm ơn bạn đã đánh giá.');
  } catch (e) {
    if (Array.isArray(e.details)) {
      const map = { name: 'rv-name', text: 'rv-text' };
      e.details.forEach((d) => { if (map[d.field]) setErr(map[d.field], d.message); if (d.field === 'rating') $('[data-err="rv-star"]').textContent = d.message; });
    }
    apiFail(e);
  }
};

/* ---------- quản trị (AC-ADM-02..07) ---------- */
const _admPToggle = A.admPToggle;
A.admPToggle = async function (el) {
  if (!isApi()) return _admPToggle(el);
  const p = P(el.dataset.id);
  try {
    replaceProduct(await API.patch(`/api/admin/products/${enc(p.id)}`, { status: p.status === 'active' ? 'hidden' : 'active' }));
    refresh();
    toast(P(p.id).status === 'active' ? 'Sản phẩm đang được bán.' : 'Đã ẩn sản phẩm khỏi cửa hàng.');
  } catch (e) { apiFail(e); }
};
const _Fproduct = F.product;
F.product = async function (form) {
  if (!isApi()) return _Fproduct(form);
  const id = form.dataset.id;
  const name = $('#p-name').value.trim();
  const price = +$('#p-price').value.replace(/\D/g, '');
  const saleRaw = $('#p-sale').value.replace(/\D/g, '');
  const sale = saleRaw ? +saleRaw : 0;
  const sizes = $('#p-sizes').value.split(',').map((s) => s.trim()).filter(Boolean);
  const colors = $$('#p-colors input:checked').map((i) => i.value);
  let ok = true;
  const E = (k, m) => { setErr(k, m); if (m) ok = false; };
  E('p-name', name.length < 3 ? 'Tên cần ít nhất 3 ký tự.' : '');
  E('p-price', price <= 0 ? 'Nhập giá lớn hơn 0.' : '');
  E('p-sale', sale && sale >= price ? 'Giá khuyến mãi phải thấp hơn giá gốc.' : '');
  E('p-sizes', sizes.length ? '' : 'Nhập ít nhất một size.');
  const ce = $('[data-err="p-colors"]');
  ce.textContent = colors.length ? '' : 'Chọn ít nhất một màu.';
  if (!colors.length) ok = false;
  if (!ok) return;
  const body = { name, cat: $('#p-cat').value, sub: $('#p-sub').value, gender: $('#p-gender').value, badge: $('#p-badge').value, price, sale, sizes, colors, desc: $('#p-desc').value.trim(), base: $('#p-base').value };
  const btn = form.querySelector('button[type=submit], button:not([type])');
  if (btn) btn.disabled = true;
  try {
    const p = id ? await API.patch(`/api/admin/products/${enc(id)}`, body) : await API.post('/api/admin/products', body);
    replaceProduct(p);
    closeModal();
    refresh();
    toast(id ? 'Đã lưu sản phẩm.' : 'Đã tạo sản phẩm. Sản phẩm đã xuất hiện ở cửa hàng.');
  } catch (e) {
    const map = { name: 'p-name', price: 'p-price', sale: 'p-sale', sizes: 'p-sizes' };
    if (Array.isArray(e.details)) e.details.forEach((d) => { if (map[d.field]) setErr(map[d.field], d.message); if (d.field === 'colors') ce.textContent = d.message; });
    apiFail(e);
  } finally { if (btn && btn.isConnected) btn.disabled = false; }
};
const _Fcategory = F.category;
F.category = async function () {
  if (!isApi()) return _Fcategory();
  const n = $('#c-name').value.trim();
  setErr('c-name', n ? '' : 'Nhập tên danh mục.');
  if (!n) return;
  try { const c = await API.post('/api/admin/categories', { name: n }); S.categories.push({ id: c.id, name: c.name, sub: c.sub }); refresh(); toast('Đã thêm danh mục.'); } catch (e) { apiFail(e); }
};
const _admCDel = A.admCDel;
A.admCDel = async function (el) {
  if (!isApi()) return _admCDel(el);
  try { await API.del(`/api/admin/categories/${enc(el.dataset.id)}`); S.categories = S.categories.filter((c) => c.id !== el.dataset.id); refresh(); toast('Đã xoá danh mục.'); } catch (e) { apiFail(e); }
};
const _admRT = A.admRT;
A.admRT = async function (el) {
  if (!isApi()) return _admRT(el);
  const r = S.reviews.find((x) => x.id === el.dataset.id);
  try {
    const nr = await API.patch(`/api/admin/reviews/${enc(r.id)}`, { status: r.status === 'visible' ? 'hidden' : 'visible' });
    Object.assign(r, { status: nr.status });
    refresh();
    toast(nr.status === 'visible' ? 'Đánh giá đã hiện lại.' : 'Đã ẩn đánh giá.');
  } catch (e) { apiFail(e); }
};
const _admRD = A.admRD;
A.admRD = async function (el) {
  if (!isApi()) return _admRD(el);
  try { await API.del(`/api/admin/reviews/${enc(el.dataset.id)}`); S.reviews = S.reviews.filter((r) => r.id !== el.dataset.id); refresh(); toast('Đã xoá đánh giá.'); } catch (e) { apiFail(e); }
};
const _reset = A.reset;
A.reset = function () { if (!isApi()) return _reset(); closeModal(); toast('Đặt lại dữ liệu chỉ có ở chế độ demo.'); };

/* Ô nhập trong bảng quản trị (trạng thái đơn, tồn kho, tên danh mục): bắt ở pha capture để thay xử lý cục bộ. */
document.addEventListener('change', async (e) => {
  if (!isApi()) return;
  const t = e.target;
  if (!t.dataset) return;
  if (t.dataset.ost) {
    e.stopImmediatePropagation();
    const o = S.orders.find((x) => x.id === t.dataset.ost);
    const prev = o.status;
    t.disabled = true;
    try {
      replaceOrder(await API.patch(`/api/admin/orders/${enc(o.id)}/status`, { status: t.value }));
      refresh();
      toast(`Đơn ${esc(o.id)}: ${STATUS[t.value]}`);
      refreshCatalog(false);
    } catch (err) {
      t.value = prev;
      apiFail(err);
    } finally { t.disabled = false; }
  } else if (t.dataset.stock) {
    e.stopImmediatePropagation();
    const [pid, c, s] = t.dataset.stock.split('|');
    const n = Math.max(0, Math.floor(+t.value || 0));
    t.value = n;
    try {
      const p = await API.put(`/api/admin/products/${enc(pid)}/stock`, { color: c, size: s, stock: n });
      replaceProduct(p);
      t.className = n === 0 ? 'zero' : n <= 2 ? 'low' : '';
      const tot = $('#inv-total');
      if (tot) tot.textContent = totalStock(p);
      toast(`Đã cập nhật ${colorName(c)} / ${esc(s)}: ${n}`);
    } catch (err) {
      t.value = stockOf(P(pid), c, s);
      apiFail(err);
    }
  } else if (t.dataset.catname) {
    e.stopImmediatePropagation();
    const cat = S.categories.find((x) => x.id === t.dataset.catname);
    const v = t.value.trim();
    if (!v) { t.value = cat.name; return; }
    try { await API.patch(`/api/admin/categories/${enc(cat.id)}`, { name: v }); cat.name = v; toast('Đã đổi tên danh mục.'); } catch (err) { t.value = cat.name; apiFail(err); }
  }
}, true);

/* ---------- khởi động ---------- */
function startDemo(reason) {
  SYNC.mode = 'demo';
  SYNC.ready = true;
  if (!S.meId) S.meId = 'c1';
  render();
  if (reason !== 'forced') toast('Không kết nối được máy chủ — đang chạy <b>chế độ demo</b>, dữ liệu lưu trong trình duyệt.', { ms: 6000 });
}

async function boot() {
  const cfg = window.THAITU_CONFIG || {};
  if (cfg.forceDemo) return startDemo('forced');
  let cat;
  try {
    cat = await API.get('/api/catalog', { timeout: cfg.timeoutMs || 4000 });
  } catch (e) {
    if (e.status === 401) {
      API.clear();
      try { cat = await API.get('/api/catalog', { timeout: cfg.timeoutMs || 4000 }); } catch (e2) { return startDemo(e2); }
    } else return startDemo(e);
  }
  SYNC.mode = 'api';
  const base = seedState();
  const uiState = loadUiState();
  S = Object.assign(base, {
    products: [], categories: [], reviews: [], customers: [], orders: [], notifs: [], outfits: [], restock: [],
    cart: [], wish: [], coupon: '', quote: null, user: { ...BLANK_USER }, meId: null, seq: 5000, viewed: [],
  });
  UI_KEYS.forEach((k) => { if (uiState[k] !== undefined) S[k] = uiState[k]; });
  if (!API.session()) GUEST_KEYS.forEach((k) => { if (Array.isArray(uiState[k])) S[k] = uiState[k]; });
  applyCatalog(cat);
  await loadUser();
  SYNC.ready = true;
  render();
  setInterval(() => { if (isApi() && loggedIn() && document.visibilityState === 'visible') reloadNotifs(); }, 60000);
}
boot();
