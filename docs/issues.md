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

<!-- Thêm issues ở đây -->
