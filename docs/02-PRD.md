# 02 · PRD – Thai Tu Fashion (bản 1.0)

| | |
|---|---|
| **Người viết** | TV1 – lequangkhanh6002-pixel (PO/BA) |
| **Người review** | TV2 – nguyen06-vn, TV3 – huynhsy986-droid |
| **Trạng thái** | Đã duyệt cho Step 3 |
| **Đầu vào** | Prototype (`frontend/`), Design review (`01-design-review.md`) |

---

## 1. Problem (Vấn đề)

Thai Tu Fashion là thương hiệu thời trang unisex phong cách Seoul bán online. Prototype đã chứng minh trải nghiệm mua sắm tốt, nhưng **không thể vận hành thật**:

1. Dữ liệu nằm trong trình duyệt → không có một cửa hàng chung cho mọi khách (DR-01).
2. Giá và tồn kho tính ở client → có thể bị sửa tổng tiền, bán vượt kho (DR-02).
3. Không có tài khoản, trang quản trị mở công khai (DR-03, DR-04).
4. Mã giảm giá, trạng thái đơn, nhãn "đã mua" không được kiểm soát (DR-05…DR-07).

## 2. Context (Bối cảnh)

- **Người dùng:**
  - *Khách mua (customer)* 18–30 tuổi, mua bằng điện thoại là chính, quan tâm size và cách phối đồ.
  - *Quản trị viên (admin)* 1–3 nhân viên vận hành: cập nhật sản phẩm, tồn kho, xử lý đơn, kiểm duyệt đánh giá.
  - *Khách vãng lai (guest)*: xem sản phẩm, đánh giá; phải đăng nhập để giữ giỏ, đặt hàng, lưu yêu thích.
- **Ràng buộc:** dùng **Supabase** (Postgres + Auth); giữ nguyên giao diện prototype; tiền tệ VND số nguyên; nội dung tiếng Việt.
- **Ngoài phạm vi (v1):** cổng thanh toán thật, vận chuyển thật, AI Stylist/Visual Search/Try-on dùng model thật (giữ mô phỏng phía client), đa ngôn ngữ.

## 3. Mục tiêu & chỉ số

| Mục tiêu | Chỉ số đo |
|---|---|
| Một nguồn dữ liệu chung | 100% thao tác ghi đi qua API và lưu trong Supabase |
| Không thể gian lận giá / bán vượt kho | 0 đơn có tổng tiền khác giá trị DB tính; test đặt hàng đồng thời không âm kho |
| Bảo mật | Mọi bảng bật RLS; endpoint admin trả 403 với khách |
| Chất lượng | Unit + integration + e2e chạy xanh trong CI |

## 4. Features & Acceptance Criteria

Quy ước: mỗi AC có mã `AC-<NHÓM>-<số>`. Mã này xuất hiện trong tên test để truy vết (xem `traceability.md`). Ưu tiên: **P0** bắt buộc cho v1, **P1** nên có.

### F1. Tài khoản & xác thực (P0)

> Là khách, tôi muốn có tài khoản để giỏ hàng, đơn hàng và yêu thích đi theo tôi trên mọi thiết bị.

- **AC-AUTH-01** Đăng ký bằng email hợp lệ + mật khẩu ≥ 8 ký tự có cả chữ và số + họ tên ≥ 2 ký tự → tạo tài khoản Supabase Auth, tự tạo `profile` vai trò `customer`, trả phiên đăng nhập. Email đã tồn tại → lỗi 409 "Email đã được đăng ký".
- **AC-AUTH-02** Đăng nhập đúng → nhận access token (JWT); sai → 401 "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không).
- **AC-AUTH-03** Gọi API cần đăng nhập mà không có/sai token → 401.
- **AC-AUTH-04** Người không phải admin gọi API quản trị → 403. Trên giao diện, vào `#admin*` khi chưa là admin → chuyển về `#login`.
- **AC-AUTH-05** Đăng xuất xoá phiên ở client; header trở về trạng thái khách.

### F2. Danh mục & sản phẩm (P0)

