-- =====================================================================
-- Thai Tu Fashion · Migration 004 · Dashboard: thêm lowStockCount, tăng giới hạn danh sách sắp hết lên 50
-- Lý do: prototype hiển thị cả biến thể tồn kho 0; giới hạn 20 làm mất biến thể còn 1–2 (phát hiện bởi integration test AC-ADM-01).
-- Không sửa migration 002 đã merge (CLAUDE.md · Constraints).
-- =====================================================================
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
    'lowStockCount', (select count(*) from public.product_variants v join public.products p on p.id = v.product_id
                       where p.status = 'active' and v.stock <= 2),
    'lowStock', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                   select v.product_id as "productId", p.name, v.color_code as color, v.size, v.stock
                     from public.product_variants v join public.products p on p.id = v.product_id
                    where p.status = 'active' and v.stock <= 2
                    order by v.stock, p.name, v.color_code, v.size limit 50) x)
  ) into res;
  return res;
end $$;

