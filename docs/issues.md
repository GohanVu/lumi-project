# Issues & Bug Tracking

> Ghi lại bugs, root cause analysis, và bài học rút ra.
> Khi AI fix bug → PHẢI ghi vào đây + viết test đi kèm.

---

## Format

```markdown
### [Issue-XXX] Tiêu đề ngắn

- **Status**: 🔴 Open / 🟡 In Progress / 🟢 Fixed
- **Severity**: Critical / High / Medium / Low
- **Phát hiện**: [Ngày] — [Ai phát hiện, trong context nào]
- **Root cause**: [Nguyên nhân gốc]
- **Fix**: [Mô tả cách fix]
- **Test added**: [File test và test name]
- **Lesson learned**: [Bài học rút ra để tránh lặp]
```

---

### [Issue-001] Prisma v7 setup mất nhiều vòng trial-and-error

- **Status**: 🟢 Fixed
- **Severity**: Low (không ảnh hưởng code quality, chỉ mất thời gian)
- **Phát hiện**: 2026-06-28 — AI trong quá trình implement T3
- **Root cause**: Prisma v7 (release cuối 2025) thay đổi hoàn toàn architecture — loại bỏ Rust engine, bắt buộc dùng driver adapter (`@prisma/adapter-pg` + `pg`). AI code theo pattern Prisma v5/v6 cũ → lỗi liên tiếp.
- **Fix**: Install `@prisma/adapter-pg` + `pg`, khởi tạo `new PrismaClient({ adapter })` thay vì `new PrismaClient()`
- **Test added**: Chưa (infrastructure setup, không có unit test)
- **Lesson learned**: Khi dùng package version mới (major version bump), **PHẢI search docs/changelog TRƯỚC khi code**. Không assume API giống version cũ.

### [Issue-002] Docker npm ci fail do lockfile version mismatch

- **Status**: 🟢 Fixed
- **Severity**: Low
- **Phát hiện**: 2026-06-28 — AI khi build Docker image
- **Root cause**: `package-lock.json` tạo bằng Node 25 (npm 11, lockfile v3) nhưng Docker image `node:22-alpine` có npm 10 → `npm ci` reject lockfile.
- **Fix**: Dùng `npm install` trong Dockerfile thay vì `npm ci`. Chấp nhận trade-off nhỏ (không 100% reproducible) cho dev stage.
- **Test added**: N/A
- **Lesson learned**: Kiểm tra Node version trên máy host vs Docker image TRƯỚC khi viết Dockerfile. Nếu khác major version → dùng cùng Node version hoặc regenerate lockfile trong container.

---

## Lessons Learned (tổng hợp)

> Rút ra từ issues, áp dụng cho tất cả sessions sau.

1. **Package mới → Docs first, code later**: Khi dùng major version mới của bất kỳ package nào, search official docs / changelog TRƯỚC. Không assume API giữ nguyên.
2. **Environment parity**: Đảm bảo Node/npm version giữa máy dev và Docker image khớp nhau, hoặc ít nhất compatible.
3. **Check port trước khi chạy**: Trước `docker compose up`, verify port availability (`lsof -i :3000`).
4. **Fail fast, search early**: Nếu lỗi lần 1 không rõ nguyên nhân → search docs ngay, không thử thêm lần 2-3 mò mẫm.
5. **npm install → PHẢI rebuild container**: Khi install package mới, PHẢI chạy `docker compose up --build -d` ngay. KHÔNG chỉ verify trên host (host có packages ≠ container có packages). Tuyệt đối không được "tự hiểu rồi bỏ qua bước" — follow quy trình từng bước.

### [Issue-003] Container thiếu packages mới sau npm install trên host

