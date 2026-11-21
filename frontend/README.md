# Thai Tu Fashion · Frontend

Giao diện từ prototype (Claude Design, xem `README.prototype.md`) được **giữ nguyên**, nối với REST API trên Supabase qua 4 file mới. Chủ sở hữu: **TV3 – huynhsy986-droid**.

| File | Vai trò |
|---|---|
| `js/config.js` | `THAITU_CONFIG.apiBase` (mặc định cùng origin), `?api=<url>`, `?demo` |
| `js/api.js` | `fetch` + phiên đăng nhập (JWT Supabase), chuẩn hoá lỗi, tự đăng xuất khi 401 |
| `js/auth.js` | `#login`, `#register`, nút tài khoản demo, đăng xuất, chặn route cần đăng nhập/admin |
| `js/sync.js` | Tải dữ liệu từ API vào `S`; bọc mọi thao tác ghi (giỏ, đặt hàng, yêu thích, tài khoản, quản trị) để gọi API; báo giá server; chế độ demo khi API tắt |

Thay đổi nhỏ trong file gốc: `'c1'` → `S.meId`; `app.js` không tự `render()` lần đầu (sync.js làm sau khi tải dữ liệu); `index.html` nạp thêm các file trên + favicon; vài dòng CSS cho màn đăng nhập.

## Chạy

```bash
# Cách 1 (khuyên dùng): backend phục vụ luôn frontend → http://localhost:4000
cd ../backend && npm start
# Cách 2: frontend tĩnh riêng, trỏ tới API
npm start   # http://localhost:8080/?api=http://localhost:4000
# Không có API: tự chuyển chế độ demo (như prototype); ép bằng ?demo
```

Tài khoản demo: `minhanh@demo.thaitu.vn / Demo@1234` (khách), `admin@thaitu.vn / Admin@1234` (quản trị).

## E2E

```bash
npm install
npm run test:e2e     # tự tạo DB thaitu_e2e (migrations + seed), bật backend :4100, chạy Chrome
```

| Spec | Nội dung |
|---|---|
| `guest.spec.js` | Khách vãng lai: catalogue từ API, tìm không dấu, giỏ khách, chặn thanh toán/quản trị, nhận tin |
| `purchase.spec.js` | Đăng ký → gộp giỏ → mã giảm giá (server) → đặt hàng → huỷ; validate form; thanh toán online lỗi/thành công; đánh giá "đã mua"; hồ sơ; đăng xuất |
| `stock.spec.js` | Hai khách tranh món cuối cùng |
| `admin.spec.js` | Phân quyền, đổi trạng thái đơn → khách nhận thông báo, hạ giá → người thích nhận thông báo, nhập kho → báo có hàng, ẩn đánh giá |
| `resilience.spec.js` | Chế độ demo khi API không truy cập được |
| `routes.spec.js` | 32 trang không lỗi JS/CSP |
| `mobile.spec.js` | Pixel 7: không tràn ngang |
