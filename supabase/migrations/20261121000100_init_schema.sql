-- =====================================================================
-- Thai Tu Fashion · Migration 001 · Schema
-- Tác giả: TV2 – nguyen06-vn (Solution Architect)
-- Tham chiếu: docs/04-database-erd.md, PRD F1–F8
-- =====================================================================
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------- Kiểu liệt kê ----------
create type public.user_role      as enum ('customer', 'admin');
create type public.product_status as enum ('active', 'hidden');
create type public.review_status  as enum ('visible', 'hidden');
create type public.order_status   as enum ('pending', 'confirmed', 'processing', 'shipping', 'delivered', 'cancelled');
create type public.coupon_type    as enum ('pct', 'amt', 'ship');
create type public.payment_method as enum ('cod', 'online');
create type public.payment_status as enum ('unpaid', 'paid', 'refunded');
create type public.notif_type     as enum ('order', 'price', 'stock', 'info');

-- ---------- Người dùng ----------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 120),
  email       text,
  phone       text check (phone is null or phone ~ '^[0-9 +().-]{0,20}$'),
  address     text check (address is null or char_length(address) <= 300),
  birthday    date,
  role        public.user_role not null default 'customer',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
comment on table public.profiles is 'Hồ sơ người dùng, 1-1 với auth.users (tạo tự động bằng trigger).';