- **AC-CAT-01** Khách (kể cả chưa đăng nhập) xem danh sách sản phẩm **đang bán**: tên, giá, giá sale, màu, size, tồn kho theo màu/size, điểm đánh giá trung bình và số đánh giá.
- **AC-CAT-02** Lọc theo danh mục, giới tính, khoảng giá, từ khoá (tìm không dấu: "ao khoac" khớp "Áo khoác"), sắp xếp `new | price_asc | price_desc | best`; có phân trang.
- **AC-CAT-03** Xem chi tiết theo mã; sản phẩm ẩn hoặc không tồn tại → 404 với khách.
- **AC-CAT-04** Danh sách danh mục kèm số sản phẩm đang bán.

### F3. Đánh giá (P0)

- **AC-REV-01** Khách đã đăng nhập gửi đánh giá: số sao 1–5, nhận xét ≥ 10 ký tự, tên hiển thị ≥ 2 ký tự. Nhãn **"Đã mua hàng"** do server xác định: chỉ `true` khi khách có đơn **đã giao** chứa sản phẩm đó.
- **AC-REV-02** Khách chỉ thấy đánh giá `visible`. Admin xem tất cả, ẩn/hiện, xoá.

### F4. Giỏ hàng & mã giảm giá (P0)

- **AC-CART-01** Thêm biến thể (màu + size) vào giỏ; tổng số lượng không vượt tồn kho; hết hàng → 409 với thông báo rõ size/màu.
- **AC-CART-02** Đổi số lượng, xoá dòng; giỏ lưu trên server, đăng nhập thiết bị khác vẫn thấy.
- **AC-CART-03** Báo giá (quote) do server tính: tạm tính theo giá hiện hành (ưu tiên giá sale), giảm giá, phí giao (tiêu chuẩn 30.000₫, miễn phí khi tạm tính ≥ 1.500.000₫; giao nhanh 55.000₫), tổng = max(0, tạm tính − giảm + phí).
- **AC-CART-04** Mã giảm giá: `THAITU10` giảm 10%, `NEW50K` giảm 50.000₫ cho đơn ≥ 500.000₫, `FREESHIP` miễn phí giao. Mã không tồn tại / hết hạn / ngưng / hết lượt / chưa đủ giá trị tối thiểu → 422 với lý do cụ thể.

### F5. Đặt hàng (P0)

- **AC-ORD-01** Đặt hàng từ giỏ: họ tên ≥ 2 ký tự, số điện thoại `0` + 9 chữ số, địa chỉ ≥ 10 ký tự, phương thức giao `std|exp`, thanh toán `cod|online`. Server **tính lại toàn bộ tiền**, trừ kho, tăng số đã bán, xoá giỏ, sinh mã đơn `TTxxxx`, trạng thái `pending`, tạo thông báo — tất cả trong **một transaction**.
- **AC-ORD-02** Bất kỳ dòng nào không đủ hàng → 409, **không** thay đổi gì (không trừ kho một phần, giỏ giữ nguyên).
- **AC-ORD-03** Hai đơn đồng thời tranh nhau món cuối cùng → chỉ một đơn thành công, tồn kho không bao giờ âm.
- **AC-ORD-04** Khách chỉ xem được đơn của mình, có dòng thời gian trạng thái.
- **AC-ORD-05** Khách tự huỷ đơn khi còn `pending` → hoàn kho, ghi lịch sử.
- **AC-ORD-06** Thanh toán online (mô phỏng): thành công → đơn có `payment_status = paid`; COD → `unpaid`; mô phỏng thất bại → không tạo đơn.

### F6. Yêu thích, theo dõi giá, báo có hàng (P0)

- **AC-WISH-01** Thêm/bỏ yêu thích, đặt giá mong muốn (tuỳ chọn); dữ liệu lưu trên server.
- **AC-WISH-02** Khi admin hạ giá bán hiệu lực, mọi khách có món đó trong yêu thích nhận thông báo; nếu giá mới ≤ giá mong muốn → thông báo "đã đạt giá bạn mong muốn".
- **AC-WISH-03** Đăng ký "báo khi có hàng" cho biến thể hết hàng; khi tồn kho từ 0 lên > 0 → người đăng ký nhận thông báo và đăng ký tự huỷ.

### F7. Tài khoản cá nhân (P0)

