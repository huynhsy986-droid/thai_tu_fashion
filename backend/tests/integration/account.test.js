import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp, bearer } from '../helpers/app.js';
import { DEMO } from '../helpers/env.js';

let t;
beforeAll(async () => { t = await makeTestApp('account'); });
afterAll(async () => t?.close());

describe('F7 · Tài khoản cá nhân', () => {
  it('AC-ACC-01 xem và sửa hồ sơ', async () => {
    const token = await t.login(DEMO);
    const g = await t.api().get('/api/me/profile').set(bearer(token));
    expect(g.body).toMatchObject({ name: 'Nguyễn Minh Anh', birthday: '1998-05-14', role: 'customer' });
    const p = await t.api().patch('/api/me/profile').set(bearer(token)).send({ name: 'Nguyễn Minh Anh B', phone: '0901 111 222', address: '1 Lê Lợi, Quận 1', birthday: '1999-01-02' });
    expect(p.status).toBe(200);
    expect(p.body).toMatchObject({ name: 'Nguyễn Minh Anh B', phone: '0901 111 222', birthday: '1999-01-02' });
    expect((await t.api().patch('/api/me/profile').set(bearer(token)).send({ name: 'A' })).body.error.message).toBe('Nhập họ tên.');
    expect((await t.api().patch('/api/me/profile').set(bearer(token)).send({ name: 'Tên', birthday: '2020-13-40' })).status).toBe(422);
  });

  it('AC-ACC-01 khách không tự nâng quyền admin (trigger DB)', async () => {
    const c = await t.newCustomer();
    const err = await t.db.withUser({ id: c.user.id, email: c.email }, (cl) => cl.query("update public.profiles set role = 'admin' where id = $1", [c.user.id])).catch((e) => e);
    expect(err.hint).toBe('FORBIDDEN');
  });

  it('AC-ACC-02 lưu số đo với giới hạn hợp lệ', async () => {
    const c = await t.newCustomer();
    expect((await t.api().get('/api/me/measurements').set(bearer(c.token))).body).toBeNull();
    const ok = await t.api().put('/api/me/measurements').set(bearer(c.token)).send({ height: 170, weight: 60, chest: 90, waist: 72, hip: 95, fit: 'oversized' });
    expect(ok.body).toEqual({ height: 170, weight: 60, chest: 90, waist: 72, hip: 95, fit: 'oversized' });
    const bad = await t.api().put('/api/me/measurements').set(bearer(c.token)).send({ height: 250, weight: 60, chest: 90, waist: 72, hip: 95 });
    expect(bad.status).toBe(422);
    expect(bad.body.error.message).toBe('Chiều cao cần trong khoảng 130–210.');
  });

  it('AC-ACC-03 lưu, xem, xoá outfit; không xoá được outfit người khác', async () => {
    const c = await t.newCustomer();
    const o = await t.api().post('/api/me/outfits').set(bearer(c.token)).send({ name: 'Đi chơi cuối tuần', slots: { top: { pid: 'k06', color: 'white' }, bottom: { pid: 'k11', color: 'ltdenim' } } });
    expect(o.status).toBe(201);
    expect((await t.api().get('/api/me/outfits').set(bearer(c.token))).body.items).toHaveLength(1);
    const other = await t.newCustomer();
    expect((await t.api().delete(`/api/me/outfits/${o.body.id}`).set(bearer(other.token))).status).toBe(404);
    expect((await t.api().delete(`/api/me/outfits/${o.body.id}`).set(bearer(c.token))).status).toBe(204);
    expect((await t.api().post('/api/me/outfits').set(bearer(c.token)).send({ name: '', slots: {} })).body.error.message).toBe('Đặt tên để dễ tìm lại.');
    const evil = await t.api().post('/api/me/outfits').set(bearer(c.token)).send({ name: 'X', slots: { top: { pid: '<img src=x onerror=alert(1)>', color: 'white' } } });
    expect(evil.status).toBe(422);
  });

  it('AC-ACC-04 thông báo: đánh dấu từng cái và tất cả', async () => {
    const token = await t.login(DEMO);
    let items = (await t.api().get('/api/me/notifications').set(bearer(token))).body.items;
    expect(items.filter((n) => !n.read).length).toBeGreaterThan(0);
    await t.api().post(`/api/me/notifications/${items[0].id}/read`).set(bearer(token)).expect(204);
    items = (await t.api().get('/api/me/notifications').set(bearer(token))).body.items;
    expect(items[0].read).toBe(true);
    await t.api().post('/api/me/notifications/read-all').set(bearer(token)).expect(204);
    items = (await t.api().get('/api/me/notifications').set(bearer(token))).body.items;
    expect(items.every((n) => n.read)).toBe(true);
  });

  it('AC-ACC-05 đăng ký nhận tin: email hợp lệ, gửi lại không lỗi, email sai → 422', async () => {
    expect((await t.api().post('/api/newsletter').send({ email: 'Ban@Email.com' })).status).toBe(201);
    expect((await t.api().post('/api/newsletter').send({ email: 'ban@email.com' })).status).toBe(201);
    const bad = await t.api().post('/api/newsletter').send({ email: 'sai-email' });
    expect(bad.status).toBe(422);
    expect(bad.body.error.message).toBe('Email chưa đúng định dạng, ví dụ: ten@email.com');
    const { rows } = await t.sql("select count(*)::int as n from public.newsletter_subscribers where email = 'ban@email.com'");
    expect(rows[0].n).toBe(1);
  });
});