- **Status**: 🟢 Fixed
- **Severity**: Medium (app crash, user thấy lỗi trên browser)
- **Phát hiện**: 2026-06-28 — User báo lỗi "Can't resolve @tanstack/react-query" trên localhost:3001
- **Root cause**: AI chạy `npm install` trên host → packages có trên host nhưng container vẫn dùng node_modules cũ (chưa rebuild). AI verify bằng `tsc --noEmit` trên host → pass → tưởng OK. Nhưng app chạy trong Docker → container chưa có packages mới.
- **Fix**: Chạy `docker compose up --build -d` sau khi install packages.
- **Test added**: N/A (quy trình, không phải code bug)
- **Lesson learned**: **KHÔNG được tự hiểu rồi tự bỏ qua bước.** Rule nói "mọi dependency phải nằm trong container" → sau npm install BẮT BUỘC rebuild container. Verify trên host ≠ verify trong container. Luôn follow quy trình từng bước, không assume.

### [Issue-004] Plan, audit log và source code lệch trạng thái

- **Status**: 🟢 Fixed
- **Severity**: Medium
- **Phát hiện**: 2026-06-28 — Khi review tiến độ trước T12
- **Root cause**: Task được cập nhật rời rạc, không có checkpoint bắt buộc đối chiếu plan/audit/git/source/quality gates. T11 được đánh dấu Done thiếu audit; T12 có code nhưng plan còn Todo; T13 đã implement nhưng chưa đóng task.
- **Fix**: Thêm `State Consistency Gate` vào `.kiro/steering/workflow-guide.md`; bắt buộc In Progress trước khi code, chỉ Done sau quality gates, audit và plan cập nhật cùng session.
- **Test added**: N/A — process rule; được kiểm tra bằng checklist và `git status` cuối session
- **Lesson learned**: Trạng thái task phải dựa trên bằng chứng từ source và quality gates, không dựa riêng vào plan hoặc audit log.

### [Issue-005] Contact form không qua TypeScript do Zod default làm lệch input/output type

- **Status**: 🟢 Fixed
- **Severity**: Medium
- **Phát hiện**: 2026-06-28 — Chạy quality gates cho T12
- **Root cause**: `z.boolean().default(false)` khiến input type của `isPrimary` là optional, trong khi React Hook Form khai báo field này required theo output type.
- **Fix**: Tách schema form có `isPrimary` required và schema API có default; dùng schema Contact chung cho UI/API và khai báo đúng input/output generic của React Hook Form.
- **Test added**: `src/lib/validation/contact.test.ts` — 4 tests cho required/default, influence enum và trim input
- **Lesson learned**: Với Zod transform/default và React Hook Form, phải phân biệt `z.input` và `z.output`; schema dùng chung cần thể hiện rõ contract từng boundary.

### [Issue-006] ASM phụ trách bị rỗng khi user thường tạo NPP

- **Status**: 🟢 Fixed
- **Severity**: High (chặn luồng tạo NPP chính)
- **Phát hiện**: 2026-06-28 — User báo lỗi tại `/companies/new`
- **Root cause**: Có hai lớp lỗi: (1) auth client hardcode `localhost:3000` trong khi app chạy tại `localhost:3001`, nên session rỗng và API trả 401; (2) form khởi tạo `defaultValues.assignedToId` trước khi session tải xong và React Hook Form không tự đồng bộ lại.
- **Fix**: Dùng auth client same-origin, cấu hình Better Auth URL đúng port, thêm login/guard; đồng bộ assignee bằng `setValue` khi session sẵn sàng. User thường hiển thị field tự gán, Admin mới tải dropdown users. API luôn cưỡng chế user thường tự gán và validate assignee active.
- **Test added**: `src/lib/company-assignment.test.ts` — 4 tests cho user tự gán, chống giả mạo, Admin chọn và Admin thiếu assignee
- **Lesson learned**: Auth client trên web nhiều port phải dùng same-origin hoặc URL public đúng; không dùng session bất đồng bộ trực tiếp làm `defaultValues`; quyền sở hữu quan trọng phải được server quyết định lại.

### [Issue-007] npm test bỏ sót test do shell mở rộng glob

