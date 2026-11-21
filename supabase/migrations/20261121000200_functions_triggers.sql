-- =====================================================================
-- Thai Tu Fashion · Migration 002 · Functions & triggers (business rules)
-- Một nguồn sự thật: tính tiền, trừ/hoàn kho, máy trạng thái đơn, thông báo.
-- Lỗi nghiệp vụ: errcode P0001 + HINT = mã lỗi (API map sang HTTP status).
--   AUTH_REQUIRED 401 · FORBIDDEN 403 · NOT_FOUND 404 · OUT_OF_STOCK 409 · CONFLICT 409
--   VALIDATION 422 · CART_EMPTY 422 · COUPON_INVALID 422 · INVALID_TRANSITION 422 · PAYMENT_FAILED 402
-- =====================================================================

-- ---------- Tiện ích ----------
create or replace function public.format_vnd(p int) returns text
language sql immutable set search_path = public as $$
  select replace(to_char(coalesce(p, 0), 'FM999,999,999,999'), ',', '.') || '₫'
$$;

create or replace function public.effective_price(p_price int, p_sale int) returns int
language sql immutable set search_path = public as $$
  select case when p_sale is not null and p_sale > 0 and p_sale < p_price then p_sale else p_price end
$$;

create or replace function public.status_label(p public.order_status) returns text
language sql immutable set search_path = public as $$
  select case p
    when 'pending'    then 'Chờ xác nhận'
    when 'confirmed'  then 'Đã xác nhận'
    when 'processing' then 'Đang xử lý'
    when 'shipping'   then 'Đang giao'
    when 'delivered'  then 'Đã giao'
    when 'cancelled'  then 'Đã huỷ' end
$$;

-- Máy trạng thái đơn hàng (AC-ADM-05)
create or replace function public.order_next_statuses(p_from public.order_status) returns public.order_status[]
language sql immutable set search_path = public as $$
  select case p_from
    when 'pending'    then array['confirmed', 'cancelled']::public.order_status[]
    when 'confirmed'  then array['processing', 'cancelled']::public.order_status[]
    when 'processing' then array['shipping', 'cancelled']::public.order_status[]
    when 'shipping'   then array['delivered']::public.order_status[]
    else array[]::public.order_status[] end
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

-- ---------- updated_at ----------
create or replace function public.tg_set_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.tg_set_updated_at();
create trigger products_updated_at before update on public.products for each row execute function public.tg_set_updated_at();
create trigger variants_updated_at before update on public.product_variants for each row execute function public.tg_set_updated_at();
create trigger orders_updated_at   before update on public.orders   for each row execute function public.tg_set_updated_at();

-- ---------- Người dùng mới → profile (AC-AUTH-01) ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, phone)
  values (new.id, new.email,
          coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), split_part(new.email, '@', 1)),
          nullif(new.raw_user_meta_data ->> 'phone', ''))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Khách không tự nâng quyền (AC-AUTH-04)
create or replace function public.tg_protect_profile_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role and current_user in ('anon', 'authenticated') and not public.is_admin() then
    raise exception using message = 'Không được tự thay đổi vai trò tài khoản.', errcode = 'P0001', hint = 'FORBIDDEN';
  end if;
  return new;
end $$;
create trigger profiles_protect_role before update on public.profiles
  for each row execute function public.tg_protect_profile_role();

-- ---------- Đồng bộ biến thể theo màu × size (AC-ADM-02) ----------
create or replace function public.tg_sync_product_variants() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.product_variants (product_id, color_code, size, stock)
  select new.id, c, s, 10
    from unnest(new.colors) as c cross join unnest(new.sizes) as s
  on conflict (product_id, color_code, size) do nothing;

  delete from public.product_variants v
   where v.product_id = new.id
     and (not (v.color_code = any (new.colors)) or not (v.size = any (new.sizes)));
  return null;
end $$;
create trigger products_sync_variants after insert or update of colors, sizes on public.products
  for each row execute function public.tg_sync_product_variants();

-- ---------- Giảm giá → báo cho người đã thích (AC-WISH-02) ----------
create or replace function public.tg_notify_price_drop() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_old int := public.effective_price(old.price, old.sale_price);
  v_new int := public.effective_price(new.price, new.sale_price);
