# Project Conventions & Patterns

## Mục đích
File này định hướng AI hiểu các quy ước riêng của project. Khi implement bất kỳ tính năng nào, AI PHẢI tuân theo các pattern đã được thiết lập ở đây.

> **NOTE:** File này được fill sau brainstorm session 1 (2026-06-27).

## Nguyên tắc chung

1. **Reuse trước, tạo mới sau**: Trước khi tạo bất kỳ service/utility/pattern nào mới, PHẢI kiểm tra xem project đã có pattern tương tự chưa. Nếu có → reuse.
2. **Đọc context trước khi code**: Luôn đọc plan, brainstorm, issues và audit log gần nhất trước khi bắt đầu implement.
3. **Ghi lại quyết định**: Mọi quyết định kỹ thuật quan trọng phải được ghi vào audit log.
4. **BẮT BUỘC đọc mỗi session**: plan.md, brainstorm.md, issues.md (đọc đủ), và audit-log.md (chỉ phần session gần nhất còn trong file — KHÔNG cần đọc archive trừ khi cần truy nguyên quyết định cũ).

## Surgical Changes — chỉ sửa cái tối thiểu

Khi implement hoặc fix, giới hạn thay đổi đúng phạm vi task yêu cầu:

- **Chỉ động vào code cần cho task.** KHÔNG refactor, đổi format, đổi tên, hay "cải thiện" code lân cận đang chạy tốt — kể cả khi thấy nó chưa đẹp. Muốn dọn → ghi vào `issues.md` hoặc đề xuất riêng, không gộp vào diff hiện tại.
- **Match pattern hiện có.** Code mới đọc phải giống code xung quanh (naming, cấu trúc, style); không áp phong cách riêng.
- **Chỉ xóa thứ chính bạn làm thừa.** Xóa import/biến mà sửa đổi của BẠN làm orphan; dead code có sẵn từ trước để yên trừ khi task yêu cầu dọn.
- **Sửa lại file thay vì viết đè toàn bộ.** Ưu tiên edit phần cần đổi; KHÔNG recreate cả file khi chỉ cần sửa vài dòng (tránh lặp lại kiểu rewrite nguyên file CSS chỉ vì sai vài token).
- **Diff nhỏ là mục tiêu.** Diff càng tập trung càng dễ review và càng ít rủi ro regression.

## Anti-over-engineering — đủ dùng, không thừa

- **Code tối thiểu giải đúng bài toán.** KHÔNG thêm tính năng không được yêu cầu, không "phòng xa" cho trường hợp chưa tồn tại.
- **Không abstraction cho thứ dùng 1 lần.** Chỉ tách helper/lớp/generic khi đã có ≥2 chỗ dùng thật hoặc yêu cầu rõ ràng. Đây là dự án MVP — ưu tiên đơn giản hơn linh hoạt.
- **Không xử lý lỗi cho edge case không xảy ra.** Validate input ở boundary (đã có Zod) là đủ; đừng bọc try/catch phòng thủ tràn lan.
- **Tự kiểm tra trước khi đánh dấu Done:** "Một senior engineer có thấy cách này bị over-engineer không?" Nếu nghi ngờ phức tạp thừa → hỏi trước khi code, đừng tự quyết thầm.

## Tham chiếu bắt buộc

Khi bắt đầu một session mới hoặc implement task mới, AI PHẢI đọc:
- `docs/plan.md` — Plan, roadmap, phases, tasks (**nguồn chân lý trạng thái** cùng với git + source + quality gates)
- `docs/brainstorm.md` — Kết quả brainstorm ban đầu
- `docs/issues.md` — Bugs đã phát hiện
- `docs/audit-log.md` — Log tham khảo các session gần nhất (rolling window; session cũ ở `docs/audit-archive/`). KHÔNG dùng làm bằng chứng trạng thái.
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

## TanStack Query Cache Consistency

- **BẮT BUỘC dùng query-key factory tập trung** tại `src/lib/query-keys.ts`. Không viết raw query-key array trực tiếp trong component hoặc mutation (`["resource", id]`).
- Mỗi mutation `POST` / `PUT` / `PATCH` / `DELETE` phải xác định trước các cache bị ảnh hưởng:
  - Create: invalidate collection/list liên quan.
  - Update: invalidate detail và mọi list/aggregate đang hiển thị field đó.
  - Delete: invalidate list/aggregate và remove hoặc invalidate detail.
  - Nested resource: invalidate resource con và parent nếu parent có count/summary.
- Nếu mutation thành công rồi redirect, **phải `await` cache invalidation trước khi gọi `router.push` / `router.replace`**.
- `router.push`, `router.replace` và `router.refresh` **không thay thế** TanStack Query invalidation.
- Bug hoặc feature có mutation phải có regression test cho cache contract. Luồng xuyên trang quan trọng phải có E2E test khi project đã có browser test runner.
- Khi review mutation, trả lời đủ 3 câu trước khi đánh dấu Done:
  1. Dữ liệu server nào vừa thay đổi?
  2. Query keys nào đang hiển thị hoặc tổng hợp dữ liệu đó?
  3. Test nào chứng minh UI không tái sử dụng cache cũ?

## Next.js SSR / Hydration Conventions

- **BẮT BUỘC: `isMounted` guard cho `"use client"` component render có điều kiện dựa trên async state** (auth session, data fetch...).
  - Lý do: Next.js App Router vẫn SSR `"use client"` components. Nếu server render khác client render ban đầu → hydration crash.
  - ⚠️ Dự án bật **React Compiler** → KHÔNG được gọi `setState` trong `useEffect` (lỗi lint `react-hooks/set-state-in-effect`). Vì vậy pattern `useState`+`useEffect(setIsMounted(true))` **KHÔNG dùng được**.
  - Pattern chuẩn (dùng `useSyncExternalStore`):
    ```tsx
    const isMounted = useSyncExternalStore(
      () => () => {},   // subscribe (no-op)
      () => true,        // client snapshot
      () => false        // server snapshot
    );
    if (!isMounted || isPending || !data) return <LoadingState />;
    ```
  - Server render: snapshot = `false` → render loading
  - Client initial: snapshot = `false` → render loading (khớp server ✅), sau hydrate → `true`
- **KHÔNG gọi `setState` trực tiếp trong `useEffect`** (React Compiler chặn). Nếu cần "auto-select / giá trị phụ thuộc state khác" → dùng **giá trị dẫn xuất** khi render (vd `const effectiveId = selectedId ?? items[0]?.id ?? null`) thay vì set state trong effect.
- **KHÔNG dùng `typeof window !== 'undefined'`** để phân biệt server/client — dễ sai, dùng `isMounted` thay thế
- **KHÔNG render giá trị dynamic** (Date.now(), Math.random(), session user) trực tiếp trong JSX khi component được SSR'd — đảm bảo server/client output giống nhau

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
- **SAU KHI `npm install` package mới → BẮT BUỘC chạy `docker compose up --build -d`** để container cập nhật. KHÔNG được chỉ verify trên host rồi bỏ qua.
- **KHÔNG được "tự hiểu rồi tự làm"** — luôn follow đúng quy trình, kiểm tra từng bước. Nếu rule nói "chạy trong container" thì phải verify TRONG container, không phải trên host.
