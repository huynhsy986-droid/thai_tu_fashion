/* Thai Tu Fashion: trang Giới thiệu (#about), Liên hệ (#contact) và tab quản trị "Liên hệ" (#admin-contacts).
   Issue #6 · AC-CON-01..03 · TV3 – huynhsy986-droid
   - Dùng class sẵn có của design system (.wrap .sec .card .panel .field .input .btn .msgbox details.ac .stats)
     + utility Tailwind (tw-*) cho bố cục.
   - Chạy được cả khi API tắt (chế độ demo): tin nhắn lưu trong trình duyệt (S.contacts).
   Nạp trước sync.js (sync.js có thể khởi động ngay ở chế độ ?demo); chỉ gọi isApi()/API lúc chạy. */

/* Thông tin liên hệ hiển thị trên web — sửa tại đây khi có số liệu chính thức */
const SHOP_INFO = {
  email: 'hello@thaitu.vn',
  hours: 'Thứ 2 – Chủ nhật · 9:00 – 21:00',
  showroom: 'Showroom Thai Tu · Quận 1, TP. Hồ Chí Minh',
  reply: 'Phản hồi trong vòng 24 giờ làm việc',
};
const CONTACT_TOPICS = [
  ['order', 'Đơn hàng & giao hàng'],
  ['size', 'Tư vấn size'],
  ['product', 'Sản phẩm & chất liệu'],
  ['return', 'Đổi trả & hoàn tiền'],
  ['partner', 'Hợp tác'],
  ['other', 'Khác'],
];
const CONTACT_STATUS = { new: ['Mới', 's-pending'], read: ['Đã xem', 's-processing'], replied: ['Đã trả lời', 's-delivered'] };
const PHONE_RE = /^0\d{9}$/;
icons.mail = '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>';

/* Quyền riêng tư: nội dung đúng cho cả 2 chế độ (máy chủ Supabase / demo trong trình duyệt) */
INFO.privacy = ['Quyền riêng tư', [
  'Khi bạn đăng nhập, hồ sơ, giỏ hàng, đơn hàng, yêu thích và số đo được lưu trên máy chủ của Thai Tu (Supabase) và chỉ tài khoản của bạn xem được.',
  'Tin nhắn gửi qua trang Liên hệ chỉ dùng để trả lời yêu cầu của bạn và chỉ quản trị viên đọc được.',
  'Ảnh tải lên Visual Search và Virtual Try-On chỉ nằm trong bộ nhớ của trang, không gửi lên máy chủ và mất đi khi bạn xoá hoặc tải lại trang.',
  'Chúng tôi dùng Google Analytics (ẩn địa chỉ IP) để đếm lượt xem trang và Sentry để ghi nhận lỗi kỹ thuật; hai công cụ này không nhận mật khẩu hay nội dung đơn hàng của bạn.',
  'Khi máy chủ tạm thời không truy cập được, trang chạy chế độ dự phòng và lưu dữ liệu ngay trong trình duyệt của bạn.',
]];
const ORDER_RE = /^TT\d{4,}$/;

