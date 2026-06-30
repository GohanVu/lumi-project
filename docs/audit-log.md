# Audit Log

> Nhật ký làm việc với AI — chỉ giữ các session gần nhất (rolling window).
> Mục đích: tham khảo quyết định gần đây, tránh lặp lỗi.
> **Đây là log tham khảo, KHÔNG phải nguồn chân lý về trạng thái.** Nguồn chân lý về
> trạng thái task = `docs/plan.md` + `git` + source + quality gates.
>
> **Archive:** session cũ (1–12) ở `docs/audit-archive/2026-Q2.md` — chỉ mở khi cần truy nguyên quyết định cũ.
> Khi file này vượt ~6 session, chuyển các session cũ nhất sang file archive của quý hiện tại.

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

## 2026-06-30 — Session 18: T23 So sánh các lần chấm điểm

### Yêu cầu
- Làm task tiếp theo sau T22 → T23 (lịch sử chấm điểm, so sánh các lần chấm)

### Công việc đã làm
- Khảo sát code scoring hiện có qua codebase graph: phần "lịch sử các lần chấm" đã có sẵn trong `ScoresTab` từ T21; T23 chỉ còn thiếu phần **so sánh**
- Xác nhận `GET /api/companies/[id]/scores` đã trả đủ details + criteria cho mọi lần chấm → so sánh hoàn toàn client-side, KHÔNG đụng API/schema
- `ScoresTab.tsx`: thêm chế độ so sánh (compare mode) — nút "So sánh" (chỉ hiện khi ≥2 lần chấm), chọn tối đa 2 lần chấm trong danh sách, badge số thứ tự
- Thêm component thuần `ScoreComparePanel` + helper `buildCriteriaMap`/`formatDelta`: bảng so sánh điểm tổng, độ hoàn thiện, và từng tiêu chí (union criteria của cả 2 phiên bản template), hiển thị delta tăng/giảm theo màu
- `ScoresTab.module.css`: thêm style compare (toggle, badge, summary 3 cột, bảng so sánh, delta up/down/flat) dùng đúng token có sẵn trong globals
- Verify thủ công 9 CSS token tồn tại trong globals.css trước khi chạy gates (theo bài học Issue Session 9 — gates không bắt CSS token sai)

### Quyết định quan trọng
- **So sánh thuần client-side**: GET đã trả đủ dữ liệu; không thêm endpoint/migration — đúng tinh thần Surgical Changes + MVP
- **Sắp xếp 2 lần chấm cũ → mới ("Trước"/"Sau")**: delta = Sau − Trước, đọc thay đổi theo thời gian tự nhiên
- **Union tiêu chí theo id**: hai lần chấm có thể dùng template version khác nhau; tiêu chí chỉ có ở một bên hiển thị "—", delta chỉ tính khi cả hai có điểm
- **Không thêm test**: T23 read-only, logic hiển thị trong component — nhất quán tiền lệ T14/T17 (read-only không thêm unit test)

### Kết quả
- T23 hoàn thành ✅
- TypeScript: pass (sau khi dọn artifact `.next/dev/types` bị dev-server ghi hỏng — không liên quan code T23)
- ESLint: 0 errors, còn 1 warning React Hook Form/React Compiler đã biết tại companies/new
- Test suite: 39/39 pass
- Lưu ý: chưa smoke test trên browser (cần seed ≥2 lần chấm cho 1 NPP); không có thay đổi API/layout/auth nên rủi ro thấp

### Tasks liên quan
- T23 ✅. Tiếp theo: T24 — phân loại A/B/C theo ngưỡng Admin cấu hình

---

## 2026-06-30 — Session 19: Phân tích tối ưu codebase + lập Phase 7

### Yêu cầu
- Đánh giá dự án đã tối ưu code chưa; ghi các phần tối ưu vào plan để làm sau cùng
- (Mobile display tách riêng — cần brainstorm thêm, chưa chốt task)

### Công việc đã làm
- Re-index repo, truy vấn metric qua codebase graph: complexity, loop_depth, transitive_loop_depth, linear_scan_in_loop, alloc_in_loop, param_count cho toàn bộ ~140 hàm
- Kiểm tra tầng DB: index trong schema, dùng Promise.all, dấu hiệu N+1 (await-in-loop / map(async))
- Thêm Phase 7 (Tối ưu — làm sau cùng) vào plan: T34 (DB index), T35 (refactor component phức tạp), T36 (đo bundle/re-render/query plan)

### Kết quả phân tích
- **Thuật toán/JS: sạch** — không vòng lặp lồng nhau, không O(n²), không linear-scan-in-loop, param ≤3, không phát hiện N+1, có Promise.all. JS không phải bottleneck (app CRUD)
- **Complexity smell (maintainability, không phải perf)**: TasksTab cog 14, TemplateDetailPanel 13, POST companies / POST scores 13, ScoresTab 10, PUT companies 12
- **Gap thật = DB index**: schema chỉ có 3 @unique (email, token, taxCode); thiếu index trên FK companyId và các cột filter/sort nóng (assignedToId, status, dueDate, createdAt...). Postgres không tự index FK → T34
- **Giới hạn**: graph chỉ thấy cấu trúc tĩnh — không đo được bundle size, React re-render, query plan thực tế → gom vào T36

### Quyết định quan trọng
- Tối ưu xếp Phase 7, KHÔNG chặn deploy (P6); ưu tiên cao nhất là T34 (DB index — giá trị cao, 1 migration)
- Mobile/responsive là mảng lớn → brainstorm riêng trước khi thành task, chưa đưa vào plan

### Tasks liên quan
- Thêm T34, T35, T36 (Phase 7). Mobile: chờ brainstorm

---

<!-- Thêm session mới ở đây -->
