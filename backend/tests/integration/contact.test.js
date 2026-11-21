import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { makeTestApp, bearer } from '../helpers/app.js';
import { ADMIN, DEMO } from '../helpers/env.js';

let t;
beforeAll(async () => { t = await makeTestApp('contact'); });
afterAll(async () => t?.close());

const valid = { name: 'Trần Thu Hà', email: 'Thuha@Example.com', phone: '0901 234 567', topic: 'size', message: 'Mình cao 1m62 nặng 50kg thì mặc size nào?' };

describe('F9 · Liên hệ', () => {
  it('AC-CON-01 khách chưa đăng nhập gửi tin nhắn, dữ liệu được chuẩn hoá', async () => {
    const r = await t.api().post('/api/contact').send(valid);
    expect(r.status).toBe(201);
    expect(r.body.ok).toBe(true);
    const { rows } = await t.sql('select * from public.contact_messages where id = $1', [r.body.id]);
    expect(rows[0]).toMatchObject({ name: 'Trần Thu Hà', email: 'thuha@example.com', phone: '0901234567', topic: 'size', status: 'new', user_id: null });
  });

  it('AC-CON-01 khách đã đăng nhập: tin nhắn gắn với tài khoản, kèm mã đơn', async () => {
    const token = await t.login(DEMO);
    const r = await t.api().post('/api/contact').set(bearer(token)).send({ ...valid, topic: 'order', orderCode: 'tt1100' });
    expect(r.status).toBe(201);
    const { rows } = await t.sql('select user_id, order_code from public.contact_messages where id = $1', [r.body.id]);
    expect(rows[0]).toEqual({ user_id: DEMO.id, order_code: 'TT1100' });
  });

  it.each([
    [{ name: 'A' }, 'Nhập họ tên.'],
    [{ email: 'abc' }, 'Email chưa đúng định dạng, ví dụ: ten@email.com'],
    [{ phone: '12345' }, 'Số điện thoại gồm 10 số, bắt đầu bằng 0.'],
    [{ topic: 'spam' }, 'Chọn chủ đề cần hỗ trợ.'],
    [{ orderCode: 'ABC' }, 'Mã đơn có dạng TT1234.'],
    [{ message: 'ngắn' }, 'Nội dung cần ít nhất 10 ký tự.'],
  ])('AC-CON-01 dữ liệu sai %o → 422 thông báo tiếng Việt', async (patch, msg) => {
    const r = await t.api().post('/api/contact').send({ ...valid, ...patch });
    expect(r.status).toBe(422);
    expect(r.body.error.message).toBe(msg);
  });

  it('AC-CON-01 chống spam: quá 5 tin/email/giờ → 429', async () => {
    const email = `spam${Date.now()}@test.vn`;
    for (let i = 0; i < 5; i += 1) expect((await t.api().post('/api/contact').send({ ...valid, email })).status).toBe(201);
    const r = await t.api().post('/api/contact').send({ ...valid, email });
    expect(r.status).toBe(429);
    expect(r.body.error.code).toBe('RATE_LIMITED');
  });

  it('AC-CON-02 admin xem, lọc, đổi trạng thái, xoá; khách thường bị chặn', async () => {
    const sent = await t.api().post('/api/contact').send({ ...valid, email: 'admin-flow@test.vn' });
    const admin = await t.login(ADMIN);
    const list = await t.api().get('/api/admin/contacts').set(bearer(admin));
    expect(list.status).toBe(200);
    expect(list.body.items.find((x) => x.id === sent.body.id)).toMatchObject({ name: 'Trần Thu Hà', status: 'new', topic: 'size', phone: '0901234567' });
    expect(list.body.unread).toBeGreaterThanOrEqual(1);
    const p = await t.api().patch(`/api/admin/contacts/${sent.body.id}`).set(bearer(admin)).send({ status: 'replied' });
    expect(p.body.status).toBe('replied');
    expect((await t.api().get('/api/admin/contacts?status=replied').set(bearer(admin))).body.items.map((x) => x.id)).toContain(sent.body.id);
    expect((await t.api().get('/api/admin/contacts?status=xyz').set(bearer(admin))).status).toBe(422);
    expect((await t.api().patch(`/api/admin/contacts/${sent.body.id}`).set(bearer(admin)).send({ status: 'done' })).status).toBe(422);

    const customer = await t.login(DEMO);
    expect((await t.api().get('/api/admin/contacts').set(bearer(customer))).status).toBe(403);

    expect((await t.api().delete(`/api/admin/contacts/${sent.body.id}`).set(bearer(admin))).status).toBe(204);
    expect((await t.api().delete(`/api/admin/contacts/${sent.body.id}`).set(bearer(admin))).status).toBe(404);
    expect((await t.api().patch('/api/admin/contacts/khong-ton-tai').set(bearer(admin)).send({ status: 'read' })).status).toBe(404);
  });

  it('AC-CON-02 RLS: anon và khách không đọc/ghi trực tiếp bảng contact_messages', async () => {
    await expect(t.db.withUser(null, (c) => c.query('select * from public.contact_messages'))).rejects.toMatchObject({ code: '42501' });
    const demo = { id: DEMO.id, email: DEMO.email };
    expect((await t.db.withUser(demo, (c) => c.query('select * from public.contact_messages'))).rowCount).toBe(0);
    await expect(t.db.withUser(demo, (c) => c.query("insert into public.contact_messages (name, email, topic, message) values ('Hack', 'h@x.vn', 'other', 'xxxxxxxxxxxx')"))).rejects.toMatchObject({ code: '42501' });
    expect((await t.db.withUser(demo, (c) => c.query("update public.contact_messages set status = 'read'"))).rowCount).toBe(0);
  });
});
