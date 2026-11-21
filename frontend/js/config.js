/* Thai Tu Fashion: cấu hình chạy. Nạp đầu tiên.
   apiBase: '' = cùng origin với backend (mặc định khi backend phục vụ frontend).
   Khi mở frontend riêng (VD: npx serve . -l 8080) đặt apiBase:'http://localhost:4000'.
   forceDemo: true = luôn chạy chế độ demo cục bộ như prototype (không gọi API). */
window.THAITU_CONFIG = Object.assign({ apiBase: '', forceDemo: false, timeoutMs: 4000 }, window.THAITU_CONFIG || {});
(function () {
  try {
    const q = new URLSearchParams(location.search);
    if (q.has('api')) window.THAITU_CONFIG.apiBase = q.get('api');
    if (q.has('demo')) window.THAITU_CONFIG.forceDemo = true;
  } catch (e) {}
})();
