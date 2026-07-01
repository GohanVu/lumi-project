# Audit Log Archive (Sessions 1 - 19)

> Tệp này lưu trữ lịch sử nhật ký hoạt động từ Session 1 đến Session 19.
> Xem nhật ký hiện tại tại: [Nhật ký hoạt động](file:///d:/Project/lumi-project/docs/audit-log.md)

---

## 2026-06-27 — Session 1: Brainstorm & Planning

### Yêu cầu
- Người dùng yêu cầu đọc tài liệu đặc tả Word (`Dac_ta_web_CRM_quan_ly_NPP_LUMI.docx`) và brainstorm

### Công việc đã làm
- Đọc toàn bộ steering files và docs template
- Extract nội dung file Word sang text bằng python-docx
- Brainstorm tech stack, clarify requirements qua Q&A
- Ghi kết quả vào docs/brainstorm.md
- Tạo docs/plan.md với 6 phases, 33 tasks

### Quyết định quan trọng
- **Desktop-first** (không mobile) → giảm phức tạp UI
- **Vanilla CSS + CSS Modules** → tuân thủ rule, không dùng Tailwind
- **Next.js 15 full-stack** → 1 repo, AI vibe code hiệu quả nhất
- **Better Auth** thay NextAuth → nhẹ hơn, role-based tốt hơn
- **TanStack Query** → tránh bất đồng bộ gây đơ UI (rule project)
- **File lưu local** → đơn giản cho self-host VPS rẻ
- **Scoring full spec** → có versioning, ghi đè, lịch sử (theo đặc tả section 7)
- **Opportunity/Import Excel** → ngoài MVP, để Phase 2

### Kết quả
- docs/brainstorm.md: đã fill đầy đủ context session 1
- docs/plan.md: 6 phases, 33 tasks, critical path rõ ràng
- Sẵn sàng bắt đầu Phase 1 (Setup & Foundation)

### Tasks liên quan
- T1 → T8 (Phase 1 — Setup)

---

## 2026-06-28 — Session 2: Phase 1 Complete (Setup & Foundation)

### Yêu cầu
- Implement toàn bộ Phase 1 (T1 → T8): setup project, Docker, DB schema, auth, CSS, layout, seed

### Công việc đã làm
- T1: Init Next.js 15 + TypeScript (App Router, src dir, no Tailwind)
- T2: Docker Compose — app (Next.js dev), db (PostgreSQL 16), nginx (reverse proxy + static uploads)
- T3: Prisma v7 + @prisma/adapter-pg + pg driver (Prisma v7 dùng driver adapters, không còn Rust engine)
- T4: Database Schema đầy đủ — 12 models: User, Session, Account, Verification, Company, Contact, Interaction, Task, ScoreTemplate, ScoreCriteria, ScoreResult, ScoreResultDetail, Attachment, AuditLog
- T5: Better Auth setup — email/password, role (admin/user), API route /api/auth/[...all]
- T6: CSS Design System — custom properties (colors, typography, spacing, shadows, transitions)
- T7: Layout components — Sidebar, Header, AppLayout (CSS Modules)
- T8: Seed script — admin@lumi.vn (admin123) + asm1@lumi.vn (user123)

### Quyết định quan trọng
- **Prisma v7 breaking change**: v7 dùng "client" engine, bắt buộc adapter. Dùng `@prisma/adapter-pg` + `pg` Pool
- **Docker port**: map host 3001:3000 (tránh conflict với process local)
- **Dockerfile dùng `npm install`** thay vì `npm ci` vì lockfile v3 (Node 25) không tương thích với Node 22 trong container
- **Next.js output: "standalone"** cho production Docker build
- **`prisma db push`** cho dev — migration sẽ dùng khi production

### Kết quả
- Phase 1 hoàn thành ✅
- `docker compose up --build` → app chạy tại localhost:3001 (direct) hoặc localhost:80 (via nginx)
- Auth endpoint verified: GET /api/auth/ok → {"ok":true}
- Seed data: 2 users (admin + ASM)
- TypeScript compiles clean (tsc --noEmit passes)

### Tasks liên quan
- T1, T2, T3, T4, T5, T6, T7, T8 — tất cả ✅ Done

---

## 2026-06-28 — Session 3: T9 + T10 — Danh sách NPP & Form thêm NPP

### Yêu cầu
- Implement T9: Trang danh sách NPP với bảng, lọc cơ bản, phân quyền
- Implement T10: Form thêm NPP, cảnh báo trùng SĐT/MST

### Công việc đã làm
**T9:**
- Cài đặt `@tanstack/react-query` v5 và `zod` v3
- Tạo TanStack Query provider (`QueryProvider`) và wrap vào root layout
- Tạo `src/lib/query-client.ts`, `src/lib/auth-guard.ts`
- API `GET /api/companies` (auth, role filter, search, status filter, pagination, sort)
- Trang `/companies` (bảng, search, filter, pagination, empty/loading/error states)

**T10:**
- Cài đặt `react-hook-form` + `@hookform/resolvers`
- API `POST /api/companies` (Zod validate, duplicate check SĐT+MST, role check)
- API `GET /api/companies/check-duplicate` (real-time check trước khi submit)
- API `GET /api/users` (dropdown ASM phụ trách)
- Trang `/companies/new` (React Hook Form + Zod, 3 sections: cơ bản, địa chỉ, phân loại)
- Cảnh báo trùng onBlur (hiện link đến NPP đã tồn tại)
- Bổ sung section API Endpoints vào brainstorm
- Cập nhật steering workflow-guide (thêm rule liệt kê API trước planning)

### Quyết định quan trọng
- **Duplicate check 2 lớp**: (1) real-time onBlur via `/check-duplicate`, (2) server-side validate khi POST → đảm bảo không lọt
- **Non-admin chỉ assign cho mình**: API trả 403 nếu user thường assign NPP cho người khác
- **Status field required** thay vì default trong Zod schema → tránh type mismatch với RHF resolver
- **react-hook-form watch() warning**: React Compiler incompatibility — acceptable, RHF chưa support RC

### Kết quả
- T9, T10 hoàn thành ✅
- TypeScript compile clean
- ESLint pass (1 warning — RHF/React Compiler known issue)
- Brainstorm updated với full API list
- Steering updated

### Tasks liên quan
- T9 ✅, T10 ✅

---

## 2026-06-28 — Session 4: Đồng bộ trạng thái & hoàn tất Phase 2

### Yêu cầu
- Phân tích nguyên nhân plan/audit/source bị lệch thông tin
- Cập nhật rule để ngăn sai sót lặp lại
- Tiếp tục hoàn thiện task kế tiếp

### Công việc đã làm
- Xác định state drift: T11 đã ghi Done nhưng thiếu audit; T12 đã có code nhưng plan còn Todo và quality gates chưa pass; T13 đã được implement cùng T9 nhưng chưa cập nhật plan
- Thêm `State Consistency Gate` vào steering workflow: đối chiếu plan, audit, git, source và quality gates; bắt buộc chuyển In Progress trước khi code; chỉ Done sau khi lint/type/test pass; audit và plan phải cập nhật cùng session
- Reconcile T11 (layout hồ sơ NPP) và T13 (tìm kiếm tên/MST/SĐT) theo source thực tế
- Hoàn thiện T12: CRUD Contact, liên hệ chính, error state và accessibility cho modal
- Tách schema Contact dùng chung giữa UI/API để tránh lệch validation
- Bọc thao tác đổi liên hệ chính và create/update trong Prisma transaction
- Thêm test runner bằng `node:test` + `tsx` và 4 test validation Contact
- Thêm `.dockerignore`, giảm Docker build context từ khoảng 729 MB xuống 1.71 MB; rebuild và recreate app container thành công

### Quyết định quan trọng
- **Done là trạng thái có bằng chứng**: file tồn tại chưa đủ; lint, TypeScript, test, audit và plan phải đồng bộ
- **Schema UI và API dùng chung**: form yêu cầu `isPrimary` rõ ràng, API vẫn default `false` khi client bỏ qua field
- **Đổi primary contact phải atomic**: unset contact cũ và create/update contact mới nằm trong cùng transaction
- **Test framework tối giản**: dùng `node:test` qua dependency `tsx` đã có, chưa thêm framework mới khi project chưa chốt testing stack

### Kết quả
- Phase 2 (T9–T13) hoàn thành ✅
- ESLint: 0 errors, còn 1 warning React Hook Form/React Compiler đã biết tại form NPP
- TypeScript: pass
- Contact tests: 4/4 pass
- App, PostgreSQL và Nginx đang chạy healthy sau rebuild

### Tasks liên quan
- T11 ✅ (reconcile audit)
- T12 ✅
- T13 ✅ (reconcile plan)

---

## 2026-06-28 — Session 5: T14 — Timeline tương tác

### Yêu cầu
- Implement riêng T14: Tab Timeline hiển thị nhật ký tương tác theo thời gian
- Không implement form thêm tương tác của T15

### Công việc đã làm
- Tạo API `GET /api/companies/[id]/interactions`
- Áp dụng Better Auth và RBAC: Admin xem tất cả, User chỉ xem NPP được phân công
- Query interaction mới nhất trước, trả kèm người tạo, loại tương tác, nội dung, kết quả, người liên hệ và lịch follow-up
- Tạo `TimelineTab` dùng TanStack Query với loading, error/retry và empty state
- Hiển thị timeline dọc, nhóm theo ngày giờ Việt Nam, phân màu theo loại tương tác
- Tích hợp TimelineTab vào trang hồ sơ NPP, thay placeholder T14

### Quyết định quan trọng
- **Giữ đúng boundary T14/T15**: T14 chỉ đọc và trình bày timeline; thao tác thêm tương tác để riêng cho T15
- **Timezone hiển thị cố định**: dùng `Asia/Ho_Chi_Minh` để ngày/giờ nhất quán với người dùng nội bộ Việt Nam
- **Ẩn tài nguyên trái quyền bằng 404**: reuse pattern Company/Contact hiện có để không tiết lộ NPP tồn tại cho user không được phân công

### Kết quả
- T14 hoàn thành ✅
- ESLint: 0 errors, còn 1 warning React Hook Form/React Compiler đã biết tại form NPP
- TypeScript: pass
- Test suite: 4/4 pass
- Smoke test endpoint chưa đăng nhập: trả đúng `401 Unauthorized`

### Tasks liên quan
- T14 ✅

---

## 2026-06-28 — Session 6: T15 — Form thêm tương tác

### Yêu cầu
- Tiếp tục code task kế tiếp sau T14
- Implement T15: form ghi nhận tương tác mới

### Công việc đã làm
- Bổ sung `POST /api/companies/[id]/interactions` với Better Auth, RBAC và Zod validation
- Tạo shared schema cho loại tương tác, nội dung, kết quả, người liên hệ và lịch follow-up
- Thêm modal React Hook Form vào Timeline, hỗ trợ 6 loại tương tác
- Dùng TanStack Query mutation; sau khi tạo thành công tự refresh timeline và số lượng trên tab
- Chuyển giá trị `datetime-local` sang ISO trước khi gửi API
- Thêm loading, submit error, khóa thao tác đóng form khi request đang chạy
- Thêm 4 test cho Interaction validation; tổng test suite tăng lên 8 tests

### Quyết định quan trọng
- **Follow-up gửi dưới dạng ISO**: browser chuyển giờ local sang ISO trước khi POST, server chỉ nhận datetime có offset để tránh hiểu sai múi giờ trong container
- **Contact name là snapshot text**: tuân theo schema hiện tại `contactName`, giữ đúng tên người được liên hệ tại thời điểm ghi log thay vì phụ thuộc Contact có thể đổi sau này
- **Shared validation theo boundary**: form schema xử lý `datetime-local`; API schema yêu cầu timestamp ISO và tái validate toàn bộ input

### Kết quả
- T15 hoàn thành ✅
- ESLint: 0 errors, còn 1 warning React Hook Form/React Compiler đã biết tại form NPP
- TypeScript: pass
- Test suite: 8/8 pass
- Smoke test POST chưa đăng nhập: trả đúng `401 Unauthorized`

### Tasks liên quan
- T15 ✅

---

## 2026-06-28 — Session 8: Fix Hydration + T16 Tab Nhiệm vụ

### Yêu cầu
- Sửa lỗi hydration crash tại AppLayout (`Đang kiểm tra đăng nhập` vs full layout)
- Implement T16: Tab Nhiệm vụ — CRUD task, deadline, trạng thái

### Công việc đã làm
**Fix hydration (Issue-008):**
- Xác định root cause: Better Auth đọc session từ cookie trong SSR → server render full layout; client bắt đầu với `isPending: true` → render loading state → mismatch
- Lần 1: dùng `useState(false)` + `setIsMounted(true)` trong `useEffect` → ESLint React Compiler báo lỗi `react-hooks/set-state-in-effect`
- Lần 2: thay bằng `useSyncExternalStore(noop, () => true, () => false)` — cách React chính thức để expose server/client snapshot khác nhau, không cần effect
- Bổ sung rule `isMounted` pattern vào `project-conventions.md`, ghi Issue-008 vào `issues.md`

**T16 — Tab Nhiệm vụ:**
- Tạo `src/lib/validation/task.ts` — taskFormSchema, createTaskSchema, updateTaskSchema, enums
- Tạo `GET/POST /api/companies/[id]/tasks` — Better Auth, RBAC, Zod validate
- Tạo `PATCH/DELETE /api/tasks/[id]` — PATCH tự động set/clear completedAt theo status transition
- Tạo `TasksTab.tsx` — TanStack Query, filter (all/active/done), quick status toggle, create/edit modal, delete with confirm
- Tạo `TasksTab.module.css` — follow pattern TimelineTab, priority/status badges, deadline overdue highlight
- Tích hợp TasksTab vào company detail page (thay PlaceholderTab T16)
- Thêm 4 tests validation task

### Quyết định quan trọng
- **`useSyncExternalStore` cho hydration guard**: server snapshot = `false`, client snapshot = `true`. React 18 hydrates với server snapshot rồi schedule re-render với client snapshot mà không throw hydration error. Sạch hơn `setState` trong `useEffect`, không vi phạm React Compiler rule
- **`completedAt` tự động theo status**: PATCH → DONE sets `completedAt = now()`; PATCH khỏi DONE clears `completedAt = null`; các transition khác không chạm `completedAt`
- **assignedToId mặc định là người tạo**: MVP không cần UI chọn assignee — server tự dùng `session.user.id`; giảm form complexity
- **Hard delete task**: Task model không có `deletedAt` → DELETE xóa cứng; acceptable vì task không có lịch sử cần giữ

### Kết quả
- Fix hydration: 0 errors, 0 warnings mới
- T16 hoàn thành ✅
- ESLint: 0 errors, 1 warning đã biết (React Hook Form/React Compiler tại form NPP)
- TypeScript: pass
- Test suite: 16/16 pass (4 test mới cho task validation)

### Tasks liên quan
- Issue-008 ✅ Fixed
- T16 ✅

---

## 2026-06-28 — Session 12: T20 Versioning template (ban hành / nhân bản / lưu trữ)

### Yêu cầu
- Tiếp tục task tiếp theo sau T19 → T20 (versioning mẫu chấm điểm, đặc tả 7.7)

### Công việc đã làm
- API chuyển trạng thái (Admin only, đều check 401/403):
  - `api/score-templates/[id]/publish/route.ts`: DRAFT → PUBLISHED, yêu cầu ≥1 tiêu chí (409 NO_CRITERIA), khóa cấu hình
  - `api/score-templates/[id]/archive/route.ts`: PUBLISHED → ARCHIVED (ngừng áp dụng, không xóa cứng)
  - `api/score-templates/[id]/clone/route.ts`: nhân bản sang DRAFT mới, copy toàn bộ tiêu chí, version = max version cùng tên + 1
- UI `app/scoring/page.tsx`: thêm nút Ban hành / Nhân bản / Lưu trữ trong panel chi tiết; clone xong tự chọn mẫu mới; lockNotice hướng dẫn nhân bản; hiển thị lỗi chuyển trạng thái

### Quyết định quan trọng
- Nhân bản dùng version = max version trong các mẫu CÙNG TÊN + 1 (gom phiên bản theo tên), giữ lịch sử mẫu cũ nguyên vẹn
- Nút "Nhân bản" cho phép ở mọi trạng thái (để sửa mẫu đã ban hành → tạo DRAFT mới); Ban hành chỉ khi DRAFT có tiêu chí; Lưu trữ chỉ khi PUBLISHED
- KHÔNG dùng AuditLog cho lịch sử cấu hình template vì model AuditLog bắt buộc companyId (gắn NPP); lịch sử config-level hoãn lại (cần field/model riêng) — ghi nhận để xử lý sau
- "Ngày hiệu lực" (effective date) trong spec 7.7 hoãn: schema ScoreTemplate chưa có field, cần migration — defer, không chặn luồng versioning cốt lõi

### Kết quả
- Quality gates: `tsc --noEmit` pass; eslint 0 errors (1 warning cũ); `npm test` 28/28 pass; smoke test publish/archive/clone đều trả 401 khi chưa đăng nhập
- T20 → ✅ Done

### Tasks liên quan
- T20 (done). Tiếp theo: T21 (tab Chấm điểm theo NPP — phụ thuộc T19 + T20, đã sẵn sàng)

---

## 2026-06-28 — Session 11: T19 Logic tính điểm chuẩn hóa 0-100

### Yêu cầu
- Tiếp tục task tiếp theo sau T18 → T19 (công thức tính điểm, đặc tả 7.5)

### Công việc đã làm
- `lib/scoring/calculate.ts`: hàm thuần `calculateScore(criteria, inputs, policy)` — không phụ thuộc Prisma, tái sử dụng ở API chấm điểm (T21)
  - Điểm quy đổi = (điểm thô / điểm tối đa) × trọng số; Điểm tổng = (Σ quy đổi / Σ trọng số được tính) × 100
  - 3 chính sách dữ liệu thiếu: EXCLUDE (loại khỏi mẫu số), ZERO (cộng trọng số, 0 điểm), BLOCK (chặn hoàn tất)
  - Trả thêm `dataCompleteness` (%), `isComplete`, `canFinalize`, chi tiết từng tiêu chí
- `lib/scoring/calculate.test.ts`: 8 test (chuẩn hóa thang 100, điểm tuyệt đối, 3 policy, kẹp [0,maxScore], không có dữ liệu / mẫu rỗng — guard chia cho 0)

### Quyết định quan trọng
- Tách logic thành module thuần (no Prisma) để test nhanh + dùng lại cho T21 (tab chấm điểm) và preview ở T20
- Kẹp điểm thô về [0, maxScore] để chống dữ liệu nhập sai thay vì throw (chấm điểm là thao tác thường xuyên, fail-soft)
- `canFinalize` chỉ phụ thuộc policy BLOCK; EXCLUDE/ZERO cho phép hoàn tất với dữ liệu một phần (đúng đặc tả 7.5)
- Ngưỡng phân loại A/B/C tách sang T24 (không gộp vào đây)

### Kết quả
- Quality gates: `tsc --noEmit` pass; eslint 0 errors (1 warning cũ); `npm test` 28/28 pass (thêm 8 test scoring, tổng 20→28)
- T19 → ✅ Done

### Tasks liên quan
- T19 (done). Tiếp theo: T20 (versioning template) hoặc T21 (tab chấm điểm — phụ thuộc T19+T20)

---

## 2026-06-28 — Session 10: T18 Admin CRUD ScoreTemplate + ScoreCriteria

### Yêu cầu
- Tiếp tục task tiếp theo sau T17 → T18 (Phase 4: cấu hình module chấm điểm)

### Công việc đã làm
- `lib/auth-guard.ts`: thêm helper `requireAdmin()` trả về `{ session, isAdmin }`
- `lib/validation/score-template.ts`: schema cho template (form/create/update) và criteria (form/create/update); `criteriaFormSchema` dùng `z.coerce.number().positive()` cho maxScore/weight
- `lib/validation/score-template.test.ts`: 4 test (name bắt buộc, maxScore/weight phải dương, coerce string→number, update yêu cầu ≥1 field)
- API:
  - `api/score-templates/route.ts`: GET list + POST create (Admin only)
  - `api/score-templates/[id]/route.ts`: GET detail (kèm criteria) + PUT (chỉ DRAFT, 409 TEMPLATE_LOCKED) + DELETE (chỉ DRAFT & chưa có results, 409)
  - `api/score-templates/[id]/criteria/route.ts`: POST thêm tiêu chí (chỉ DRAFT, auto sortOrder = max+1)
  - `api/score-criteria/[id]/route.ts`: PUT + DELETE (chỉ khi template DRAFT)
- UI: `app/scoring/page.tsx` + `scoring.module.css` — master-detail, guard non-admin (accessDenied), CRUD template + criteria qua modal, khóa cấu hình khi template không phải DRAFT

### Quyết định quan trọng
- "Ẩn tiêu chí" = hard delete trong DRAFT, vì schema ScoreCriteria không có field isActive/deletedAt
- DELETE template bị chặn nếu PUBLISHED hoặc đã có ScoreResult (toàn vẹn lịch sử chấm)
- Trọng số chỉ cần số dương, không bắt buộc tổng = 100 (chuẩn hóa khi tính điểm — đặc tả 7.5)
- Versioning (ban hành/nhân bản/lưu trữ) hoãn sang T20; công thức tính điểm T19
- Auto-select mẫu đầu tiên dùng giá trị dẫn xuất `effectiveId` thay vì setState-in-effect (tránh lỗi React Compiler `react-hooks/set-state-in-effect`)

### Kết quả
- Quality gates: `tsc --noEmit` pass; `eslint` 0 errors (1 warning cũ ở companies/new); `npm test` 20/20 pass; smoke test `/api/score-templates` trả 401 khi chưa đăng nhập
- T18 → ✅ Done

### Tasks liên quan
- T18 (done). Tiếp theo: T19 (logic tính điểm chuẩn hóa 0-100)

---

## 2026-06-28 — Session 9: T17 Dashboard + fix CSS token T16

### Yêu cầu
- Tiếp tục task tiếp theo sau T16
- Implement T17: Dashboard — task quá hạn, follow-up hôm nay

### Công việc đã làm
**Fix CSS token TasksTab (phát sinh từ T16):**
- Phát hiện `TasksTab.module.css` dùng nhiều CSS custom property không tồn tại trong `globals.css` (`--border-light`, `--border-medium`, `--bg-secondary`, `--bg-primary`, `--bg-tertiary`, `--text-tertiary`, `--color-danger-600/500/300/700`, `--color-success-600`)
- Đối chiếu token thật trong `globals.css` và recreate file với token đúng: `--border-color`, `--bg-surface`, `--color-gray-100/300`, `--text-muted`, `--color-danger`, `--color-danger-light`, `--color-success`

**T17 — Dashboard:**
- Tạo `GET /api/dashboard` — Better Auth + RBAC, scope theo role (Admin toàn bộ, User theo `assignedToId`)
- Trả về: totalCompanies, companiesByStatus (đủ 6 status kể cả 0), taskStats, overdueTasks (≤20), todayFollowUps (≤20)
- Tính "hôm nay" theo giờ VN (UTC+7) cho follow-up; task quá hạn = status TODO/IN_PROGRESS và dueDate < đầu ngày hôm nay
- Tạo `dashboard.module.css` với token đúng
- Viết lại `dashboard/page.tsx`: KPI cards, phân bố trạng thái, 2 cột (task quá hạn + follow-up hôm nay), link tới hồ sơ NPP, dùng useSession thay cho hardcode "Admin"

### Quyết định quan trọng
- **Tính "hôm nay" theo UTC+7 ở server**: container chạy UTC, follow-up so sánh theo ranh giới ngày VN để khớp người dùng nội bộ
- **companiesByStatus chuẩn hóa đủ status**: groupBy chỉ trả status có data → map về đủ 6 status (0 nếu thiếu) để UI ổn định
- **Giới hạn 20 bản ghi mỗi danh sách**: dashboard chỉ cần snapshot, tránh query nặng
- **Không thêm test mới**: T17 là read-only aggregation, không có validation logic mới; giữ nhất quán với T14 (cũng read-only)

### Kết quả
- T17 hoàn thành ✅; CSS token T16 đã sửa
- ESLint: 0 errors, 1 warning đã biết (RHF/React Compiler)
- TypeScript: pass
- Test suite: 16/16 pass
- Smoke test `GET /api/dashboard` chưa đăng nhập: trả đúng 401

### Tasks liên quan
- T17 ✅

## 2026-06-28 — Session 7: Fix ASM phụ trách bị rỗng khi tạo NPP

### Yêu cầu
- Kiểm tra và sửa lỗi dropdown ASM không có giá trị, khiến user thường không tạo được NPP

### Công việc đã làm
- Xác định React Hook Form lấy `defaultValues` trước khi Better Auth session tải xong và không tự đồng bộ lại
- Xác định auth client hardcode `localhost:3000` trong khi app được truy cập qua `localhost:3001`, khiến session request đi sai origin và Company API trả 401
- Chuyển Better Auth client sang same-origin, cập nhật `BETTER_AUTH_URL` và tăng dev secret lên trên 32 ký tự
- Bổ sung trang `/login`, auth guard tại AppLayout và thao tác đăng xuất
- Dùng `setValue` trong effect để gán `assignedToId` ngay khi session user sẵn sàng
- User thường hiển thị chính tài khoản hiện tại ở field ASM và không gọi API danh sách users
- Admin vẫn tải và chọn ASM active từ `/api/users`, có loading/error state
- API tạo Company cưỡng chế user thường tự gán cho chính mình, kể cả client thiếu hoặc giả mạo `assignedToId`
- API kiểm tra assignee tồn tại và đang active trước khi tạo Company
- Siết `GET /api/users` về đúng spec Admin-only
- Thêm 4 regression tests cho logic phân công Company
- Sửa test script bằng cách quote glob để `npm test` không bỏ sót test nằm ở thư mục sâu
- Rebuild và recreate app container sau thay đổi `package.json`
- Integration test bằng ASM seed: sign-in 200, get-session 200, Company API 200, Users API 403; session test đã được sign-out và thu hồi

### Quyết định quan trọng
- **Defense in depth cho assignee**: UI tự điền để UX đúng; API vẫn tự quyết định assignee cho user thường để không phụ thuộc dữ liệu client
- **Auth client dùng same-origin**: không hardcode port trong browser; URL public được cấu hình tại environment của server
- **User thường không cần danh sách users**: chỉ Admin được gọi `/api/users`, giảm lộ thông tin tài khoản và tránh request thừa
- **Test discovery phải ổn định**: glob được quote để `tsx` tự tìm recursive, không để shell mở rộng khác nhau theo cấu trúc file

### Kết quả
- User thường thấy chính mình ở ASM phụ trách và có thể tạo NPP ✅
- Người chưa đăng nhập được chuyển về `/login`; session hoạt động đúng trên `localhost:3001`
- Admin vẫn chọn được ASM active
- ESLint: 0 errors, còn 1 warning React Hook Form/React Compiler đã biết
- TypeScript: pass
- Test suite thực tế: 12/12 pass

### Tasks liên quan
- T5 ✅ (hoàn thiện auth flow)
- T10 ✅ (bugfix Issue-006)

---

## 2026-06-28 — Session 13: T21 Tab Chấm điểm NPP

### Yêu cầu
- Tạo checkpoint cho T15–T20 đã hoàn thành
- Implement T21: chấm điểm NPP theo template, tự tính điểm và xem chi tiết

### Công việc đã làm
- Chạy quality gates và commit checkpoint T15–T20 tại `e11ec17`
- Tạo validation `score-result.ts` cho form và API, gồm chính sách dữ liệu thiếu và chống trùng tiêu chí
- Tạo `GET /api/companies/[id]/scores`: trả lịch sử chấm, chi tiết tiêu chí, độ hoàn thiện và template PUBLISHED khả dụng
- Tạo `POST /api/companies/[id]/scores`: RBAC theo NPP, validate template/criteria/maxScore, tính lại điểm ở server
- Lưu `ScoreResult`, `ScoreResultDetail` và AuditLog `SCORE` trong cùng Prisma transaction
- Tạo `ScoresTab`: kết quả gần nhất, lịch sử, panel chi tiết cách tính, modal chấm điểm động theo template
- Live preview tự động tính tổng điểm 0–100 và độ hoàn thiện khi nhập điểm thô
- Hỗ trợ ba policy EXCLUDE / ZERO / BLOCK từ đặc tả 7.5
- Thêm 4 tests validation score result
- Integration test có fixture tạm: GET 200, POST 201, lưu đúng 80/100 từ 8/10, completeness 100%, có audit SCORE; đã dọn fixture và thu hồi session

### Quyết định quan trọng
- **Server là nguồn sự thật cho tổng điểm**: client chỉ preview; API luôn tính lại bằng `calculateScore`, không nhận totalScore từ client
- **Chỉ dùng template PUBLISHED**: kết quả mới luôn gắn đúng template/version đã khóa; template DRAFT/ARCHIVED không được chấm mới
- **Tiêu chí thiếu không tạo detail row**: độ hoàn thiện được suy ra bằng cách so result details với toàn bộ criteria của đúng template version
- **Tự động trong T21 là tự động tính công thức**: schema hiện chưa có mapping tiêu chí ↔ field Company nên chưa tự lấy điểm thô từ hồ sơ; việc này cần mở rộng model cấu hình sau
- **Grade để T24**: T21 lưu `grade = null` và hiển thị “Chưa phân loại” cho đến khi có ngưỡng A/B/C cấu hình

### Kết quả
- T21 hoàn thành ✅
- ESLint: 0 errors, còn 1 warning React Hook Form/React Compiler đã biết
- TypeScript: pass
- Test suite: 32/32 pass
- Integration test DB/API pass và không để lại dữ liệu test

### Tasks liên quan
- T21 ✅

---

## 2026-06-28 — Session 14: Fix danh sách NPP stale sau khi tạo

### Yêu cầu
- Fix lỗi tạo NPP thành công và quay về danh sách nhưng chưa thấy bản ghi mới cho đến khi F5

### Công việc đã làm
- Truy vết luồng mutation tại trang thêm NPP và query cache tại trang danh sách
- Xác định mutation chỉ điều hướng, không invalidate cache danh sách có `staleTime` 60 giây
- Tạo helper query key dùng chung cho danh sách NPP
- Invalidate toàn bộ query prefix `companies` và chờ hoàn tất trước khi chuyển về `/companies`
- Thêm regression test cho cache mặc định và cache có filter/phân trang

### Quyết định quan trọng
- **Invalidate collection theo prefix**: mọi biến thể phân trang/tìm kiếm/trạng thái đều stale sau khi tạo mới, tránh chỉ sửa riêng trang đầu mặc định
- **Chờ invalidation trước navigation**: đảm bảo trang danh sách mount lại với query đã stale và tự fetch dữ liệu mới
- **Không dùng `router.refresh` làm cache fix**: router refresh không quản lý server state nằm trong TanStack Query cache

### Kết quả
- Issue-009 hoàn thành ✅
- Test suite: 33/33 pass
- TypeScript: pass
- ESLint: 0 errors, còn 1 warning React Hook Form/React Compiler đã biết

### Tasks liên quan
- T10 ✅ (bugfix Issue-009)

---

## 2026-06-28 — Session 15: Hardening TanStack Query cache consistency

### Yêu cầu
- Tạo cơ chế phòng ngừa để không lặp lại lỗi cache stale sau mutation
- Áp dụng ba lớp: rule rõ ràng, query-key factory và regression/E2E test

### Công việc đã làm
- Thêm `TanStack Query Cache Consistency` vào project conventions với mapping bắt buộc cho create/update/delete/nested mutation
- Thêm `Cache Consistency Gate` vào workflow trước quality gates
- Tạo `src/lib/query-keys.ts` làm nguồn query key duy nhất
- Refactor toàn bộ query và invalidation hiện có của Company, Contact, Interaction, Task, Score, ScoreTemplate, User và Dashboard sang factory
- Mở rộng regression test Issue-009: invalidate mọi list cache nhưng không làm stale detail không liên quan
- Thêm automated convention test, test suite sẽ fail nếu source khai báo `queryKey: [...]` trực tiếp ngoài factory

### Quyết định quan trọng
- **Automated guard thay vì chỉ nhắc bằng tài liệu**: convention test biến vi phạm raw query key thành test failure, giảm phụ thuộc vào trí nhớ của người implement/reviewer
- **Chưa thêm Playwright**: regression test ở tầng QueryClient bắt đúng cache contract hiện tại mà không thêm browser dependency; workflow yêu cầu E2E cho luồng quan trọng khi project có browser test runner
- **Một factory cho toàn app**: query và mutation dùng cùng nguồn key, tránh typo hoặc lệch cấu trúc key khi invalidate

### Kết quả
- Cache Consistency Gate được áp dụng ✅
- Test suite: 34/34 pass
- TypeScript: pass
- ESLint: 0 errors, còn 1 warning React Hook Form/React Compiler đã biết

### Tasks liên quan
- T10 ✅ (hardening sau Issue-009)

---

## 2026-06-28 — Session 16: T22 Ghi đè điểm có audit

### Yêu cầu
- Tiếp tục task hợp lý tiếp theo sau T21
- Implement T22: Admin ghi đè điểm, bắt buộc nhập lý do và truy xuất được audit

### Công việc đã làm
- Bổ sung `ScoreResult.systemScore` để giữ riêng điểm hệ thống; `totalScore` trở thành điểm hiệu lực sau điều chỉnh
- Cập nhật luồng tạo kết quả chấm để lưu đồng thời điểm hệ thống và điểm hiệu lực ban đầu
- Tạo `PUT /api/scores/[id]/override`: Admin-only, validate điểm 0–100 và lý do tối thiểu 5 ký tự
- Ghi đè điểm và tạo AuditLog `OVERRIDE` trong cùng Prisma transaction; audit lưu điểm hệ thống, điểm hiệu lực trước/sau, lý do và trạng thái ghi đè trước đó
- Cập nhật `ScoresTab`: chỉ Admin thấy nút ghi đè; modal nhập điểm/lý do; hiển thị đồng thời điểm hệ thống, điểm điều chỉnh và lý do
- Thêm helper invalidation cho score + dashboard và regression test cache contract
- Thêm 4 test validation ghi đè; tổng suite tăng từ 34 lên 39 tests
- Đồng bộ PostgreSQL dev bằng `prisma db push`, regenerate Prisma client và restart app để tiến trình dev nạp client mới
- Integration test bằng fixture tạm: chưa đăng nhập 401, ASM 403, Admin 200; DB giữ điểm hệ thống 75, điểm hiệu lực 82 và audit đúng; đã dọn fixture và thu hồi session

### Quyết định quan trọng
- **Không ghi đè mất điểm gốc**: thêm `systemScore`; dữ liệu cũ fallback từ `totalScore` và được backfill khi ghi đè lần đầu
- **`totalScore` là điểm hiệu lực**: các màn hình tổng hợp/xếp hạng sau này dùng điểm đã được phê duyệt, còn UI vẫn trình bày rõ điểm hệ thống để đối chiếu
- **Mỗi lần ghi đè tạo một audit riêng**: `overrideNote` lưu lý do hiện tại cho UI; toàn bộ chuỗi thay đổi nằm trong AuditLog để T30 hiển thị
- **Cache contract**: ghi đè làm stale lịch sử điểm của NPP và dashboard aggregate; không invalidate company detail vì số lượng kết quả không đổi
- Người duyệt/thời hạn hiệu lực chưa áp dụng vì T22 trong MVP chỉ yêu cầu role Admin + lý do; schema/audit hiện đã đủ mở rộng nếu nghiệp vụ này được bật sau

### Kết quả
- T22 hoàn thành ✅
- PostgreSQL dev schema đồng bộ
- Test suite: 39/39 pass
- TypeScript: pass
- ESLint: 0 errors, còn 1 warning React Hook Form/React Compiler đã biết
- Integration/RBAC/audit test: pass và không để lại fixture

### Tasks liên quan
- T22 ✅. Tiếp theo: T23 — lịch sử chấm điểm và so sánh các lần chấm

---

## 2026-06-29 — Session 17: Push checkpoint T21–T22

### Yêu cầu
- Đẩy toàn bộ phần code mới nhất lên Git

### Công việc đã làm
- Đọc lại plan, audit, brainstorm, issues và toàn bộ steering trước khi thao tác
- Fetch `origin/feat/phase1-setup`; xác nhận remote không có commit mới và local đang đi trước 2 commit
- Rà diff, whitespace và dấu hiệu secrets trước khi stage
- Khởi động lại Docker stack và chạy đầy đủ quality gates trong container
- Commit 26 files của T21, T22 và cache safeguards tại `4cbe82c`
- Push branch `feat/phase1-setup` lên GitHub; xác nhận local HEAD và remote tracking cùng commit

### Quyết định quan trọng
- Giữ toàn bộ thay đổi liên quan scoring + cache consistency trong một checkpoint vì plan/audit đã mô tả chung chuỗi T21–T22 và các regression safeguards
- Không push vào `main`; tiếp tục đúng feature branch hiện tại để không thay đổi luồng merge/review của repository

### Kết quả
- Code đã được push thành công lên `origin/feat/phase1-setup`
- Commit tính năng: `4cbe82c feat: add scoring workflow and cache safeguards`
- Test suite: 39/39 pass
- TypeScript: pass
- ESLint: 0 errors, 1 warning React Hook Form/React Compiler đã biết

### Tasks liên quan
- T21 ✅
- T22 ✅

---

## 2026-07-01 — Session 18: T24 Phân loại A/B/C theo ngưỡng cấu hình

### Yêu cầu
- Tiếp tục T24 sau khi index repository: cho phép Admin tự cấu hình ngưỡng A/B/C

### Công việc đã làm
- Thêm `gradeAMin`/`gradeBMin` vào `ScoreTemplate`; mở rộng form, API tạo/sửa/nhân bản và validation 0–100, B < A
- Tự xếp hạng khi chấm mới; tính lại grade khi override; fallback phân loại cho kết quả cũ có `grade = null`
- Hiển thị ngưỡng ở trang Admin, grade preview khi chấm và phân bố A/B/C trên Dashboard
- Chuẩn hóa query-key prefix score; publish/archive invalidates mọi score view
- Thêm test logic grade, validation ngưỡng và cache contract
- Rebuild Docker, đồng bộ schema PostgreSQL và smoke test route

### Quyết định quan trọng
- **Version ngưỡng theo ScoreTemplate** để lịch sử luôn gắn đúng cấu hình; muốn đổi mẫu đã ban hành phải nhân bản
- **Grade dùng điểm hiệu lực**: override tính lại hạng nhưng vẫn giữ điểm hệ thống
- **Không sửa ngầm dữ liệu cũ**: API fallback grade; kết quả mới luôn lưu grade

### Kết quả
- T24 hoàn thành ✅
- Container test 61/61 pass; TypeScript pass; ESLint 0 errors, 1 warning cũ
- App, PostgreSQL, Nginx healthy; `/scoring` 200 và API chưa đăng nhập trả đúng 401

### Tasks liên quan
- T24 ✅

---

## 2026-07-01 — Session 19: Khôi phục credential tài khoản nội bộ

### Yêu cầu
- Kiểm tra `admin@lumi.vn` và `asm1@lumi.vn`, đặt lại cùng mật khẩu do người dùng cung cấp

### Công việc đã làm
- Kiểm tra database dev và phát hiện cả hai tài khoản chưa tồn tại trong volume PostgreSQL hiện tại
- Chạy seed chuẩn để khôi phục Admin và ASM với đúng role, trạng thái active và credential Better Auth
- Hash mật khẩu mới bằng `better-auth/crypto` và cập nhật hai credential trong một transaction
- Xác minh đăng nhập thực tế qua `/api/auth/sign-in/email` cho từng tài khoản
- Xóa script reset tạm sau khi hoàn tất; không ghi plaintext password vào source hoặc audit log

### Quyết định quan trọng
- Dùng cùng `hashPassword` và cấu trúc Account `providerId = credential` như API quản lý User hiện có
- Dừng toàn bộ transaction nếu thiếu user, user inactive hoặc credential không đúng cấu trúc để tránh cập nhật nửa chừng

### Kết quả
- `admin@lumi.vn`: role ADMIN, active, đăng nhập 200
- `asm1@lumi.vn`: role USER, active, đăng nhập 200
- Mật khẩu của cả hai đã được đặt lại thành công

### Tasks liên quan
- T5, T8 (maintenance credential)
