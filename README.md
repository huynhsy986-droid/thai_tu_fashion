# Thai Tu Fashion

Cửa hàng thời trang unisex phong cách Seoul: **SPA (prototype Claude Design) + REST API Node.js + Supabase (Postgres, Auth, RLS)**.

Dự án được hoàn thiện theo quy trình 3 bước với một nhóm 3 người:

| Bước | Nội dung | Người phụ trách | Kết quả |
|---|---|---|---|
| Step 1 | Prototype / Design ① → review | TV1 · lequangkhanh6002-pixel (PO/BA & Designer) | [`docs/01-design-review.md`](docs/01-design-review.md) |
| Step 2 | ② PRD (Problem · Context · Features · AC) | TV1 | [`docs/02-PRD.md`](docs/02-PRD.md) |
| | ③ Solution Architecture · ④ Database (ERD) · ⑤ API Docs | TV2 · nguyen06-vn (Architect & Backend) | [`03`](docs/03-solution-architecture.md) · [`04`](docs/04-database-erd.md) · [`05`](docs/05-api-docs.md) · [`openapi.yaml`](docs/openapi.yaml) |
| Step 3 | Backend = ②+③+④+⑤: Plan → Review plan → Code → Test | TV2 | [`plans/backend-plan.md`](docs/plans/backend-plan.md) · `backend/` · `supabase/` |
| | Frontend = ①+②+③+⑤: Plan → Review plan → Code → Test | TV3 · huynhsy986-droid (Frontend & QA) | [`plans/frontend-plan.md`](docs/plans/frontend-plan.md) · `frontend/` |
| | Đánh giá, truy vết, CI | TV3 | [`06-test-report.md`](docs/06-test-report.md) · [`traceability.md`](docs/traceability.md) · `.github/workflows/ci.yml` |
| | Rule + Skill + Constraint cho AI coding agent | cả nhóm | [`CLAUDE.md`](CLAUDE.md) · `.claude/skills/` |

Quy trình chi tiết: [`docs/00-team-workflow.md`](docs/00-team-workflow.md).

## Chạy nhanh (không cần Docker)

Cần Node.js ≥ 20 và PostgreSQL ≥ 15 (`psql` trong PATH).

```bash
# 1. Tạo DB: shim Supabase → migrations → dữ liệu giả lập
DATABASE_URL=postgres://postgres:postgres@localhost:5432/thaitu scripts/db-reset.sh

# 2. Chạy API + giao diện
cd backend && cp .env.example .env && npm install && npm start
# → http://localhost:4000
```

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Khách hàng | `minhanh@demo.thaitu.vn` | `Demo@1234` |
| Quản trị viên | `admin@thaitu.vn` | `Admin@1234` |
| Khách khác | `khach2@demo.thaitu.vn` … `khach13@demo.thaitu.vn` | `Demo@1234` |

Không có máy chủ? Mở `frontend/index.html?demo` — giao diện chạy chế độ demo như prototype.

## Chạy với Supabase

```bash
supabase start                 # Docker: Postgres + Auth + Studio (config: supabase/config.toml)
supabase db reset              # chạy supabase/migrations/* + supabase/seed.sql
```
`backend/.env`:
```
AUTH_PROVIDER=supabase
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<anon key in ra từ supabase start>
SUPABASE_JWT_SECRET=<JWT secret in ra từ supabase start>
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
```
Supabase Cloud: `supabase link --project-ref <ref> && supabase db push`, đặt `DATABASE_URL` là chuỗi Transaction pooler và `DATABASE_SSL=true`. Không chạy các file trong `supabase/local/` trên Supabase thật.

## Kiểm thử

```bash
cd backend  && npm test            # 54 unit + 97 integration (Postgres thật, RLS)
cd frontend && npm run test:e2e    # 20 e2e (Chrome + backend + DB thật)
node scripts/trace.mjs --check     # ma trận AC → code → test
```
Kết quả gần nhất: **171/171 test xanh**, phủ backend 99% dòng, 44/44 AC/NFR có test — xem [`docs/06-test-report.md`](docs/06-test-report.md).

## Cấu trúc

```
├─ docs/                 PRD, kiến trúc, ERD, API (OpenAPI), plans + review, báo cáo test, truy vết
├─ supabase/
│  ├─ migrations/        001 schema · 002 functions/triggers · 003 RLS · 004 dashboard
│  ├─ seed.sql           dữ liệu giả lập (sinh bởi scripts/gen-seed.mjs từ catalogue prototype)
│  ├─ local/             shim Supabase + local auth cho Postgres thường (dev/CI)
│  └─ config.toml
├─ backend/              Express 5 API · src/ · tests/{unit,integration}
├─ frontend/             SPA prototype + js/{config,api,auth,sync}.js · e2e/ (Playwright)
├─ scripts/              gen-seed.mjs · db-reset.sh · trace.mjs
├─ CLAUDE.md, .claude/   Rule · Skill · Constraint cho AI coding agent
└─ .github/workflows/    CI: seed · migrations · unit · integration · e2e · truy vết
```
