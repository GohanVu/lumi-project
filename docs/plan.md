# Project Plan & Roadmap

> CRM Quản lý NPP LUMI — Web nội bộ cho ASM LUMI
> AI PHẢI đọc file này trước khi implement bất kỳ task nào.
> Cập nhật trạng thái task sau mỗi session.

## Overview

- **Project**: CRM Quản lý Nhà Phân Phối LUMI
- **Goal**: Web nội bộ giúp ASM quản lý toàn bộ thông tin NPP, người liên hệ, tương tác, chấm điểm
- **Tech Stack**: Next.js 15 + TypeScript + PostgreSQL + Prisma + Better Auth + Vanilla CSS
- **Timeline**: 2 tuần MVP
- **Deploy**: Docker Compose + Nginx trên VPS (LANIT Vietnam)

---

## Phases

### Phase 1 (P1) — Setup & Foundation

> Mục tiêu: Khởi tạo project, môi trường, database schema, auth cơ bản

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| T1 | Init Next.js 15 + TypeScript project | ⬜ Todo | — | npx create-next-app |
| T2 | Setup Docker Compose (Next.js + PostgreSQL + Nginx) | ⬜ Todo | T1 | Portability: clone → docker compose up |
| T3 | Setup Prisma + kết nối PostgreSQL | ⬜ Todo | T2 | |
| T4 | Thiết kế & migrate Database Schema đầy đủ | ⬜ Todo | T3 | Tất cả entities từ brainstorm |
| T5 | Setup Better Auth (email/password, role admin/user) | ⬜ Todo | T4 | |
| T6 | Setup CSS Design System (Vanilla CSS variables, layout) | ⬜ Todo | T1 | Colors, typography, spacing tokens |
| T7 | Layout chính: Sidebar + Header + Main area | ⬜ Todo | T5, T6 | |
| T8 | Seed data: tạo user admin mặc định | ⬜ Todo | T5 | |

### Phase 2 (P2) — Core CRUD: NPP & Contacts

> Mục tiêu: Module trung tâm — quản lý hồ sơ NPP và người liên hệ

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| T9 | Trang danh sách NPP (bảng, lọc cơ bản, phân quyền) | ⬜ Todo | P1 | Admin thấy tất cả, User thấy của mình |
| T10 | Form thêm NPP — cảnh báo trùng SĐT/MST | ⬜ Todo | T9 | |
| T11 | Trang hồ sơ NPP — layout tab (Tổng quan, Contact, Timeline, Task, Score, File, Log) | ⬜ Todo | T10 | |
| T12 | Tab Người liên hệ — CRUD contact, đánh dấu contact chính | ⬜ Todo | T11 | |
| T13 | Tìm kiếm NPP (tên, MST, SĐT) | ⬜ Todo | T9 | |

### Phase 3 (P3) — Tương tác & Nhiệm vụ

> Mục tiêu: Nhật ký tương tác, follow-up, task management

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| T14 | Tab Timeline — log tương tác theo thời gian | ⬜ Todo | P2 | |
| T15 | Form thêm tương tác — chọn loại, ghi nội dung, kết quả | ⬜ Todo | T14 | |
| T16 | Tab Nhiệm vụ — CRUD task, deadline, trạng thái | ⬜ Todo | T14 | |
| T17 | Dashboard — task quá hạn, follow-up hôm nay | ⬜ Todo | T16 | |

### Phase 4 (P4) — Chấm điểm NPP (Full Spec)

> Mục tiêu: Module scoring linh hoạt với versioning, ghi đè, lịch sử

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| T18 | Admin: CRUD ScoreTemplate + ScoreCriteria | ⬜ Todo | P2 | Thêm/sửa/ẩn tiêu chí, trọng số |
| T19 | Logic tính điểm — công thức chuẩn hóa 0-100 | ⬜ Todo | T18 | Theo đặc tả section 7.5 |
| T20 | Versioning template — Ban hành, Nhân bản, Ngừng | ⬜ Todo | T18 | Khóa config khi ban hành |
| T21 | Tab Chấm điểm — chấm thủ công, tự động, xem chi tiết | ⬜ Todo | T19, T20 | |
| T22 | Ghi đè điểm — audit log, bắt buộc nhập lý do | ⬜ Todo | T21 | |
| T23 | Lịch sử chấm điểm — so sánh các lần chấm | ⬜ Todo | T21 | |
| T24 | Phân loại A/B/C — ngưỡng Admin tự cấu hình | ⬜ Todo | T19 | |

### Phase 5 (P5) — File & Dashboard

> Mục tiêu: Upload file, dashboard tổng quan

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| T25 | Upload file đính kèm per NPP (ảnh, PDF, doc) | ⬜ Todo | P2 | Lưu local /uploads, Nginx serve |
| T26 | Tab Tệp — xem, tải, xóa file | ⬜ Todo | T25 | |
| T27 | Dashboard chính — KPI: tổng NPP, theo trạng thái, score | ⬜ Todo | P3, P4 | Phân theo role |
| T28 | Admin: quản lý User (tạo, phân quyền, vô hiệu hóa) | ⬜ Todo | P1 | |

### Phase 6 (P6) — Polish & Deploy

> Mục tiêu: Hoàn thiện, test, deploy lên VPS

| Task ID | Mô tả | Status | Dependencies | Notes |
|---------|--------|--------|--------------|-------|
| T29 | Xử lý edge cases, validation đầy đủ | ⬜ Todo | P5 | |
| T30 | Audit log Tab Lịch sử per NPP | ⬜ Todo | P5 | |
| T31 | Build production Docker image | ⬜ Todo | T29 | |
| T32 | Deploy lên VPS LANIT, cấu hình Nginx + HTTPS | ⬜ Todo | T31 | |
| T33 | Test end-to-end với user thật | ⬜ Todo | T32 | |

---

## Critical Path

```
P1 (Setup) → P2 (NPP + Contact) → P3 (Tương tác + Task) → P4 (Scoring) → P5 (File + Dashboard) → P6 (Deploy)
```

## Ngoài scope MVP (Phase 2 sau)

- Cơ hội hợp tác (Opportunity/Pipeline)
- Import dữ liệu từ Excel
- Bản đồ NPP
- Báo cáo tuần/tháng tự động
- Đồng bộ Google Calendar / Zalo
- PWA / offline mode

## Status Legend

- ⬜ Todo
- 🔄 In Progress
- ✅ Done
- ❌ Blocked
- ⏭️ Skipped