begin
  if v_new < v_old and new.status = 'active' then
    insert into public.notifications (user_id, type, title, body, link)
    select w.user_id, 'price',
           case when coalesce(w.target_price, 0) > 0 and v_new <= w.target_price
                then new.name || ' đã đạt giá bạn mong muốn'
                else new.name || ' vừa giảm giá' end,
           case when coalesce(w.target_price, 0) > 0 and v_new <= w.target_price
                then 'Giá mới ' || public.format_vnd(v_new) || ', mong muốn ' || public.format_vnd(w.target_price) || '.'
                else 'Từ ' || public.format_vnd(v_old) || ' xuống ' || public.format_vnd(v_new) || '.' end,
           'product-' || new.id
      from public.wishlist_items w
     where w.product_id = new.id;
  end if;
  return null;
end $$;
create trigger products_price_drop after update of price, sale_price on public.products
  for each row execute function public.tg_notify_price_drop();

-- ---------- Có hàng trở lại → báo người đăng ký (AC-WISH-03) ----------
create or replace function public.tg_notify_restock() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if old.stock = 0 and new.stock > 0 then
    with subs as (
      delete from public.restock_subscriptions where variant_id = new.id returning user_id
    )
    insert into public.notifications (user_id, type, title, body, link)
    select s.user_id, 'stock', p.name || ' đã có hàng trở lại',
           'Màu ' || c.name || ', size ' || new.size || ': còn ' || new.stock || ' sản phẩm.',
           'product-' || new.product_id
      from subs s
      join public.products p on p.id = new.product_id
      join public.colors c   on c.code = new.color_code;
  end if;
  return null;
end $$;
create trigger variants_restock after update of stock on public.product_variants
  for each row execute function public.tg_notify_restock();

-- ---------- Đánh giá: server xác định "đã mua" (AC-REV-01) ----------
create or replace function public.tg_review_defaults() returns trigger
language plpgsql set search_path = public as $$
begin
  if current_user in ('anon', 'authenticated') then
    new.created_at := now();
    if not public.is_admin() then new.status := 'visible'; end if;
    new.verified := new.user_id is not null and exists (
      select 1 from public.orders o join public.order_items i on i.order_id = o.id
       where o.user_id = new.user_id and o.status = 'delivered' and i.product_id = new.product_id);
  end if;
  return new;
end $$;
create trigger reviews_defaults before insert on public.reviews
  for each row execute function public.tg_review_defaults();

-- ---------- Mã giảm giá (AC-CART-04) ----------
create or replace function public._validate_coupon(p_code text, p_subtotal int, p_lock boolean default false)
returns public.coupons
language plpgsql security definer set search_path = public as $$
declare
  v public.coupons;
  v_code text := upper(btrim(coalesce(p_code, '')));
begin
  if v_code = '' then return null; end if;
  if p_lock then select * into v from public.coupons where code = v_code for update;
  else           select * into v from public.coupons where code = v_code; end if;
  if not found then
    raise exception using message = 'Mã này không tồn tại.', errcode = 'P0001', hint = 'COUPON_INVALID', detail = 'not_found';
  end if;
  if not v.active then
    raise exception using message = 'Mã này đã ngưng áp dụng.', errcode = 'P0001', hint = 'COUPON_INVALID', detail = 'inactive';
  end if;
  if v.starts_at is not null and now() < v.starts_at then
    raise exception using message = 'Mã này chưa đến thời gian áp dụng.', errcode = 'P0001', hint = 'COUPON_INVALID', detail = 'not_started';
  end if;
  if v.expires_at is not null and now() > v.expires_at then
    raise exception using message = 'Mã này đã hết hạn.', errcode = 'P0001', hint = 'COUPON_INVALID', detail = 'expired';
  end if;
  if v.usage_limit is not null and v.used_count >= v.usage_limit then
    raise exception using message = 'Mã này đã hết lượt sử dụng.', errcode = 'P0001', hint = 'COUPON_INVALID', detail = 'exhausted';
  end if;
  if p_subtotal < v.min_subtotal then
    raise exception using message = 'Mã này cần đơn từ ' || public.format_vnd(v.min_subtotal) || '.',
                          errcode = 'P0001', hint = 'COUPON_INVALID', detail = 'min_subtotal';
  end if;
  return v;
end $$;

-- ---------- Tính tiền (AC-CART-03) ----------
create or replace function public.compute_totals(p_subtotal int, p_shipping text,
                                                 p_coupon_type public.coupon_type, p_coupon_value int)
