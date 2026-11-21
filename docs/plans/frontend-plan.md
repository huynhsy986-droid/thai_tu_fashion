# Plan · Frontend (Step 3) — đầu vào ① Design + ② PRD + ③ Architecture + ⑤ API Docs

**Người viết:** TV3 – huynhsy986-droid · **Review:** TV1 (đối chiếu design/AC), TV2 (dùng API đúng)

Nguyên tắc (ADR-06): **không viết lại giao diện**. Giữ nguyên `data.js … app.js` của prototype, thêm 3 file nạp sau cùng:

| File | Vai trò |
|---|---|
| `js/config.js` | `window.THAITU_CONFIG = { apiBase, forceDemo }` (nạp đầu tiên) |
| `js/api.js` | Client `fetch` + phiên đăng nhập (Bearer JWT), chuẩn hoá lỗi `{status, code, message, details}` |
| `js/auth.js` | Màn hình `#login`, `#register`, khối tài khoản/đăng xuất, chặn route cần đăng nhập/admin |
| `js/sync.js` | Khởi động: tải catalogue + dữ liệu người dùng vào `S`; bọc các thao tác ghi để gọi API; chế độ demo khi API tắt |

## Phase 0 · Init
- [x] Thêm `config.js`, `api.js`, `auth.js`, `sync.js` vào `index.html` đúng thứ tự; favicon (DR-09)
- [x] Đổi khách cứng `'c1'` thành `S.meId` (DR-03)
- [x] `package.json` frontend: `serve` (tĩnh) + Playwright (`test:e2e`)

## Phase 1 · Đọc dữ liệu từ API
- [x] Boot: `GET /api/catalog` (timeout 4 s) → `S.products/categories/reviews`, bảng màu; lỗi mạng → chế độ demo (NFR-REL-01) — AC-CAT-01
- [x] Đã đăng nhập: giỏ, yêu thích, báo có hàng, đơn, thông báo, outfit, số đo, hồ sơ
- [x] Admin: toàn bộ đơn + khách hàng
- [x] `save()` chỉ lưu dữ liệu giao diện (đã xem, outfit nháp, thử đồ) và giỏ/yêu thích của khách vãng lai

## Phase 2 · Đăng nhập & phân quyền
- [x] `#login`, `#register` theo design system (dùng `Field`, `.btn`, `.err`), nút điền nhanh tài khoản demo — AC-AUTH-01/02
- [x] Route cần đăng nhập (`checkout`, `account*`, `order-*`, `notifications`) → `#login` rồi quay lại — AC-AUTH-03
- [x] `#admin*` khi không phải admin → `#login` + thông báo — AC-AUTH-04
- [x] Đăng xuất trong trang tài khoản và sidebar admin — AC-AUTH-05
- [x] Gộp giỏ/yêu thích của khách vãng lai vào tài khoản sau đăng nhập

## Phase 3 · Ghi qua API (optimistic UI + đối soát server)
- [x] Giỏ: thêm/sửa/xoá → `/api/cart/*`; lỗi → toast + tải lại giỏ — AC-CART-01/02
- [x] Mã giảm giá + tổng tiền lấy từ `POST /api/cart/quote` — AC-CART-03/04
- [x] Đặt hàng → `POST /api/orders`; 409 hiện dòng thiếu hàng; 422 gắn lỗi vào đúng ô; chống bấm 2 lần — AC-ORD-01/02/06
- [x] Huỷ đơn → `/api/orders/:id/cancel` — AC-ORD-05
- [x] Yêu thích, giá mong muốn, báo có hàng — AC-WISH-01/03
- [x] Hồ sơ, số đo, outfit, thông báo, nhận tin — AC-ACC-01..05; đánh giá — AC-REV-01
- [x] Admin: sản phẩm, ẩn/hiện, tồn kho, danh mục, trạng thái đơn, đánh giá — AC-ADM-02..07
- [x] Hỏi thông báo mới mỗi 60 s khi đã đăng nhập (AC-WISH-02/03 hiện ra không cần tải lại)

## Phase 4 · E2E (Playwright + Chrome thật, backend + DB thật)
- [x] Khách vãng lai duyệt & tìm kiếm; trang admin bị chặn
- [x] Đăng ký → mua → mã giảm giá → đặt hàng → xem đơn → huỷ
- [x] Hết hàng do người khác mua trước → thông báo, không tạo đơn
- [x] Admin đổi trạng thái đơn → khách thấy thông báo; admin hạ giá → người thích nhận thông báo
- [x] Chế độ demo khi không có API; không lỗi console/CSP trên các trang chính; mobile 390 px

---

## Review plan

**TV1 – lequangkhanh6002-pixel (PO/BA):** ✅ Duyệt.
- Màn đăng nhập phải nhìn như một phần của prototype (cùng font, nút, khoảng cách) → *đã ghi ở Phase 2*.
- Khách vãng lai vẫn thêm được vào giỏ như prototype, chỉ bắt đăng nhập lúc thanh toán → *đổi thiết kế: giỏ/yêu thích khách vãng lai lưu cục bộ, gộp khi đăng nhập*.
- Các nút "Mô phỏng giảm giá/hàng về" ở trang Yêu thích: với khách thật không được đổi giá → *trong chế độ API: admin bấm thì gọi API thật, khách bấm thì hướng dẫn*.

**TV2 – nguyen06-vn (Backend):** ✅ Duyệt.
- Không tự tính tổng tiền khi đã có `quote` của server; chỉ dùng tính cục bộ để hiển thị tạm trong lúc chờ → *đồng ý*.
- Mọi lỗi 401 giữa chừng phải xoá phiên và đưa về đăng nhập, không để UI ở trạng thái "nửa đăng nhập" → *thêm vào `api.js`*.
- Gọi API ghi theo hàng đợi tuần tự để `POST /orders` luôn chạy sau các thay đổi giỏ còn đang gửi → *thêm `enqueue()` trong `sync.js`*.
