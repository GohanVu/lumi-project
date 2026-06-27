# Project Conventions & Patterns

## Mục đích
File này định hướng AI hiểu các quy ước riêng của project. Khi implement bất kỳ tính năng nào, AI PHẢI tuân theo các pattern đã được thiết lập ở đây.

> **NOTE:** File này được fill sau brainstorm session 1 (2026-06-27).

## Nguyên tắc chung

1. **Reuse trước, tạo mới sau**: Trước khi tạo bất kỳ service/utility/pattern nào mới, PHẢI kiểm tra xem project đã có pattern tương tự chưa. Nếu có → reuse.
2. **Đọc context trước khi code**: Luôn đọc audit log, plan, brainstorm, issues trước khi bắt đầu implement.
3. **Ghi lại quyết định**: Mọi quyết định kỹ thuật quan trọng phải được ghi vào audit log.
4. **BẮT BUỘC đọc đủ 4 file mỗi session**: audit-log.md, plan.md, brainstorm.md, issues.md — kể cả khi summary có vẻ đủ.

## Tham chiếu bắt buộc

Khi bắt đầu một session mới hoặc implement task mới, AI PHẢI đọc:
- `docs/audit-log.md` — Lịch sử làm việc với AI
- `docs/plan.md` — Plan, roadmap, phases, tasks
- `docs/brainstorm.md` — Kết quả brainstorm ban đầu
- `docs/issues.md` — Bugs đã phát hiện
- `.kiro/steering/` — Tất cả steering files

## Tech Stack

- [x] Frontend: Next.js 15 (App Router) + TypeScript
- [x] Backend: Next.js API Routes (full-stack monorepo)
- [x] Database: PostgreSQL
- [x] ORM: Prisma (schema-first, migration với `prisma migrate`)
- [x] Auth: Better Auth (role: admin | user)
- [x] Deployment: Docker Compose + Nginx

## Database Conventions

- [x] ORM: Prisma
- [x] Migration tool: `prisma migrate dev` (dev) / `prisma migrate deploy` (prod)
- [x] Naming convention: snake_case cho table/column trong DB, camelCase trong Prisma schema
- [x] Soft delete pattern: field `deletedAt DateTime?` — KHÔNG xóa cứng bản ghi có lịch sử
- [x] Audit fields bắt buộc: `createdAt`, `updatedAt`, `createdBy`, `updatedBy` trên mọi entity chính

## API Conventions

- [x] API style: REST
- [x] Prefix: `/api/`
- [x] Versioning: chưa cần (nội bộ), không versioning trong MVP
- [x] Error response format:
  ```json
  { "error": "Mô tả lỗi", "code": "ERROR_CODE" }
  ```
- [x] Authentication: Better Auth session (cookie-based)
- [x] Schema validation: Zod — validate mọi input ở API route trước khi xử lý
- [x] Router pattern: `/app/api/[resource]/route.ts` — mỗi resource 1 file route

## Frontend Conventions

- [x] Component library: Không dùng UI library bên ngoài
- [x] UI framework: Vanilla CSS + CSS Modules (file `.module.css` đi kèm mỗi component)
- [x] State management: TanStack Query (server state) + React useState/useReducer (local state)
- [x] Routing: Next.js App Router
- [x] Styling approach: CSS Modules — KHÔNG dùng Tailwind, KHÔNG dùng inline style
- [x] Form handling: React Hook Form + Zod resolver
- [x] API client: TanStack Query + fetch (KHÔNG dùng axios)
- [x] QUAN TRỌNG: Mọi async operation phải dùng TanStack Query để tránh đơ UI

## CSS Conventions

- Dùng CSS Custom Properties (variables) trong `:root` cho design tokens
- Mỗi component có file `.module.css` riêng
- Global styles chỉ trong `app/globals.css`
- Không dùng `!important`
- Responsive: desktop-first (breakpoint nếu cần, không ưu tiên mobile)

## File Upload

- [x] Storage: Local filesystem tại `/uploads` trong container
- [x] Nginx serve static files từ `/uploads`
- [x] API: `/api/upload` — multipart/form-data
- [x] Giới hạn: 10MB/file, các loại: image/*, application/pdf, .doc, .docx, .xlsx
- [x] Naming: `{timestamp}_{uuid}_{originalname}` để tránh trùng

## Phân quyền

- [x] Roles: `admin` | `user`
- [x] Admin: thấy toàn bộ dữ liệu tất cả ASM
- [x] User (ASM): chỉ thấy NPP được assign cho mình (`assignedTo = currentUser.id`)
- [x] Kiểm tra quyền: middleware + mỗi API route tự kiểm tra role

## Queue / Background Jobs

- [ ] Chưa có trong MVP — cập nhật khi cần

## Testing

- [ ] Backend test framework: chưa quyết định
- [ ] Frontend test framework: chưa quyết định
- [x] Convention: Mỗi bug fix PHẢI có test đi kèm
- [ ] Coverage target: chưa đặt

## Logging

- [ ] Chưa setup logging library — dùng console.log tạm trong MVP
- [ ] Cập nhật sau khi deploy

## Documentation

- Tham chiếu: `.kiro/steering/documentation-review.md`
- Khi thay đổi code → kiểm tra doc liên quan có cần update không.

## Environment & Portability

- [x] Containerization: Docker Compose
- [x] Node isolation: node_modules trong container (không mount từ host)
- [x] Reproduce command: `docker compose up --build` (1 lệnh duy nhất)
- [x] .gitignore: Cover node_modules, .env, .next, /uploads, prisma/migrations/dev
- [x] Environment variables: `.env.example` (commit) + `.env` (gitignore)
- [x] Lock files: `package-lock.json` PHẢI commit

**Nguyên tắc:**
- AI KHÔNG được cài package global (`npm install -g`)
- Mọi dependency phải nằm trong container
- Clone → `docker compose up --build` → chạy. Không cần setup manual.