/* ---------- Giới thiệu ---------- */
function viewAbout() {
  const prods = live().length;
  const cats = S.categories.length;
  const rv = S.reviews.filter((r) => r.status === 'visible');
  const avg = rv.length ? rv.reduce((s, r) => s + r.rating, 0) / rv.length : 0;
  const stat = (n, l) => `<div class="stat"><span class="h-lg num">${n}</span><span class="small muted">${l}</span></div>`;
  const value = (t, d, tone) => `<div class="tw-flex tw-flex-col tw-gap-2 tw-p-6 tw-rounded-ds" style="background:var(--${tone})"><span class="h-sm">${t}</span><p class="small tw-text-ink-soft">${d}</p></div>`;
  return `<section class="wrap sec">
  <div class="tw-grid tw-grid-cols-1 tw-gap-8 lg:tw-grid-cols-2 lg:tw-items-center">
   <div class="tw-flex tw-flex-col tw-gap-4">
    <span class="eyebrow">Về Thai Tu Fashion</span>
    <h1 class="h-xl">Mặc thoải mái, đẹp kiểu Seoul</h1>
    <p class="lede">Thai Tu Fashion là thương hiệu thời trang unisex lấy cảm hứng từ đường phố Seoul: form rộng dễ mặc, bảng màu pastel nhẹ nhàng và chất liệu dày dặn để mặc được lâu.</p>
    <p class="lede">Mỗi thứ Sáu chúng tôi ra mắt một đợt drop nhỏ, số lượng có hạn, để bạn luôn có món mới mà không phải chạy theo xu hướng.</p>
    <div class="row tw-mt-2"><a class="btn" href="#shop-new">Xem hàng mới</a><a class="btn ghost" href="#contact">Liên hệ với chúng tôi</a></div>
   </div>
   <div class="tw-grid tw-grid-cols-2 tw-gap-3">
    <img class="tw-w-full tw-aspect-[3/4] tw-object-cover tw-rounded-ds" src="img/look-1.webp" alt="Phối đồ áo khoác dáng rộng tông kem" width="600" height="800" loading="lazy">
    <img class="tw-w-full tw-aspect-[3/4] tw-object-cover tw-rounded-ds tw-mt-10" src="img/look-3.webp" alt="Phối đồ len pastel phong cách Seoul" width="600" height="800" loading="lazy">
   </div>
  </div>
 </section>
 <section class="tw-bg-grey"><div class="wrap sec tight">
  <div class="stats" id="about-stats">${stat(prods, 'sản phẩm đang bán')}${stat(cats, 'danh mục')}${stat(rv.length.toLocaleString('vi-VN'), 'đánh giá từ khách')}${stat(avg ? avg.toFixed(1).replace('.', ',') + '★' : '—', 'điểm trung bình')}</div>
 </div></section>
 <section class="wrap sec">
  <div class="sec-head"><div><span class="eyebrow">Điều chúng tôi theo đuổi</span><h2 class="h-lg">Ba giá trị</h2></div></div>
  <div class="tw-grid tw-grid-cols-1 tw-gap-3 md:tw-grid-cols-3">
   ${value('Unisex & dễ phối', 'Form rộng, size rõ ràng theo số đo. Một món đồ, ai mặc cũng hợp và phối được nhiều kiểu.', 'lav')}
   ${value('Chất liệu bền', 'Cotton dày, len, denim được chọn để giữ dáng sau nhiều lần giặt. Chi tiết chất liệu có trên từng sản phẩm.', 'mint')}
   ${value('Mua sắm thông minh', 'Smart Studio giúp bạn chọn size, phối outfit, tìm đồ bằng ảnh và thử đồ trước khi mua.', 'sky')}
  </div>
 </section>
 <section class="wrap sec tight">
  <div class="tw-grid tw-grid-cols-1 tw-gap-6 lg:tw-grid-cols-2">
   <div class="card tw-flex tw-flex-col tw-gap-3"><span class="eyebrow">Cam kết</span><h2 class="h-md">Mua online yên tâm</h2>
    <ul class="tw-flex tw-flex-col tw-gap-2 small tw-text-ink-soft">
     <li>• Miễn phí giao hàng cho đơn từ 1.500.000₫, giao nhanh 1–2 ngày ở thành phố lớn.</li>
     <li>• Đổi size miễn phí trong 7 ngày khi còn nguyên tem mác.</li>
     <li>• Thanh toán khi nhận hàng hoặc trực tuyến; theo dõi đơn ngay trong tài khoản.</li>
    </ul>
    <div class="row"><a class="tlink" href="#info-shipping">Chính sách giao hàng</a><a class="tlink" href="#info-returns">Chính sách đổi trả</a></div>
   </div>
   <div class="card tw-flex tw-flex-col tw-gap-3"><span class="eyebrow">Ghé thăm</span><h2 class="h-md">${esc(SHOP_INFO.showroom)}</h2>
    <p class="small tw-text-ink-soft">${esc(SHOP_INFO.hours)}</p>
    <p class="small tw-text-ink-soft">Email: <a class="tlink" href="mailto:${SHOP_INFO.email}">${SHOP_INFO.email}</a></p>
    <div class="row"><a class="btn ghost sm" href="#contact">Gửi tin nhắn</a></div>
   </div>
  </div>
 </section>`;
}

