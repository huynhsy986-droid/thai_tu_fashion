const { test, expect } = require('@playwright/test');
const { gotoApp, login, register, waitFor, DEMO, ADMIN } = require('./helpers');

test.describe('F1 · Đăng nhập: phiên bền, quên mật khẩu, trải nghiệm', () => {
  test('AC-AUTH-08 hiện/ẩn mật khẩu, thanh độ mạnh, khung tài khoản dùng thử chỉ khi server cho phép', async ({ page }) => {
    await gotoApp(page, 'register');
    await page.fill('#au-pass', 'abc');
    await expect(page.locator('#au-pass-meter')).toHaveAttribute('data-s', '1');
    await expect(page.locator('#au-pass-level')).toHaveText('Độ mạnh: Yếu');
    await page.fill('#au-pass', 'Matkhau2026!x');
    await expect(page.locator('#au-pass-meter')).toHaveAttribute('data-s', '4');
    await expect(page.locator('#au-pass-rules [data-r=len]')).toHaveClass(/ok/);
    await expect(page.locator('#au-pass-rules [data-r=mix]')).toHaveClass(/ok/);
    await expect(page.locator('#au-pass')).toHaveAttribute('type', 'password');
    await page.click('[data-a=pwToggle][data-for=au-pass]');
    await expect(page.locator('#au-pass')).toHaveAttribute('type', 'text');
    await expect(page.locator('[data-a=pwToggle][data-for=au-pass]')).toHaveAttribute('aria-label', 'Ẩn mật khẩu');

    await gotoApp(page, 'login');
    await expect(page.locator('.auth-demo')).toBeVisible(); // local: có dữ liệu mẫu
    await page.route('**/api/config', (r) => r.fulfill({ json: { gaMeasurementId: null, sentryDsn: null, demoAccounts: false } }));
    await page.reload(); // cùng URL: phải tải lại để đọc /api/config mới
    await waitFor(page, () => SYNC.ready);
    await page.waitForTimeout(300);
    await expect(page.locator('.auth-demo')).toHaveCount(0); // production: không có tài khoản dùng thử
  });

  test('AC-AUTH-08 menu người dùng: chữ cái đầu tên, liên kết đúng vai trò, đăng xuất', async ({ page }) => {
    await login(page, DEMO);
    await gotoApp(page, 'home');
    await expect(page.locator('#umenu .avatar')).toHaveText('A'); // Nguyễn Minh Anh
    await page.click('#umenu summary');
    const pop = page.locator('.umenu-pop');
    await expect(pop).toContainText('minhanh@demo.thaitu.vn');
    await expect(pop.locator('a[href="#admin"]')).toHaveCount(0);
    await pop.locator('a[href="#account-orders"]').click();
    await expect(page).toHaveURL(/#account-orders$/);
    await expect(page.locator('#umenu')).not.toHaveAttribute('open', '');
    await page.click('#umenu summary');
    await page.keyboard.press('Escape');
    await expect(page.locator('#umenu')).not.toHaveAttribute('open', '');
    await page.click('#umenu summary');
    await page.locator('.umenu-pop [data-a=logout]').click();
    await expect(page.locator('.hdr a[href="#login"][aria-label="Đăng nhập"]')).toBeVisible();
    await login(page, ADMIN);
    await gotoApp(page, 'home');
    await page.click('#umenu summary');
    await expect(page.locator('.umenu-pop a[href="#admin"]')).toBeVisible();
  });

  test('AC-AUTH-06 phiên hết hạn được gia hạn tự động — không bị đăng xuất', async ({ page }) => {
    await login(page, DEMO);
    // Giả lập đã qua 1 giờ: access token hỏng + hết hạn, chỉ còn refresh token
    await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('thaitu-session'));
      localStorage.setItem('thaitu-session', JSON.stringify({ ...s, accessToken: 'het-han', expiresAt: Math.floor(Date.now() / 1000) - 60 }));
    });
    await gotoApp(page, 'account-orders');
    await waitFor(page, () => Boolean(API.session()) && API.session().accessToken !== 'het-han' && S.orders.length > 0);
    await expect(page.locator('#main')).not.toContainText('Đăng nhập để');
    // Token bị server từ chối giữa chừng → gia hạn rồi gọi lại
    await page.evaluate(() => { const s = API.session(); API.setSession({ ...s, accessToken: 'bi-thu-hoi' }); });
    expect(await page.evaluate(() => API.get('/api/me/profile').then((p) => p.name))).toBe('Nguyễn Minh Anh');
    // Refresh token cũng hỏng → về trạng thái khách, có thông báo
    await page.evaluate(() => { const s = API.session(); API.setSession({ ...s, accessToken: 'x', refreshToken: 'hong-han' }); });
    expect(await page.evaluate(() => API.get('/api/me/profile').then(() => 0, (e) => e.status))).toBe(401);
    expect(await page.evaluate(() => API.session())).toBeNull();
  });

  test('AC-AUTH-07 quên mật khẩu → link → đặt mật khẩu mới → đăng nhập bằng mật khẩu mới', async ({ page }) => {
    const acc = await register(page, 'Khách Quên Mật Khẩu');
    await page.evaluate(() => { API.clear(); });
    await gotoApp(page, 'login');
    await page.fill('#au-email', acc.email);
    await page.click('#au-forgot');
    await expect(page).toHaveURL(/#forgot$/);
    await expect(page.locator('#fp-email')).toHaveValue(acc.email);
    await page.click('#fp-submit');
    await expect(page.locator('#fp-ok')).toContainText('Nếu email này đã đăng ký');
    await page.click('#fp-dev'); // môi trường thử: link thay cho email
    await expect(page).toHaveURL(/#reset-password$/); // token đã bị xoá khỏi URL
    await page.fill('#rp-pass', 'MatKhauMoi789');
    await page.fill('#rp-pass2', 'KhacNhau789');
    await page.click('#rp-submit');
    await expect(page.locator('[data-err=rp-pass2]')).toHaveText('Hai mật khẩu chưa khớp.');
    await page.fill('#rp-pass2', 'MatKhauMoi789');
    await page.click('#rp-submit');
    await expect(page).toHaveURL(/#login$/);
    await expect(page.locator('#au-ok')).toContainText('Đã đổi mật khẩu');
    await login(page, { email: acc.email, password: 'MatKhauMoi789' });
    expect(await page.evaluate(() => API.user().email)).toBe(acc.email);
  });

  test('AC-AUTH-07 link hỏng/hết hạn → quay về Quên mật khẩu với lời nhắc', async ({ page }) => {
    await page.goto('/#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid');
    await expect(page).toHaveURL(/#forgot$/);
    await expect(page.locator('#fp-note')).toContainText('đã hết hạn');
    await page.goto('/#access_token=gia-mao-123456&type=recovery');
    await expect(page).toHaveURL(/#reset-password$/);
    await page.fill('#rp-pass', 'MatKhauMoi789');
    await page.fill('#rp-pass2', 'MatKhauMoi789');
    await page.click('#rp-submit');
    await expect(page).toHaveURL(/#forgot$/);
    await expect(page.locator('#fp-note')).toContainText('không hợp lệ hoặc đã hết hạn');
  });
});
