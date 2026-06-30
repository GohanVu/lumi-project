# Audit Log

> Nhật ký làm việc với AI — chỉ giữ các session gần nhất (rolling window).
> Mục đích: tham khảo quyết định gần đây, tránh lặp lỗi.
> **Đây là log tham khảo, KHÔNG phải nguồn chân lý về trạng thái.** Nguồn chân lý về
> trạng thái task = `docs/plan.md` + `git` + source + quality gates.
>
> **Archive:** session cũ (1–12) ở `docs/audit-archive/2026-Q2.md` — chỉ mở khi cần truy nguyên quyết định cũ.
> Khi file này vượt ~6 session, chuyển các session cũ nhất sang file archive của quý hiện tại.

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

<!-- Thêm session mới ở đây -->
