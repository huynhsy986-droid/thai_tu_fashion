# Self-Report: Final Project



---

## Thông tin cá nhân

| | |
|---|---|
| **Full name** | Nguyễn Trần Minh Nguyên |
| **Student ID** | 24090010 |
| **Team** | Nhóm 5 |
| **Role in team** | TV2 · Solution Architect & Backend |

---

## Task 1 — Planning & Setup

**Week:** Sprint 1 · đến 23/11/2026

**Work completed:**

Thiết kế kiến trúc (SPA + Express + Supabase), chọn công nghệ; setup dự án Supabase, quy ước backend.

**Evidence of contribution:**

- `docs/03-solution-architecture.md`
- `CLAUDE.md`, `.claude/skills/`
- [Commit của nguyen06-vn](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=nguyen06-vn)

**Difficulties encountered:**

Phải chọn kiến trúc vừa đủ cho đồ án nhưng vẫn chạy được thật trên Supabase: vừa giữ giao diện prototype, vừa có REST API và phân quyền đúng. Việc cấu hình dự án Supabase lần đầu (Auth, khoá công khai, kết nối pooler) mất khá nhiều thời gian tìm hiểu.


**Self-assessment:** ⟨1–10⟩
8 
---

## Task 2 — UI Implementation

**Week:** Sprint 2 · đến 25/11/2026

**Work completed:**

Cung cấp API cho các trang (catalog, giỏ, đơn, tài khoản) theo DTO giống prototype để UI không phải sửa.

**Evidence of contribution:**

- `backend/src/lib/mappers.js`
- `docs/openapi.yaml`
- [Commit của nguyen06-vn](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=nguyen06-vn)

**Difficulties encountered:**

Dữ liệu API phải trả về đúng "hình dạng" mà giao diện prototype đang dùng để frontend không phải viết lại, nên em phải viết lớp chuyển đổi dữ liệu và thống nhất với bạn làm frontend nhiều lần.

**Self-assessment:** ⟨1–10⟩
8
---

## Task 3 — Database Integration

**Week:** Sprint 3 · đến 27/11/2026

**Work completed:**

ERD 19 bảng, 5 migrations, RLS, function `cart_quote`/`place_order`; REST API 62 operation; bảng `contact_messages` + API liên hệ; áp dụng lên Supabase thật.

**Evidence of contribution:**

- `supabase/migrations/`
- `docs/04-database-erd.md`
- Liên hệ [#3](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/3) → [PR #11](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/11)
- `docs/07-supabase-production.md`
- [Commit của nguyen06-vn](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=nguyen06-vn)

**Difficulties encountered:**

Khó nhất là Row Level Security: mỗi truy vấn phải chạy dưới quyền đúng người dùng để khách không xem được dữ liệu của nhau. Đặt hàng phải trừ kho trong một giao dịch để hai người mua cùng lúc không bán vượt tồn kho. Luồng quên mật khẩu với Supabase cũng phức tạp vì liên kết trong email trả token về trên URL.


**Self-assessment:** ⟨1–10⟩
8
---

## Task 4 — Optimization

**Week:** Sprint 4 · đến 30/11/2026

**Work completed:**

Log JSON có request id, Sentry backend, `GET /api/config`, nén gzip (Lighthouse).

**Evidence of contribution:**

- [#4](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/4) → [PR #12](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/12)
- [Commit của nguyen06-vn](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=nguyen06-vn)

**Difficulties encountered:**

Thêm log có mã request và Sentry mà không làm lộ thông tin nhạy cảm (mật khẩu, token). Sau một lần cập nhật, CI bị đỏ dù mọi test đều qua do logger giả trong test thiếu hàm; em phải tìm ra nguyên nhân và sửa.

**Self-assessment:** ⟨1–10⟩
8
---

## Task 5 — Peer Review

**Week:** Sprint 5 · đến 06/12/2026

**Work completed:**

Tham gia review 2 nhóm (mảng chức năng/dữ liệu); xử lý góp ý liên quan backend.

**Evidence of contribution:**

- `docs/peer-review/`
- [Commit của nguyen06-vn](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=nguyen06-vn)

**Difficulties encountered:**

Phần peer review chủ yếu do bạn đại diện nhóm thực hiện; em góp ý về mặt chức năng và dữ liệu khi nhóm thảo luận. Khó khăn là sắp xếp thời gian cùng trao đổi với các nhóm khác.

**Self-assessment:** ⟨1–10⟩
9
---

## Tổng Kết Đóng Góp Cá Nhân

**Summary of your contributions to the project:**

Em phụ trách kiến trúc và backend: thiết kế cơ sở dữ liệu 19 bảng trên Supabase với Row Level Security, viết REST API cùng tài liệu OpenAPI, các hàm SQL tính tiền và đặt hàng an toàn khi nhiều người mua cùng lúc. Em cũng làm phần đăng nhập bền (tự gia hạn phiên), quên mật khẩu qua email và ghi log lỗi. Điều em tự hào nhất là hệ thống phân quyền chạy thật trên database chứ không chỉ kiểm tra ở giao diện. Qua dự án, em học được cách thiết kế database cho dữ liệu thật, viết test tự động và làm việc theo quy trình Pull Request.


**Estimated % contribution relative to the whole team:** 33% *(tỷ lệ cả nhóm thống nhất, xem README → Đánh giá mức độ đóng góp)*

**Overall self-assessment score:** ⟨1–10⟩
8