- **AC-ACC-01** Xem/sửa hồ sơ: họ tên ≥ 2 ký tự, điện thoại, địa chỉ, ngày sinh.
- **AC-ACC-02** Lưu số đo: cao 130–210 cm, nặng 35–150 kg, ngực 60–150, eo 50–140, mông 70–160 cm, dáng mặc ưa thích.
- **AC-ACC-03** Lưu, xem, xoá outfit (từ Outfit Builder).
- **AC-ACC-04** Danh sách thông báo; đánh dấu đã đọc từng cái / tất cả.
- **AC-ACC-05** Đăng ký nhận tin bằng email hợp lệ (đăng ký lại không lỗi).

### F8. Quản trị (P0)

- **AC-ADM-01** Tổng quan: doanh thu 8 tuần gần nhất (không tính đơn huỷ), số đơn theo trạng thái, số sản phẩm đang bán, số khách, danh sách sắp hết hàng (≤ 2).
- **AC-ADM-02** Tạo/sửa/ẩn sản phẩm: tên ≥ 3 ký tự, giá > 0, giá sale < giá gốc, ≥ 1 size, ≥ 1 màu. Đổi màu/size thì biến thể được đồng bộ: biến thể giữ lại giữ nguyên tồn kho, biến thể mới mặc định 10.
- **AC-ADM-03** Danh mục: thêm, đổi tên, xoá; không xoá được danh mục còn sản phẩm (409).
- **AC-ADM-04** Tồn kho: đặt số lượng nguyên ≥ 0 cho từng biến thể.
- **AC-ADM-05** Đơn hàng: lọc theo trạng thái; đổi trạng thái theo luồng `pending → confirmed → processing → shipping → delivered`, được huỷ từ `pending/confirmed/processing`; `delivered`, `cancelled` là trạng thái cuối. Chuyển sai luồng → 422. Huỷ → hoàn kho. Mọi thay đổi ghi lịch sử và báo cho khách.
- **AC-ADM-06** Khách hàng: danh sách kèm số đơn và tổng chi tiêu.
- **AC-ADM-07** Kiểm duyệt đánh giá: lọc theo trạng thái, ẩn/hiện, xoá.
- **AC-ADM-08** *(P1)* Mã giảm giá: xem, tạo, bật/tắt qua API quản trị.

## 5. Yêu cầu phi chức năng

| Mã | Yêu cầu |
|---|---|
| NFR-SEC-01 | Bật Row Level Security trên mọi bảng `public`; vai trò `anon` chỉ đọc sản phẩm đang bán, danh mục, đánh giá `visible`. |
| NFR-SEC-02 | Secret (service role key, JWT secret, DB URL) chỉ ở biến môi trường server; không commit `.env`. |
| NFR-SEC-03 | Giới hạn tần suất các endpoint đăng nhập/đăng ký; header bảo mật (Helmet); CORS theo danh sách cho phép. |
| NFR-PERF-01 | API danh mục phản hồi < 300 ms (p95) với dữ liệu mẫu. |
| NFR-REL-01 | API không truy cập được → giao diện vẫn chạy chế độ demo (dữ liệu cục bộ) và báo cho người dùng. |
| NFR-QA-01 | Có unit test, integration test (DB thật) và e2e test (trình duyệt thật), chạy được bằng 1 lệnh và trong CI. |
| NFR-DATA-01 | Tiền là số nguyên VND; thời gian lưu `timestamptz`. |

## 6. Dữ liệu mẫu (giả lập)

Sinh từ catalogue của prototype để giao diện khớp 100%: 66 sản phẩm, ~600 biến thể, 7 danh mục, 13 khách + 1 admin, ~35 đơn rải trong 55 ngày, ~250 đánh giá, 3 mã giảm giá, thông báo/outfit/số đo cho khách demo.

Tài khoản demo:

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Khách | `minhanh@demo.thaitu.vn` | `Demo@1234` |
| Admin | `admin@thaitu.vn` | `Admin@1234` |

## 7. Phát hành

- **v1 (đợt này):** F1–F8 (P0) + AC-ADM-08 ở mức API.
- **v1.1:** cổng thanh toán thật (VNPay/MoMo), đơn vị vận chuyển, upload ảnh đánh giá lên Supabase Storage.
