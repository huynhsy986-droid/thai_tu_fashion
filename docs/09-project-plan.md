# 09 · Project Plan — 5 sprint theo Final Project Brief

**Người viết:** TV1 – lequangkhanh6002-pixel (PO/BA) · **Duyệt:** TV2 – nguyen06-vn, TV3 – huynhsy986-droid
**Theo dõi trên GitHub:** [Issues](https://github.com/huynhsy986-droid/thai_tu_fashion/issues) · [Milestones](https://github.com/huynhsy986-droid/thai_tu_fashion/milestones) · [Pull Requests](https://github.com/huynhsy986-droid/thai_tu_fashion/pulls?q=is%3Apr)

## 1. Phạm vi

**Thai Tu Fashion** — website bán thời trang unisex phong cách Seoul: khách xem/tìm/lọc sản phẩm, giỏ hàng, mã giảm giá, đặt hàng, theo dõi đơn, yêu thích, đánh giá, Smart Studio; quản trị viên quản lý sản phẩm, tồn kho, danh mục, đơn hàng, khách hàng, đánh giá, tin nhắn liên hệ.

**Ngoài phạm vi:** cổng thanh toán thật, đơn vị vận chuyển thật, AI thật cho Stylist / Visual Search / Try-on (giữ mô phỏng phía trình duyệt).

## 2. Sản phẩm bàn giao (theo brief)

| # | Sản phẩm | Vị trí | Phụ trách |
|---|---|---|---|
| 1 | Source code + lịch sử commit, branch, PR, issue | GitHub repo | Cả nhóm |
| 2 | README theo Report Template | `README.md` | TV1 |
| 3 | Wireframe các trang chính | `docs/wireframes/` | TV1 |
| 4 | Database schema (ERD) | `docs/04-database-erd.md` | TV2 |
| 5 | Báo cáo Lighthouse trước/sau | `docs/10-lighthouse.md` | TV3 |
| 6 | Video demo YouTube ≤ 10 phút, ≥ 720p | link trong README | Cả nhóm (kịch bản: TV1) |
| 7 | Self-Report 5 sprint của từng người | `docs/self-reports/self-report-[MSSV].md` | Mỗi thành viên |

## 3. Milestones

| Milestone | Deadline | Trạng thái |
|---|---|---|
| Hoàn thành wireframe | 23/11/2026 | Đúng hạn — hoàn thành 21/11 ([#1](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/1)) |
| Setup GitHub & database schema | 23/11/2026 | Đúng hạn — hoàn thành 21/11 |
| Hoàn thành UI cơ bản | 25/11/2026 | Đúng hạn — hoàn thành 21/11 |
| Tích hợp database xong | 27/11/2026 | Đúng hạn — hoàn thành 21/11 (Supabase `thai-tu-fashion-v1`) |
| Optimization & peer review | 30/11/2026 (optimization) · 06/12/2026 (peer review) | Optimization: hoàn thành 21/11 · Peer review: đang chờ lịch trao đổi với 2 nhóm |
| Nộp bài | 07/12/2026 *(điều chỉnh theo lịch giảng viên)* | Đang thực hiện |

## 4. Kế hoạch theo sprint

| Sprint (Milestone GitHub) | Task brief | Công việc | Phụ trách | Issue / PR |
|---|---|---|---|---|
| **1 · Planning & Setup** | Task 1 | Họp phân vai, PRD, review prototype | TV1 | `docs/00`, `01`, `02` |
| | | Project plan có milestone | TV1 | #2 |
| | | Wireframe 9 trang (desktop + mobile) | TV1 | #1 |
| | | Repo, nhãn, milestone, quy ước commit/PR, CI | TV3 | `.github/workflows/ci.yml` |
| **2 · UI** | Task 2 | Giao diện prototype (Claude Design), responsive 3 breakpoint | Cả nhóm | `frontend/` |
| | | Tailwind CSS | TV3 | #5 |
| | | Trang Giới thiệu & Liên hệ (form có kiểm tra dữ liệu) | TV3 | #6 |
| | | Đăng nhập/đăng ký, chặn quyền admin | TV3 | `frontend/js/auth.js` |
| **3 · Database & Dynamic** | Task 3 | ERD, migrations, RLS, dữ liệu thật trên Supabase | TV2 | `supabase/`, `docs/04`, `07` |
| | | REST API (CRUD) + test | TV2 | `backend/` |
| | | Bảng `contact_messages` + API liên hệ | TV2 | #3 |
| | | Nối frontend với API (trang động) | TV3 | `frontend/js/sync.js` |
| **4 · Optimization** | Task 4 | Lighthouse đo → sửa → đo lại | TV3 | #8 |
| | | Google Analytics + Sentry trình duyệt | TV3 | #7 |
| | | Log có cấu trúc + Sentry backend | TV2 | #4 |
| **5 · Peer review & nộp bài** | Task 5 | Review UI/UX 2 nhóm khác, trao đổi trực tiếp | Cả nhóm | `docs/peer-review/` |
| | | Xử lý góp ý nhận được (sửa hoặc giải thích) | Người phụ trách phần bị góp ý | issue mới cho từng góp ý |
| | | README theo Report Template, kịch bản video, khung Self-Report | TV1 | #9 |
| | | Quay & đăng video, mỗi người tự viết Self-Report | Cả nhóm | — |

## 5. Quy trình làm việc trên GitHub

1. Mỗi công việc là **1 issue** có nhãn task (`task-1-planning` … `task-5-peer-review`), nhãn người phụ trách (`TV1-PO-BA`, `TV2-backend`, `TV3-frontend-QA`) và milestone sprint.
2. Tạo **branch theo issue**: `feature/<số-issue>-<tên-ngắn>` (VD `feature/3-contact-api`).
3. Commit nhỏ, mỗi commit một thay đổi logic, theo dạng `type(scope): mô tả (#issue)`:
   `feat` · `fix` · `docs` · `test` · `chore` · `perf` · `style` · `refactor`.
4. Mở **Pull Request** vào `main`, mô tả có `Closes #<issue>`; CI (seed, migrations, unit, integration, e2e, truy vết) phải xanh trước khi merge.
5. Merge bằng *merge commit* để giữ lịch sử từng người; branch được giữ lại làm bằng chứng.

## 6. Họp nhóm

| Buổi | Nội dung | Kết quả |
|---|---|---|
| Kick-off | Phân vai, chọn đề tài, đọc brief | `docs/00-team-workflow.md` |
| Review PRD & plan | Duyệt AC, plan backend/frontend | Biên bản review cuối `docs/plans/*.md` |
| Duyệt wireframe | Duyệt 9 wireframe trước khi code trang mới | Bảng duyệt trong `docs/wireframes/README.md` |
| Review sprint 4 | Kết quả Lighthouse, tracking | `docs/10-lighthouse.md` |
| Chuẩn bị nộp | Peer review, video, self-report | Checklist trong README |
