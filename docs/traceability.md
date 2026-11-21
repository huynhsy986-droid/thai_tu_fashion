# Ma trận truy vết AC → Code → Test

> Sinh tự động bởi `node scripts/trace.mjs` (TV3). Quét mã AC trong PRD, tên test (unit/integration/e2e) và chú thích trong mã nguồn.
> Số trong ô = số test có nhắc mã AC trong tên · tên file test.

**Tổng:** 40 AC + 8 NFR · 48/48 mục có test · số lần được test: unit 29, integration 90, e2e 36.

| Mã | Ưu tiên | Mô tả | Code | Unit | Integration | E2E |
|---|---|---|---|---|---|---|
| AC-AUTH-01 | P0 | Đăng ký bằng email hợp lệ + mật khẩu ≥ 8 ký tự có cả chữ và số +… | `routes/auth.js` `20261121000200_functions_triggers.sql` `auth.js` | 2 · providers | 3 · auth | 1 · purchase |
| AC-AUTH-02 | P0 | Đăng nhập đúng → nhận access token (JWT); sai → 401 "Email hoặc… | `routes/auth.js` | 2 · providers, tokens | 2 · auth | 1 · mobile |
| AC-AUTH-03 | P0 | Gọi API cần đăng nhập mà không có/sai token → 401. | `auth/middleware.js` `routes/auth.js` | 9 · jwks, tokens | 2 · auth | — |
| AC-AUTH-04 | P0 | Người không phải admin gọi API quản trị → 403. Trên giao diện, vào… | `auth/middleware.js` `20261121000200_functions_triggers.sql` | — | 1 · admin | 2 · admin, guest |
| AC-AUTH-05 | P0 | Đăng xuất xoá phiên ở client; header trở về trạng thái khách. | `auth/providers.js` `routes/auth.js` `auth.js` | 1 · providers | 1 · auth | 1 · purchase |
| AC-CAT-01 | P0 | Khách (kể cả chưa đăng nhập) xem danh sách sản phẩm đang bán: tên,… | `routes/catalog.js` | 1 · mappers | 3 · catalog | 1 · guest |
| AC-CAT-02 | P0 | Lọc theo danh mục, giới tính, khoảng giá, từ khoá (tìm không dấu:… | `routes/catalog.js` | — | 4 · catalog | 1 · guest |
| AC-CAT-03 | P0 | Xem chi tiết theo mã; sản phẩm ẩn hoặc không tồn tại → 404 với khách. | `routes/catalog.js` | — | 1 · catalog | — |
| AC-CAT-04 | P0 | Danh sách danh mục kèm số sản phẩm đang bán. | `routes/catalog.js` | — | 1 · catalog | — |
| AC-REV-01 | P0 | Khách đã đăng nhập gửi đánh giá: số sao 1–5, nhận xét ≥ 10 ký tự,… | `routes/catalog.js` `20261121000200_functions_triggers.sql` `sync.js` | — | 4 · catalog | 1 · purchase |
| AC-REV-02 | P0 | Khách chỉ thấy đánh giá `visible`. Admin xem tất cả, ẩn/hiện, xoá. | `routes/catalog.js` | — | 1 · catalog | — |
| AC-CART-01 | P0 | Thêm biến thể (màu + size) vào giỏ; tổng số lượng không vượt tồn… | `routes/cart.js` `sync.js` | — | 2 · cart | 1 · guest |
| AC-CART-02 | P0 | Đổi số lượng, xoá dòng; giỏ lưu trên server, đăng nhập thiết bị… | `routes/cart.js` | — | 3 · cart | — |
| AC-CART-03 | P0 | Báo giá (quote) do server tính: tạm tính theo giá hiện hành (ưu… | `routes/cart.js` `20261121000200_functions_triggers.sql` `sync.js` | — | 2 · cart | 1 · purchase |
| AC-CART-04 | P0 | Mã giảm giá: `THAITU10` giảm 10%, `NEW50K` giảm 50.000₫ cho đơn ≥… | `routes/cart.js` `20261121000200_functions_triggers.sql` | — | 2 · cart | 1 · purchase |
| AC-ORD-01 | P0 | Đặt hàng từ giỏ: họ tên ≥ 2 ký tự, số điện thoại `0` + 9 chữ số,… | `routes/orders.js` `20261121000200_functions_triggers.sql` `sync.js` | 2 · validate | 3 · orders | 2 · purchase |
| AC-ORD-02 | P0 | Bất kỳ dòng nào không đủ hàng → 409, không thay đổi gì (không trừ… | — | — | 2 · orders | 1 · stock |
| AC-ORD-03 | P0 | Hai đơn đồng thời tranh nhau món cuối cùng → chỉ một đơn thành… | — | — | 1 · orders | 1 · stock |
| AC-ORD-04 | P0 | Khách chỉ xem được đơn của mình, có dòng thời gian trạng thái. | `routes/orders.js` | 1 · mappers | 1 · orders | 1 · purchase |
| AC-ORD-05 | P0 | Khách tự huỷ đơn khi còn `pending` → hoàn kho, ghi lịch sử. | `routes/orders.js` `20261121000200_functions_triggers.sql` | — | 2 · orders | 1 · purchase |
| AC-ORD-06 | P0 | Thanh toán online (mô phỏng): thành công → đơn có `payment_status… | — | — | 1 · orders | 1 · purchase |
| AC-WISH-01 | P0 | Thêm/bỏ yêu thích, đặt giá mong muốn (tuỳ chọn); dữ liệu lưu trên… | `routes/wishlist.js` `sync.js` | — | 2 · wishlist | — |
| AC-WISH-02 | P0 | Khi admin hạ giá bán hiệu lực, mọi khách có món đó trong yêu thích… | `20261121000200_functions_triggers.sql` | — | 1 · wishlist | 1 · admin |
| AC-WISH-03 | P0 | Đăng ký "báo khi có hàng" cho biến thể hết hàng; khi tồn kho từ 0… | `routes/admin/products.js` `routes/wishlist.js` `20261121000200_functions_triggers.sql` | — | 2 · wishlist | 1 · admin |
| AC-ACC-01 | P0 | Xem/sửa hồ sơ: họ tên ≥ 2 ký tự, điện thoại, địa chỉ, ngày sinh. | `routes/me.js` | — | 2 · account | 1 · purchase |
| AC-ACC-02 | P0 | Lưu số đo: cao 130–210 cm, nặng 35–150 kg, ngực 60–150, eo 50–140,… | `routes/me.js` | — | 1 · account | — |
| AC-ACC-03 | P0 | Lưu, xem, xoá outfit (từ Outfit Builder). | `routes/me.js` | — | 1 · account | — |
| AC-ACC-04 | P0 | Danh sách thông báo; đánh dấu đã đọc từng cái / tất cả. | `routes/me.js` `sync.js` | — | 1 · account | — |
| AC-ACC-05 | P0 | Đăng ký nhận tin bằng email hợp lệ (đăng ký lại không lỗi). | `routes/me.js` `20261121000200_functions_triggers.sql` | — | 1 · account | 1 · guest |
| AC-ADM-01 | P0 | Tổng quan: doanh thu 8 tuần gần nhất (không tính đơn huỷ), số đơn… | `routes/admin/misc.js` `20261121000200_functions_triggers.sql` `20261121000400_dashboard_low_stock.sql` | — | 1 · admin | 1 · admin |
| AC-ADM-02 | P0 | Tạo/sửa/ẩn sản phẩm: tên ≥ 3 ký tự, giá > 0, giá sale < giá gốc, ≥… | `routes/admin/products.js` `20261121000200_functions_triggers.sql` `sync.js` | — | 3 · admin | 1 · admin |
| AC-ADM-03 | P0 | Danh mục: thêm, đổi tên, xoá; không xoá được danh mục còn sản phẩm… | `routes/admin/misc.js` | — | 1 · admin | — |
| AC-ADM-04 | P0 | Tồn kho: đặt số lượng nguyên ≥ 0 cho từng biến thể. | `routes/admin/products.js` | — | 1 · admin | 1 · admin |
| AC-ADM-05 | P0 | Đơn hàng: lọc theo trạng thái; đổi trạng thái theo luồng `pending… | `routes/admin/orders.js` `20261121000200_functions_triggers.sql` | 3 · orderStatus | 3 · admin | 1 · admin |
| AC-ADM-06 | P0 | Khách hàng: danh sách kèm số đơn và tổng chi tiêu. | `routes/admin/misc.js` | — | 1 · admin | — |
| AC-ADM-07 | P0 | Kiểm duyệt đánh giá: lọc theo trạng thái, ẩn/hiện, xoá. | `routes/admin/misc.js` | — | 1 · admin | 1 · admin |
| AC-ADM-08 | P1 | Mã giảm giá: xem, tạo, bật/tắt qua API quản trị. | `routes/admin/misc.js` | — | 1 · admin | — |
| AC-CON-01 | P0 | Trang Liên hệ (`#contact`): ai cũng gửi được tin nhắn gồm họ tên ≥… | `routes/contact.js` `20261121000500_contact_messages.sql` | 3 · contact | 4 · contact | 1 · contact |
| AC-CON-02 | P0 | Admin xem danh sách tin nhắn (lọc theo trạng thái), đánh dấu `new… | `lib/mappers.js` `routes/contact.js` `20261121000500_contact_messages.sql` | 1 · contact | 2 · contact | 1 · contact |
| AC-CON-03 | P0 | Trang Giới thiệu (`#about`): câu chuyện thương hiệu, giá trị, hệ… | — | — | — | 1 · contact |
| NFR-SEC-01 | NFR | Bật Row Level Security trên mọi bảng `public`; vai trò `anon` chỉ… | `20261121000300_rls_policies.sql` | — | 7 · catalog, rls | — |
| NFR-SEC-02 | NFR | Secret (service role key, JWT secret, DB URL) chỉ ở biến môi… | `config.js` | 1 · config | — | — |
| NFR-SEC-03 | NFR | Giới hạn tần suất các endpoint đăng nhập/đăng ký; header bảo mật… | `app.js` | — | 5 · security | — |
| NFR-PERF-01 | NFR | API danh mục phản hồi < 300 ms (p95) với dữ liệu mẫu. | — | — | 2 · observability, security | — |
| NFR-REL-01 | NFR | API không truy cập được → giao diện vẫn chạy chế độ demo (dữ liệu… | `sync.js` | — | — | 3 · contact, resilience |
| NFR-QA-01 | NFR | Có unit test, integration test (DB thật) và e2e test (trình duyệt… | — | — | — | 1 · routes |
| NFR-OBS-01 | NFR | Log JSON mỗi request (request id, method, path, status, thời gian,… | — | 3 · logger | 4 · observability | 2 · tracking |
| NFR-DATA-01 | NFR | Tiền là số nguyên VND; thời gian lưu `timestamptz`. | — | — | 1 · contract | — |

**Mọi AC và NFR đều có ít nhất một test.**
