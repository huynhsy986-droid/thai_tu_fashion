-- =====================================================================
-- CHỈ DÙNG CHO AUTH_PROVIDER=local (dev/CI không có Supabase Auth).
-- Đăng ký/đăng nhập ghi trực tiếp vào auth.users với bcrypt (giống GoTrue),
-- để backend phát JWT HS256 cùng định dạng Supabase. Không cấp quyền cho anon/authenticated.
-- =====================================================================
create or replace function public.local_auth_signup(p_email text, p_password text, p_full_name text)
returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid := gen_random_uuid(); v_email text := lower(btrim(p_email));
begin
  if exists (select 1 from auth.users where email = v_email) then
    raise exception using message = 'Email đã được đăng ký.', errcode = 'P0001', hint = 'CONFLICT';
  end if;
  insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
  values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
          extensions.crypt(p_password, extensions.gen_salt('bf', 10)), now(),
          '{"provider":"email","providers":["email"]}'::jsonb,
          jsonb_build_object('full_name', btrim(p_full_name)), now(), now());
  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (v_id::text, v_id, jsonb_build_object('sub', v_id::text, 'email', v_email), 'email', now(), now());
  return v_id;
end $$;

create or replace function public.local_auth_login(p_email text, p_password text)
returns table (id uuid, email text)
language sql security definer set search_path = public, extensions as $$
  select u.id, u.email::text from auth.users u
   where u.email = lower(btrim(p_email))
     and u.encrypted_password = extensions.crypt(p_password, u.encrypted_password)
$$;

revoke execute on function public.local_auth_signup(text, text, text) from public, anon, authenticated;
revoke execute on function public.local_auth_login(text, text) from public, anon, authenticated;
