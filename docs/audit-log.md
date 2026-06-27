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

<!-- Thêm session mới ở đây -->
