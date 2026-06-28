# Audit Log

> Nhật ký ghi lại toàn bộ quá trình làm việc với AI.
> Mục đích: tracking quyết định, tránh lặp lỗi, giữ context giữa các session.

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

<!-- Thêm session mới ở đây -->
