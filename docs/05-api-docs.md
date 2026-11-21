# 05 · API Docs

**Người viết:** TV2 – nguyen06-vn · **Đặc tả máy đọc được:** [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1)
Integration test `contract.test.js` kiểm tra **mọi route của Express đều có trong `openapi.yaml`** và ngược lại.

## Quy ước

| | |
|---|---|
| Base URL | `http://localhost:4000` (cùng origin với frontend khi backend phục vụ `frontend/`) |
| Xác thực | `Authorization: Bearer <accessToken>` — JWT của Supabase Auth |
| Định dạng | JSON UTF-8; tiền là số nguyên VND; thời gian `at` = epoch ms |
| Lỗi | `{"error":{"code":"OUT_OF_STOCK","message":"Không đủ hàng…","details":[…]}}` – bảng mã ở `03-solution-architecture.md` §ADR-07 |
| DTO | Cùng hình dạng với đối tượng trong prototype (`S.products`, `S.orders`…) để frontend dùng lại code render |

## Danh sách endpoint

| Method | Path | Quyền | Mô tả | AC |
|---|---|---|---|---|
| GET | `/api/health` | công khai | Trạng thái API + DB | — |
| POST | `/api/auth/register` | công khai | Đăng ký | AC-AUTH-01 |
| POST | `/api/auth/login` | công khai | Đăng nhập | AC-AUTH-02 |
| POST | `/api/auth/logout` | khách | Đăng xuất | AC-AUTH-05 |
| GET | `/api/auth/me` | khách | Người dùng hiện tại | AC-AUTH-03 |
| GET | `/api/catalog` | công khai | Toàn bộ catalogue cho SPA | AC-CAT-01 |
| GET | `/api/categories` | công khai | Danh mục + số SP | AC-CAT-04 |
| GET | `/api/colors` | công khai | Bảng màu | — |
| GET | `/api/shipping-methods` | công khai | Phương thức giao | AC-CART-03 |
| GET | `/api/products` | công khai | Lọc, tìm không dấu, sắp xếp, phân trang | AC-CAT-01/02 |
| GET | `/api/products/{id}` | công khai | Chi tiết | AC-CAT-03 |
| GET | `/api/products/{id}/reviews` | công khai | Đánh giá hiển thị | AC-REV-02 |
| POST | `/api/products/{id}/reviews` | khách | Gửi đánh giá | AC-REV-01 |
| GET / DELETE | `/api/cart` | khách | Xem / xoá giỏ | AC-CART-02 |
| POST | `/api/cart/items` | khách | Thêm vào giỏ | AC-CART-01 |
| PATCH / DELETE | `/api/cart/items/{variantId}` | khách | Sửa SL / xoá dòng | AC-CART-02 |
| POST | `/api/cart/quote` | khách | Báo giá server | AC-CART-03/04 |
| GET / POST | `/api/orders` | khách | Đơn của tôi / đặt hàng | AC-ORD-01…06 |
| GET | `/api/orders/{id}` | khách | Chi tiết + lịch sử | AC-ORD-04 |
| POST | `/api/orders/{id}/cancel` | khách | Huỷ đơn chờ xác nhận | AC-ORD-05 |
| GET | `/api/wishlist` | khách | Yêu thích | AC-WISH-01 |
| PUT / DELETE | `/api/wishlist/{productId}` | khách | Thêm (giá mong muốn) / bỏ | AC-WISH-01 |
| GET / POST | `/api/restock-subscriptions` | khách | Báo có hàng (toggle) | AC-WISH-03 |
| GET / PATCH | `/api/me/profile` | khách | Hồ sơ | AC-ACC-01 |
| GET / PUT | `/api/me/measurements` | khách | Số đo | AC-ACC-02 |
| GET / POST | `/api/me/outfits` | khách | Outfit | AC-ACC-03 |
| DELETE | `/api/me/outfits/{id}` | khách | Xoá outfit | AC-ACC-03 |
| GET | `/api/me/notifications` | khách | Thông báo | AC-ACC-04 |
| POST | `/api/me/notifications/{id}/read` | khách | Đánh dấu đã đọc | AC-ACC-04 |
| POST | `/api/me/notifications/read-all` | khách | Đọc tất cả | AC-ACC-04 |
| POST | `/api/newsletter` | công khai | Nhận tin | AC-ACC-05 |
| GET | `/api/admin/dashboard` | admin | Tổng quan | AC-ADM-01 |
| GET / POST | `/api/admin/products` | admin | Danh sách (cả ẩn) / tạo | AC-ADM-02 |
| PATCH | `/api/admin/products/{id}` | admin | Sửa / ẩn | AC-ADM-02 |
| PUT | `/api/admin/products/{id}/stock` | admin | Đặt tồn kho biến thể | AC-ADM-04 |
| POST | `/api/admin/categories` | admin | Thêm danh mục | AC-ADM-03 |
| PATCH / DELETE | `/api/admin/categories/{id}` | admin | Đổi tên / xoá | AC-ADM-03 |
| GET | `/api/admin/orders` | admin | Đơn, lọc trạng thái | AC-ADM-05 |
| GET | `/api/admin/orders/{id}` | admin | Chi tiết đơn | AC-ADM-05 |
| PATCH | `/api/admin/orders/{id}/status` | admin | Đổi trạng thái | AC-ADM-05 |
| GET | `/api/admin/customers` | admin | Khách + chi tiêu | AC-ADM-06 |
| GET | `/api/admin/reviews` | admin | Đánh giá (mọi trạng thái) | AC-ADM-07 |
| PATCH / DELETE | `/api/admin/reviews/{id}` | admin | Ẩn/hiện / xoá | AC-ADM-07 |
| GET / POST | `/api/admin/coupons` | admin | Mã giảm giá | AC-ADM-08 |
| PATCH | `/api/admin/coupons/{code}` | admin | Bật/tắt, sửa | AC-ADM-08 |

## Ví dụ

```bash
# Đăng nhập
TOKEN=$(curl -s localhost:4000/api/auth/login -H 'content-type: application/json' \
  -d '{"email":"minhanh@demo.thaitu.vn","password":"Demo@1234"}' | jq -r .accessToken)

# Thêm vào giỏ
curl -s localhost:4000/api/cart/items -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"productId":"k11","color":"ltdenim","size":"M","quantity":1}'

# Báo giá với mã giảm giá
curl -s localhost:4000/api/cart/quote -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"shipping":"std","coupon":"THAITU10"}'
# → {"subtotal":690000,"discount":69000,"shippingFee":30000,"total":651000,...}

# Đặt hàng
curl -s localhost:4000/api/orders -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' \
  -d '{"name":"Nguyễn Minh Anh","phone":"0901234567","address":"24 Lý Tự Trọng, Quận 1, TP. HCM","ship":"std","pay":"cod","coupon":"THAITU10"}'
# → 201 {"id":"TT1100","status":"pending","total":651000,...}

# Hết hàng
# → 409 {"error":{"code":"OUT_OF_STOCK","message":"Không đủ hàng cho một số sản phẩm.","details":[{"productId":"k08","size":"L","requested":1,"available":0,...}]}}
```
