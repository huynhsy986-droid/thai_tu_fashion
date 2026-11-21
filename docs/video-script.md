# Kịch bản video demo (≤ 10 phút)

**Viết:** TV1 – lequangkhanh6002-pixel · Yêu cầu brief: tối đa 10 phút, tối thiểu 720p, MP4, YouTube *Unlisted* hoặc *Public*, chỉ cần quay ứng dụng chạy (không cần quay code), phải thể hiện **đủ yêu cầu 5 task**.

## Chuẩn bị

- Quay bản đã deploy (hoặc `npm start` local với dữ liệu mẫu), Chrome cửa sổ 1280×720 trở lên, tắt thông báo hệ thống.
- Mở sẵn các tab: web, GitHub (Issues, Pull Requests, Milestones), Supabase Table Editor, Google Analytics *Realtime*, Sentry *Issues*, `docs/10-lighthouse.md`.
- Tài khoản: khách `minhanh@demo.thaitu.vn / Demo@1234`, admin `admin@thaitu.vn / Admin@1234` (hoặc tài khoản thật trên production).
- Chia người nói: TV1 mở đầu + Task 1 + Task 5, TV3 Task 2 + Task 4, TV2 Task 3.

## Phân cảnh

| Thời gian | Người nói | Cảnh quay | Lời dẫn chính | Task |
|---|---|---|---|---|
| 0:00–0:30 | TV1 | Trang chủ | Giới thiệu nhóm, dự án Thai Tu Fashion, đối tượng khách hàng | — |
| 0:30–1:30 | TV1 | `docs/wireframes/`, `docs/09-project-plan.md`, GitHub Milestones → Issues → 1 PR (commit có `(#issue)`, `Closes #`) | Phân vai, wireframe 10 trang, 5 sprint, quy trình issue → branch → PR | 1 |
| 1:30–3:30 | TV3 | Trang chủ → menu → Cửa hàng (lọc, tìm không dấu) → Sản phẩm (màu/size, size hết hàng bị khoá, gợi ý size) → Giới thiệu → Liên hệ (nhập sai để hiện lỗi, rồi gửi thành công) | ≥ 3 trang, điều hướng, tương tác JS: modal, slider, form validation, accordion | 2 |
| 3:30–4:00 | TV3 | DevTools → Responsive: 390px, 820px, 1280px; mở `css/tailwind.css` / class `tw-*` trong Elements | Responsive 3 breakpoint, Tailwind với prefix `tw-` theo design system | 2 |
| 4:00–6:00 | TV2 | Đăng nhập khách → thêm giỏ → mã `THAITU10` → đặt hàng → Tài khoản → Đơn hàng (timeline). Mở Supabase Table Editor: `orders`, `product_variants` (kho đã trừ), `contact_messages` (tin vừa gửi) | Dữ liệu thật trên PostgreSQL/Supabase, CRUD qua REST API, RLS | 3 |
| 6:00–7:00 | TV2 | Đăng nhập admin → Tổng quan (doanh thu 8 tuần) → Đơn hàng: đổi trạng thái → Liên hệ: đánh dấu đã trả lời → Sản phẩm: sửa giá | Trang quản trị đọc/ghi DB, máy trạng thái đơn | 3 |
| 7:00–8:15 | TV3 | `docs/10-lighthouse.md` (bảng trước/sau) + chạy Lighthouse trực tiếp trang chủ | Mobile 74 → 94, Accessibility 95 → 100; các lỗi đã sửa | 4 |
| 8:15–9:00 | TV3 | GA Realtime (thấy page_view, add_to_cart), Sentry Issues (lỗi có tag `request_id`) | Theo dõi người dùng & lỗi | 4 |
| 9:00–9:45 | TV1 | README → Task 5: bảng review 2 nhóm, bảng xử lý góp ý, ảnh trước/sau | Peer review & xử lý feedback | 5 |
| 9:45–10:00 | TV1 | Trang chủ | Tổng kết, cảm ơn | — |

## Sau khi quay

- Xuất MP4 ≥ 720p, kiểm tra tiếng, cắt còn ≤ 10:00.
- Đăng YouTube chế độ **Unlisted**, dán link vào README → *Thông Tin Nhóm* → *Video Demo* và tick checklist.
