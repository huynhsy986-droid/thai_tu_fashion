import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp } from '../helpers/app.js';
import { ADMIN, DEMO, OTHER } from '../helpers/env.js';

let t;
beforeAll(async () => { t = await makeTestApp('rls'); });
afterAll(async () => t?.close());

const as = (user, sql, params) => t.db.withUser(user, (c) => c.query(sql, params));
const anon = (sql, params) => as(null, sql, params);
const demo = { id: DEMO.id, email: DEMO.email };
const other = { id: OTHER.id, email: OTHER.email };
const admin = { id: ADMIN.id, email: ADMIN.email };

describe('NFR-SEC-01 · Row Level Security trên Supabase Postgres', () => {
  it('NFR-SEC-01 mọi bảng trong schema public đều bật RLS', async () => {
    const { rows } = await t.sql("select relname from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity");
    expect(rows).toEqual([]);
    const { rows: all } = await t.sql("select count(*)::int as n from pg_class c join pg_namespace n on n.oid = c.relnamespace where n.nspname = 'public' and c.relkind = 'r'");
    expect(all[0].n).toBe(18);
  });

  it('NFR-SEC-01 anon chỉ đọc catalogue công khai', async () => {
    await t.sql("update public.products set status = 'hidden' where id = 'k23'");
    expect((await anon('select count(*)::int as n from public.products')).rows[0].n).toBe(65);
    expect((await anon("select count(*)::int as n from public.product_variants where product_id = 'k23'")).rows[0].n).toBe(0);
    for (const tbl of ['profiles', 'orders', 'cart_items', 'coupons', 'notifications', 'newsletter_subscribers']) {
      await expect(anon(`select * from public.${tbl} limit 1`), tbl).rejects.toMatchObject({ code: '42501' });
    }
    await expect(anon("insert into public.categories (id, name) values ('hack', 'Hack')")).rejects.toMatchObject({ code: '42501' });
  });

  it('NFR-SEC-01 khách chỉ thấy dữ liệu của mình', async () => {
    const orders = (await as(demo, 'select distinct user_id from public.orders')).rows;
    expect(orders).toEqual([{ user_id: DEMO.id }]);
    expect((await as(other, 'select count(*)::int as n from public.wishlist_items where user_id = $1', [DEMO.id])).rows[0].n).toBe(0);
    expect((await as(other, 'select count(*)::int as n from public.profiles')).rows[0].n).toBe(1);
    expect((await as(other, 'update public.notifications set is_read = true where user_id = $1', [DEMO.id])).rowCount).toBe(0);
    expect((await as(demo, 'select count(*)::int as n from public.coupons')).rows[0].n).toBe(0);
  });

  it('NFR-SEC-01 khách không ghi được catalogue, đơn hàng, giỏ người khác', async () => {
    expect((await as(demo, "update public.products set price = 1 where id = 'k01'")).rowCount).toBe(0);
    await expect(as(demo, "insert into public.products (id, name, category_id, sub_type, base_image, image_colors, price, sizes, colors) values ('zz', 'Hack SP', 'tops', 'top', 'k01', '{lav}', 1, '{M}', '{lav}')")).rejects.toMatchObject({ code: '42501' });
    await expect(as(demo, "update public.orders set total = 0 where user_id = $1", [DEMO.id])).rejects.toMatchObject({ code: '42501' });
    await expect(as(demo, 'insert into public.cart_items (user_id, variant_id, quantity) values ($1, 1, 1)', [OTHER.id])).rejects.toMatchObject({ code: '42501' });
    await expect(as(demo, "insert into public.reviews (product_id, user_id, display_name, rating, body) values ('k01', $1, 'Giả mạo', 5, 'Review giả mạo người khác')", [OTHER.id])).rejects.toMatchObject({ code: '42501' });
  });

  it('NFR-SEC-01 function nội bộ không gọi được trực tiếp; RPC admin chặn khách', async () => {
    await expect(as(demo, "select public._transition_order('TT1040', 'cancelled', $1)", [DEMO.id])).rejects.toMatchObject({ code: '42501' });
    await expect(as(demo, "select public._validate_coupon('THAITU10', 0)")).rejects.toMatchObject({ code: '42501' });
    await expect(as(demo, "select public.admin_set_order_status('TT1040', 'cancelled')")).rejects.toMatchObject({ hint: 'FORBIDDEN' });
    await expect(as(demo, 'select public.admin_dashboard()')).rejects.toMatchObject({ hint: 'FORBIDDEN' });
    await expect(anon("select public.place_order('A B', '0900000000', '1234567890 HN')")).rejects.toMatchObject({ code: '42501' });
    await expect(as(demo, "select public.local_auth_login('a', 'b')")).rejects.toMatchObject({ code: '42501' });
  });

  it('NFR-SEC-01 admin thấy toàn bộ đơn, coupon, SP ẩn', async () => {
    const total = (await t.sql('select count(*)::int as n from public.orders')).rows[0].n;
    expect((await as(admin, 'select count(*)::int as n from public.orders')).rows[0].n).toBe(total);
    expect((await as(admin, 'select count(*)::int as n from public.coupons')).rows[0].n).toBe(5);
    expect((await as(admin, "select status from public.products where id = 'k23'")).rows[0].status).toBe('hidden');
  });
});
