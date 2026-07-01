# Audit Log

> Nhật ký ghi lại toàn bộ quá trình làm việc với AI.
> Mục đích: tracking quyết định, tránh lặp lỗi, giữ context giữa các session.
> Xem các nhật ký cũ hơn (Session 1 - 19) tại: [Nhật ký lưu trữ](file:///d:/Project/lumi-project/docs/audit-log-archive.md)

---

## 2026-07-01 — Session 20: T29 — Xử lý edge cases và bảo mật dữ liệu

### Yêu cầu
- Rà soát bảo mật, tối ưu hóa validation và giải quyết lỗi tranh chấp dữ liệu (concurrency protection) tầng API cho phân hệ Chấm điểm (Scoring) và Quản lý NPP.

### Công việc đã làm
- Thay thế `update` bằng `updateMany` ở các API của `ScoreTemplate` (PUT template, publish, archive) để kiểm soát điều kiện trạng thái template (`DRAFT`/`PUBLISHED`) một cách nguyên tử (atomic), chống race condition.
- Bọc các thao tác chỉnh sửa tiêu chí (`ScoreCriteria`) bao gồm POST, PUT và DELETE vào Prisma `$transaction`, đồng thời kiểm tra lại trạng thái của template sở hữu xem có ở trạng thái `DRAFT` không để bảo toàn khóa dữ liệu.
- Sửa đổi API ghi đè điểm (`PUT /api/scores/[id]/override`) để xác thực NPP liên kết xem có bị soft-delete hay không. Nếu có, trả về 404 (Not Found).
- API override giờ tự động tính lại hạng đánh giá (`grade`) mới dựa trên điểm số đã thay đổi và lưu vào DB thay vì giữ hạng cũ.
- Tự động trim khoảng trắng và chuyển đổi tham số truy vấn trống thành `undefined` trong API check-duplicate để tránh thực hiện query DB vô nghĩa.
- Viết unit tests mới trong `concurrency.test.ts` để kiểm tra validation thứ tự ngưỡng điểm (`gradeAMin` và `gradeBMin`).
- Sửa lỗi trải nghiệm (UX) trên giao diện cấu hình chấm điểm: Thêm banner thông báo màu đỏ nổi bật khi mẫu nháp chưa có tiêu chí nào, bổ sung tooltip (`title`) giải thích lý do nút **Ban hành** bị khóa, và cập nhật CSS `.primaryButton:disabled` đổi con trỏ thành `not-allowed` để tránh gây cảm giác hệ thống bị đơ (lag).
- Chạy TypeScript compiler `tsc --noEmit` và test suite thành công 100%.

### Quyết định quan trọng
- **Bảo vệ trạng thái template bằng updateMany**: Vì Prisma không cho phép lọc các trường không unique trong mệnh đề `where` của hàm `update`, ta sử dụng `updateMany` với điều kiện lọc `{ id, status }`. Việc này bảo đảm DB-level locking và nguyên tử hóa, ngăn chặn việc cập nhật/ban hành/lưu trữ đồng thời bị xung đột trạng thái.
- **Rà soát soft-delete NPP khi override**: Ngăn chặn tình trạng Admin sửa đổi và lưu trữ điểm cho NPP đã bị xóa tạm bằng cách kiểm tra liên kết `company.deletedAt`.
- **Tích hợp tính lại grade khi override**: Đảm bảo trường `grade` lưu trong database luôn đồng bộ với điểm tổng mới sau khi Admin điều chỉnh, khắc phục triệt để lỗi không nhất quán dữ liệu.
- **Cải thiện phản hồi trực quan trên UI**: Thay vì ẩn nút hoặc khóa nút một cách im lặng, việc thêm cảnh báo trực quan bằng banner đỏ cảnh báo điều kiện và chỉ dẫn cụ thể (thêm tối thiểu 1 tiêu chí) giúp người dùng dễ dàng định hướng thao tác mà không cảm thấy ứng dụng bị đơ hay lag.

### Kết quả
- T29 hoàn thành ✅
- Trải nghiệm người dùng được cải thiện trực quan trên UI.
- Toàn bộ test suite: 70/70 pass.
- TypeScript biên dịch không có lỗi.

### Tasks liên quan
- T29 ✅

---

## 2026-07-01 — Session 21: T30 — Audit log Tab Lịch sử per NPP

### Yêu cầu
- Tích hợp tab Lịch sử chi tiết cho từng Nhà phân phối (NPP) trên giao diện chi tiết, kết nối qua endpoint API bảo mật, hỗ trợ định dạng trực quan cho các sự kiện Chấm điểm (SCORE) và Điều chỉnh điểm (OVERRIDE).

### Công việc đã làm
- Khôi phục và cập nhật cấu trúc khóa cache TanStack Query `scoreResults` và thêm khóa `auditLogs` vào [query-keys.ts](file:///d:/Project/lumi-project/app/src/lib/query-keys.ts).
- Tạo endpoint API `GET /api/companies/[id]/audit-logs` kiểm soát phân quyền (Admin xem được tất cả, ASM chỉ xem được NPP được phân công, nếu không trả về 404).
- Tạo utility [audit-logs.ts](file:///d:/Project/lumi-project/app/src/lib/audit-logs.ts) để dịch các chuỗi JSON thô của thay đổi trong database sang câu văn tiếng Việt thân thiện, rõ nghĩa.
- Tạo React Component [AuditLogsTab.tsx](file:///d:/Project/lumi-project/app/src/components/companies/AuditLogsTab.tsx) và CSS Module [AuditLogsTab.module.css](file:///d:/Project/lumi-project/app/src/components/companies/AuditLogsTab.module.css) hiển thị lịch sử dạng Dòng thời gian (Timeline).
- Tích hợp tab Lịch sử thay thế Placeholder vào trang chi tiết NPP [page.tsx](file:///d:/Project/lumi-project/app/src/app/companies/[id]/page.tsx).
- Viết unit test tự động cho utility định dạng thay đổi tại [audit-logs.test.ts](file:///d:/Project/lumi-project/app/src/lib/audit-logs.test.ts) (4 test cases).
- Chạy toàn bộ test suite thành công (74/74 tests pass) và biên dịch TypeScript thành công không có lỗi.

### Quyết định quan trọng
- **Bảo mật bằng cách trả 404 cho yêu cầu không có quyền**: Tại API Endpoint, nếu ASM cố truy cập log của NPP khác, hệ thống sẽ trả về `404 Not Found` thay vì `403 Forbidden` để tránh để lộ sự tồn tại của NPP đó trên hệ thống theo nguyên tắc bảo mật.
- **Biên dịch chuỗi JSON thô sang ngôn ngữ tự nhiên**: Định nghĩa cấu trúc thay đổi cho hai loại log quan trọng nhất là `SCORE` và `OVERRIDE` để hiển thị tiếng Việt dễ đọc (chỉ rõ phiên bản mẫu, điểm cũ → mới, hạng cũ → mới, lý do ghi đè...).

### Kết quả
- T30 hoàn thành ✅
- 74/74 tests pass.
- TypeScript tsc biên dịch thành công.

### Tasks liên quan
- T30 ✅

---

## 2026-07-01 — Session 22: Thống nhất nghiệp vụ & Thêm T34 vào Plan

### Yêu cầu
- Brainstorm làm rõ luồng nghiệp vụ của phân hệ Nhiệm vụ (Task), vai trò của NPP (Nhà phân phối) và các tác nhân hệ thống.
- Thống nhất bổ sung trang Quản lý Nhiệm vụ Tập trung (`/tasks`) để sửa lỗi 404 trên Sidebar.

### Công việc đã làm
- Làm rõ luồng nghiệp vụ: NPP là khách hàng B2B (Company), ASM/Admin là người dùng hệ thống. Task là đầu việc nội bộ của ASM cần làm đối với NPP.
- Cập nhật [docs/plan.md](file:///d:/Project/lumi-project/docs/plan.md): Thêm task `T34: Trang Quản lý Nhiệm vụ Tập trung (/tasks)` vào Phase 6 làm Todo.

### Kết quả
- T34 hoàn thành ✅ (Trang `/tasks` hoạt động tốt, đã tích hợp TanStack Query và queryKeys conventions, chạy qua 78/78 tests).

### Tasks liên quan
- T34 ✅

---

## 2026-07-01 — Session 23: Brainstorm & Lên kế hoạch Theme Light/Dark Mode (T35)

### Yêu cầu
- Người dùng phát hiện lỗi trải nghiệm: Nút chọn theme của Next.js/TanStack DevTools ở góc dưới bên trái (gần thông tin user) chỉ thay đổi màu của DevTools chứ không đổi màu ứng dụng.
- Yêu cầu lên kế hoạch (plan) để thực sự đổi màu giao diện Sáng/Tối (Light/Dark Mode) toàn diện cho CRM.

### Công việc đã làm
- Làm rõ nguyên nhân: Hộp thoại "Preferences" chọn theme trong screenshot thực chất là cài đặt DevTools của hệ thống, không phải cấu hình theme của CRM.
- Phân tích kiến trúc: Sử dụng biến CSS (CSS Custom Properties) để chuyển đổi giao diện động, tích hợp script chống nhấp nháy (anti-FOUC) vào Root Layout.
- Cập nhật [docs/plan.md](file:///d:/Project/lumi-project/docs/plan.md): Thêm task `T35: Hệ thống Theme Light/Dark Mode toàn diện` làm Todo.
- Tạo [implementation_plan.md](file:///C:/Users/Admin/.gemini/antigravity/brain/a4c34031-deef-4fea-8197-fc51aefea33c/implementation_plan.md) chi tiết cho T35.

### Kết quả
- Đề xuất kế hoạch T35 và gửi yêu cầu phê duyệt từ người dùng.

### Tasks liên quan
- T35 (Đã thêm vào plan)
