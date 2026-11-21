/* Thai Tu Fashion: Đăng nhập / đăng ký / đăng xuất, quên & đặt lại mật khẩu, menu người dùng, chặn route cần quyền (AC-AUTH-01..08).
   Giao diện dùng lại design system của prototype (Field, .card, .btn, .msgbox). Nạp sau app.js. */
const NEED_LOGIN = (h) => h === 'checkout' || h === 'notifications' || h.startsWith('account') || h.startsWith('order-') || h.startsWith('confirm-');
const isAdminRoute = (h) => h === 'admin' || h.startsWith('admin-');
const DEMO_ACC = { customer: ['minhanh@demo.thaitu.vn', 'Demo@1234'], admin: ['admin@thaitu.vn', 'Admin@1234'] };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/* ---------- ô mật khẩu: hiện/ẩn + độ mạnh (AC-AUTH-08) ---------- */
const EYE = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF = '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.5 7 10 7a9.7 9.7 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"/></svg>';
function PwField(id, label, attrs, { meter = false, extra = '' } = {}) {
  return `<div class="field"><div class="tw-flex tw-justify-between tw-items-baseline tw-gap-3"><label for="${id}">${label}</label>${extra}</div>
   <div class="pw-wrap tw-relative"><input class="input pw-input" id="${id}" type="password" ${attrs}>
    <button class="pw-eye" type="button" data-a="pwToggle" data-for="${id}" aria-label="Hiện mật khẩu" aria-pressed="false">${EYE}</button></div>
   ${meter ? `<div class="pw-meter" id="${id}-meter" data-s="0" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
   <ul class="pw-rules xs tw-flex tw-flex-wrap tw-gap-x-4 tw-gap-y-1" id="${id}-rules"><li data-r="len">Ít nhất 8 ký tự</li><li data-r="mix">Có cả chữ và số</li><li class="pw-level tw-ml-auto" id="${id}-level"></li></ul>` : ''}
   <div class="err" data-err="${id}"></div></div>`;
}
/** Điểm 0–4: dài ≥ 8, dài ≥ 12, có chữ + số, có chữ hoa/thường lẫn lộn hoặc ký tự đặc biệt. */
function pwScore(v) {
  if (!v) return 0;
  let n = 0;
  if (v.length >= 8) n += 1;
  if (v.length >= 12) n += 1;
  if (/[A-Za-z]/.test(v) && /\d/.test(v)) n += 1;
  if ((/[a-z]/.test(v) && /[A-Z]/.test(v)) || /[^A-Za-z0-9]/.test(v)) n += 1;
  return v.length < 8 ? 1 : Math.max(n, 1);
}
const PW_LEVEL = ['', 'Yếu', 'Trung bình', 'Khá', 'Mạnh'];
function updateMeter(input) {
  const m = document.getElementById(`${input.id}-meter`);
  if (!m) return;
  const v = input.value;
  const sc = pwScore(v);
  m.dataset.s = String(sc);
  const rules = document.getElementById(`${input.id}-rules`);
  rules.querySelector('[data-r=len]').classList.toggle('ok', v.length >= 8);
  rules.querySelector('[data-r=mix]').classList.toggle('ok', /[A-Za-z]/.test(v) && /\d/.test(v));
  document.getElementById(`${input.id}-level`).textContent = v ? `Độ mạnh: ${PW_LEVEL[sc] || 'Yếu'}` : '';
}
document.addEventListener('input', (e) => {
  const t = e.target;
  if (t && t.classList && t.classList.contains('pw-input')) updateMeter(t);
  if (t && t.id === 'au-email') ui.authEmail = t.value.trim(); // mang email sang màn Quên mật khẩu
});
A.pwToggle = function (el) {
  const i = document.getElementById(el.dataset.for);
  if (!i) return;
  const show = i.type === 'password';
  i.type = show ? 'text' : 'password';
  el.innerHTML = show ? EYE_OFF : EYE;
  el.setAttribute('aria-pressed', String(show));
  el.setAttribute('aria-label', show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  i.focus();
};

/* Tài khoản dùng thử chỉ có ở dữ liệu mẫu local — server báo qua /api/config (AC-AUTH-08) */
ui.demoAccounts = false;
API.config().then((c) => {
  ui.demoAccounts = Boolean(c && c.demoAccounts);
  if (ui.demoAccounts && typeof cur === 'function' && cur() === 'login' && typeof SYNC !== 'undefined' && SYNC.mode === 'api') render(true);
});

const authShell = (eyebrow, title, lede, body) => `<div class="wrap sec"><div class="auth tw-mx-auto tw-grid tw-max-w-[980px] tw-grid-cols-1 tw-gap-4 lg:tw-grid-cols-2 lg:tw-items-start">
  <div class="auth-intro tw-flex tw-flex-col tw-gap-2.5 lg:tw-row-span-2"><span class="eyebrow">${eyebrow}</span><h1 class="h-xl">${title}</h1>
   <p class="lede">${lede}</p></div>${body}
 </div></div><div style="height:var(--sec)"></div>`;

function viewLogin(mode) {
  const reg = mode === 'register';
  const demo = typeof SYNC !== 'undefined' && SYNC.mode === 'demo';
  const note = ui.authNote ? `<div class="msgbox warn" id="au-note">${esc(ui.authNote)}</div>` : '';
  const ok = ui.authOk ? `<div class="msgbox ok" id="au-ok" role="status">${esc(ui.authOk)}</div>` : '';
  const demoBox = demo
    ? `<div class="msgbox warn">Máy chủ chưa chạy nên trang đang ở <b>chế độ dự phòng</b>: dữ liệu lưu trong trình duyệt, không cần đăng nhập. <a class="tlink" href="#account">Vào tài khoản</a></div>`
    : '';
  const forgot = reg ? '' : '<a class="tlink xs" href="#forgot" id="au-forgot">Quên mật khẩu?</a>';
  return authShell(reg ? 'Tạo tài khoản' : 'Chào mừng trở lại', reg ? 'Đăng ký' : 'Đăng nhập', 'Giỏ hàng, đơn hàng, yêu thích và số đo đi theo bạn trên mọi thiết bị.',
  `<form class="card stack tw-w-full tw-max-w-[520px] !tw-gap-3.5" data-form="${reg ? 'register' : 'login'}" novalidate>${demoBox}${ok}${note}
   ${reg ? Field('au-name', 'Họ tên', '', 'autocomplete="name"') : ''}
   ${Field('au-email', 'Email', ui.authEmail || '', 'type="email" autocomplete="email" placeholder="ten@email.com"')}
   ${PwField('au-pass', 'Mật khẩu', `autocomplete="${reg ? 'new-password' : 'current-password'}"${reg ? ' placeholder="Ít nhất 8 ký tự, có cả chữ và số"' : ''}`, { meter: reg, extra: forgot })}
   <div id="au-msg" aria-live="polite"></div>
   <button class="btn block" id="au-submit" type="submit">${reg ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
   <p class="small muted">${reg ? 'Đã có tài khoản? <a class="tlink" href="#login">Đăng nhập</a>' : 'Chưa có tài khoản? <a class="tlink" href="#register">Đăng ký ngay</a>'}</p>
  </form>
  ${reg || !ui.demoAccounts || demo ? '' : `<div class="card stack auth-demo tw-w-full tw-max-w-[520px] !tw-gap-2.5"><div class="h-sm">Tài khoản dùng thử</div><p class="small muted">Chỉ có trên môi trường chạy thử với dữ liệu mẫu. Bấm để điền sẵn và đăng nhập.</p><div class="row tw-flex-wrap !tw-gap-2"><button class="btn ghost sm" type="button" data-a="demoLogin" data-k="customer">Khách hàng · Minh Anh</button><button class="btn ghost sm" type="button" data-a="demoLogin" data-k="admin">Quản trị viên</button></div></div>`}`);
}

/* ---------- Quên mật khẩu (AC-AUTH-07) ---------- */
function viewForgot() {
  const f = ui.fp || {};
  const demo = typeof SYNC !== 'undefined' && SYNC.mode === 'demo';
  return authShell('Khôi phục tài khoản', 'Quên mật khẩu', 'Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết để bạn đặt mật khẩu mới. Liên kết có hiệu lực trong thời gian ngắn và chỉ dùng được một lần.',
  `<form class="card stack tw-w-full tw-max-w-[520px] !tw-gap-3.5" data-form="forgot" novalidate>
   ${demo ? '<div class="msgbox warn">Máy chủ chưa chạy nên chưa gửi được email đặt lại mật khẩu.</div>' : ''}
   ${f.note ? `<div class="msgbox warn" id="fp-note">${esc(f.note)}</div>` : ''}
   ${f.sent ? `<div class="msgbox ok" id="fp-ok" role="status">${esc(f.sent)}${f.dev ? `<br><span class="xs">Môi trường chạy thử không gửi email thật: <a class="tlink" id="fp-dev" href="${esc(f.dev)}">mở liên kết đặt lại mật khẩu</a>.</span>` : ''}</div>` : ''}
   ${Field('fp-email', 'Email', f.email || ui.authEmail || '', 'type="email" autocomplete="email" placeholder="ten@email.com"')}
   <div id="fp-msg" aria-live="polite"></div>
   <button class="btn block" id="fp-submit" type="submit">${f.sent ? 'Gửi lại liên kết' : 'Gửi liên kết đặt lại'}</button>
   <p class="small muted">Nhớ ra mật khẩu? <a class="tlink" href="#login">Đăng nhập</a></p>
  </form>`);
}
F.forgot = async function () {
  const email = $('#fp-email').value.trim();
  setErr('fp-email', EMAIL_RE.test(email) ? '' : 'Email chưa đúng định dạng, ví dụ: ten@email.com');
  $('#fp-msg').innerHTML = '';
  if (!EMAIL_RE.test(email)) return;
  if (SYNC.mode !== 'api') { $('#fp-msg').innerHTML = '<div class="msgbox warn">Máy chủ chưa chạy, vui lòng thử lại sau.</div>'; return; }
  const b = $('#fp-submit'); b.disabled = true; b.textContent = 'Đang gửi…';
  try {
    const r = await API.post('/api/auth/forgot', { email }, { anonymous: true });
    ui.fp = { email, sent: r.message, dev: r.devResetLink || '' };
    ui.authEmail = email;
    render(true);
  } catch (e) {
    b.disabled = false; b.textContent = 'Gửi liên kết đặt lại';
    if (e.status === 422) setErr('fp-email', e.message); else $('#fp-msg').innerHTML = `<div class="msgbox bad">${esc(e.message)}</div>`;
  }
};

/* ---------- Đặt lại mật khẩu từ liên kết trong email ----------
   Supabase chuyển về: <site>/#access_token=…&refresh_token=…&type=recovery (hoặc #error=…&error_description=…).
   Token chỉ giữ trong bộ nhớ; URL được thay bằng #reset-password để không lưu token vào lịch sử trình duyệt. */
function captureAuthRedirect(h) {
  if (!/(^|&)(access_token|error|error_code)=/.test(h)) return null;
  const q = new URLSearchParams(h);
  history.replaceState(null, '', `${location.pathname}${location.search}#reset-password`);
  if (q.get('type') === 'recovery' && q.get('access_token')) { ui.recovery = q.get('access_token'); return 'reset-password'; }
  const code = q.get('error_code') || q.get('error');
  ui.recovery = null;
  ui.fp = { note: code === 'otp_expired' ? 'Liên kết đặt lại mật khẩu đã hết hạn hoặc đã được dùng. Hãy yêu cầu liên kết mới.' : 'Liên kết không hợp lệ. Hãy yêu cầu liên kết mới.' };
  history.replaceState(null, '', `${location.pathname}#forgot`);
  return 'forgot';
}
function viewReset() {
  if (!ui.recovery) {
    return authShell('Khôi phục tài khoản', 'Đặt lại mật khẩu', 'Trang này mở từ liên kết trong email đặt lại mật khẩu.',
      `<div class="card stack tw-w-full tw-max-w-[520px] !tw-gap-3.5"><div class="msgbox warn" id="rp-none">Không tìm thấy liên kết đặt lại mật khẩu hợp lệ. Hãy mở lại liên kết mới nhất trong email hoặc yêu cầu liên kết mới.</div><a class="btn block" href="#forgot">Yêu cầu liên kết mới</a></div>`);
  }
  return authShell('Khôi phục tài khoản', 'Đặt mật khẩu mới', 'Chọn mật khẩu mới cho tài khoản của bạn. Sau khi đổi, hãy đăng nhập lại bằng mật khẩu mới.',
  `<form class="card stack tw-w-full tw-max-w-[520px] !tw-gap-3.5" data-form="resetpw" novalidate>
   ${PwField('rp-pass', 'Mật khẩu mới', 'autocomplete="new-password" placeholder="Ít nhất 8 ký tự, có cả chữ và số"', { meter: true })}
   ${PwField('rp-pass2', 'Nhập lại mật khẩu mới', 'autocomplete="new-password"')}
   <div id="rp-msg" aria-live="polite"></div>
   <button class="btn block" id="rp-submit" type="submit">Đổi mật khẩu</button>
  </form>`);
}
F.resetpw = async function () {
  const p1 = $('#rp-pass').value;
  const p2 = $('#rp-pass2').value;
  const e1 = p1.length < 8 ? 'Mật khẩu cần ít nhất 8 ký tự.' : !(/[A-Za-z]/.test(p1) && /\d/.test(p1)) ? 'Mật khẩu cần có cả chữ và số.' : '';
  setErr('rp-pass', e1);
  setErr('rp-pass2', !e1 && p1 !== p2 ? 'Hai mật khẩu chưa khớp.' : '');
  $('#rp-msg').innerHTML = '';
  if (e1 || p1 !== p2) return;
  const b = $('#rp-submit'); b.disabled = true; b.textContent = 'Đang đổi mật khẩu…';
  try {
    const r = await API.post('/api/auth/reset', { token: ui.recovery, password: p1 }, { anonymous: true });
    ui.recovery = null; ui.fp = null;
    ui.authOk = r.message;
    location.hash = 'login';
  } catch (e) {
    b.disabled = false; b.textContent = 'Đổi mật khẩu';
    if (e.code === 'RESET_INVALID') { ui.recovery = null; ui.fp = { note: e.message }; location.hash = 'forgot'; return; }
    if (e.status === 422) setErr('rp-pass', e.message); else $('#rp-msg').innerHTML = `<div class="msgbox bad">${esc(e.message)}</div>`;
  }
};

/* ---------- Menu người dùng trên header (AC-AUTH-08) ---------- */
function userInitial(name, email) {
  const n = String(name || '').trim();
  if (n && n !== 'Khách') return n.split(/\s+/).pop().charAt(0).toUpperCase();
  return String(email || '?').charAt(0).toUpperCase();
}
function UserMenu() {
  const u = API.user();
  if (!u) return '';
  const name = (S.user && S.user.name && S.user.name !== 'Khách' ? S.user.name : u.name) || u.email;
  const item = (href, label) => `<a role="menuitem" href="#${href}">${label}</a>`;
  return `<details class="umenu tw-relative" id="umenu"><summary class="iconbtn" aria-label="Tài khoản của ${esc(name)}" aria-haspopup="menu"><span class="avatar" aria-hidden="true">${esc(userInitial(name, u.email))}</span></summary>
  <div class="umenu-pop" role="menu">
   <div class="umenu-who"><b>${esc(name)}</b><span class="xs muted">${esc(u.email)}</span></div>
   ${item('account', 'Tài khoản của tôi')}${item('account-orders', 'Đơn hàng')}${item('wishlist', 'Yêu thích')}${item('notifications', 'Thông báo')}${u.role === 'admin' ? item('admin', 'Trang quản trị') : ''}
   <button role="menuitem" type="button" data-a="logout">Đăng xuất</button>
  </div></details>`;
}
document.addEventListener('click', (e) => { const m = document.getElementById('umenu'); if (m && m.open && (!m.contains(e.target) || e.target.closest('.umenu-pop a, .umenu-pop button'))) m.open = false; });
document.addEventListener('keydown', (e) => { const m = document.getElementById('umenu'); if (e.key === 'Escape' && m && m.open) { m.open = false; m.querySelector('summary').focus(); } });

/** Khối phiên đăng nhập trong trang tài khoản (AC-AUTH-05). */
function SessionBox() {
  const u = API.user();
  if (!u) return '';
  return `<div class="card sess tw-mb-3 tw-flex tw-flex-wrap tw-items-center tw-justify-between tw-gap-3"><div class="stack !tw-gap-0.5"><span class="xs muted">Đăng nhập bằng</span><b>${esc(u.email)}</b></div><div class="acts tw-flex tw-flex-wrap tw-gap-2">${u.role === 'admin' ? '<a class="btn ghost sm" href="#admin">Trang quản trị</a>' : ''}<button class="btn ghost sm" data-a="logout">Đăng xuất</button></div></div>`;
}

function setBusy(on, label) {
  const b = $('#au-submit');
  if (!b) return;
  b.disabled = on;
  if (on) { b.dataset.txt = b.textContent; b.textContent = label || 'Đang xử lý…'; } else if (b.dataset.txt) b.textContent = b.dataset.txt;
}

function authFieldErrors(e) {
  const map = { email: 'au-email', password: 'au-pass', fullName: 'au-name' };
  let hit = false;
  (Array.isArray(e.details) ? e.details : []).forEach((d) => { if (map[d.field]) { setErr(map[d.field], d.message); hit = true; } });
  if (!hit) $('#au-msg').innerHTML = `<div class="msgbox bad">${esc(e.message)}</div>`;
}

F.login = async function () {
  const email = $('#au-email').value.trim();
  const password = $('#au-pass').value;
  setErr('au-email', EMAIL_RE.test(email) ? '' : 'Email chưa đúng định dạng, ví dụ: ten@email.com');
  setErr('au-pass', password ? '' : 'Nhập mật khẩu.');
  $('#au-msg').innerHTML = '';
  if (!EMAIL_RE.test(email) || !password) return;
  if (SYNC.mode !== 'api') { $('#au-msg').innerHTML = '<div class="msgbox warn">Chế độ demo không có đăng nhập.</div>'; return; }
  setBusy(true, 'Đang đăng nhập…');
  try {
    const r = await API.post('/api/auth/login', { email, password }, { anonymous: true });
    await afterAuth(r);
  } catch (e) {
    authFieldErrors(e);
  } finally {
    setBusy(false);
  }
};

F.register = async function () {
  const name = $('#au-name').value.trim();
  const email = $('#au-email').value.trim();
  const password = $('#au-pass').value;
  const errs = {
    'au-name': name.length < 2 ? 'Nhập họ tên.' : '',
    'au-email': EMAIL_RE.test(email) ? '' : 'Email chưa đúng định dạng, ví dụ: ten@email.com',
    'au-pass': password.length < 8 ? 'Mật khẩu cần ít nhất 8 ký tự.' : !(/[A-Za-z]/.test(password) && /\d/.test(password)) ? 'Mật khẩu cần có cả chữ và số.' : '',
  };
  Object.entries(errs).forEach(([k, v]) => setErr(k, v));
  $('#au-msg').innerHTML = '';
  if (Object.values(errs).some(Boolean)) return;
  if (SYNC.mode !== 'api') { $('#au-msg').innerHTML = '<div class="msgbox warn">Chế độ demo không có đăng ký.</div>'; return; }
  setBusy(true, 'Đang tạo tài khoản…');
  try {
    const r = await API.post('/api/auth/register', { email, password, fullName: name }, { anonymous: true });
    if (!r.accessToken) { $('#au-msg').innerHTML = '<div class="msgbox ok">Đã tạo tài khoản. Hãy mở email để xác nhận rồi đăng nhập.</div>'; return; }
    await afterAuth(r);
  } catch (e) {
    authFieldErrors(e);
  } finally {
    setBusy(false);
  }
};

A.demoLogin = function (el) {
  const [email, pass] = DEMO_ACC[el.dataset.k];
  $('#au-email').value = email;
  $('#au-pass').value = pass;
  F.login();
};

A.logout = async function () {
  if (SYNC.mode === 'api') {
    try { await API.post('/api/auth/logout'); } catch (e) { /* JWT không trạng thái: vẫn xoá phiên ở client */ }
  }
  API.clear();
  await onSignedOut();
  toast('Đã đăng xuất.');
  if (cur() === 'home') render(); else location.hash = 'home';
};

/** Gắn khối phiên + nút đăng xuất vào trang tài khoản và sidebar quản trị. */
(function decorate() {
  const _viewAccount = viewAccount;
  viewAccount = function (tab) {
    const html = _viewAccount(tab);
    return SYNC.mode === 'api' ? html.replace('<div style="min-width:0">', '<div style="min-width:0">' + SessionBox()) : html;
  };
  const _viewAdmin = viewAdmin;
  viewAdmin = function (h) {
    const html = _viewAdmin(h);
    if (SYNC.mode !== 'api') return html;
    const u = API.user();
    return html.replace('Tính trực tiếp từ dữ liệu demo đang chạy.', 'Tính trực tiếp từ dữ liệu trên Supabase.').replace('<span class="xs">Khu quản trị demo, không cần đăng nhập</span>',
      `<span class="xs">${esc(u ? u.email : '')}</span><button class="tlink" data-a="logout" style="color:#c7c7cc">Đăng xuất</button>`);
  };
  const _Header = Header;
  Header = function (c) {
    const html = _Header(c);
    if (SYNC.mode !== 'api') return html;
    if (!API.session()) return html.replace('href="#account" aria-label="Tài khoản"', 'href="#login" aria-label="Đăng nhập"');
    return html.replace(/<a class="iconbtn" href="#account" aria-label="Tài khoản">[\s\S]*?<\/a>/, UserMenu());
  };
})();