returns table (discount int, shipping_fee int, total int)
language plpgsql stable set search_path = public as $$
declare
  sm public.shipping_methods;
  d int := 0;
  f int;
begin
  select * into sm from public.shipping_methods where code = p_shipping;
  if not found then
    raise exception using message = 'Phương thức giao hàng không hợp lệ.', errcode = 'P0001', hint = 'VALIDATION', detail = 'shipping';
  end if;
  if p_coupon_type = 'pct' then d := round(p_subtotal * p_coupon_value / 100.0);
  elsif p_coupon_type = 'amt' then d := least(p_coupon_value, p_subtotal);
  end if;
  f := sm.fee;
  if sm.free_threshold is not null and p_subtotal >= sm.free_threshold then f := 0; end if;
  if p_coupon_type = 'ship' then f := 0; end if;
  return query select d, f, greatest(0, p_subtotal - d + f);
end $$;

create or replace function public.cart_quote(p_shipping text default 'std', p_coupon text default null)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_sub int;
  v_items jsonb;
  v public.coupons;
  t record;
begin
  if uid is null then
    raise exception using message = 'Bạn cần đăng nhập.', errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  select coalesce(sum(public.effective_price(p.price, p.sale_price) * ci.quantity), 0)::int,
         coalesce(jsonb_agg(jsonb_build_object(
            'variantId', v2.id, 'productId', p.id, 'name', p.name, 'color', v2.color_code, 'size', v2.size,
            'quantity', ci.quantity, 'unitPrice', public.effective_price(p.price, p.sale_price),
            'stock', v2.stock, 'available', (p.status = 'active' and v2.stock >= ci.quantity))
            order by ci.added_at, v2.id), '[]'::jsonb)
    into v_sub, v_items
    from public.cart_items ci
    join public.product_variants v2 on v2.id = ci.variant_id
    join public.products p on p.id = v2.product_id
   where ci.user_id = uid;

  v := public._validate_coupon(p_coupon, v_sub);
  select * into t from public.compute_totals(v_sub, p_shipping, v.type, v.value);
  return jsonb_build_object('items', v_items, 'subtotal', v_sub, 'discount', t.discount,
                            'shippingFee', t.shipping_fee, 'total', t.total,
                            'coupon', v.code, 'couponLabel', v.label, 'shipping', p_shipping);
end $$;

-- ---------- Đặt hàng nguyên tử (AC-ORD-01/02/03/06) ----------
create or replace function public.place_order(
  p_recipient_name text,
  p_phone          text,
  p_address        text,
  p_note           text default '',
  p_shipping       text default 'std',
  p_payment        public.payment_method default 'cod',
  p_coupon         text default null,
  p_payment_ok     boolean default true)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  uid     uuid := auth.uid();
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\s', '', 'g');
  r       record;
  v_sub   int := 0;
  v_count int := 0;
  v_issues jsonb := '[]'::jsonb;
  v       public.coupons;
  t       record;
  v_id    text;
