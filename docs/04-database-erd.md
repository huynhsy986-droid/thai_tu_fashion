# 04 · Database Schema (ERD) – Supabase Postgres

**Người viết:** TV2 – nguyen06-vn · **Nguồn sự thật:** `supabase/migrations/*.sql`

## 1. Sơ đồ quan hệ

```mermaid
erDiagram
  AUTH_USERS ||--|| PROFILES : "trigger on_auth_user_created"
  PROFILES ||--o{ CART_ITEMS : has
  PROFILES ||--o{ WISHLIST_ITEMS : has
  PROFILES ||--o{ RESTOCK_SUBSCRIPTIONS : has
  PROFILES ||--o{ ORDERS : places
  PROFILES ||--o{ REVIEWS : writes
  PROFILES ||--o{ NOTIFICATIONS : receives
  PROFILES ||--o{ OUTFITS : saves
  PROFILES ||--o| BODY_MEASUREMENTS : has
  CATEGORIES ||--o{ PRODUCTS : contains
  PRODUCTS ||--o{ PRODUCT_VARIANTS : "colors x sizes"
  COLORS ||--o{ PRODUCT_VARIANTS : colors
  PRODUCTS ||--o{ REVIEWS : has
  PRODUCTS ||--o{ WISHLIST_ITEMS : in
  PRODUCT_VARIANTS ||--o{ CART_ITEMS : in
  PRODUCT_VARIANTS ||--o{ RESTOCK_SUBSCRIPTIONS : watched
  PRODUCT_VARIANTS ||--o{ ORDER_ITEMS : sold
  ORDERS ||--|{ ORDER_ITEMS : contains
  ORDERS ||--o{ ORDER_STATUS_HISTORY : logs
  SHIPPING_METHODS ||--o{ ORDERS : ships
  COUPONS ||--o{ ORDERS : applied

  PROFILES {
    uuid id PK "= auth.users.id"
    text full_name
    text email
    text phone
    text address
    date birthday
    user_role role "customer | admin"
  }
  CATEGORIES {
    text id PK "tops, outer..."
    text name
    text description
    int sort_order
  }
  COLORS {
    text code PK "lav, mint..."
    text name
    text hex
  }
  PRODUCTS {
    text id PK "k01, t01..."
    text name
    text category_id FK
    text gender "unisex | nu | nam"
    int price "VND"
    int sale_price "null | < price"
    text_arr sizes
    text_arr colors
    text badge
    product_status status "active | hidden"
    int sold_count
    text base_image "ảnh img/{base}-{color}-{k}.webp"
  }
  PRODUCT_VARIANTS {
    bigint id PK
    text product_id FK
    text color_code FK
    text size
    int stock "CHECK >= 0"
  }
  REVIEWS {
    uuid id PK
    text product_id FK
    uuid user_id FK "null = dữ liệu nhập"
    smallint rating "1..5"
    text body ">= 10 ký tự"
    bool verified "server tính"
    review_status status
  }
  CART_ITEMS {
    uuid user_id PK
    bigint variant_id PK
    int quantity "1..99"
  }
  WISHLIST_ITEMS {
    uuid user_id PK
    text product_id PK
    int target_price
  }
  RESTOCK_SUBSCRIPTIONS {
    uuid user_id PK
    bigint variant_id PK
  }
  COUPONS {
    text code PK
    coupon_type type "pct | amt | ship"
    int value
    int min_subtotal
    bool active
    timestamptz expires_at
    int usage_limit
    int used_count
  }
  SHIPPING_METHODS {
    text code PK "std | exp"
    int fee
    int free_threshold
  }
  ORDERS {
    text id PK "TT1100..."
    uuid user_id FK
    text recipient_name
    text phone "^0[0-9]{9}$"
    text address
    text shipping_method FK
    payment_method payment_method
    payment_status payment_status
    text coupon_code FK
    int subtotal
    int discount
    int shipping_fee
    int total "CHECK = max(0, sub-disc+fee)"
    order_status status
  }
  ORDER_ITEMS {
    bigint id PK
    text order_id FK
    text product_id FK
    bigint variant_id FK
    text product_name "snapshot"
    int quantity
    int unit_price "snapshot"
    int line_total "generated"
  }
  ORDER_STATUS_HISTORY {
    bigint id PK
    text order_id FK
    order_status from_status
    order_status to_status
    uuid changed_by FK
  }
  NOTIFICATIONS {
    bigint id PK
    uuid user_id FK
    notif_type type "order | price | stock | info"
    text title
    bool is_read
  }
  OUTFITS {
    uuid id PK
    uuid user_id FK
    text name
    jsonb slots
  }
  BODY_MEASUREMENTS {
    uuid user_id PK
    numeric height_cm "130..210"
    numeric weight_kg "35..150"
    text fit_pref
  }
```

