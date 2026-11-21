#!/usr/bin/env python3
"""Sinh wireframe low-fi (HTML) cho các trang chính — TV1 lequangkhanh6002-pixel (Issue #1).
   python3 docs/wireframes/src/build.py  → docs/wireframes/src/wireframes.html
   node docs/wireframes/src/render.mjs   → docs/wireframes/*.png
Ký hiệu: [IMG] khối ảnh · ▭ nút · ▤ ô nhập · ≡ menu. Không màu, không font thật — chỉ bố cục."""
import html, pathlib
OUT = pathlib.Path(__file__).with_name('wireframes.html')

def box(label='', cls='', style='', inner=''):
    return f'<div class="b {cls}" style="{style}"><span class="l">{html.escape(label)}</span>{inner}</div>'
def img(label='IMG', h=120, style=''): return box(f'[{label}]', 'img', f'height:{h}px;{style}')
def txt(n=3, w=None): return ''.join(f'<i class="t" style="width:{w or (90 - i*12)}%"></i>' for i in range(n))
def btn(label, dark=False): return f'<span class="btn{" dk" if dark else ""}">{html.escape(label)}</span>'
def inp(label): return f'<div class="in"><small>{html.escape(label)}</small><b></b></div>'
def row(*xs, gap=12, cols=None, style=''):
    g = f'grid-template-columns:{cols};' if cols else f'grid-template-columns:repeat({len(xs)},1fr);'
    return f'<div class="g" style="{g}gap:{gap}px;{style}">{"".join(f"<div>{x}</div>" for x in xs)}</div>'
def h(t, lvl=2): return f'<div class="h{lvl}">{html.escape(t)}</div>'
def note(n, t): return f'<span class="n" title="{html.escape(t)}">{n}</span>'

def header(m):
    if m: return '<div class="hdr">' + box('LOGO', 'lg') + '<span class="ic">⌕ 🔔 👤 ≡</span></div>'
    return '<div class="ann">Thanh thông báo chạy: miễn phí giao hàng · drop thứ Sáu · mã giảm giá</div><div class="hdr">' + box('LOGO', 'lg') + '<span class="nav">Hàng mới · Cửa hàng · Áo · Áo khoác · Quần & váy · Đầm · Giày · Phụ kiện · Trang sức · ● Smart Studio</span><span class="ic">⌕ 🔔 👤 ♡ 🛍</span></div>'
def footer(m):
    cols = ['MUA SẮM', 'SMART STUDIO', 'HỖ TRỢ: Giới thiệu · Liên hệ · Giao hàng · Đổi trả']
    news = row(box('Nhận tin đợt drop mới', inner=txt(1)), box('', inner=inp('Email') + btn('Đăng ký', True)), cols='1fr' if m else '1fr 1fr')
    return '<div class="ftr">' + news + row(box('LOGO + mô tả thương hiệu', inner=txt(2)), *[box(c, inner=txt(4, 60)) for c in cols], cols='1fr 1fr' if m else '2fr 1fr 1fr 1fr') + '<div class="cp">© 2026 Thai Tu Fashion · Về Thai Tu · Liên hệ · Quyền riêng tư</div></div>'
def tabbar(m): return '<div class="tab">⌂ Trang chủ · ▦ Cửa hàng · ✦ Studio · ♡ Yêu thích · 🛍 Giỏ</div>' if m else ''

def card(): return box('', 'card', inner=img('Ảnh SP', 150) + txt(2) + '<i class="t" style="width:40%;background:#999"></i>')
def grid(n, cols): return row(*[card() for _ in range(n)], cols=f'repeat({cols},1fr)')

P = {}
def page(key, title, desc, notes, fn):
    P[key] = (title, desc, notes, fn)

page('01-home', 'Trang chủ', 'Hero chiến dịch, danh mục, sản phẩm nổi bật, outfit theo dịp, lookbook.',
  ['Hero ảnh lớn + 2 CTA (Mua ngay / Smart Studio)', 'Lưới danh mục 4→8 cột', 'Sản phẩm bán chạy dạng lưới thẻ', 'Lookbook / outfit theo dịp'],
  lambda m: img('HERO chiến dịch · tiêu đề · 2 nút CTA', 260 if m else 380) + note(1, '') +
    h('Danh mục') + note(2, '') + row(*[img('DM', 70) for _ in range(4 if m else 8)]) +
    h('Bán chạy tuần này') + note(3, '') + grid(4, 2 if m else 4) +
    h('Phối theo dịp') + note(4, '') + row(img('Look', 200), img('Look', 200), *([] if m else [img('Look', 200)])))