begin
  if uid is null then
    raise exception using message = 'Bạn cần đăng nhập để đặt hàng.', errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  if char_length(btrim(coalesce(p_recipient_name, ''))) < 2 then
    raise exception using message = 'Nhập họ tên người nhận.', errcode = 'P0001', hint = 'VALIDATION', detail = 'recipientName';
  end if;
  if v_phone !~ '^0[0-9]{9}$' then
    raise exception using message = 'Số điện thoại cần có 10 chữ số và bắt đầu bằng 0.', errcode = 'P0001', hint = 'VALIDATION', detail = 'phone';
  end if;
  if char_length(btrim(coalesce(p_address, ''))) < 10 then
    raise exception using message = 'Nhập địa chỉ đầy đủ, gồm số nhà, đường và tỉnh/thành.', errcode = 'P0001', hint = 'VALIDATION', detail = 'address';
  end if;
  if not exists (select 1 from public.shipping_methods where code = p_shipping) then
    raise exception using message = 'Phương thức giao hàng không hợp lệ.', errcode = 'P0001', hint = 'VALIDATION', detail = 'shipping';
  end if;
  if p_payment = 'online' and not coalesce(p_payment_ok, false) then
    raise exception using message = 'Thanh toán không thành công. Bạn chưa bị trừ tiền.', errcode = 'P0001', hint = 'PAYMENT_FAILED';
  end if;

  -- Khoá các biến thể theo thứ tự id để tránh deadlock; đọc lại tồn kho mới nhất.
  for r in
    select v2.id as variant_id, v2.stock, v2.color_code, v2.size, p.id as product_id, p.name,
           p.status, public.effective_price(p.price, p.sale_price) as unit_price, ci.quantity
      from public.cart_items ci
      join public.product_variants v2 on v2.id = ci.variant_id
      join public.products p on p.id = v2.product_id
     where ci.user_id = uid
     order by v2.id
       for update of v2
  loop
    v_count := v_count + 1;
    if r.status <> 'active' or r.stock < r.quantity then
      v_issues := v_issues || jsonb_build_object(
        'productId', r.product_id, 'name', r.name, 'color', r.color_code, 'size', r.size,
        'requested', r.quantity, 'available', case when r.status = 'active' then r.stock else 0 end);
    end if;
    v_sub := v_sub + r.unit_price * r.quantity;
  end loop;

  if v_count = 0 then
    raise exception using message = 'Giỏ hàng đang trống.', errcode = 'P0001', hint = 'CART_EMPTY';
  end if;
  if jsonb_array_length(v_issues) > 0 then
    raise exception using message = 'Không đủ hàng cho một số sản phẩm.', errcode = 'P0001',
                          hint = 'OUT_OF_STOCK', detail = v_issues::text;
  end if;

  v := public._validate_coupon(p_coupon, v_sub, true);
  select * into t from public.compute_totals(v_sub, p_shipping, v.type, v.value);

  insert into public.orders (user_id, recipient_name, phone, address, note, shipping_method, payment_method,
                             payment_status, coupon_code, subtotal, discount, shipping_fee, total)
  values (uid, btrim(p_recipient_name), v_phone, btrim(p_address), coalesce(btrim(p_note), ''), p_shipping, p_payment,
          case when p_payment = 'online' then 'paid'::public.payment_status else 'unpaid'::public.payment_status end,
          v.code, v_sub, t.discount, t.shipping_fee, t.total)
  returning id into v_id;

  insert into public.order_items (order_id, product_id, variant_id, product_name, color_code, size, quantity, unit_price)
  select v_id, p.id, v2.id, p.name, v2.color_code, v2.size, ci.quantity, public.effective_price(p.price, p.sale_price)
    from public.cart_items ci
    join public.product_variants v2 on v2.id = ci.variant_id
    join public.products p on p.id = v2.product_id
   where ci.user_id = uid;

  update public.product_variants v2 set stock = v2.stock - ci.quantity
    from public.cart_items ci where ci.user_id = uid and ci.variant_id = v2.id;

  update public.products p set sold_count = p.sold_count + x.q
    from (select v2.product_id, sum(ci.quantity)::int as q
            from public.cart_items ci join public.product_variants v2 on v2.id = ci.variant_id
           where ci.user_id = uid group by v2.product_id) x
   where p.id = x.product_id;

  if v.code is not null then
    update public.coupons set used_count = used_count + 1 where code = v.code;
  end if;

  delete from public.cart_items where user_id = uid;

  insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
  values (v_id, null, 'pending', uid, 'Khách đặt hàng');

  insert into public.notifications (user_id, type, title, body, link)
  values (uid, 'order', 'Đã nhận đơn hàng ' || v_id,
          'Tổng ' || public.format_vnd(t.total) || '. Chúng tôi sẽ xác nhận sớm.', 'order-' || v_id);
  return v_id;
end $$;

-- ---------- Chuyển trạng thái đơn (nội bộ) ----------
create or replace function public._transition_order(p_order text, p_to public.order_status, p_actor uuid, p_note text default null)
returns public.order_status
language plpgsql volatile security definer set search_path = public as $$
declare
  o public.orders;
  v_pay public.payment_status;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then
    raise exception using message = 'Không tìm thấy đơn hàng.', errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  if o.status = p_to then return o.status; end if;
  if not (p_to = any (public.order_next_statuses(o.status))) then
    raise exception using message = format('Không thể chuyển đơn từ "%s" sang "%s".', public.status_label(o.status), public.status_label(p_to)),
                          errcode = 'P0001', hint = 'INVALID_TRANSITION';
  end if;

  v_pay := o.payment_status;
  if p_to = 'cancelled' then
    update public.product_variants v2 set stock = v2.stock + i.quantity
      from public.order_items i where i.order_id = o.id and i.variant_id = v2.id;
    update public.products p set sold_count = greatest(0, p.sold_count - x.q)
      from (select product_id, sum(quantity)::int as q from public.order_items
             where order_id = o.id and product_id is not null group by product_id) x
     where p.id = x.product_id;
    if o.payment_status = 'paid' then v_pay := 'refunded'; end if;
  elsif p_to = 'delivered' and o.payment_method = 'cod' then
    v_pay := 'paid';
  end if;

  update public.orders set status = p_to, payment_status = v_pay where id = o.id;
  insert into public.order_status_history (order_id, from_status, to_status, changed_by, note)
  values (o.id, o.status, p_to, p_actor, p_note);
  if o.user_id is not null then
    insert into public.notifications (user_id, type, title, body, link)
    values (o.user_id, 'order', 'Đơn ' || o.id || ': ' || public.status_label(p_to),
            'Trạng thái đơn hàng vừa được cập nhật.', 'order-' || o.id);
  end if;
  return p_to;
