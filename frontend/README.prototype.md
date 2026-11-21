# Thai Tu Fashion: mã nguồn giao diện (HTML, CSS, JS)

Mã nguồn tách từ bản prototype Thai Tu Fashion. Giao diện, bố cục, câu chữ và chức năng giữ nguyên như prototype. Không dùng database, không cần server riêng: dữ liệu mẫu nằm sẵn trong JS và mọi thay đổi (giỏ hàng, yêu thích, đơn hàng, quản trị) lưu trong trình duyệt (localStorage).

## Chạy thử

- Cách nhanh: mở `index.html` bằng Chrome, Edge hoặc Firefox.
- Cách khuyên dùng: mở thư mục bằng VS Code, chuột phải `index.html` → **Open with Live Server**.
  Hoặc trong thư mục này chạy `npx serve .` (hay `python -m http.server`) rồi mở địa chỉ được in ra.
- Cần mạng để tải font Google (Archivo, Be Vietnam Pro). Không có mạng thì trang vẫn chạy, chỉ đổi sang font hệ thống.

## Cấu trúc thư mục

```
index.html          Khung trang, nạp CSS và các file JS theo đúng thứ tự
css/style.css       Toàn bộ giao diện (màu, chữ, bố cục, responsive 768 / 1024 / 1200px)
js/data.js          Dữ liệu mẫu: logo, sản phẩm (k01–k24, t01–t42), màu, mô tả, hàm sinh dữ liệu
js/store.js         Trạng thái lưu localStorage, hàm tiện ích, toast, hộp thoại, thông báo, giỏ hàng
js/components.js    Thành phần dùng chung: thẻ sản phẩm, chọn màu/size, bảng size, header, footer
js/pages.js         Trang chủ, cửa hàng, chi tiết sản phẩm, yêu thích, giỏ hàng, thanh toán, tài khoản
js/studio.js        Smart Studio: Outfit Builder, Size Advisor, Stylist, tìm bằng ảnh, thử đồ
js/admin.js         Trang quản trị: tổng quan, sản phẩm, danh mục, tồn kho, đơn hàng, khách hàng, đánh giá
js/app.js           Điều hướng theo #hash, xử lý click/nhập liệu/form, khởi chạy trang
img/                Toàn bộ ảnh (.webp)
```

Các file JS là script thường (không phải module), dùng chung biến toàn cục. **Phải giữ đúng thứ tự nạp** như trong `index.html`.

## Các trang (địa chỉ sau dấu #)

| Trang | Địa chỉ |
| --- | --- |
| Trang chủ | `#home` |
| Cửa hàng, danh mục | `#shop`, `#shop-new`, `#shop-tops`, `#shop-dresses`, `#shop-jewelry`… |
| Chi tiết sản phẩm | `#product-k01`, `#product-t01`… |
| Yêu thích, thông báo | `#wishlist`, `#notifications` |
| Giỏ hàng, thanh toán | `#cart`, `#checkout` |
| Tài khoản | `#account`, `#account-orders`… |
| Smart Studio | `#studio`, `#outfit`, `#size`, `#stylist`, `#visual`, `#tryon` |
| Quản trị | `#admin`, `#admin-products`, `#admin-orders`, `#admin-inventory`… |

## Ảnh

- Ảnh sản phẩm: `img/{mã}-{màu}-{loại}.webp`
  - `a` ảnh chính
  - `b` ảnh khi rê chuột
  - `c` ảnh ô danh mục
  - `d` ảnh cận chất liệu
  - `o` lớp mặc lên ma-nơ-canh (chỉ sản phẩm k01–k24, dùng cho Outfit Builder và thử đồ)
- Banner trang chủ: `img/hero-desktop.webp` (máy tính, 2:1) và `img/hero-mobile.webp` (điện thoại và máy tính bảng).
- Thay ảnh: ghi đè file cùng tên, khung 3:4 (720×960 hoặc 900×1200) cho ảnh sản phẩm.
- Nếu thay banner bằng ảnh có người mẫu đứng ở vị trí khác, sửa tọa độ nút "+" trong `js/pages.js` (dòng `const hd=[...]` cho máy tính, `hm=[...]` cho điện thoại, đơn vị %).

## Dữ liệu

- Dữ liệu lưu trong localStorage với khóa `thaitu-fashion-v4`.
- Muốn về dữ liệu mẫu ban đầu, xóa khóa này: F12 → Application → Local Storage, hoặc gõ vào Console `localStorage.removeItem('thaitu-fashion-v4')` rồi tải lại trang.
- Thêm hoặc sửa sản phẩm mẫu trong `js/data.js` (`RAW` và `RAW_PHOTO`). Sản phẩm mới tự được thêm vào dữ liệu đã lưu, không làm mất giỏ hàng hay đơn hàng.
- Thanh toán, mã giảm giá, AI Stylist, tìm bằng ảnh, thử đồ đều là mô phỏng chạy trong trình duyệt, không gọi server.