page('02-shop', 'Cửa hàng / danh mục', 'Bộ lọc + sắp xếp + lưới sản phẩm, URL theo danh mục.',
  ['Bộ lọc: danh mục, size, màu, giá, dáng (mobile: mở dạng ngăn kéo)', 'Thanh tìm kiếm + sắp xếp + số kết quả', 'Lưới thẻ sản phẩm, nút "Xem thêm"'],
  lambda m: h('Cửa hàng', 1) + row(box('▤ Tìm kiếm'), box('Sắp xếp ▾'), box('66 sản phẩm'), cols='2fr 1fr 1fr') + note(2, '') +
    (box('≡ Bộ lọc (ngăn kéo)', style='margin:10px 0') + note(1, '') + grid(6, 2) if m else
     row(box('BỘ LỌC', inner=''.join(box(x, inner=txt(3, 70)) for x in ['Danh mục', 'Size', 'Màu', 'Khoảng giá', 'Dáng'])) + note(1, ''), grid(9, 3), cols='1fr 3fr')) +
    '<div class="c">' + btn('Xem thêm') + '</div>' + note(3, ''))
page('03-product', 'Chi tiết sản phẩm', 'Thư viện ảnh, chọn màu/size, tồn kho theo biến thể, đánh giá.',
  ['Thư viện 4 ảnh + ảnh phối', 'Giá / giá sale, chọn màu, chọn size (hết hàng bị gạch)', 'Thêm vào giỏ / Mua ngay / Báo khi có hàng / ♡', 'Gợi ý size từ số đo', 'Đánh giá: tổng quan sao + danh sách + form viết đánh giá'],
  lambda m: row(row(img('Ảnh chính', 300 if m else 420), *([] if m else [img('Ảnh 2', 420)]), cols='1fr' if m else '1fr 1fr') + note(1, ''),
       box('', inner=h('Tên sản phẩm', 1) + txt(1, 30) + note(2, '') + box('Màu: ● ● ●') + box('Size: S M L XL') + note(4, '') + box('Gợi ý size: M (độ tin cậy cao)') + row(btn('Thêm vào giỏ'), btn('Mua ngay', True)) + note(3, '') + ''.join(box(x, 'acc') for x in ['Chất liệu', 'Giao hàng & đổi trả'])),
       cols='1fr' if m else '3fr 2fr') +
    h('Đánh giá') + note(5, '') + row(box('4,7★ · 120 đánh giá', inner=txt(5, 70)), box('', inner=txt(3) + txt(3) + btn('Viết đánh giá')), cols='1fr' if m else '1fr 2fr') +
    h('Có thể bạn thích') + grid(4, 2 if m else 4))
page('04-cart', 'Giỏ hàng', 'Danh sách món, đổi số lượng, mã giảm giá, tổng do server tính.',
  ['Dòng sản phẩm: ảnh, tên, màu/size, − số lượng +, xoá', 'Ô mã giảm giá + thông báo lỗi cụ thể', 'Tóm tắt: tạm tính, giảm, phí giao, tổng', 'Nút Thanh toán'],
  lambda m: h('Giỏ hàng (3)', 1) + row(box('', inner=''.join(row(img('', 90), box('', inner=txt(2) + '− 1 + · Xoá'), cols='90px 1fr') for _ in range(3))) + note(1, ''),
       box('TÓM TẮT', inner=inp('Mã giảm giá') + note(2, '') + txt(4, 80) + note(3, '') + btn('Thanh toán', True) + note(4, '')), cols='1fr' if m else '2fr 1fr'))
page('05-checkout', 'Thanh toán', 'Thông tin giao hàng, phương thức giao & thanh toán, xác nhận đơn.',
  ['Form người nhận (họ tên, SĐT, địa chỉ, ghi chú) — lỗi ngay dưới ô', 'Giao tiêu chuẩn / giao nhanh', 'COD / Thanh toán online (mô phỏng cổng)', 'Tóm tắt đơn + nút Đặt hàng; hết hàng → thông báo rõ món nào'],
  lambda m: h('Thanh toán', 1) + row(box('', inner=h('Thông tin giao hàng', 3) + inp('Họ tên') + inp('Số điện thoại') + inp('Địa chỉ') + inp('Ghi chú') + note(1, '') +
       h('Giao hàng', 3) + box('◉ Tiêu chuẩn 30.000₫   ○ Nhanh 55.000₫') + note(2, '') + h('Thanh toán', 3) + box('◉ COD   ○ Online') + note(3, '')),
       box('ĐƠN HÀNG', inner=''.join(row(img('', 60), box('', inner=txt(2)), cols='60px 1fr') for _ in range(2)) + txt(4, 80) + btn('Đặt hàng', True) + note(4, '')), cols='1fr' if m else '3fr 2fr'))