/* ---------- Liên hệ ---------- */
function viewContact() {
  const u = typeof API !== 'undefined' && API.user ? API.user() : null;
  const pf = S.user || {};
  const d = ui.contact || {};
  const name = d.name ?? (u && pf.name !== 'Khách' ? pf.name || '' : '');
  const email = d.email ?? (u ? u.email || '' : '');
  const sel = d.topic || 'order';
  const sent = ui.contactSent;
  const faq = [
    ['Bao lâu tôi nhận được hàng?', 'Giao tiêu chuẩn 3–5 ngày làm việc, giao nhanh 1–2 ngày tại thành phố lớn. Bạn theo dõi trạng thái trong Tài khoản → Đơn hàng.'],
    ['Tôi muốn đổi size thì làm thế nào?', 'Gửi tin nhắn chủ đề "Đổi trả" kèm mã đơn trong 7 ngày kể từ khi nhận hàng, sản phẩm còn nguyên tem mác.'],
    ['Làm sao chọn đúng size?', 'Dùng <a class="tlink" href="#size">Size Advisor</a> với số đo của bạn hoặc xem bảng size trên trang sản phẩm.'],
    ['Tôi có thể huỷ đơn không?', 'Bạn tự huỷ được khi đơn còn ở trạng thái "Chờ xác nhận". Sau đó vui lòng nhắn cho chúng tôi kèm mã đơn.'],
  ];
  return `<section class="wrap sec">
  <div class="tw-grid tw-grid-cols-1 tw-gap-8 lg:tw-grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:tw-items-start">
   <div class="tw-flex tw-flex-col tw-gap-4">
    <span class="eyebrow">Liên hệ</span>
    <h1 class="h-xl">Chúng tôi luôn sẵn lòng hỗ trợ</h1>
    <p class="lede">Hỏi về đơn hàng, size, chất liệu hay hợp tác — để lại lời nhắn, đội ngũ Thai Tu sẽ trả lời qua email.</p>
    <dl class="card tw-grid tw-grid-cols-1 tw-gap-4 tw-mt-2">
     <div><dt class="xs muted">Email</dt><dd class="tw-m-0 h-sm"><a href="mailto:${SHOP_INFO.email}">${SHOP_INFO.email}</a></dd></div>
     <div><dt class="xs muted">Giờ làm việc</dt><dd class="tw-m-0 small">${esc(SHOP_INFO.hours)}</dd></div>
     <div><dt class="xs muted">Showroom</dt><dd class="tw-m-0 small">${esc(SHOP_INFO.showroom)}</dd></div>
     <div><dt class="xs muted">Thời gian phản hồi</dt><dd class="tw-m-0 small">${esc(SHOP_INFO.reply)}</dd></div>
    </dl>
   </div>
   <form class="card stack !tw-gap-4" data-form="contact" novalidate aria-labelledby="ct-title">
    <h2 class="h-md" id="ct-title">Gửi tin nhắn</h2>
    ${sent ? `<div class="msgbox ok" id="ct-ok" role="status">Cảm ơn bạn! Tin nhắn đã được gửi, chúng tôi sẽ phản hồi qua email <b>${esc(sent)}</b>.</div>` : ''}
    <div class="tw-grid tw-grid-cols-1 tw-gap-4 md:tw-grid-cols-2">
     ${Field('ct-name', 'Họ tên *', name, 'autocomplete="name" maxlength="80" required')}
     ${Field('ct-email', 'Email *', email, 'type="email" autocomplete="email" placeholder="ten@email.com" required')}
     ${Field('ct-phone', 'Số điện thoại', d.phone || '', 'type="tel" autocomplete="tel" inputmode="numeric" placeholder="0901234567"')}
     <div class="field"><label for="ct-topic">Chủ đề *</label><select class="input" id="ct-topic">${CONTACT_TOPICS.map(([v, l]) => `<option value="${v}" ${v === sel ? 'selected' : ''}>${l}</option>`).join('')}</select><div class="err" data-err="ct-topic"></div></div>
    </div>
    ${Field('ct-order', 'Mã đơn hàng (nếu có)', d.orderCode || '', 'placeholder="TT1234" autocapitalize="characters" maxlength="12"')}
    <div class="field"><label for="ct-msg">Nội dung *</label><textarea class="input" id="ct-msg" rows="5" maxlength="2000" placeholder="Bạn cần hỗ trợ điều gì?" required>${esc(d.message || '')}</textarea><div class="tw-flex tw-justify-between tw-gap-3"><div class="err" data-err="ct-msg"></div><span class="xs muted num" id="ct-count">${(d.message || '').length}/2000</span></div></div>
    <div id="ct-err" aria-live="polite"></div>
    <button class="btn block" id="ct-submit" type="submit">Gửi tin nhắn</button>
    <p class="xs muted">Thông tin chỉ dùng để trả lời yêu cầu của bạn. Xem <a class="tlink" href="#info-privacy">Quyền riêng tư</a>.</p>
   </form>
  </div>
 </section>
 <section class="wrap sec tight"><div class="tw-max-w-prose">
  <div class="sec-head"><div><span class="eyebrow">Câu hỏi thường gặp</span><h2 class="h-lg">Có thể bạn đang tìm</h2></div></div>
  ${faq.map(([q, a]) => `<details class="ac"><summary>${q}</summary><div>${a}</div></details>`).join('')}
 </div></section>`;
}

