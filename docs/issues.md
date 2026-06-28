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

<!-- Thêm issues ở đây -->