page('06-login', 'Đăng nhập / Đăng ký', 'Form email + mật khẩu, tài khoản demo, chuyển đổi đăng ký.',
  ['Tiêu đề + lợi ích khi đăng nhập', 'Form: email, mật khẩu (đăng ký: + họ tên) — lỗi tiếng Việt', 'Liên kết chuyển Đăng ký/Đăng nhập'],
  lambda m: row(box('', inner=h('Đăng nhập', 1) + txt(2)) + note(1, ''), box('', inner=inp('Email') + inp('Mật khẩu') + btn('Đăng nhập', True) + txt(1, 50)) + note(2, '') + note(3, ''), cols='1fr' if m else '1fr 1fr'))
page('07-account', 'Tài khoản', 'Hồ sơ, đơn hàng + dòng thời gian, yêu thích, số đo, outfit, thông báo.',
  ['Menu tài khoản (mobile: tab ngang)', 'Phiên đăng nhập + Đăng xuất', 'Danh sách đơn: mã, ngày, trạng thái, tổng → chi tiết + timeline + huỷ khi chờ xác nhận'],
  lambda m: h('Tài khoản', 1) + row(box('MENU', inner=txt(6, 70)) + note(1, ''), box('', inner=box('email@… · Đăng xuất') + note(2, '') + h('Đơn hàng của tôi', 3) + ''.join(box('TT1100 · 12/11 · Đang giao · 1.290.000₫') for _ in range(4)) + note(3, '')), cols='1fr' if m else '1fr 3fr'))
page('08-admin', 'Quản trị — Tổng quan & Đơn hàng', 'Sidebar, KPI, doanh thu 8 tuần, sắp hết hàng; bảng đơn + đổi trạng thái theo luồng.',
  ['Sidebar: Tổng quan, Sản phẩm, Danh mục, Tồn kho, Đơn hàng, Khách hàng, Đánh giá, Liên hệ', 'KPI: doanh thu, đơn theo trạng thái, SP đang bán, khách', 'Biểu đồ doanh thu 8 tuần + danh sách sắp hết hàng', 'Bảng đơn: lọc trạng thái, dropdown chỉ hiện bước hợp lệ'],
  lambda m: row(box('SIDEBAR', 'side', inner=txt(8, 80)) + note(1, ''), box('', inner=h('Tổng quan', 1) + row(*[box('KPI', inner=txt(1, 50)) for _ in range(4)], cols='1fr 1fr' if m else 'repeat(4,1fr)') + note(2, '') +
       row(img('Biểu đồ doanh thu 8 tuần', 180), box('Sắp hết hàng', inner=txt(5, 80)), cols='1fr' if m else '2fr 1fr') + note(3, '') +
       h('Đơn hàng', 3) + box('Tất cả · Chờ xác nhận · Đã xác nhận · Đang giao …') + ''.join(box('TT1101 · Khách · 3 món · 890.000₫ · [trạng thái ▾]') for _ in range(4)) + note(4, '')), cols='1fr' if m else '1fr 4fr'))
page('09-about', 'Giới thiệu', 'Câu chuyện thương hiệu, số liệu thật, giá trị, cam kết, showroom.',
  ['Tiêu đề + 2 đoạn giới thiệu + CTA', 'Số liệu từ dữ liệu: sản phẩm, danh mục, đánh giá, điểm TB', '3 giá trị thương hiệu', 'Cam kết mua online + showroom'],
  lambda m: row(box('', inner=h('Mặc thoải mái, đẹp kiểu Seoul', 1) + txt(4) + row(btn('Xem hàng mới', True), btn('Liên hệ'))) + note(1, ''), row(img('Look', 240), img('Look', 240)), cols='1fr' if m else '1fr 1fr') +
    row(*[box('Số liệu', inner=txt(1, 40)) for _ in range(4)], cols='1fr 1fr' if m else 'repeat(4,1fr)') + note(2, '') +
    row(*[box('Giá trị', inner=txt(2)) for _ in range(3)], cols='1fr' if m else 'repeat(3,1fr)') + note(3, '') +
    row(box('Cam kết', inner=txt(3)), box('Showroom', inner=txt(3)), cols='1fr' if m else '1fr 1fr') + note(4, ''))
