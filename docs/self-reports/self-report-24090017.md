# Self-Report: Final Project

---

## Thông tin cá nhân

| | |
|---|---|
| **Full name** | Huỳnh Tấn Sỹ |
| **Student ID** | 24090017 |
| **Team** | Nhóm 5 |
| **Role in team** | TV3 · Frontend Engineer & QA |

---

## Task 1 — Planning & Setup

**Week:** Sprint 1 · đến 23/11/2026

**Work completed:**

Tạo repo, nhãn, milestone, CI GitHub Actions; quy ước branch/PR.

**Evidence of contribution:**

- `.github/workflows/ci.yml`
- [Milestones](https://github.com/huynhsy986-droid/thai_tu_fashion/milestones)
- [Commit của huynhsy986-droid](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=huynhsy986-droid)

**Difficulties encountered:**

Thiết lập GitHub cho cả nhóm (nhãn, milestone, quy ước branch và Pull Request) và cấu hình CI chạy đủ test backend, e2e trên trình duyệt thật mất nhiều thời gian; lúc đầu test e2e chạy trước khi database sẵn sàng nên phải sắp xếp lại thứ tự.

**Self-assessment:** ⟨1–10⟩

8

## Task 2 — UI Implementation

**Week:** Sprint 2 · đến 25/11/2026

**Work completed:**

Nối giao diện với API (đăng nhập, phân quyền admin, đồng bộ giỏ/đơn); tích hợp Tailwind CSS; trang Giới thiệu & Liên hệ; tab Liên hệ trong quản trị; bỏ dòng "Website demo" ở footer.

**Evidence of contribution:**

- `frontend/js/{api,auth,sync,info}.js`
- Tailwind [#5](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/5) → [PR #13](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/13)
- Giới thiệu/Liên hệ [#6](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/6) → [PR #14](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/14)
- [Commit của huynhsy986-droid](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=huynhsy986-droid)

**Difficulties encountered:**

Phải nối giao diện prototype với API mà vẫn giữ nguyên thiết kế, và web vẫn chạy được khi API tắt. Tích hợp Tailwind CSS mà không làm vỡ CSS sẵn có cần cấu hình riêng (tiền tố tw-, tắt reset). Chính sách bảo mật CSP chặn một số cách kiểm thử nên em phải đổi cách viết test.

**Self-assessment:** ⟨1–10⟩

9

## Task 3 — Database Integration

**Week:** Sprint 3 · đến 27/11/2026

**Work completed:**

Các trang động đọc/ghi Supabase qua API; e2e kiểm tra dữ liệu thật (đặt hàng, tồn kho, liên hệ).

**Evidence of contribution:**

- `frontend/e2e/`
- `docs/06-test-report.md`
- [Commit của huynhsy986-droid](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=huynhsy986-droid)

**Difficulties encountered:**

Đồng bộ giỏ hàng, đơn hàng giữa giao diện và server: phải cập nhật giao diện ngay khi bấm nhưng vẫn khớp với dữ liệu thật trên server, xử lý trường hợp hết hàng giữa chừng và giỏ của khách chưa đăng nhập.

**Self-assessment:** ⟨1–10⟩

8

## Task 4 — Optimization

**Week:** Sprint 4 · đến 30/11/2026

**Work completed:**

Lighthouse đo → sửa → đo lại (mobile 74→94, accessibility 95→100); Google Analytics 4 + Sentry trình duyệt.

**Evidence of contribution:**

- Lighthouse [#8](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/8) → [PR #16](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/16)
- GA/Sentry [#7](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/7) → [PR #15](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/15)
- `docs/10-lighthouse.md`
- [Commit của huynhsy986-droid](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=huynhsy986-droid)

**Difficulties encountered:**

Lần deploy đầu lên Vercel chỉ chạy được API, trang chủ báo "Cannot GET /", phải đổi cách cấu hình. Biến môi trường có tiền tố PUBLIC_ bị Vercel chặn khi lưu dạng Secret. Điểm Lighthouse mobile trên bản thật (86) thấp hơn khi đo ở máy (94–96) vì ảnh lớn tải qua mạng thật, và ảnh chụp báo cáo lần đầu bị lỗi chồng số phải chụp lại.

**Self-assessment:** ⟨1–10⟩

8

## Task 5 — Peer Review

**Week:** Sprint 5 · đến 06/12/2026

**Work completed:**

Tham gia review 2 nhóm (giao diện/trải nghiệm); sửa giao diện theo góp ý nhận được.

**Evidence of contribution:**

- `docs/peer-review/`
- [Commit của huynhsy986-droid](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=huynhsy986-droid)

**Difficulties encountered:**

Phần đánh giá hai nhóm do bạn đại diện nhóm thực hiện; em hỗ trợ kiểm tra giao diện trên điện thoại và máy tính. Khó khăn là sắp xếp lịch trao đổi trực tiếp và chờ góp ý từ các nhóm khác để sửa.

**Self-assessment:** ⟨1–10⟩

7

## Tổng Kết Đóng Góp Cá Nhân

**Summary of your contributions to the project:**

Em phụ trách frontend và kiểm thử: nối toàn bộ giao diện với API, làm đăng nhập/phân quyền, tích hợp Tailwind CSS, xây trang Giới thiệu và Liên hệ, khung tải và menu người dùng. Em cũng viết test e2e, cấu hình CI, tối ưu Lighthouse (mobile 74 → 86, accessibility 100) và deploy website lên Vercel. Điều em tự hào nhất là website chạy thật trên Vercel với dữ liệu Supabase và mọi thay đổi đều được test tự động trước khi merge. Qua dự án, em học được cách tối ưu hiệu năng web, viết test trên trình duyệt thật và deploy một ứng dụng hoàn chỉnh.  

**Estimated % contribution relative to the whole team:** 34% *(tỷ lệ cả nhóm thống nhất, xem README → Đánh giá mức độ đóng góp)*

**Overall self-assessment score:** ⟨1–10⟩
10
