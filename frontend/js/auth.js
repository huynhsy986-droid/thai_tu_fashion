/* Thai Tu Fashion: Đăng nhập / đăng ký / đăng xuất và chặn route cần quyền (AC-AUTH-01..05).
   Giao diện dùng lại design system của prototype (Field, .card, .btn, .msgbox). Nạp sau app.js. */
const NEED_LOGIN = (h) => h === 'checkout' || h === 'notifications' || h.startsWith('account') || h.startsWith('order-') || h.startsWith('confirm-');
const isAdminRoute = (h) => h === 'admin' || h.startsWith('admin-');
const DEMO_ACC = { customer: ['minhanh@demo.thaitu.vn', 'Demo@1234'], admin: ['admin@thaitu.vn', 'Admin@1234'] };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function viewLogin(mode) {
  const reg = mode === 'register';
  const demo = typeof SYNC !== 'undefined' && SYNC.mode === 'demo';
  const note = ui.authNote ? `<div class="msgbox warn" id="au-note">${esc(ui.authNote)}</div>` : '';
  const demoBox = demo
    ? `<div class="msgbox warn">Máy chủ chưa chạy nên trang đang ở <b>chế độ demo</b>: dữ liệu lưu trong trình duyệt, không cần đăng nhập. <a class="tlink" href="#account">Vào tài khoản demo</a></div>`
    : '';
  return `<div class="wrap sec"><div class="auth tw-mx-auto tw-grid tw-max-w-[980px] tw-grid-cols-1 tw-gap-4 lg:tw-grid-cols-2 lg:tw-items-start">
  <div class="auth-intro tw-flex tw-flex-col tw-gap-2.5 lg:tw-row-span-2"><span class="eyebrow">${reg ? 'Tạo tài khoản' : 'Chào mừng trở lại'}</span><h1 class="h-xl">${reg ? 'Đăng ký' : 'Đăng nhập'}</h1>
   <p class="lede">Giỏ hàng, đơn hàng, yêu thích và số đo đi theo bạn trên mọi thiết bị.</p></div>
  <form class="card stack tw-w-full tw-max-w-[520px] !tw-gap-3.5" data-form="${reg ? 'register' : 'login'}" novalidate>${demoBox}${note}
   ${reg ? Field('au-name', 'Họ tên', '', 'autocomplete="name"') : ''}
   ${Field('au-email', 'Email', '', 'type="email" autocomplete="email" placeholder="ten@email.com"')}
   ${Field('au-pass', 'Mật khẩu', '', `type="password" autocomplete="${reg ? 'new-password' : 'current-password'}"${reg ? ' placeholder="Ít nhất 8 ký tự, có cả chữ và số"' : ''}`)}
   <div id="au-msg" aria-live="polite"></div>
   <button class="btn block" id="au-submit" type="submit">${reg ? 'Tạo tài khoản' : 'Đăng nhập'}</button>
   <p class="small muted">${reg ? 'Đã có tài khoản? <a class="tlink" href="#login">Đăng nhập</a>' : 'Chưa có tài khoản? <a class="tlink" href="#register">Đăng ký ngay</a>'}</p>
  </form>
  ${reg ? '' : `<div class="card stack auth-demo tw-w-full tw-max-w-[520px] !tw-gap-2.5"><div class="h-sm">Tài khoản demo</div><p class="small muted">Dữ liệu giả lập trên Supabase. Bấm để điền sẵn và đăng nhập.</p><div class="row tw-flex-wrap !tw-gap-2"><button class="btn ghost sm" type="button" data-a="demoLogin" data-k="customer">Khách hàng · Minh Anh</button><button class="btn ghost sm" type="button" data-a="demoLogin" data-k="admin">Quản trị viên</button></div></div>`}
 </div></div><div style="height:var(--sec)"></div>`;
}

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
    if (SYNC.mode === 'api' && !API.session()) return html.replace('href="#account" aria-label="Tài khoản"', 'href="#login" aria-label="Đăng nhập"');
    return html;
  };
})();
