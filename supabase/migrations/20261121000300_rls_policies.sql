-- =====================================================================
-- Thai Tu Fashion · Migration 003 · Row Level Security & quyền (NFR-SEC-01)
-- Nguyên tắc: bật RLS mọi bảng; anon chỉ đọc catalogue công khai;
-- người dùng chỉ chạm dữ liệu của mình; admin qua is_admin();
-- đơn hàng/coupon chỉ được ghi qua function SECURITY DEFINER.
-- =====================================================================

-- ---------- Quyền mức bảng ----------
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;

grant select on public.categories, public.colors, public.shipping_methods, public.products,
                public.product_variants, public.reviews, public.product_rating_stats
  to anon, authenticated;

grant select, update                  on public.profiles               to authenticated;
grant insert, update, delete          on public.categories, public.colors, public.products, public.product_variants to authenticated;
grant insert, update, delete          on public.reviews                to authenticated;
grant select, insert, update, delete  on public.cart_items, public.wishlist_items, public.restock_subscriptions,
                                         public.outfits, public.body_measurements to authenticated;
grant select, update, delete          on public.notifications          to authenticated;
grant select, insert, update          on public.coupons                to authenticated;  -- RLS: chỉ admin
grant select                          on public.orders, public.order_items, public.order_status_history to authenticated;
grant select                          on public.newsletter_subscribers to authenticated;   -- RLS: chỉ admin
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- ---------- Quyền function ----------
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.format_vnd(int), public.effective_price(int, int), public.status_label(public.order_status),
                          public.order_next_statuses(public.order_status), public.is_admin()
  to anon, authenticated;
grant execute on function public.cart_quote(text, text),
                          public.place_order(text, text, text, text, text, public.payment_method, text, boolean),
                          public.cancel_my_order(text),
                          public.admin_set_order_status(text, public.order_status, text),
                          public.admin_dashboard()
  to authenticated;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
-- Trigger functions cần chạy được khi người dùng ghi bảng
grant execute on function public.tg_set_updated_at(), public.tg_protect_profile_role(), public.tg_sync_product_variants(),
                          public.tg_notify_price_drop(), public.tg_notify_restock(), public.tg_review_defaults()
  to authenticated;

-- ---------- Bật RLS ----------
alter table public.profiles               enable row level security;
alter table public.categories             enable row level security;
alter table public.colors                 enable row level security;
alter table public.shipping_methods       enable row level security;
alter table public.products               enable row level security;
alter table public.product_variants       enable row level security;
alter table public.reviews                enable row level security;
alter table public.cart_items             enable row level security;
alter table public.wishlist_items         enable row level security;
alter table public.restock_subscriptions  enable row level security;
alter table public.coupons                enable row level security;
alter table public.orders                 enable row level security;
alter table public.order_items            enable row level security;
alter table public.order_status_history   enable row level security;
alter table public.notifications          enable row level security;
alter table public.outfits                enable row level security;
alter table public.body_measurements      enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- ---------- profiles ----------
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- ---------- catalogue công khai ----------
create policy categories_read on public.categories for select to anon, authenticated using (true);
create policy categories_admin_write on public.categories for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy colors_read on public.colors for select to anon, authenticated using (true);
create policy colors_admin_write on public.colors for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy shipping_read on public.shipping_methods for select to anon, authenticated using (true);

create policy products_read on public.products for select to anon, authenticated
  using (status = 'active' or public.is_admin());
create policy products_admin_write on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy variants_read on public.product_variants for select to anon, authenticated
  using (public.is_admin() or exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy variants_admin_write on public.product_variants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- reviews ----------
create policy reviews_read on public.reviews for select to anon, authenticated
  using (status = 'visible' or user_id = auth.uid() or public.is_admin());
create policy reviews_insert_own on public.reviews for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy reviews_admin_update on public.reviews for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy reviews_delete on public.reviews for delete to authenticated
  using (public.is_admin() or user_id = auth.uid());

-- ---------- dữ liệu cá nhân: chỉ chủ sở hữu ----------
create policy cart_own on public.cart_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy wishlist_own on public.wishlist_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy restock_own on public.restock_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy outfits_own on public.outfits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy measures_own on public.body_measurements for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_select on public.notifications for select to authenticated
  using (user_id = auth.uid());
create policy notifications_update on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy notifications_delete on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ---------- coupons: chỉ admin xem/sửa (khách kiểm tra qua cart_quote) ----------
create policy coupons_admin on public.coupons for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ---------- đơn hàng: đọc của mình hoặc admin; ghi qua function ----------
create policy orders_read on public.orders for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy order_items_read on public.order_items for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));
create policy order_history_read on public.order_status_history for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_admin())));

-- ---------- newsletter: admin xem; đăng ký qua function ----------
create policy newsletter_admin_read on public.newsletter_subscribers for select to authenticated
  using (public.is_admin());

-- ---------- Supabase Storage (chỉ chạy khi có schema storage) ----------
do $$
begin
  if exists (select 1 from information_schema.schemata where schema_name = 'storage')
     and exists (select 1 from information_schema.tables where table_schema = 'storage' and table_name = 'buckets') then
    insert into storage.buckets (id, name, public) values ('product-images', 'product-images', true)
      on conflict (id) do nothing;
    insert into storage.buckets (id, name, public) values ('review-images', 'review-images', true)
      on conflict (id) do nothing;
  end if;
end $$;