/** Kiểm tra form liên hệ phía trình duyệt — cùng quy tắc & câu chữ với API (AC-CON-01). */
function readContactForm() {
  const v = {
    name: $('#ct-name').value.trim(),
    email: $('#ct-email').value.trim(),
    phone: $('#ct-phone').value.replace(/\s/g, ''),
    topic: $('#ct-topic').value,
    orderCode: $('#ct-order').value.trim().toUpperCase(),
    message: $('#ct-msg').value.trim(),
  };
  const errs = {
    'ct-name': v.name.length < 2 ? 'Nhập họ tên.' : '',
    'ct-email': !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email) ? 'Email chưa đúng định dạng, ví dụ: ten@email.com' : '',
    'ct-phone': v.phone && !PHONE_RE.test(v.phone) ? 'Số điện thoại gồm 10 số, bắt đầu bằng 0.' : '',
    'ct-order': v.orderCode && !ORDER_RE.test(v.orderCode) ? 'Mã đơn có dạng TT1234.' : '',
    'ct-msg': v.message.length < 10 ? 'Nội dung cần ít nhất 10 ký tự.' : '',
  };
  Object.entries(errs).forEach(([k, m]) => setErr(k, m));
  const first = Object.keys(errs).find((k) => errs[k]);
  if (first) { const el = document.getElementById(first); if (el) el.focus(); return null; }
  return v;
}

F.contact = async function () {
  const v = readContactForm();
  if (!v) return;
  const btn = $('#ct-submit');
  if (btn) { btn.disabled = true; btn.textContent = 'Đang gửi…'; }
  $('#ct-err').innerHTML = '';
  try {
    if (typeof isApi === 'function' && isApi()) {
      await API.post('/api/contact', v);
    } else {
      S.contacts = S.contacts || [];
      S.contacts.unshift({ id: 'c' + Date.now(), ...v, status: 'new', createdAt: new Date().toISOString() });
      commit();
    }
    ui.contact = {};
    ui.contactSent = v.email;
    if (typeof track === 'function') track('generate_lead', { topic: v.topic });
    render(true);
    const ok = $('#ct-ok');
    if (ok) ok.scrollIntoView({ block: 'center' });
  } catch (e) {
    if (btn) { btn.disabled = false; btn.textContent = 'Gửi tin nhắn'; }
    const map = { name: 'ct-name', email: 'ct-email', phone: 'ct-phone', message: 'ct-msg' };
    if (e.status === 422 && e.details && map[e.details]) setErr(map[e.details], e.message);
    else $('#ct-err').innerHTML = `<div class="msgbox bad">${esc(e.status === 429 || e.status === 422 ? e.message : 'Chưa gửi được tin nhắn, vui lòng thử lại.')}</div>`;
  }
};

