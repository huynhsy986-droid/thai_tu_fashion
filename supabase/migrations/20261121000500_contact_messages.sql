-- =====================================================================
-- Thai Tu Fashion · Migration 005 · Tin nhắn liên hệ (trang #contact)  — Issue #3
-- AC-CON-01: khách (kể cả chưa đăng nhập) gửi tin nhắn qua RPC submit_contact
-- AC-CON-02: admin xem, đổi trạng thái (new → read → replied), xoá
-- Tác giả: TV2 – nguyen06-vn
-- =====================================================================
create type public.contact_status as enum ('new', 'read', 'replied');

create table public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references public.profiles(id) on delete set null,
  name        text not null check (char_length(name) between 2 and 80),
  email       text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone       text check (phone is null or phone ~ '^0\d{9}$'),
  topic       text not null check (topic in ('order', 'product', 'size', 'return', 'partner', 'other')),
  order_code  text check (order_code is null or order_code ~ '^TT\d{4,}$'),
  message     text not null check (char_length(message) between 10 and 2000),
  status      public.contact_status not null default 'new',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index contact_messages_status_created_idx on public.contact_messages (status, created_at desc);

create trigger contact_messages_updated_at before update on public.contact_messages
  for each row execute function public.tg_set_updated_at();

-- Gửi tin nhắn: security definer để anon không cần quyền insert trực tiếp vào bảng
create or replace function public.submit_contact(
  p_name text, p_email text, p_phone text, p_topic text, p_order_code text, p_message text
) returns uuid
language plpgsql volatile security definer set search_path = public as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_phone text := nullif(regexp_replace(coalesce(p_phone, ''), '\s', '', 'g'), '');
  v_code  text := nullif(upper(btrim(coalesce(p_order_code, ''))), '');
  v_id uuid;
begin
  if char_length(btrim(coalesce(p_name, ''))) < 2 then
    raise exception using message = 'Nhập họ tên.', errcode = 'P0001', hint = 'VALIDATION', detail = 'name';
  end if;
  if v_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception using message = 'Email chưa đúng định dạng, ví dụ: ten@email.com', errcode = 'P0001', hint = 'VALIDATION', detail = 'email';
  end if;
  if v_phone is not null and v_phone !~ '^0\d{9}$' then
    raise exception using message = 'Số điện thoại gồm 10 số, bắt đầu bằng 0.', errcode = 'P0001', hint = 'VALIDATION', detail = 'phone';
  end if;
  if char_length(btrim(coalesce(p_message, ''))) < 10 then
    raise exception using message = 'Nội dung cần ít nhất 10 ký tự.', errcode = 'P0001', hint = 'VALIDATION', detail = 'message';
  end if;
  -- chống spam đơn giản: tối đa 5 tin / email / giờ
  if (select count(*) from public.contact_messages where email = v_email and created_at > now() - interval '1 hour') >= 5 then
    raise exception using message = 'Bạn đã gửi nhiều tin nhắn, vui lòng thử lại sau.', errcode = 'P0001', hint = 'RATE_LIMITED';
  end if;
  insert into public.contact_messages (user_id, name, email, phone, topic, order_code, message)
  values (auth.uid(), btrim(p_name), v_email, v_phone, coalesce(p_topic, 'other'), v_code, btrim(p_message))
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.submit_contact(text, text, text, text, text, text) from public;
grant execute on function public.submit_contact(text, text, text, text, text, text) to anon, authenticated;

-- RLS: chỉ admin đọc/sửa/xoá; không ai insert trực tiếp (đi qua submit_contact)
alter table public.contact_messages enable row level security;
grant select, update, delete on public.contact_messages to authenticated;
create policy contact_admin_select on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_admin_update on public.contact_messages for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy contact_admin_delete on public.contact_messages for delete to authenticated using (public.is_admin());

-- Dashboard: thêm số tin nhắn mới (giữ nguyên các trường cũ)
create or replace function public.admin_contact_unread() returns int
language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then (select count(*)::int from public.contact_messages where status = 'new') else 0 end
$$;
grant execute on function public.admin_contact_unread() to authenticated;