Ngoài ra: `newsletter_subscribers(email PK)`, view `product_rating_stats(product_id, rating_avg, rating_count)` (security_invoker).

## 2. Quy tắc dữ liệu đáng chú ý

| Quy tắc | Cài đặt | AC |
|---|---|---|
| Tồn kho không âm | `CHECK (stock >= 0)` + khoá `FOR UPDATE` trong `place_order` | AC-ORD-02/03 |
| Tổng tiền nhất quán | `CHECK (total = greatest(0, subtotal - discount + shipping_fee))` | AC-CART-03 |
| Giá sale < giá gốc | `products_sale_lt_price` | AC-ADM-02 |
| Biến thể = màu × size | trigger `products_sync_variants` (biến thể mới = 10, biến thể bị bỏ thì xoá) | AC-ADM-02 |
| Snapshot đơn hàng | `order_items.product_name`, `unit_price` lưu tại thời điểm mua | AC-ORD-04 |
| Không xoá danh mục còn SP | FK `on delete restrict` → API trả 409 | AC-ADM-03 |
| Mã đơn dạng `TTxxxx` | `default 'TT' || nextval('order_number_seq')` | AC-ORD-01 |

## 3. Functions & triggers

| Tên | Loại | Vai trò |
|---|---|---|
| `handle_new_user` | trigger `auth.users` | tạo `profiles` khi đăng ký |
| `tg_protect_profile_role` | trigger | chặn tự nâng quyền |
| `tg_sync_product_variants` | trigger | đồng bộ biến thể |
| `tg_notify_price_drop` | trigger | thông báo giảm giá cho người thích |
| `tg_notify_restock` | trigger | thông báo có hàng, huỷ đăng ký |
| `tg_review_defaults` | trigger | tính `verified`, ép `status=visible` với khách |
| `is_admin()` | function | dùng trong RLS |
| `cart_quote(shipping, coupon)` | RPC | báo giá giỏ |
| `place_order(...)` | RPC | đặt hàng nguyên tử |
| `cancel_my_order(id)` | RPC | khách huỷ đơn `pending` |
| `admin_set_order_status(id, status, note)` | RPC | admin đổi trạng thái |
| `admin_dashboard()` | RPC | số liệu tổng quan |
| `subscribe_newsletter(email)` | RPC | đăng ký nhận tin |

## 4. Ma trận RLS

| Bảng | anon | authenticated (khách) | admin |
|---|---|---|---|
| categories, colors, shipping_methods | đọc | đọc | đọc/ghi |
| products, product_variants | đọc SP `active` | đọc SP `active` | đọc tất cả, ghi |
| reviews | đọc `visible` | đọc `visible` + của mình; thêm của mình; xoá của mình | đọc/sửa/xoá tất cả |
| profiles | — | đọc/sửa của mình (không đổi `role`) | đọc/sửa tất cả |
| cart_items, wishlist_items, restock_subscriptions, outfits, body_measurements | — | CRUD của mình | (như khách) |
| notifications | — | đọc/đánh dấu/xoá của mình | (như khách) |
| orders, order_items, order_status_history | — | đọc của mình; ghi qua RPC | đọc tất cả; ghi qua RPC |
| coupons | — | — (kiểm tra qua `cart_quote`) | CRUD |
| newsletter_subscribers | ghi qua RPC | ghi qua RPC | đọc |

## 5. Dữ liệu giả lập

`node scripts/gen-seed.mjs` đọc catalogue của prototype và sinh `supabase/seed.sql`:

| Bảng | Số dòng |
|---|---|
| auth.users / profiles | 14 (1 admin, 13 khách) |
| categories / colors / shipping_methods | 7 / 23 / 2 |
| products / product_variants | 66 / 319 (tổng tồn kho ≈ 2.950) |
| reviews | 262 |
| orders (+ items, history) | 34 |
| coupons | 5 (3 của prototype + `SUMMER25` đã hết hạn + `VIP100K` giới hạn lượt) |