end $$;

-- Khách tự huỷ khi còn chờ xác nhận (AC-ORD-05)
create or replace function public.cancel_my_order(p_order text) returns public.order_status
language plpgsql volatile security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  v_status public.order_status;
begin
  if uid is null then
    raise exception using message = 'Bạn cần đăng nhập.', errcode = 'P0001', hint = 'AUTH_REQUIRED';
  end if;
  select status into v_status from public.orders where id = p_order and user_id = uid;
  if not found then
    raise exception using message = 'Không tìm thấy đơn hàng.', errcode = 'P0001', hint = 'NOT_FOUND';
  end if;
  if v_status <> 'pending' then
    raise exception using message = 'Chỉ huỷ được đơn đang chờ xác nhận.', errcode = 'P0001', hint = 'INVALID_TRANSITION';
  end if;
  return public._transition_order(p_order, 'cancelled', uid, 'Khách huỷ đơn');
end $$;

-- Admin đổi trạng thái (AC-ADM-05)
create or replace function public.admin_set_order_status(p_order text, p_status public.order_status, p_note text default null)
returns public.order_status
language plpgsql volatile security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception using message = 'Chỉ quản trị viên được thực hiện.', errcode = 'P0001', hint = 'FORBIDDEN';
  end if;
  return public._transition_order(p_order, p_status, auth.uid(), p_note);
end $$;

-- Dashboard (AC-ADM-01)
create or replace function public.admin_dashboard() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare res jsonb;
begin
  if not public.is_admin() then
    raise exception using message = 'Chỉ quản trị viên được thực hiện.', errcode = 'P0001', hint = 'FORBIDDEN';
  end if;
  select jsonb_build_object(
    'revenueWeeks', (
      select jsonb_agg(jsonb_build_object(
               'weekStart', to_char(w, 'YYYY-MM-DD'),
               'revenue', coalesce((select sum(total) from public.orders
                                     where status <> 'cancelled' and created_at >= w and created_at < w + interval '7 days'), 0),
               'orders',  (select count(*) from public.orders
                                     where status <> 'cancelled' and created_at >= w and created_at < w + interval '7 days'))
             order by w)
        from generate_series(date_trunc('week', now()) - interval '7 weeks', date_trunc('week', now()), interval '1 week') as w),
    'revenue8w', (select coalesce(sum(total), 0) from public.orders
                   where status <> 'cancelled' and created_at >= date_trunc('week', now()) - interval '7 weeks'),
    'statusCounts', (select jsonb_object_agg(s::text, (select count(*) from public.orders where status = s))
                       from unnest(enum_range(null::public.order_status)) as s),
    'activeProducts', (select count(*) from public.products where status = 'active'),
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'lowStock', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                   select v.product_id as "productId", p.name, v.color_code as color, v.size, v.stock
                     from public.product_variants v join public.products p on p.id = v.product_id
                    where p.status = 'active' and v.stock <= 2
                    order by v.stock, p.name, v.color_code, v.size limit 20) x)
  ) into res;
  return res;
end $$;

-- Nhận tin (AC-ACC-05) – idempotent
create or replace function public.subscribe_newsletter(p_email text) returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare v text := lower(btrim(coalesce(p_email, '')));
begin
  if v !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using message = 'Email chưa đúng định dạng, ví dụ: ten@email.com', errcode = 'P0001', hint = 'VALIDATION', detail = 'email';
  end if;
  insert into public.newsletter_subscribers (email) values (v) on conflict (email) do nothing;
  return true;
end $$;