page('10-contact', 'Liên hệ', 'Thông tin liên hệ, form gửi tin nhắn có kiểm tra dữ liệu, FAQ.',
  ['Thông tin: email, giờ làm việc, showroom, thời gian phản hồi', 'Form: họ tên*, email*, SĐT, chủ đề*, mã đơn, nội dung* (đếm ký tự) — lỗi dưới từng ô', 'Thông báo gửi thành công', 'FAQ dạng accordion'],
  lambda m: row(box('', inner=h('Chúng tôi luôn sẵn lòng hỗ trợ', 1) + txt(2) + box('THÔNG TIN', inner=txt(4, 70))) + note(1, ''),
       box('GỬI TIN NHẮN', inner=row(inp('Họ tên *'), inp('Email *'), cols='1fr' if m else '1fr 1fr') + row(inp('Số điện thoại'), inp('Chủ đề * ▾'), cols='1fr' if m else '1fr 1fr') + inp('Mã đơn (nếu có)') + box('▤ Nội dung *', style='height:90px') + '<small>0/2000</small>' + btn('Gửi tin nhắn', True)) + note(2, '') + note(3, ''), cols='1fr' if m else '5fr 7fr') +
    h('Câu hỏi thường gặp') + ''.join(box('Câu hỏi ＋', 'acc') for _ in range(4)) + note(4, ''))

CSS = '''body{margin:0;background:#ddd;font:12px/1.4 system-ui,sans-serif;color:#333}
.frame{background:#fff;margin:0 0 40px;padding:0;position:relative}.frame.d{width:1280px}.frame.m{width:390px}
.cap{background:#222;color:#fff;padding:10px 16px;font-size:14px}.cap small{color:#aaa;margin-left:8px}
.pg{padding:16px 24px}.m .pg{padding:12px}
.b{border:1.5px solid #888;border-radius:3px;padding:8px;margin:6px 0;position:relative;min-height:18px;background:#fff}
.b .l{font-size:11px;color:#666;display:block}.img{background:repeating-linear-gradient(45deg,#eee 0 10px,#f7f7f7 10px 20px);display:flex;align-items:center;justify-content:center}.img .l{color:#555}
.g{display:grid;align-items:start}.t{display:block;height:7px;background:#ccc;margin:6px 0;border-radius:2px}
.h1{font-size:22px;font-weight:700;margin:10px 0}.h2{font-size:16px;font-weight:700;margin:18px 0 6px}.h3{font-size:13px;font-weight:700;margin:10px 0 4px}
.btn{display:inline-block;border:1.5px solid #333;padding:7px 14px;margin:6px 6px 0 0;font-size:11px;font-weight:700;text-transform:uppercase}.btn.dk{background:#333;color:#fff}
.in{margin:6px 0}.in small{display:block;color:#555}.in b{display:block;height:26px;border:1.5px solid #999;border-radius:3px}
.ann{background:#eee;padding:5px 24px;font-size:11px;color:#666}.hdr{display:flex;align-items:center;gap:20px;padding:10px 24px;border-bottom:1.5px solid #bbb}.m .hdr{padding:10px 12px;justify-content:space-between}
.hdr .lg{width:90px;margin:0}.nav{flex:1;font-size:11px;color:#444}.ic{font-size:13px;letter-spacing:4px}
.ftr{background:#f1f1f1;padding:12px 24px;margin-top:20px}.cp{border-top:1px solid #bbb;padding-top:6px;color:#777;font-size:11px}
.tab{background:#fff;border-top:1.5px solid #999;padding:10px;text-align:center;font-size:11px}
.c{text-align:center}.side{background:#eee;min-height:420px}.acc{min-height:12px}
.n{position:relative;display:inline-block;background:#e8543b;color:#fff;border-radius:50%;width:20px;height:20px;line-height:20px;text-align:center;font-size:11px;font-weight:700;margin:2px 4px;vertical-align:top}
.legend{background:#fffbe6;border-top:1.5px dashed #c9b200;padding:10px 24px;font-size:12px}.legend{list-style:none}.legend li{margin:2px 0}'''

def frame(key, mode):
    title, desc, notes, fn = P[key]
    m = mode == 'm'
    admin = key.startswith('08')
    body = fn(m)
    chrome = (header(m) if not admin else '') + f'<div class="pg">{body}</div>' + (footer(m) + tabbar(m) if not admin else '')
    legend = '<ol class="legend">' + ''.join(f'<li><b>{i+1}</b> {html.escape(t)}</li>' for i, t in enumerate(notes)) + '</ol>'
    return f'<section class="frame {mode}" id="{key}-{"mobile" if m else "desktop"}"><div class="cap">{html.escape(title)}<small>{"Mobile 390px" if m else "Desktop 1280px"} · {html.escape(desc)}</small></div>{chrome}{legend}</section>'

OUT.write_text('<!doctype html><meta charset="utf-8"><title>Thai Tu Fashion — Wireframes</title><style>' + CSS + '</style>' + ''.join(frame(k, mo) for k in P for mo in ('d', 'm')), encoding='utf-8')
print(OUT, len(P), 'trang')