/* Giữ nội dung đang nhập khi trang vẽ lại; đếm ký tự */
document.addEventListener('input', (ev) => {
  const t = ev.target;
  if (!t || !t.id || !t.id.startsWith('ct-')) return;
  ui.contact = ui.contact || {};
  const key = { 'ct-name': 'name', 'ct-email': 'email', 'ct-phone': 'phone', 'ct-order': 'orderCode', 'ct-msg': 'message', 'ct-topic': 'topic' }[t.id];
  if (key) ui.contact[key] = t.value;
  if (t.id === 'ct-msg') { const c = $('#ct-count'); if (c) c.textContent = `${t.value.length}/2000`; }
  if (ui.contactSent) ui.contactSent = '';
});
document.addEventListener('change', (ev) => { if (ev.target && ev.target.id === 'ct-topic') { ui.contact = ui.contact || {}; ui.contact.topic = ev.target.value; } });

/* ---------- Quản trị: tin nhắn liên hệ (AC-CON-02) ---------- */
const fmtDT = (iso) => { try { return new Date(iso).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } };
const topicLabel = (t) => (CONTACT_TOPICS.find((x) => x[0] === t) || [t, t])[1];

function admContacts() {
  const f = ui.adm.cf || 'all';
  const all = S.contacts || [];
  const l = all.filter((c) => f === 'all' || c.status === f);
  const unread = all.filter((c) => c.status === 'new').length;
  const loading = ui.adm.contactsLoading;
  return `<div class="adm-head"><div><h1 class="h-lg">Liên hệ</h1><p class="small muted num">${all.length} tin nhắn · ${unread} chưa đọc</p></div><button class="btn ghost sm" data-a="admCRefresh">Tải lại</button></div>
 <div class="chips">${[['all', 'Tất cả'], ['new', 'Mới'], ['read', 'Đã xem'], ['replied', 'Đã trả lời']].map(([v, t]) => `<button class="chip ${f === v ? 'on' : ''}" data-a="admCF" data-v="${v}">${t}</button>`).join('')}</div>
 <div class="panel" style="padding:0"><div class="tbl-wrap"><table class="t"><thead><tr><th>Thời gian</th><th>Khách</th><th>Chủ đề</th><th>Nội dung</th><th>Trạng thái</th><th></th></tr></thead><tbody>
 ${loading ? '<tr><td colspan="6" class="muted">Đang tải…</td></tr>' : l.length ? l.map((c) => {
    const st = CONTACT_STATUS[c.status] || CONTACT_STATUS.new;
    const next = c.status === 'new' ? ['read', 'Đánh dấu đã xem'] : c.status === 'read' ? ['replied', 'Đã trả lời'] : ['new', 'Mở lại'];
    return `<tr${c.status === 'new' ? ' style="font-weight:600"' : ''}><td class="num" style="white-space:nowrap">${fmtDT(c.createdAt)}</td>
    <td style="min-width:170px"><div>${esc(c.name)}</div><a class="xs tlink" href="mailto:${esc(c.email)}?subject=${encodeURIComponent('Thai Tu Fashion phản hồi: ' + topicLabel(c.topic))}" data-a="admCReply" data-id="${esc(c.id)}">${esc(c.email)}</a>${c.phone ? `<div class="xs muted num">${esc(c.phone)}</div>` : ''}</td>
    <td style="white-space:nowrap">${esc(topicLabel(c.topic))}${c.orderCode ? `<div class="xs"><a class="tlink" href="#admin-orders">${esc(c.orderCode)}</a></div>` : ''}</td>
    <td style="min-width:260px;font-weight:400;white-space:pre-line">${esc(c.message)}</td>
    <td><span class="status ${st[1]}">${st[0]}</span></td>
    <td style="white-space:nowrap"><button class="tlink" data-a="admCS" data-id="${esc(c.id)}" data-v="${next[0]}">${next[1]}</button> &nbsp; <button class="tlink danger" data-a="admCD" data-id="${esc(c.id)}">Xoá</button></td></tr>`;
  }).join('') : '<tr><td colspan="6" class="muted">Chưa có tin nhắn nào.</td></tr>'}
 </tbody></table></div></div>`;
}

