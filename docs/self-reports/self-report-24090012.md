# Self-Report: Final Project

> **Bản nháp** do nhóm chuẩn bị sẵn phần "đã làm" và "bằng chứng" từ lịch sử GitHub của `lequangkhanh6002-pixel`.
> Chủ tài khoản: (1) điền các ô ⟨…⟩ (khó khăn, tự đánh giá, tổng kết, % đóng góp), (2) sửa/bổ sung phần đã làm cho đúng thực tế, (3) xoá dòng ghi chú này, (4) tự commit bằng tài khoản GitHub của mình. Phần tự đánh giá do chính bạn viết.

---

## Thông tin cá nhân

| | |
|---|---|
| **Full name** | Lê Quang Khanh |
| **Student ID** | 24090012 |
| **Team** | Nhóm 5 |
| **Role in team** | TV1 · Product Owner / BA & Designer |

---

## Task 1 — Planning & Setup

**Week:** Sprint 1 · đến 23/11/2026

**Work completed:**

Review prototype Claude Design, viết PRD (Problem · Context · Features ·  AC), project plan 5 sprint với milestone/deadline; tạo wireframe 10 trang (desktop + mobile).

**Evidence of contribution:**

- `docs/01-design-review.md`, `docs/02-PRD.md`
- Project plan [#2](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/2) → [PR #10](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/10)
- Wireframe [#1](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/1) → [PR #17](https://github.com/huynhsy986-droid/thai_tu_fashion/pull/17)
- [Commit của lequangkhanh6002-pixel](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=lequangkhanh6002-pixel)

**Difficulties encountered:**

Prototype có nhiều màn hình nên khó viết tiêu chí nghiệm thu (AC) vừa đủ chi tiết để kiểm thử được, vừa không quá dài; em phải viết lại vài lần cho từng AC đo được bằng test. Wireframe được dựng sau khi đã có prototype nên phải chú ý vẽ đúng bố cục thật và đánh số chú thích cho từng vùng chức năng.

**Self-assessment:** 

---

## Task 2 — UI Implementation

**Week:** Sprint 2 · đến 25/11/2026

**Work completed:**

Đặc tả giao diện cần bổ sung (đăng nhập, trang Giới thiệu/Liên hệ) trong PRD; duyệt plan frontend; nghiệm thu giao diện theo wireframe.

**Evidence of contribution:**

- `docs/plans/frontend-plan.md` (mục review)
- PRD F9 · AC-CON-01..03
- [Commit của lequangkhanh6002-pixel](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=lequangkhanh6002-pixel)

**Difficulties encountered:**

Khó nhất là quyết định trang nào cần thêm mà không phá giao diện gốc (đăng nhập, Giới thiệu, Liên hệ) và viết yêu cầu đủ rõ để bạn làm frontend triển khai đúng. Việc đối chiếu giao diện với wireframe trên cả điện thoại và máy tính tốn nhiều thời gian.

**Self-assessment:** 

---

## Task 3 — Database Integration

**Week:** Sprint 3 · đến 27/11/2026

**Work completed:**

Duyệt ERD và OpenAPI với TV2; đối chiếu 40 AC của PRD với ma trận truy vết do TV3 sinh tự động.

**Evidence of contribution:**

- `docs/04-database-erd.md` (review)
- `docs/traceability.md`
- [Commit của lequangkhanh6002-pixel](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=lequangkhanh6002-pixel)

**Difficulties encountered:**

Em không phụ trách code database nên phải tự tìm hiểu ERD, Row Level Security và tài liệu OpenAPI để duyệt được với bạn làm backend. Đối chiếu từng AC trong PRD với ma trận truy vết cũng mất công khi PRD thay đổi giữa chừng.

**Self-assessment:** 8

---

## Task 4 — Optimization

**Week:** Sprint 4 · đến 30/11/2026

**Work completed:**

Nghiệm thu báo cáo Lighthouse và tracking; cập nhật README theo Report Template.

**Evidence of contribution:**

- `docs/10-lighthouse.md`
- README [#9](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/9)
- [Commit của lequangkhanh6002-pixel](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=lequangkhanh6002-pixel)

**Difficulties encountered:**

Viết README theo đúng Report Template của môn mà vẫn gọn, dễ đọc là việc khó: lần đầu README quá dài và lặp ý, nhóm phải rà lại và rút gọn. Số liệu Lighthouse đo ở máy local và trên Vercel khác nhau nên phải ghi chú rõ để không gây hiểu lầm.

**Self-assessment:** 8

---

## Task 5 — Peer Review

**Week:** Sprint 5 · đến 06/12/2026

**Work completed:**

Điều phối peer review: chuẩn bị biểu mẫu, chọn 2 nhóm, tổng hợp góp ý; viết kịch bản video demo.

**Evidence of contribution:**

- `docs/peer-review/`
- `docs/video-script.md`
- [Commit của lequangkhanh6002-pixel](https://github.com/huynhsy986-droid/thai_tu_fashion/commits?author=lequangkhanh6002-pixel)

**Difficulties encountered:**

Hai web được review đều dựng giao diện bằng JavaScript và PawPass yêu cầu đăng nhập mới xem được phần chính, nên em chưa đánh giá được toàn bộ ứng dụng của nhóm PawPass. Viết góp ý sao cho cụ thể (trang nào, vấn đề gì, đề xuất gì) và mang tính xây dựng cũng cần cân nhắc câu chữ.

**Self-assessment:** 8

---

## Tổng Kết Đóng Góp Cá Nhân

**Summary of your contributions to the project:**

Em phụ trách vai trò Product Owner/BA của nhóm: review prototype, viết PRD với 46 tiêu chí nghiệm thu, vẽ wireframe 10 trang cho cả máy tính và điện thoại, lập kế hoạch 5 sprint và viết README theo mẫu báo cáo của môn. Em cũng là người đại diện nhóm đánh giá UI/UX cho hai nhóm FocuSpace và PawPass. Điều em tự hào nhất là bộ tiêu chí nghiệm thu được dùng trực tiếp làm tên test, giúp cả nhóm biết chức năng nào đã xong. Qua dự án, em học được cách viết yêu cầu sản phẩm rõ ràng, làm việc với GitHub theo issue và Pull Request, và trình bày tài liệu cho người khác dễ đọc.


**Estimated % contribution relative to the whole team:** 33% *(tỷ lệ cả nhóm thống nhất, xem README → Đánh giá mức độ đóng góp)*

**Overall self-assessment score:** 8