-- ---------- Danh mục, màu, phương thức giao ----------
create table public.categories (
  id          text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name        text not null check (char_length(name) between 1 and 80),
  description text,
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create table public.colors (
  code text primary key check (code ~ '^[a-z0-9-]{2,20}$'),
  name text not null,
  hex  text not null check (hex ~ '^#[0-9A-Fa-f]{6}$')
);

create table public.shipping_methods (
  code           text primary key,
  name           text not null,
  eta            text not null,
  fee            int  not null check (fee >= 0),
  free_threshold int  check (free_threshold is null or free_threshold > 0),
  sort_order     int  not null default 0
);

-- ---------- Sản phẩm & biến thể ----------
create table public.products (
  id            text primary key check (id ~ '^[a-z0-9-]{2,40}$'),
  name          text not null check (char_length(name) between 3 and 160),
  kor_name      text,
  category_id   text not null references public.categories (id) on update cascade on delete restrict,
  sub_type      text not null,
  gender        text not null default 'unisex' check (gender in ('unisex', 'nu', 'nam')),
  template      text,
  texture       text,
  base_image    text not null,               -- mã ảnh gốc: img/{base_image}-{color}-{a|b|c|d|o}.webp
  image_colors  text[] not null,             -- các màu có ảnh
  price         int  not null check (price > 0),
  sale_price    int  check (sale_price is null or (sale_price > 0)),
  sizes         text[] not null check (cardinality(sizes) >= 1),
  colors        text[] not null check (cardinality(colors) >= 1),
  badge         text not null default '' check (badge in ('', 'new', 'best', 'sale')),
  fit           text,
  fabric        smallint[],
  occasions     text[] not null default '{}',
  styles        text[] not null default '{}',
  description   text,
  material      text,
  care          text,
  is_photo      boolean not null default false,
  status        public.product_status not null default 'active',
  sold_count    int not null default 0 check (sold_count >= 0),
  likes_count   int not null default 0 check (likes_count >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint products_sale_lt_price check (sale_price is null or sale_price < price)
);
create index products_category_idx on public.products (category_id);
create index products_status_idx   on public.products (status);

create table public.product_variants (
  id          bigint generated always as identity primary key,
  product_id  text not null references public.products (id) on update cascade on delete cascade,
  color_code  text not null references public.colors (code),
  size        text not null check (char_length(size) between 1 and 20),
  stock       int  not null default 0 check (stock >= 0),
  updated_at  timestamptz not null default now(),
  unique (product_id, color_code, size)
);
create index product_variants_product_idx on public.product_variants (product_id);

-- ---------- Đánh giá ----------
create table public.reviews (
  id            uuid primary key default gen_random_uuid(),
  product_id    text not null references public.products (id) on update cascade on delete cascade,
  user_id       uuid references public.profiles (id) on delete set null,
  display_name  text not null check (char_length(display_name) between 2 and 60),
  rating        smallint not null check (rating between 1 and 5),
  body          text not null check (char_length(body) between 10 and 2000),
  size          text,
  color_code    text references public.colors (code),
  height_cm     smallint check (height_cm is null or height_cm between 100 and 230),
  weight_kg     smallint check (weight_kg is null or weight_kg between 25 and 200),
  fit_feel      text check (fit_feel is null or fit_feel in ('true', 'small', 'large')),
  verified      boolean not null default false,
  status        public.review_status not null default 'visible',
  image_url     text,
  created_at    timestamptz not null default now()
);
create index reviews_product_idx on public.reviews (product_id, status);

-- ---------- Giỏ, yêu thích, báo có hàng ----------
create table public.cart_items (
  user_id     uuid   not null references public.profiles (id) on delete cascade,
  variant_id  bigint not null references public.product_variants (id) on delete cascade,
  quantity    int    not null check (quantity between 1 and 99),
  added_at    timestamptz not null default now(),
  primary key (user_id, variant_id)
);

create table public.wishlist_items (
  user_id      uuid not null references public.profiles (id) on delete cascade,
  product_id   text not null references public.products (id) on update cascade on delete cascade,
  target_price int  check (target_price is null or target_price >= 0),
  created_at   timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table public.restock_subscriptions (
  user_id     uuid   not null references public.profiles (id) on delete cascade,
  variant_id  bigint not null references public.product_variants (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (user_id, variant_id)
);

-- ---------- Mã giảm giá ----------
create table public.coupons (
  code          text primary key check (code ~ '^[A-Z0-9]{3,20}$'),
  type          public.coupon_type not null,
  value         int  not null default 0 check (value >= 0),
  min_subtotal  int  not null default 0 check (min_subtotal >= 0),
  label         text not null,
  active        boolean not null default true,
  starts_at     timestamptz,
  expires_at    timestamptz,
  usage_limit   int check (usage_limit is null or usage_limit > 0),
  used_count    int not null default 0 check (used_count >= 0),
  created_at    timestamptz not null default now(),
  constraint coupons_pct_range check (type <> 'pct' or value between 1 and 100)
);

-- ---------- Đơn hàng ----------
create sequence public.order_number_seq start 1100;

create table public.orders (
  id               text primary key default ('TT' || nextval('public.order_number_seq')),
  user_id          uuid references public.profiles (id) on delete set null,
  recipient_name   text not null check (char_length(recipient_name) between 2 and 120),
  phone            text not null check (phone ~ '^0[0-9]{9}$'),
  address          text not null check (char_length(address) between 10 and 300),
  note             text not null default '' check (char_length(note) <= 500),
  shipping_method  text not null references public.shipping_methods (code),
  payment_method   public.payment_method not null,
  payment_status   public.payment_status not null default 'unpaid',
  coupon_code      text references public.coupons (code) on update cascade,
  subtotal         int not null check (subtotal >= 0),
  discount         int not null default 0 check (discount >= 0),
  shipping_fee     int not null default 0 check (shipping_fee >= 0),
  total            int not null check (total >= 0),
  status           public.order_status not null default 'pending',
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint orders_total_consistent check (total = greatest(0, subtotal - discount + shipping_fee))
);
create index orders_user_idx   on public.orders (user_id, created_at desc);
create index orders_status_idx on public.orders (status, created_at desc);

create table public.order_items (
  id            bigint generated always as identity primary key,
  order_id      text   not null references public.orders (id) on delete cascade,
  product_id    text   references public.products (id) on update cascade on delete set null,
  variant_id    bigint references public.product_variants (id) on delete set null,
  product_name  text   not null,
  color_code    text   not null,
  size          text   not null,
  quantity      int    not null check (quantity > 0),
  unit_price    int    not null check (unit_price >= 0),
  line_total    int    generated always as (quantity * unit_price) stored
);
create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.order_status_history (
  id           bigint generated always as identity primary key,
  order_id     text not null references public.orders (id) on delete cascade,
  from_status  public.order_status,
  to_status    public.order_status not null,
  changed_by   uuid references public.profiles (id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);
create index order_status_history_order_idx on public.order_status_history (order_id, created_at);

-- ---------- Thông báo, outfit, số đo, nhận tin ----------
create table public.notifications (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  type        public.notif_type not null,
  title       text not null,
  body        text not null default '',
  link        text,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, is_read, created_at desc);

create table public.outfits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 80),
  slots       jsonb not null default '{}'::jsonb check (jsonb_typeof(slots) = 'object'),
  created_at  timestamptz not null default now()
);
create index outfits_user_idx on public.outfits (user_id, created_at desc);

create table public.body_measurements (
  user_id     uuid primary key references public.profiles (id) on delete cascade,
  height_cm   numeric(5,1) not null check (height_cm between 130 and 210),
  weight_kg   numeric(5,1) not null check (weight_kg between 35 and 150),
  chest_cm    numeric(5,1) not null check (chest_cm between 60 and 150),
  waist_cm    numeric(5,1) not null check (waist_cm between 50 and 140),
  hip_cm      numeric(5,1) not null check (hip_cm between 70 and 160),
  fit_pref    text not null default 'regular' check (fit_pref in ('oversized', 'relaxed', 'regular', 'slim')),
  updated_at  timestamptz not null default now()
);

create table public.newsletter_subscribers (
  email       text primary key check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  created_at  timestamptz not null default now()
);

-- ---------- View tổng hợp đánh giá ----------
create view public.product_rating_stats with (security_invoker = true) as
  select product_id,
         round(avg(rating)::numeric, 2) as rating_avg,
         count(*)::int                  as rating_count
    from public.reviews
   where status = 'visible'
   group by product_id;
