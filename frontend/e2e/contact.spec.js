const { test, expect } = require('@playwright/test');
const { gotoApp, login, sql, watchErrors, ADMIN } = require('./helpers');

test.describe('F9 · Giới thiệu & Liên hệ', () => {
  test('AC-CON-03 trang Giới thiệu có số liệu thật, liên kết ở footer; không còn dòng chữ Website demo', async ({ page }) => {
    const errors = watchErrors(page);
    await gotoApp(page, 'home');
    await expect(page.locator('footer')).not.toContainText('Website demo');
    await page.locator('footer a[href="#about"]').first().click();
    await expect(page.locator('h1')).toContainText('Mặc thoải mái');
    const n = (await sql("select count(*)::int as n from public.products where status = 'active'"))[0].n;
    await expect(page.locator('#about-stats')).toContainText(`${n}`);
    await page.locator('main a[href="#contact"]').first().click();
    await expect(page.locator('form[data-form=contact]')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('AC-CON-01 form Liên hệ báo lỗi từng ô bằng tiếng Việt, gửi thành công lưu vào Supabase', async ({ page }) => {
    await gotoApp(page, 'contact');
    await page.fill('#ct-phone', '123');
    await page.fill('#ct-order', 'abc');
    await page.click('#ct-submit');
    await expect(page.locator('[data-err=ct-name]')).toHaveText('Nhập họ tên.');
    await expect(page.locator('[data-err=ct-email]')).toHaveText('Email chưa đúng định dạng, ví dụ: ten@email.com');
    await expect(page.locator('[data-err=ct-phone]')).toHaveText('Số điện thoại gồm 10 số, bắt đầu bằng 0.');
    await expect(page.locator('[data-err=ct-order]')).toHaveText('Mã đơn có dạng TT1234.');
    await expect(page.locator('[data-err=ct-msg]')).toHaveText('Nội dung cần ít nhất 10 ký tự.');
    const email = `e2e.${Date.now()}@test.vn`;
    await page.fill('#ct-name', 'Khách E2E');
    await page.fill('#ct-email', email);
    await page.fill('#ct-phone', '0909 123 456');
    await page.fill('#ct-order', 'tt1100');
    await page.selectOption('#ct-topic', 'return');
    await page.fill('#ct-msg', 'Mình muốn đổi size áo sang L.');
    await expect(page.locator('#ct-count')).toHaveText('29/2000');
    await page.click('#ct-submit');
    await expect(page.locator('#ct-ok')).toContainText(email);
    const rows = await sql('select name, phone, topic, order_code, status from public.contact_messages where email = $1', [email]);
    expect(rows).toEqual([{ name: 'Khách E2E', phone: '0909123456', topic: 'return', order_code: 'TT1100', status: 'new' }]);
  });

  test('AC-CON-02 admin xem tin nhắn mới, đánh dấu đã trả lời và xoá', async ({ page }) => {
    const email = `admin.e2e.${Date.now()}@test.vn`;
    await sql("insert into public.contact_messages (name, email, topic, message) values ('Người hỏi size', $1, 'size', 'Cao 1m70 nặng 60kg mặc size gì?')", [email]);
    await login(page, ADMIN);
    await gotoApp(page, 'admin-contacts');
    const row = page.locator('tr', { hasText: email });
    await expect(row).toContainText('Mới');
    await row.locator('[data-a=admCS]').click();
    await expect(row).toContainText('Đã xem');
    await row.locator('[data-a=admCS]').click();
    await expect(row).toContainText('Đã trả lời');
    expect((await sql('select status from public.contact_messages where email = $1', [email]))[0].status).toBe('replied');
    await page.click('[data-a=admCF][data-v=replied]');
    await expect(page.locator('tr', { hasText: email })).toBeVisible();
    await page.locator('tr', { hasText: email }).locator('[data-a=admCD]').click();
    await page.click('[data-a=admCDo]');
    await expect(page.locator('tr', { hasText: email })).toHaveCount(0);
    expect(await sql('select 1 from public.contact_messages where email = $1', [email])).toEqual([]);
  });

  test('NFR-REL-01 API tắt (demo): form Liên hệ vẫn gửi được, lưu trong trình duyệt', async ({ page }) => {
    await page.goto('/?demo#contact');
    await expect(page.locator('form[data-form=contact]')).toBeVisible();
    await page.fill('#ct-name', 'Khách Demo');
    await page.fill('#ct-email', 'demo@test.vn');
    await page.fill('#ct-msg', 'Cửa hàng có giao tới Đà Nẵng không?');
    await page.click('#ct-submit');
    await expect(page.locator('#ct-ok')).toBeVisible();
    await page.goto('/?demo#admin-contacts');
    await expect(page.locator('tr', { hasText: 'demo@test.vn' })).toContainText('Mới');
  });
});

test('AC-CON-04 chân trang và trang Liên hệ có email, địa chỉ, hotline chính thức (bấm được để gọi/gửi mail)', async ({ page }) => {
  await gotoApp(page, 'contact');
  const f = page.locator('footer .ftr-contact');
  await expect(f).toContainText('Số 174 Lê Lợi, Quận Hải Châu, TP. Đà Nẵng');
  await expect(f.locator('a[href="tel:19005368"]')).toHaveText('1900 5368');
  await expect(f.locator('a[href="tel:+84393131385"]')).toHaveText('+84 393 131 385');
  await expect(f.locator('a[href="mailto:support@thaitufashion.vn"]')).toBeVisible();
  await expect(page.locator('main')).toContainText('support@thaitufashion.vn');
  await expect(page.locator('main a[href="tel:19005368"]')).toBeVisible();
  await gotoApp(page, 'about');
  await expect(page.locator('main')).toContainText('Số 174 Lê Lợi');
});