async function loadAdminContacts() {
  if (!(typeof isApi === 'function' && isApi() && typeof API !== 'undefined' && API.user() && API.user().role === 'admin')) return;
  ui.adm.contactsLoading = !S.contacts;
  try {
    const r = await API.get('/api/admin/contacts');
    S.contacts = r.items;
    ui.adm.contactsUnread = r.unread;
  } catch (e) { apiFail(e); } finally { ui.adm.contactsLoading = false; }
  if (cur() === 'admin-contacts') render(true);
  else badgeContacts();
}
function badgeContacts() {
  const n = (S.contacts || []).filter((c) => c.status === 'new').length;
  const a = document.querySelector('.adm-side a[href="#admin-contacts"]');
  if (!a) return;
  let b = a.querySelector('.count');
  if (!b) { b = document.createElement('span'); b.className = 'count'; a.appendChild(b); }
  b.textContent = n ? String(n) : '';
  b.hidden = !n;
}
async function setContactStatus(id, status) {
  const c = (S.contacts || []).find((x) => x.id === id);
  if (!c) return;
  if (typeof isApi === 'function' && isApi()) {
    const nc = await API.patch(`/api/admin/contacts/${encodeURIComponent(id)}`, { status });
    Object.assign(c, nc);
  } else { c.status = status; commit(); }
}

A.admCF = (el) => { ui.adm.cf = el.dataset.v; render(true); };
A.admCRefresh = () => loadAdminContacts().then(() => toast('Đã tải lại tin nhắn.'));
A.admCS = async (el) => {
  try { await setContactStatus(el.dataset.id, el.dataset.v); render(true); toast('Đã cập nhật trạng thái.'); } catch (e) { apiFail(e); }
};
A.admCReply = (el) => { const c = (S.contacts || []).find((x) => x.id === el.dataset.id); if (c && c.status !== 'replied') setContactStatus(c.id, 'read').then(() => render(true)).catch(() => {}); return true; };
A.admCD = (el) => openModal(`<h2 class="h-md">Xoá tin nhắn này?</h2><p class="small muted" style="margin:8px 0 16px">Thao tác không hoàn tác được.</p><div class="acts"><button class="btn ghost" data-a="closeModal">Giữ lại</button><button class="btn" data-a="admCDo" data-id="${esc(el.dataset.id)}">Xoá</button></div>`);
A.admCDo = async (el) => {
  const id = el.dataset.id;
  try {
    if (typeof isApi === 'function' && isApi()) await API.del(`/api/admin/contacts/${encodeURIComponent(id)}`);
    S.contacts = (S.contacts || []).filter((c) => c.id !== id);
    if (!isApi()) commit();
    closeModal(); render(true); toast('Đã xoá tin nhắn.');
  } catch (e) { apiFail(e); }
};

/* Tải tin nhắn khi admin mở khu quản trị */
window.addEventListener('hashchange', () => { if (cur() === 'admin-contacts' || cur() === 'admin') loadAdminContacts(); });
document.addEventListener('thaitu:ready', () => { if (cur().startsWith('admin')) loadAdminContacts(); });
