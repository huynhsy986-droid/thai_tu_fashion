# Final Project Report: Web Design and Development

> Còn lại cho nhóm tự điền (ô ghi **⟨cần điền⟩**): **Video demo**, **Ngày nộp**, **Task 5 Peer review**. Mỗi chỗ có hướng dẫn ngay bên dưới. Điền xong thì xoá dòng ghi chú này.

---

## Thông Tin Nhóm

| | |
|---|---|
| **Tên nhóm** | Nhóm 5 |
| **Tên dự án** | Thai Tu Fashion — website thời trang unisex phong cách Seoul |
| **Website (production)** | **https://thai-tu-fashion-v1.vercel.app** |
| **GitHub Repository** | https://github.com/huynhsy986-droid/thai_tu_fashion |
| **Video Demo** | ⟨cần điền link YouTube⟩ — xem hướng dẫn ở [Deliverables Checklist](#deliverables-checklist) |
| **Ngày nộp** | ⟨DD/MM/YYYY⟩ |

### Thành viên nhóm

| Họ tên | MSSV | GitHub | Vai trò |
|---|---|---|---|
| Lê Quang Khanh | 24090012 | [lequangkhanh6002-pixel](https://github.com/lequangkhanh6002-pixel) | TV1 · Product Owner / BA & Designer (PRD, wireframe, project plan, báo cáo) |
| Nguyễn Trần Minh Nguyên | 24090010 | [nguyen06-vn](https://github.com/nguyen06-vn) | TV2 · Solution Architect & Backend (kiến trúc, database Supabase, REST API, logging/Sentry backend) |
| Huỳnh Tấn Sỹ | 24090017 | [huynhsy986-droid](https://github.com/huynhsy986-droid) | TV3 · Frontend & QA (giao diện, Tailwind, trang động, GA/Sentry, Lighthouse, kiểm thử, CI) |

---

## Tổng Quan Project và Công Nghệ Sử Dụng

**Mô tả ứng dụng:** Thai Tu Fashion là cửa hàng thời trang unisex trực tuyến lấy cảm hứng từ đường phố Seoul, phục vụ khách hàng trẻ muốn mua quần áo, giày, phụ kiện dễ phối. Khách xem/tìm/lọc sản phẩm, chọn màu–size theo tồn kho thật, đặt hàng, theo dõi đơn, đánh giá và dùng **Smart Studio** (Size Advisor, Outfit Builder, AI Stylist, Visual Search, Virtual Try-On mô phỏng). Quản trị viên quản lý sản phẩm, tồn kho, danh mục, đơn hàng, khách hàng, đánh giá và tin nhắn liên hệ.

**Tech stack:**

| Layer | Công nghệ |
|---|---|
| Frontend | HTML, CSS (design system riêng) + **Tailwind CSS 3** (prefix `tw-`), JavaScript thuần (SPA định tuyến bằng `#hash`) |
| Backend | Node.js 22, Express 5, zod (validate), jose (JWT/JWKS), Supabase Auth (refresh token, khôi phục mật khẩu), helmet + CSP, rate-limit, compression |
| Database | **PostgreSQL 17 trên Supabase** (Auth, Row Level Security, function/trigger PL/pgSQL) |
| Giám sát | Google Analytics 4, Sentry (trình duyệt + Node), log JSON có request id |
| Kiểm thử / CI | Vitest + Supertest, Playwright, GitHub Actions |
| Deploy | **Vercel** (giao diện qua CDN + 1 Vercel Function cho API, region Singapore) — `vercel.json` · Database **Supabase** `thai-tu-fashion-v1` (Singapore) · Render (`render.yaml`) là phương án dự phòng |

**Tính năng chính:**
- Tài khoản: đăng ký/đăng nhập, **tự gia hạn phiên** (không bị đăng xuất sau 1 giờ), **quên & đặt lại mật khẩu qua email**, hiện/ẩn và đo độ mạnh mật khẩu, menu người dùng trên header.
- Cửa hàng: tìm kiếm không dấu, lọc theo danh mục/size/màu/giá/dáng, sắp xếp, tồn kho theo từng biến thể màu × size.
- Giỏ hàng lưu trên server, mã giảm giá, đặt hàng **nguyên tử trong 1 transaction** (không bán vượt kho khi 2 người mua cùng lúc), thanh toán COD/online mô phỏng.
- Tài khoản: đơn hàng + dòng thời gian trạng thái, huỷ đơn, yêu thích + báo giảm giá, báo có hàng, số đo, outfit, thông báo.
- Smart Studio: gợi ý size từ số đo, phối outfit, stylist theo dịp, tìm bằng ảnh, thử đồ ảo (mô phỏng).
- Trang Giới thiệu (số liệu lấy từ dữ liệu thật) và Liên hệ (form kiểm tra dữ liệu, lưu DB, admin xử lý).
- Quản trị: dashboard doanh thu 8 tuần, CRUD sản phẩm/danh mục, tồn kho, đơn hàng theo máy trạng thái, khách hàng, kiểm duyệt đánh giá, tin nhắn liên hệ.

| Trang chủ | Sản phẩm | Quản trị |
|---|---|---|
| ![Trang chủ](docs/screenshots/home-desktop.jpg) | ![Chi tiết sản phẩm](docs/screenshots/product.jpg) | ![Dashboard quản trị](docs/screenshots/admin-dashboard.jpg) |
| **Cửa hàng** | **Liên hệ (kiểm tra form)** | **Size Advisor** |
| ![Cửa hàng](docs/screenshots/shop.jpg) | ![Liên hệ](docs/screenshots/contact.jpg) | ![Size Advisor](docs/screenshots/size-advisor.jpg) |

---

## Hướng Dẫn Cài Đặt và Chạy Ứng Dụng

**Yêu cầu hệ thống:**

| Công cụ | Phiên bản |
|---|---|
| Node.js | >= 20 (khuyên dùng 22) |
| PostgreSQL (chạy local) | >= 15, có `psql` trong PATH — *hoặc* dùng thẳng Supabase Cloud |
| Git | bất kỳ |

**Các bước cài đặt (chạy local với PostgreSQL, không cần Docker):**

```bash
# 1. Clone repository
git clone https://github.com/huynhsy986-droid/thai_tu_fashion.git
cd thai_tu_fashion

# 2. Cài đặt dependencies
cd backend && npm install && cd ..

# 3. Cấu hình môi trường
cp backend/.env.example backend/.env
# Mặc định đã chạy được với Postgres local: postgres://postgres:postgres@localhost:5432/thaitu

# 4. Khởi tạo database (shim Supabase → migrations → dữ liệu mẫu)
DATABASE_URL=postgres://postgres:postgres@localhost:5432/thaitu bash scripts/db-reset.sh

# 5. Chạy ứng dụng (API + giao diện cùng cổng)
cd backend && npm start
# → http://localhost:4000
```

**Chạy với Supabase Cloud** — trong `backend/.env`:

```
AUTH_PROVIDER=supabase
SUPABASE_URL=https://ceryulbobrlyxckrezts.supabase.co
SUPABASE_ANON_KEY=sb_publishable_JSzQ9dv_Ug9kPvi3qlxr_g_rfHCFc8F
DATABASE_URL=<Supabase → Connect → Session pooler, tự điền Database password>
DATABASE_SSL=true
```

Dự án Supabase mới: `SUPABASE_DB_URL=... scripts/supabase-setup.sh --catalog`. Cấp quyền admin: `cd backend && npm run make-admin -- <email>`. Không chạy các file trong `supabase/local/` trên Supabase thật. Deploy production: [`docs/08-deployment.md`](docs/08-deployment.md) (Vercel mục 1b).

**Bản production:** https://thai-tu-fashion-v1.vercel.app — dữ liệu thật trên Supabase (66 sản phẩm, 7 danh mục), không có tài khoản dùng thử. Khách tự đăng ký; quyền quản trị do nhóm cấp cho tài khoản đã đăng ký (`npm run make-admin -- <email>`). Kiểm tra nhanh: [`/api/health`](https://thai-tu-fashion-v1.vercel.app/api/health).

**Tài khoản dùng thử (chỉ khi chạy local với dữ liệu mẫu):**

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Khách hàng | `minhanh@demo.thaitu.vn` | `Demo@1234` |
| Quản trị viên | `admin@thaitu.vn` | `Admin@1234` |

Khi API không chạy, giao diện tự chuyển **chế độ dự phòng** (dữ liệu lưu trong trình duyệt); ép chế độ này bằng `?demo`.

**Kiểm thử:**

```bash
cd backend  && npm test             # 75 unit + 119 integration (Postgres thật, RLS)
cd frontend && npm ci && npm run test:e2e   # 34 e2e (Chrome + backend + DB thật)
node scripts/trace.mjs --check      # ma trận AC → code → test (54/54)
```

---

## Task 1: Project Planning & Teamwork

### (a) Phân công vai trò

Nhóm 3 người chia theo tầng để mỗi người chịu trách nhiệm trọn vẹn một mảng, giao nhau qua tài liệu (PRD, OpenAPI):

| Thành viên | Phụ trách | Tài liệu / mã nguồn chính |
|---|---|---|
| TV1 · Lê Quang Khanh (lequangkhanh6002-pixel) | Review prototype, PRD (46 tiêu chí nghiệm thu AC), wireframe, project plan, README, kịch bản video, điều phối peer review | [`docs/01`](docs/01-design-review.md), [`02-PRD`](docs/02-PRD.md), [`wireframes/`](docs/wireframes/), [`09-project-plan`](docs/09-project-plan.md) |
| TV2 · Nguyễn Trần Minh Nguyên (nguyen06-vn) | Kiến trúc, ERD, migrations + RLS trên Supabase, REST API 65 operation, logging & Sentry backend | [`03`](docs/03-solution-architecture.md), [`04-ERD`](docs/04-database-erd.md), [`openapi.yaml`](docs/openapi.yaml), `backend/`, `supabase/` |
| TV3 · Huỳnh Tấn Sỹ (huynhsy986-droid) | Nối giao diện với API, đăng nhập/phân quyền, Tailwind, trang Giới thiệu/Liên hệ, GA4 + Sentry, Lighthouse, e2e, CI | `frontend/`, [`06-test-report`](docs/06-test-report.md), [`10-lighthouse`](docs/10-lighthouse.md) |

Quy trình chi tiết: [`docs/00-team-workflow.md`](docs/00-team-workflow.md).

### (b) Wireframe

- **Tool sử dụng:** wireframe low-fi dựng bằng code (HTML → PNG, nguồn sửa được ở [`docs/wireframes/src/`](docs/wireframes/src/)), từ prototype Claude Design đã duyệt ở Step 1.
- **Các trang đã thiết kế** (mỗi trang có bản Desktop 1280px + Mobile 390px, xem [`docs/wireframes/`](docs/wireframes/README.md)):
  - [x] Homepage
  - [x] Cửa hàng / danh mục
  - [x] Chi tiết sản phẩm
  - [x] Giỏ hàng
  - [x] Thanh toán
  - [x] Đăng nhập / Đăng ký
  - [x] Tài khoản & đơn hàng
  - [x] Quản trị (Tổng quan, Đơn hàng)
  - [x] Giới thiệu
  - [x] Liên hệ

| Trang chủ | Sản phẩm | Liên hệ (mobile) |
|---|---|---|
| ![](docs/wireframes/01-home-desktop.png) | ![](docs/wireframes/03-product-desktop.png) | ![](docs/wireframes/10-contact-mobile.png) |

### (c) Project Plan

Kế hoạch 5 sprint gắn với 5 task của brief, mỗi sprint là một **Milestone** trên GitHub; mỗi việc là một **Issue** có nhãn task + nhãn người phụ trách. Chi tiết: [`docs/09-project-plan.md`](docs/09-project-plan.md).

**Milestones:**

| Milestone | Deadline | Trạng thái |
|---|---|---|
| Hoàn thành wireframe | 23/11/2026 | Đúng hạn |
| Setup GitHub & database schema | 23/11/2026 | Đúng hạn |
| Hoàn thành UI cơ bản | 25/11/2026 | Đúng hạn |
| Tích hợp database xong | 27/11/2026 | Đúng hạn |
| Optimization & peer review | 30/11/2026 · 06/12/2026 | Optimization: đúng hạn · Peer review: ⟨cập nhật⟩ |
| Nộp bài | ⟨cần điền ngày⟩ | ⟨Đúng hạn / Trễ X ngày⟩ |

### (d) GitHub Repository

- **Website đang chạy:** https://thai-tu-fashion-v1.vercel.app (tự deploy lại mỗi khi `main` có commit mới)

- **Repository link:** https://github.com/huynhsy986-droid/thai_tu_fashion · [Issues](https://github.com/huynhsy986-droid/thai_tu_fashion/issues?q=is%3Aissue) · [Pull Requests](https://github.com/huynhsy986-droid/thai_tu_fashion/pulls?q=is%3Apr) · [Milestones](https://github.com/huynhsy986-droid/thai_tu_fashion/milestones)

### (e) Quy trình làm việc trên GitHub

1. Mỗi việc là **1 issue** (nhãn `task-1…5`, nhãn người phụ trách, milestone sprint).
2. Tạo **branch theo issue**: `feature/<số-issue>-<tên-ngắn>` — VD `feature/3-contact-api`, `feature/8-lighthouse`.
3. **Commit nhỏ**, mỗi commit một thay đổi, dạng `type(scope): mô tả (#issue)` với `feat`, `fix`, `docs`, `test`, `chore`, `perf`, `style`.
4. Mở **Pull Request** vào `main` có `Closes #issue`; CI (seed → migrations → unit → integration → e2e → truy vết) phải xanh rồi mới merge (merge commit, giữ branch làm bằng chứng).

**Ví dụ commit messages tiêu biểu:**

```
feat(db): migration 005 bảng contact_messages + RPC submit_contact + RLS (#3)
feat(api): POST /api/contact và quản trị /api/admin/contacts (#3)
feat(monitoring): Sentry backend + GET /api/config cho GA4 & Sentry trình duyệt (#4)
chore(ui): cài Tailwind CSS v3, theme theo design system, lệnh build:css (#5)
fix(ui): bỏ dòng "Website demo phục vụ học tập…" ở footer, thêm liên kết Giới thiệu/Liên hệ (#6)
perf(web): defer script, ảnh hero theo kích thước màn hình (srcset) + preload LCP (#8)
docs(wireframe): wireframe 10 trang chính desktop + mobile, bảng duyệt (#1)
```

Danh sách PR đã merge: https://github.com/huynhsy986-droid/thai_tu_fashion/pulls?q=is%3Apr+is%3Amerged

| Pull Request #25 (`Closes #21`, 3 commit của TV2, mô tả + kiểm thử) | Lịch sử commit trên `main` (mỗi commit tham chiếu issue, đúng tác giả) |
|---|---|
| ![Pull Request #25](docs/screenshots/github-pull-request.png) | ![Danh sách commit](docs/screenshots/github-commits.png) |

*Trong ảnh có vài commit gắn dấu ✗ đỏ: đó là lỗi CI do test (logger giả thiếu hàm), nhóm đã ghi nhận ở issue [#29](https://github.com/huynhsy986-droid/thai_tu_fashion/issues/29) và sửa ở PR #30. Từ đó CI xanh lại.*

---

## Task 2: Implement User Interface

### (a) Các trang đã xây dựng

| Trang | URL / Route | Mô tả | Người thực hiện |
|---|---|---|---|
| Homepage | `/#home` | Hero chiến dịch, danh mục, bán chạy, phối theo dịp, lookbook | Cả nhóm (prototype) · TV3 nối API |
| Cửa hàng | `/#shop`, `/#shop-<danh-mục>` | Lọc, sắp xếp, tìm kiếm, xem thêm | Cả nhóm (prototype) · TV3 nối API |
| Chi tiết sản phẩm | `/#product-<id>` | Ảnh, màu/size theo tồn kho, gợi ý size, đánh giá | Cả nhóm (prototype) · TV3 nối API |
| Giỏ hàng · Thanh toán | `/#cart`, `/#checkout` | Giỏ trên server, mã giảm giá, đặt hàng | TV3 |
| Đăng nhập · Đăng ký | `/#login`, `/#register` | Form kiểm tra dữ liệu, tài khoản dùng thử | TV3 |
| Tài khoản | `/#account`, `/#account-orders`, `/#order-<mã>` | Hồ sơ, đơn + timeline, yêu thích, số đo, outfit | TV3 |
| Smart Studio | `/#studio`, `/#size`, `/#outfit`, `/#stylist`, `/#visual`, `/#tryon` | 5 công cụ hỗ trợ mua sắm | Cả nhóm (prototype) |
| Quản trị | `/#admin`, `/#admin-*` | 8 tab quản trị | TV3 (UI) · TV2 (API) |
| Contact / About | `/#contact`, `/#about` | Form liên hệ lưu DB + FAQ; giới thiệu thương hiệu với số liệu thật | TV3 (UI) · TV2 (API) |

### (b) Sử dụng Tailwind CSS

- Cài **Tailwind CSS 3** bằng CLI trong `frontend/` (`npm run build:css` → `css/tailwind.css`, đã build sẵn nên deploy không cần bước build; CI kiểm tra file build khớp nguồn).
- `tailwind.config.js`: **`prefix: 'tw-'`** và **tắt `preflight`** để không phá CSS của design system; **theme map sang token** của design system (`ink`, `muted`, `accent`, `lav`, `mint`, `sky`…, font `display`, bo góc `ds`, khoảng cách `gut`/`sec`) nên utility và CSS cũ đồng nhất.
- Dùng cho layout màn Đăng nhập/Đăng ký/khối phiên, trang Giới thiệu, Liên hệ.

**Ví dụ utility classes đặc trưng nhóm đã dùng:** `tw-grid tw-grid-cols-1 lg:tw-grid-cols-[minmax(0,5fr)_minmax(0,7fr)]` (lưới bất đối xứng responsive), `md:tw-grid-cols-3`, `tw-aspect-[3/4] tw-object-cover tw-rounded-ds`, màu theo token `tw-bg-grey tw-text-ink-soft`, `!tw-gap-3.5` (ghi đè có chủ đích).

### (c) Các tính năng tương tác

| Tính năng | Mô tả | File / Component | Người thực hiện |
|---|---|---|---|
| Form validation | Đăng nhập/đăng ký (thanh độ mạnh mật khẩu), quên/đặt lại mật khẩu, thanh toán, liên hệ (6 ô, đếm ký tự), đánh giá, số đo — lỗi tiếng Việt dưới từng ô, cùng quy tắc với server | `js/auth.js`, `js/info.js`, `js/pages.js` | TV3 |
| Modal / ngăn kéo | Tìm kiếm gợi ý, menu mobile, xác nhận huỷ đơn, cổng thanh toán mô phỏng | `js/app.js`, `js/store.js` | Cả nhóm (prototype) |
| Slider / marquee | Thanh thông báo chạy, thư viện ảnh sản phẩm, thẻ đổi ảnh khi hover | `js/components.js`, `js/pages.js` | Cả nhóm (prototype) |
| Bộ lọc động | Lọc + sắp xếp + tìm không dấu, chip bộ lọc đang chọn | `js/pages.js` | Cả nhóm (prototype) |
| Chọn biến thể | Màu/size, size hết hàng bị khoá, "báo khi có hàng" | `js/pages.js`, `js/sync.js` | TV3 |
| Accordion | FAQ Liên hệ, chất liệu/giao hàng ở trang sản phẩm | `js/info.js`, `js/pages.js` | TV3 · prototype |
| Menu người dùng · skeleton | Menu thả xuống theo chữ cái đầu tên (đóng bằng Esc/bấm ngoài); khung tải cùng bố cục trang | `js/auth.js`, `index.html` | TV3 |
| Toast & cập nhật lạc quan | Thêm giỏ/yêu thích phản hồi ngay, đồng bộ server phía sau | `js/sync.js` | TV3 |
| Smart Studio | Size Advisor, Outfit Builder kéo chọn, Visual Search bằng canvas | `js/studio.js` | Cả nhóm (prototype) |

Các tương tác được kiểm tra tự động bằng 26 kịch bản Playwright (`frontend/e2e/`), VD `contact.spec.js` kiểm tra từng thông báo lỗi và lưu DB.

### (d) Giao diện trên nhiều thiết bị

- [x] Mobile (< 768px) — thanh điều hướng dưới, menu ngăn kéo
- [x] Tablet (768px – 1024px)
- [x] Desktop (> 1024px)

| Mobile 390px | Tablet 820px | Desktop 1280px |
|---|---|---|
| ![](docs/screenshots/home-mobile.jpg) | ![](docs/screenshots/home-tablet.jpg) | ![](docs/screenshots/home-desktop.jpg) |

---

## Task 3: Database Integration & Dynamic Content

### (a) Thiết kế cơ sở dữ liệu

- **Database system:** PostgreSQL 17 (Supabase)
- **Số bảng:** 19 (+ 1 view `product_rating_stats`), RLS bật trên cả 19 bảng

**Danh sách bảng:**

| Bảng | Mô tả | Các cột chính |
|---|---|---|
| `profiles` | Hồ sơ người dùng (1–1 `auth.users`) | `id`, `full_name`, `email`, `phone`, `role` |
| `categories` | Danh mục | `id`, `name`, `sort_order` |
| `colors` · `shipping_methods` | Bảng tra cứu màu, phương thức giao | `code`, `name`, `hex` / `fee` |
| `products` | Sản phẩm | `id`, `name`, `category_id`, `price`, `sale_price`, `status` |
| `product_variants` | Biến thể màu × size + tồn kho | `id`, `product_id`, `color`, `size`, `stock` |
| `reviews` | Đánh giá | `id`, `product_id`, `user_id`, `rating`, `verified`, `status` |
| `cart_items` | Giỏ hàng | `user_id`, `variant_id`, `quantity` |
| `wishlist_items` · `restock_subscriptions` | Yêu thích, báo có hàng | `user_id`, `product_id`/`variant_id` |
| `coupons` | Mã giảm giá | `code`, `type`, `value`, `min_subtotal` |
| `orders` · `order_items` · `order_status_history` | Đơn hàng, dòng hàng, lịch sử trạng thái | `id` (TTxxxx), `status`, `total`, `unit_price`, `from_status`, `to_status` |
| `notifications` | Thông báo | `user_id`, `type`, `title`, `is_read` |
| `outfits` · `body_measurements` | Smart Studio | `slots`, `height_cm`, `weight_kg` |
| `newsletter_subscribers` | Nhận tin | `email` |
| `contact_messages` | Tin nhắn liên hệ | `id`, `name`, `email`, `topic`, `message`, `status` |

ER diagram đầy đủ (Mermaid) và ma trận RLS: [`docs/04-database-erd.md`](docs/04-database-erd.md). Migrations: [`supabase/migrations/`](supabase/migrations/).

### (b) Kết nối cơ sở dữ liệu

- **Công nghệ server-side:** Node.js 22 + Express 5, driver `pg`
- **Cách kết nối:** RESTful API (65 operation, [`docs/openapi.yaml`](docs/openapi.yaml)); mỗi request chạy SQL dưới **quyền của người dùng** (`SET LOCAL ROLE` + JWT claims) nên RLS của Supabase là lớp phân quyền thật. Tính tiền/trừ kho nằm trong function SQL (`cart_quote`, `place_order`) — một nguồn sự thật.
- **Các thao tác CRUD đã implement:**
  - [x] Create — đăng ký, thêm giỏ, đặt hàng, đánh giá, gửi liên hệ, admin tạo sản phẩm/danh mục/mã giảm giá
  - [x] Read — catalogue, chi tiết, đơn hàng, dashboard, tin nhắn
  - [x] Update — hồ sơ, số lượng giỏ, trạng thái đơn, giá/tồn kho, trạng thái tin nhắn
  - [x] Delete — xoá khỏi giỏ/yêu thích, outfit, danh mục, đánh giá, tin nhắn

```
Trình duyệt (SPA)  ──HTTPS/JSON──►  Express API  ──pg (RLS theo user)──►  Supabase Postgres
  js/api.js, sync.js                 zod · JWT/JWKS · rate-limit          migrations · RLS · functions/triggers
```

Chi tiết: [`docs/03-solution-architecture.md`](docs/03-solution-architecture.md).

### (c) Các trang hiển thị dữ liệu động

| Trang | Dữ liệu hiển thị | Query / Endpoint | Người thực hiện |
|---|---|---|---|
| Cửa hàng, Trang chủ | 66 sản phẩm, biến thể, tồn kho, điểm đánh giá | `GET /api/catalog` | TV2 (API) · TV3 (UI) |
| Chi tiết sản phẩm | Sản phẩm, đánh giá đã duyệt | `GET /api/products/{id}`, `GET /api/products/{id}/reviews` | TV2 · TV3 |
| Giỏ hàng / Thanh toán | Giỏ, báo giá do server tính | `GET /api/cart`, `POST /api/cart/quote`, `POST /api/orders` | TV2 · TV3 |
| Tài khoản → Đơn hàng | Đơn của tôi + timeline | `GET /api/orders`, `GET /api/orders/{id}` | TV2 · TV3 |
| Giới thiệu | Số sản phẩm, danh mục, đánh giá, điểm TB | `GET /api/catalog` | TV3 |
| Quản trị → Tổng quan | Doanh thu 8 tuần, đơn theo trạng thái, sắp hết hàng | `GET /api/admin/dashboard` (function `admin_dashboard()`) | TV2 · TV3 |
| Quản trị → Liên hệ | Tin nhắn khách gửi | `GET/PATCH/DELETE /api/admin/contacts` | TV2 · TV3 |

| Quản trị → Đơn hàng | Giỏ hàng (mobile) |
|---|---|
| ![](docs/screenshots/admin-orders.jpg) | ![](docs/screenshots/cart-mobile.jpg) |

Được kiểm thử bằng 119 integration test trên Postgres thật và e2e — [`docs/06-test-report.md`](docs/06-test-report.md).

---

## Task 4: Optimization

### (a) Kiểm tra hiệu năng với Lighthouse

Đo **trang chủ** bằng Lighthouse (Chrome), cả **Mobile** (giả lập điện thoại tầm trung, mạng 4G chậm) và **Desktop**. Báo cáo đầy đủ, mọi trang: [`docs/10-lighthouse.md`](docs/10-lighthouse.md) · báo cáo gốc HTML: [`docs/lighthouse/`](docs/lighthouse/).

- **Trước:** code trước sprint 4 (commit `4004e13`), chạy chế độ production ở máy nhóm — báo cáo gốc `docs/lighthouse/before-home-*.html`.
- **Sau:** bản đang chạy thật **https://thai-tu-fashion-v1.vercel.app** (Vercel + Supabase), đo ngày 21/11/2026.

**Kết quả trước khi tối ưu:**

| Metric | Mobile | Desktop |
|---|---|---|
| Performance | 74 | 95 |
| Accessibility | 95 | 95 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

| Mobile — trước | Desktop — trước |
|---|---|
| ![Lighthouse mobile trước tối ưu](docs/screenshots/lighthouse-before-home-mobile.jpg) | ![Lighthouse desktop trước tối ưu](docs/screenshots/lighthouse-before-home-desktop.jpg) |

**Các vấn đề đã xác định và cách khắc phục:**

| Vấn đề | Hành động khắc phục |
|---|---|
| Enable text compression | Bật gzip (`compression`) trên Express; trên Vercel giao diện được CDN nén sẵn |
| Render-blocking resources (13 file JS) | Thêm `defer` cho mọi script |
| Properly size images (ảnh hero 1366–2200px trên màn 390px) | Sinh ảnh 480/800/1400px, `srcset` + `sizes`, `fetchpriority="high"`, preload ảnh LCP |
| Color contrast không đạt 4,5:1 | Chỉnh token màu `--muted`, `--hi`, `--ok` đạt WCAG AA |
| Heading không theo thứ tự | Tiêu đề cột footer `h4` → `h2` (giữ nguyên style) |
| Thiếu mô tả, thẻ chia sẻ | Meta description đầy đủ, Open Graph, `robots.txt` |
| Màn hình trắng "Đang tải…" lúc chờ dữ liệu | Khung tải skeleton cùng bố cục trang thật (CLS = 0) |
| Phục vụ từ 1 server | Deploy Vercel: file tĩnh qua CDN, API ở region Singapore cạnh database |

**Kết quả sau khi tối ưu** (production Vercel):

| Metric | Mobile | Desktop |
|---|---|---|
| Performance | **86** (+12) | **99** (+4) |
| Accessibility | **100** (+5) | **100** (+5) |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

| Chỉ số | Mobile trước → sau | Desktop trước → sau |
|---|---|---|
| First Contentful Paint | 3,0 s → **1,5 s** | 0,6 s → **0,4 s** |
| Largest Contentful Paint | 5,3 s → **4,2 s** | 1,2 s → **0,9 s** |
| Total Blocking Time | 110 ms → **0 ms** | 20 ms → **0 ms** |
| Cumulative Layout Shift | 0 → 0 | 0,08 → **0** |
| Speed Index | 3,0 s → **1,5 s** | 0,9 s → 0,9 s |

| Mobile — sau | Desktop — sau |
|---|---|
| ![Lighthouse mobile sau tối ưu](docs/screenshots/lighthouse-after-vercel-mobile.png) | ![Lighthouse desktop sau tối ưu](docs/screenshots/lighthouse-after-vercel-desktop.png) |

*Ghi chú:* mobile trên production còn 86 vì **LCP 4,2 s**: ảnh hero được tải qua mạng thật (giả lập 4G chậm) và chỉ hiện sau khi giao diện lấy dữ liệu từ API. Đo cùng code trên máy nhóm được 94–96. Hướng cải thiện tiếp: đặt sẵn ảnh hero trong HTML ban đầu thay vì chờ JavaScript vẽ, chuyển ảnh sang AVIF.

### (b) Theo dõi lỗi và hành vi người dùng

**Google Analytics:**
- [x] Đã tích hợp trong code (bật khi đặt biến môi trường) · **Trạng thái production: chưa bật** (chưa tạo property GA4)
- **Tracking ID / Measurement ID:** `⟨G-XXXXXXXXXX⟩` — *bật: tạo property GA4 → Data stream Web cho https://thai-tu-fashion-v1.vercel.app → dán Measurement ID vào Vercel `GA_MEASUREMENT_ID` (kiểu Config) → Redeploy*
- Server đọc `GA_MEASUREMENT_ID` và trả qua `GET /api/config`; `js/tracking.js` nạp gtag.js, gửi `page_view` theo route SPA và sự kiện thương mại điện tử: `view_item`, `add_to_cart`, `begin_checkout`, `purchase`, `sign_up`, `login`, `search`, `generate_lead`. CSP chỉ mở domain Google khi đã cấu hình.

⟨Chèn ảnh Google Analytics → Reports → Realtime sau khi bật⟩. Kiểm thử tự động: `frontend/e2e/tracking.spec.js` xác nhận các sự kiện được gửi vào `dataLayer`.

**Sentry (hoặc tương đương):**
- [x] Đã tích hợp trong code (bật khi đặt biến môi trường) · **Trạng thái production: chưa bật Sentry**; log JSON có `reqId` **đang chạy** (Vercel → Logs)
- **Tool sử dụng:** Sentry (2 project: Browser JavaScript + Node.js) + log JSON có cấu trúc
- **Project DSN / Config:** biến `SENTRY_DSN` (backend), `SENTRY_DSN_BROWSER` (frontend) trên Vercel — [`docs/08-deployment.md`](docs/08-deployment.md)
- Lỗi được theo dõi: lỗi JavaScript trên trình duyệt, lỗi API 5xx (kèm `request_id`), lỗi server không mong đợi (kèm user id, route). Mỗi phản hồi có header `X-Request-Id`; lỗi 500 trả `requestId` cho người dùng để đối chiếu với log/Sentry.

⟨Chèn ảnh Sentry → Issues sau khi bật⟩. Kiểm thử tự động: `backend/tests/integration/observability.test.js` (lỗi 500 có `requestId`, gửi monitor).

---

## Task 5: UI/UX Peer Review & Evaluation

Quy trình và biểu mẫu: [`docs/peer-review/`](docs/peer-review/README.md).

> **Hướng dẫn điền Task 5**
> 1. Chọn **2 nhóm** khác, xin link web + tài khoản dùng thử. Mỗi người dùng thử ~20 phút theo *Kịch bản dùng thử* trong [`docs/peer-review/README.md`](docs/peer-review/README.md) (điện thoại + máy tính).
> 2. Chép [`review-template.md`](docs/peer-review/review-template.md) thành `docs/peer-review/review-<ten-nhom>.md`, ghi nhận xét **cụ thể**: trang nào, vấn đề gì, đề xuất gì; chụp ảnh minh hoạ.
> 3. **Trao đổi trực tiếp** với nhóm đó (ghi ngày, người tham dự vào file review).
> 4. Chép tóm tắt vào 2 bảng (a) dưới đây: mỗi ô 1–2 câu. *Điểm mạnh* = điều nên giữ; *Gợi ý cải thiện* = việc cụ thể làm được.
> 5. Với góp ý **nhóm mình nhận**: mỗi góp ý tạo 1 issue nhãn `task-5-peer-review` → sửa trên branch, PR `Closes #…` **hoặc** ghi lý do không làm. Điền bảng (b), cột cuối là link commit/PR hoặc lý do; chèn ảnh trước/sau nếu đã sửa.

### (a) Feedback cho các nhóm khác

**Nhóm được review #1:**
- **Tên nhóm / Dự án:** ⟨cần điền⟩
- **Link dự án:** ⟨cần điền⟩

| Khía cạnh | Điểm mạnh | Gợi ý cải thiện |
|---|---|---|
| Usability | ⟨⟩ | ⟨⟩ |
| Aesthetics | ⟨⟩ | ⟨⟩ |
| User-Friendliness | ⟨⟩ | ⟨⟩ |

**Nhóm được review #2:**
- **Tên nhóm / Dự án:** ⟨cần điền⟩
- **Link dự án:** ⟨cần điền⟩

| Khía cạnh | Điểm mạnh | Gợi ý cải thiện |
|---|---|---|
| Usability | ⟨⟩ | ⟨⟩ |
| Aesthetics | ⟨⟩ | ⟨⟩ |
| User-Friendliness | ⟨⟩ | ⟨⟩ |

### (b) Xử lý feedback từ các nhóm khác

| Feedback | Nguồn (nhóm nào) | Quyết định | Lý do / Commit |
|---|---|---|---|
| ⟨VD: Nút "Thêm vào giỏ" khó thấy trên điện thoại⟩ | ⟨Nhóm X⟩ | ⟨Đã implement⟩ | ⟨link PR #… + ảnh trước/sau⟩ |
| ⟨VD: Muốn thêm thanh toán MoMo thật⟩ | ⟨Nhóm Y⟩ | ⟨Không implement⟩ | ⟨Ngoài phạm vi đồ án (PRD §7: v1.1), cần hợp đồng cổng thanh toán⟩ |

---

## Deliverables Checklist

- [x] **Source code trên GitHub**: https://github.com/huynhsy986-droid/thai_tu_fashion
- [x] **Website deploy**: https://thai-tu-fashion-v1.vercel.app
- [x] **README.md**: hướng dẫn cài đặt, tổng quan, danh sách tính năng có screenshots, ERD
- [ ] **Video demo trên YouTube**: tối đa 10 phút, tối thiểu 720p, không để private — kịch bản [`docs/video-script.md`](docs/video-script.md)
  > **Hướng dẫn:** quay trên https://thai-tu-fashion-v1.vercel.app theo kịch bản (mỗi người nói phần mình) → xuất MP4 ≥ 720p, ≤ 10:00 → YouTube *Tải lên* → chế độ **Không công khai (Unlisted)** → dán link vào ô *Video Demo* ở đầu README và tick ô này.
- [ ] **Self-Report**: mỗi thành viên tự điền file của mình trong `docs/self-reports/` (đã tạo sẵn theo MSSV) rồi tick ô này

---

## Self-Reports

| Họ tên | MSSV | Link Self-Report |
|---|---|---|
| Lê Quang Khanh | 24090012 | [`docs/self-reports/self-report-24090012.md`](docs/self-reports/self-report-24090012.md) |
| Nguyễn Trần Minh Nguyên | 24090010 | [`docs/self-reports/self-report-24090010.md`](docs/self-reports/self-report-24090010.md) |
| Huỳnh Tấn Sỹ | 24090017 | [`docs/self-reports/self-report-24090017.md`](docs/self-reports/self-report-24090017.md) |

---

<details>
<summary>Tài liệu kỹ thuật khác</summary>

| Tài liệu | Nội dung |
|---|---|
| [`docs/00-team-workflow.md`](docs/00-team-workflow.md) | Nhóm, quy trình 3 bước |
| [`docs/01-design-review.md`](docs/01-design-review.md) | Review prototype |
| [`docs/02-PRD.md`](docs/02-PRD.md) | Yêu cầu + 46 AC + 8 NFR |
| [`docs/05-api-docs.md`](docs/05-api-docs.md) · [`openapi.yaml`](docs/openapi.yaml) | Tài liệu API |
| [`docs/06-test-report.md`](docs/06-test-report.md) · [`traceability.md`](docs/traceability.md) | Kiểm thử, truy vết AC → test |
| [`docs/07-supabase-production.md`](docs/07-supabase-production.md) · [`08-deployment.md`](docs/08-deployment.md) | Supabase thật, deploy Render |
| [`CLAUDE.md`](CLAUDE.md) · `.claude/skills/` | Rule · Skill · Constraint cho AI coding agent |

</details>