- **Status**: 🟢 Fixed
- **Severity**: Medium (quality gate có thể xanh giả)
- **Phát hiện**: 2026-06-28 — Sau khi thêm test Issue-006, `npm test` chỉ chạy 4 test mới thay vì toàn bộ suite
- **Root cause**: Glob `src/**/*.test.ts` không được quote. Khi có test khớp ở `src/lib`, shell mở rộng pattern sớm và `tsx` không còn nhận glob để tìm recursive.
- **Fix**: Quote glob trong test script: `tsx --test \"src/**/*.test.ts\"`.
- **Test added**: N/A — xác minh bằng chính `npm test` trong image mới: discover đủ 3 test files, 12/12 tests pass
- **Lesson learned**: Glob recursive trong npm scripts phải được quote để test runner, không phải shell, chịu trách nhiệm discovery.

### [Issue-008] Hydration mismatch — AppLayout render khác nhau giữa server và client

- **Status**: 🟢 Fixed
- **Severity**: High (app crash ngay khi load, toàn bộ user thấy lỗi)
- **Phát hiện**: 2026-06-28 — Hydration error tại `/dashboard`, trỏ về AppLayout.tsx line 49
- **Root cause**: Trong Session 7, thêm `if (isPending || !sessionData) return <loading>` vào AppLayout. Better Auth đọc cookie trong SSR → server render full layout. Client khởi tạo với `isPending: true` → render loading state. Server vs client khác nhau → React hydration crash.
- **Fix**: Thêm `isMounted` guard. Lúc đầu thử `useState(false)` + `useEffect(() => setIsMounted(true))` nhưng **fail lint React Compiler** (`react-hooks/set-state-in-effect`). Giải pháp cuối: `const isMounted = useSyncExternalStore(() => () => {}, () => true, () => false)`. Guard condition là `!isMounted || isPending || !sessionData`. Server và client initial đều render loading → match. Sau hydrate mới check session thật.
- **Test added**: N/A — hydration error là runtime browser error, không test được bằng unit test hiện tại. Phát hiện bằng tay khi mở app.
- **Lesson learned**: `"use client"` component trong Next.js App Router vẫn được SSR. Mọi component render có điều kiện dựa trên async state (auth, data) **BẮT BUỘC** dùng `isMounted` guard — và vì dự án bật **React Compiler**, KHÔNG được `setState` trong effect, phải dùng `useSyncExternalStore`. Đã cập nhật rule trong `project-conventions.md`. Quality gates (lint + tsc + unit test) không phát hiện được loại bug này — cần smoke test thủ công sau mỗi session chạm vào layout/auth.

### [Issue-009] Danh sách NPP không hiện bản ghi vừa tạo cho đến khi F5

- **Status**: 🟢 Fixed
- **Severity**: High (dữ liệu đã tạo thành công nhưng UI hiển thị trạng thái cũ)
- **Phát hiện**: 2026-06-28 — User báo sau khi tạo NPP và được chuyển về `/companies`, bản ghi mới chỉ xuất hiện sau khi F5
- **Root cause**: Mutation tạo NPP chỉ gọi `router.push("/companies")`. Query danh sách có `staleTime` 60 giây và dùng key `['companies', filters]`, nên khi quay lại trang danh sách TanStack Query tái sử dụng cache cũ thay vì fetch dữ liệu mới.
- **Fix**: Chuẩn hóa toàn bộ query key tại `query-keys.ts`; sau POST thành công, invalidate collection NPP và chờ hoàn tất trước khi điều hướng. Bổ sung Cache Consistency Gate vào conventions/workflow.
- **Test added**: `src/lib/company-queries.test.ts` xác minh cache list mặc định và có filter/phân trang đều stale nhưng detail không bị ảnh hưởng; `src/lib/query-key-conventions.test.ts` fail nếu application code khai báo raw query key ngoài factory.
- **Lesson learned**: Mọi mutation làm thay đổi collection phải invalidate query prefix trước khi điều hướng; `router.push`/`router.refresh` không thay thế việc đồng bộ TanStack Query cache. Quy tắc quan trọng nên có automated guard, không chỉ dựa vào checklist thủ công.

<!-- Thêm issues ở đây -->
