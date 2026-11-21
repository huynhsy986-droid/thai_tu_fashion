# 10 · Lighthouse — đo, sửa, đo lại (Task 4a)

**Người thực hiện:** TV3 – huynhsy986-droid · Issue [#8](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/8) · Hỗ trợ backend: TV2 – nguyen06-vn (nén gzip, PR #12)

## 1. Cách đo

| Mục | Giá trị |
|---|---|
| Công cụ | Lighthouse 12.8.2 (CLI), Chrome headless |
| Chế độ | **Mobile** (mặc định: Moto G Power, mạng 4G chậm giả lập, CPU ×4) và **Desktop** (`--preset=desktop`) |
| Môi trường | `NODE_ENV=production`, backend Express phục vụ cả frontend, dữ liệu mẫu từ `supabase/seed.sql` |
| Trước | commit `4004e13` (trước sprint 4) |
| Sau | nhánh `feature/8-lighthouse` (gồm cả nén gzip của PR #12) |
| Báo cáo gốc | `docs/lighthouse/*.html` (trang chủ, trước/sau, mobile/desktop) · số liệu mọi trang: `docs/lighthouse/summary.json` |

Chạy lại:

```bash
cd backend && NODE_ENV=production JWT_SECRET=<≥32 ký tự> npm start
npx lighthouse http://localhost:4000/#home --view                 # mobile
npx lighthouse http://localhost:4000/#home --preset=desktop --view
```

Sau khi deploy, đo lại bằng [PageSpeed Insights](https://pagespeed.web.dev/) với URL thật để có số liệu mạng thật.

## 2. Kết quả trước / sau

### Trang chủ `#home`

| Chỉ số | Mobile trước | Mobile sau | Desktop trước | Desktop sau |
|---|---|---|---|---|
| **Performance** | 74 | **94** | 95 | **100** |
| **Accessibility** | 95 | **100** | 95 | **100** |
| **Best Practices** | 100 | 100 | 100 | 100 |
| **SEO** | 100 | 100 | 100 | 100 |
| First Contentful Paint | 3,0 s | 1,4 s | 0,6 s | 0,4 s |
| Largest Contentful Paint | 5,3 s | 2,6 s | 1,2 s | 0,6 s |
| Total Blocking Time | 110 ms | 180 ms | 20 ms | 10 ms |
| Cumulative Layout Shift | 0 | 0 | 0,08 | 0 |
| Speed Index | 3,0 s | 1,6 s | 0,9 s | 0,6 s |
| Dung lượng tải | 1 199 KB | 850 KB | 1 216 KB | 857 KB |

### Các trang khác (Performance / Accessibility / Best Practices / SEO)

| Trang | Mobile trước | Mobile sau | Desktop trước | Desktop sau |
|---|---|---|---|---|
| Cửa hàng `#shop` | 76 / 95 / 100 / 100 | **94 / 100 / 100 / 100** | 98 / 95 / 100 / 100 | **100 / 100 / 100 / 100** |
| Sản phẩm `#product-k01` | 74 / 95 / 100 / 100 | **94 / 100 / 100 / 100** | 98 / 95 / 100 / 100 | **100 / 100 / 100 / 100** |
| Liên hệ `#contact` *(trang mới)* | — | **98 / 100 / 100 / 100** | — | **100 / 100 / 100 / 100** |

## 3. Vấn đề Lighthouse chỉ ra và cách sửa

| # | Vấn đề (audit) | Ảnh hưởng | Cách sửa | Commit / PR |
|---|---|---|---|---|
| 1 | *Enable text compression* | HTML/JS/CSS/JSON gửi nguyên bản, LCP mobile 5,3 s | Middleware `compression` (gzip) trên Express | PR #12 (TV2) |
| 2 | *Eliminate render-blocking resources* — 13 file JS | Chặn vẽ trang lần đầu | Thêm `defer` cho mọi `<script>` (giữ nguyên thứ tự chạy) | PR này |
| 3 | *Properly size images* — ảnh hero 1366–2200 px trên màn 390 px | Tải thừa ~560 KB trên mobile | Sinh `hero-mobile-480/800.webp`, `hero-desktop-1400.webp`; dùng `srcset` + `sizes`; `fetchpriority="high"` | PR này |
| 4 | *Largest Contentful Paint element* là ảnh hero do JS vẽ | Trình duyệt phát hiện ảnh muộn | `<link rel="preload" as="image" imagesrcset …>` theo `media` mobile/desktop | PR này |
| 5 | *Background and foreground colors do not have a sufficient contrast ratio* — chữ phụ `#7C7C84` (3,73:1 trên nền xám), giá giảm/nhãn sale `#D3416A`, nhãn "Đã mua hàng" `#2B8256` | Khó đọc, không đạt WCAG AA (4,5:1) | Chỉnh token: `--muted #696970` (5,45:1), `--hi #B8325A` (≥4,65:1), `--ok #237048` (≥4,65:1). Thay đổi gần như không thấy bằng mắt | PR này |
| 6 | *Heading elements are not in a sequentially-descending order* — tiêu đề cột footer dùng `<h4>` ngay sau `<h2>` | Trình đọc màn hình hiểu sai cấu trúc | Đổi thành `<h2 class="fh">`, giữ nguyên style | PR này |
| 7 | SEO/chia sẻ: mô tả ngắn, thiếu Open Graph, thiếu `robots.txt` | Hiển thị kém khi chia sẻ link | Mô tả đầy đủ, thẻ `og:*`, `theme-color`, `robots.txt` chặn `/api/` | PR này |

**Chưa xử lý (có lý do):**

- *Reduce unused CSS* (~10 KB) và *Minify JavaScript* (~2 KB): file CSS/JS của prototype phục vụ mọi trang của SPA; tách/minify thêm lợi rất ít so với rủi ro thay đổi giao diện.
- Google Fonts vẫn là tài nguyên chặn hiển thị (~0,3–0,8 s): CSP `script-src 'self'` không cho dùng mẹo `onload` nội tuyến; đã có `preconnect` + `display=swap`. Có thể tự host font ở sprint sau.
- TBT mobile 70–180 ms: phần lớn do dựng SPA từ dữ liệu catalogue (66 sản phẩm) ở trình duyệt; vẫn dưới ngưỡng 200 ms "tốt".

### Đo lại sau sprint 6 (skeleton, đăng nhập mới — Issue #23)

| Trang chủ | Performance | Accessibility | Best Practices | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| Mobile | **96** | 100 | 100 | 100 | 2,5 s | 0 |
| Desktop | **100** | 100 | 100 | 100 | 0,6 s | 0 |

Khung tải (skeleton) có cùng bố cục với trang thật nên không gây dịch chuyển bố cục (CLS 0), người dùng thấy cấu trúc trang ngay thay vì dòng chữ "Đang tải…".

## 4. Theo dõi sau triển khai (Task 4b)

- **Google Analytics 4**: page_view theo route + sự kiện mua hàng — bật bằng `GA_MEASUREMENT_ID` (PR #15).
- **Sentry**: lỗi trình duyệt + API 5xx (frontend, PR #15) và lỗi server (backend, PR #12), liên kết bằng `request_id`.
- **Log có cấu trúc** JSON trên Render (PR #12).
