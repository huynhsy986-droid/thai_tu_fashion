# 00 · Nhóm dự án & quy trình làm việc

Tài liệu này mô tả cách nhóm 3 người đưa **Thai Tu Fashion** từ prototype (Claude Design) thành hệ thống hoàn chỉnh chạy trên **Supabase**, theo đúng sơ đồ 3 bước của dự án.

## 1. Thành viên và trách nhiệm

| # | Thành viên | Vai trò | Đầu ra chính | Bước phụ trách |
|---|---|---|---|---|
| TV1 | **lequangkhanh6002-pixel** | Product Owner / Business Analyst & Product Designer | Review prototype, PRD (Problem · Context · Features · AC), ma trận truy vết, review plan | Step 1, Step 2 ② |
| TV2 | **nguyen06-vn** | Solution Architect & Backend Engineer | Solution Architecture, Database Schema (ERD) trên Supabase, API Docs (OpenAPI), backend + unit/integration test | Step 2 ③④⑤, Step 3 (Backend) |
| TV3 | **huynhsy986-droid** | Frontend Engineer & QA | Nối giao diện với API/Supabase, đăng nhập, phân quyền admin, e2e test, CI, báo cáo kiểm thử | Step 3 (Frontend + QA) |

Mỗi thành viên commit bằng tài khoản GitHub của mình. Từ sprint 4, mọi việc đi theo **issue → branch `feature/<issue>-…` → Pull Request → merge**; chi tiết milestone, deadline và phân task ở [`09-project-plan.md`](09-project-plan.md).

## 2. Quy trình (ánh xạ với sơ đồ)

```
Step 1  Prototype / Design ①  ──(review vòng lặp)──►  "Claude Design"
           │
           ▼
Step 2  ② PRD ─► Problem / Context / Features / AC      (TV1)  ─┐ truy vết source code
        ③ Solution Architecture ─► How / Tech           (TV2)   │ (AC-ID xuất hiện trong
        ④ Database Schema (ERD)                         (TV2)   │  tên test & commit)
        ⑤ API Docs                                      (TV2)  ─┘
           │
           ▼
Step 3  Implement (AI Coding Agent)
        Frontend = ① + ② + ③ + ⑤     (TV3)
        Backend  = ② + ③ + ④ + ⑤     (TV2)
        Planning ─► Review plan ─► Code ◄── Tests (unit · integration · e2e)
                                      ▲
                       Rule + Skill + Constraint  (CLAUDE.md, .claude/)
```

### Plan theo phase (ô "Plan" trong sơ đồ)

Mỗi phần việc ở Step 3 bắt đầu bằng một file plan trong `docs/plans/`, chia **Phase 0: Init → Phase 1 → Phase 2 → …**, mỗi phase có danh sách việc, AC được phủ và tiêu chí hoàn thành ("guide 100": phase chỉ xong khi 100% việc trong checklist đạt). Plan được **một thành viên khác review** trước khi code (mục *Review plan* ở cuối mỗi file).

| Plan | Người viết | Người review |
|---|---|---|
| `plans/backend-plan.md` | TV2 | TV1 (đối chiếu AC), TV3 (hợp đồng API) |
| `plans/frontend-plan.md` | TV3 | TV1 (đối chiếu design/AC), TV2 (dùng API đúng) |

### Rule + Skill + Constraint

- `CLAUDE.md` ở gốc repo: quy tắc cho AI coding agent (cấu trúc thư mục, lệnh chạy, quy ước code, điều cấm).
- `.claude/skills/`: kỹ năng lặp lại (thêm endpoint API, thêm migration).
- Ràng buộc (constraint): mọi tính tiền và trừ kho làm trong Postgres (một nguồn sự thật); RLS bật trên mọi bảng; không lưu secret trong repo; giao diện giữ nguyên prototype.

## 3. Định nghĩa "xong" (Definition of Done)

1. Code có test tương ứng (unit, integration hoặc e2e) và test ghi AC-ID trong tên.
2. `npm test` ở `backend/` và `npm run test:e2e` ở `frontend/` đều xanh.
3. Tài liệu (PRD/ERD/API) được cập nhật nếu hợp đồng thay đổi.
4. Commit theo chuẩn `type(scope): mô tả` và ghi rõ thành viên.
