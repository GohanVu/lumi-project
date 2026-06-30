# Brainstorm Notes

> File này lưu lại toàn bộ kết quả brainstorm giữa người dùng và AI.
> Đây là nguồn context quan trọng để hiểu TẠI SAO project được thiết kế như hiện tại.

---

## Session 1 — 2026-06-27 — CRM Quản lý NPP LUMI

### Bối cảnh & Vấn đề

Người dùng có tài liệu đặc tả `Dac_ta_web_CRM_quan_ly_NPP_LUMI.docx` mô tả đầy đủ nghiệp vụ.

**Vấn đề gốc (từ đặc tả):**
- Thông tin NPP và người liên hệ bị trộn lẫn trong Excel → trùng dữ liệu, mất lịch sử
- Một công ty có nhiều người liên hệ, nhiều vai trò ảnh hưởng quyết định
- Ghi chú bị ghi đè, khó nhìn lại diễn biến theo thời gian
- Bỏ sót lịch follow-up, tài liệu đã hứa gửi
- Tiêu chí đánh giá NPP hay thay đổi → viết cứng code là sai
- Khó tổng hợp báo cáo tuần/tháng, tỷ lệ chuyển đổi

**Nguyên tắc cốt lõi (từ đặc tả):**
> Một công ty → Nhiều người liên hệ → Nhiều lần tương tác → Nhiều cơ hội hợp tác

### Yêu cầu đã xác nhận

- **Platform**: Desktop web (không cần tối ưu mobile) — ⚠️ ĐÃ THAY ĐỔI (Session 19, 2026-06-30): bổ sung mobile responsive, xem Phase 8 trong plan. Vẫn desktop-first, thêm responsive ≤768px cho luồng "quản lý xem nhanh". Chi tiết cần bàn thêm.
- **Users**: Nội bộ, 1 vài cá nhân (ASM LUMI)
- **Timeline**: 2 tuần ra MVP
- **Vibe code**: AI là driver chính → phải tuân thủ steering/rules nghiêm ngặt
- **File upload**: Có trong MVP
- **Phân quyền**: 2 role — `admin` và `user` (ASM)
  - Admin: thấy toàn bộ dữ liệu tất cả ASM
  - User: chỉ thấy NPP được phân công cho mình

### Tech Stack đã chọn

| Layer | Công nghệ | Lý do |
|-------|-----------|-------|
| Framework | Next.js 15 (App Router) | Full-stack 1 repo, AI code tốt, API Routes built-in |
| Language | TypeScript | Ít bug hơn JS thuần khi vibe code |
| Database | PostgreSQL | Quan hệ phức tạp NPP ↔ Contact ↔ Score |
| ORM | Prisma | Schema-first, migration rõ ràng, AI hiểu rất tốt |
| Auth | Better Auth | Nhẹ, dễ setup role-based (admin/user) |
| Styling | Vanilla CSS + CSS Modules | Không dùng Tailwind, kiểm soát tốt hơn |
| Validation | Zod | Type-safe từ schema → form → API |
| Data Fetching | TanStack Query | Tránh bất đồng bộ gây đơ UI |
| File Storage | Local filesystem (VPS) | Đơn giản, self-host, Nginx serve static |
| Deploy | Docker Compose + Nginx | 1 command chạy toàn bộ |
| Hosting | LANIT VPS (Vietnam) | Rẻ, latency thấp |

### Architecture

```
Next.js App (Port 3000)
├── /app                  ← Pages & Layouts (App Router)
├── /app/api              ← API Routes (full backend)
│   ├── /api/auth         ← Better Auth handler
│   ├── /api/companies    ← NPP CRUD
│   ├── /api/contacts     ← Người liên hệ
│   ├── /api/interactions ← Nhật ký tương tác
│   ├── /api/scoring      ← Chấm điểm NPP
│   └── /api/upload       ← File upload
├── /components           ← UI components (Vanilla CSS Modules)
├── /lib/db.ts            ← Prisma client singleton
├── /lib/auth.ts          ← Better Auth config
└── /uploads              ← File lưu trên server (gitignored)

PostgreSQL (Port 5432)
Nginx (Port 80) → reverse proxy → Next.js
Docker Compose quản lý toàn bộ
```

### Database Schema (draft)

**Entities chính:**
- `User` — tài khoản hệ thống (role: admin | user)
- `Company` — hồ sơ NPP/công ty
- `Contact` — người liên hệ (nhiều/công ty)
- `Interaction` — nhật ký tương tác
- `Task` — nhiệm vụ/nhắc việc
- `Opportunity` — cơ hội hợp tác
- `ScoreTemplate` — mẫu chấm điểm (có versioning)
- `ScoreCriteria` — tiêu chí trong mẫu
- `ScoreResult` — kết quả chấm cho NPP
- `Attachment` — file đính kèm

**Quan hệ:**
```
User ──── Company (assigned_to)
Company ──── Contact (1:n)
Company ──── Interaction (1:n)
Company ──── Task (1:n)
Company ──── Opportunity (1:n)
Company ──── ScoreResult (1:n)
Company ──── Attachment (1:n)
ScoreTemplate ──── ScoreCriteria (1:n)
ScoreTemplate ──── ScoreResult (1:n)
```

### Features MVP (2 tuần)

1. Auth — Đăng nhập, phân quyền admin/user
2. Quản lý NPP — CRUD công ty, cảnh báo trùng (SĐT, MST)
3. Quản lý người liên hệ — Nhiều contact/công ty, vai trò
4. Nhật ký tương tác — Timeline, ghi chú, follow-up
5. Nhiệm vụ/Nhắc việc — Tạo task, deadline, trạng thái
6. Chấm điểm NPP — Module cấu hình được (cơ bản MVP)
7. File đính kèm — Upload/xem file per NPP
8. Dashboard — Tổng quan số liệu theo role
9. Tìm kiếm & Lọc — Lọc cơ bản danh sách NPP

### Giai đoạn sau MVP

- Pipeline/Cơ hội hợp tác chi tiết hơn
- Import/Export Excel
- Báo cáo tuần/tháng
- Bản đồ NPP
- Đồng bộ Google Calendar / Zalo
- Scoring versioning đầy đủ

### Quyết định

- Không mobile-first → Desktop web → Đơn giản hóa UI — ⚠️ cập nhật Session 19: thêm responsive (Phase 8), vẫn desktop-first
- Vanilla CSS thay vì Tailwind → Kiểm soát tốt hơn, tuân thủ rule
- File lưu local thay vì S3/MinIO → Đơn giản hơn cho self-host VPS rẻ
- Better Auth thay vì NextAuth → Nhẹ hơn, hỗ trợ role tốt hơn
- TanStack Query → Rule project nhấn mạnh tránh bất đồng bộ gây đơ UI

### API Endpoints (MVP)

> Danh sách đầy đủ các API cần implement. Mỗi route tuân thủ:
> - Auth: Better Auth session (cookie-based)
> - Validate input: Zod
> - Error format: `{ "error": "...", "code": "ERROR_CODE" }`
> - Phân quyền: Admin thấy all, User chỉ thấy NPP assigned cho mình

#### Auth (Better Auth — auto)

| Method | Endpoint | Mô tả |
|--------|----------|--------|
| * | `/api/auth/[...all]` | Better Auth catch-all (sign-in, sign-up, session, sign-out) |

#### Companies (NPP)

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/companies` | Danh sách NPP (search, filter status, pagination, sort) | ✅ | Admin: all, User: assigned |
| POST | `/api/companies` | Tạo NPP mới (cảnh báo trùng SĐT/MST) | ✅ | All |
| GET | `/api/companies/[id]` | Chi tiết 1 NPP | ✅ | Owner/Admin |
| PUT | `/api/companies/[id]` | Cập nhật NPP | ✅ | Owner/Admin |
| DELETE | `/api/companies/[id]` | Soft delete NPP | ✅ | Admin |
| GET | `/api/companies/check-duplicate` | Kiểm tra trùng SĐT/MST trước khi tạo | ✅ | All |

#### Contacts (Người liên hệ)

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/companies/[id]/contacts` | Danh sách contacts của 1 NPP | ✅ | Owner/Admin |
| POST | `/api/companies/[id]/contacts` | Thêm contact | ✅ | Owner/Admin |
| PUT | `/api/contacts/[id]` | Sửa contact | ✅ | Owner/Admin |
| DELETE | `/api/contacts/[id]` | Soft delete contact | ✅ | Owner/Admin |

#### Interactions (Nhật ký tương tác)

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/companies/[id]/interactions` | Timeline tương tác của NPP | ✅ | Owner/Admin |
| POST | `/api/companies/[id]/interactions` | Thêm tương tác (type, content, follow-up) | ✅ | Owner/Admin |
| PUT | `/api/interactions/[id]` | Sửa tương tác | ✅ | Owner/Admin |
| DELETE | `/api/interactions/[id]` | Xóa tương tác | ✅ | Owner/Admin |

#### Tasks (Nhiệm vụ)

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/tasks` | Danh sách task (filter: status, dueDate, overdue) | ✅ | Admin: all, User: assigned |
| GET | `/api/companies/[id]/tasks` | Tasks của 1 NPP | ✅ | Owner/Admin |
| POST | `/api/companies/[id]/tasks` | Tạo task cho NPP | ✅ | Owner/Admin |
| PUT | `/api/tasks/[id]` | Cập nhật task (status, deadline) | ✅ | Assignee/Admin |
| DELETE | `/api/tasks/[id]` | Xóa task | ✅ | Admin |

#### Scoring (Chấm điểm)

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/score-templates` | Danh sách mẫu chấm điểm | ✅ | All |
| POST | `/api/score-templates` | Tạo mẫu mới | ✅ | Admin |
| PUT | `/api/score-templates/[id]` | Sửa mẫu (chỉ khi DRAFT) | ✅ | Admin |
| POST | `/api/score-templates/[id]/publish` | Ban hành mẫu (DRAFT → PUBLISHED) | ✅ | Admin |
| POST | `/api/score-templates/[id]/archive` | Ngừng mẫu (→ ARCHIVED) | ✅ | Admin |
| POST | `/api/score-templates/[id]/clone` | Nhân bản mẫu (tạo version mới) | ✅ | Admin |
| GET | `/api/companies/[id]/scores` | Lịch sử chấm điểm NPP | ✅ | Owner/Admin |
| POST | `/api/companies/[id]/scores` | Chấm điểm NPP | ✅ | Owner/Admin |
| PUT | `/api/scores/[id]/override` | Ghi đè điểm (bắt buộc nhập lý do) | ✅ | Admin |

#### Attachments (File đính kèm)

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/companies/[id]/attachments` | Danh sách files NPP | ✅ | Owner/Admin |
| POST | `/api/upload` | Upload file (multipart/form-data, max 10MB) | ✅ | Owner/Admin |
| DELETE | `/api/attachments/[id]` | Soft delete file | ✅ | Owner/Admin |

#### Users (Quản lý người dùng — Admin only)

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/users` | Danh sách users | ✅ | Admin |
| POST | `/api/users` | Tạo user mới | ✅ | Admin |
| PUT | `/api/users/[id]` | Sửa user (role, isActive) | ✅ | Admin |

#### Dashboard

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/dashboard/stats` | KPIs: tổng NPP, theo status, tasks overdue, follow-up today | ✅ | Admin: all, User: assigned |

#### Audit Logs

| Method | Endpoint | Mô tả | Auth | Role |
|--------|----------|--------|------|------|
| GET | `/api/companies/[id]/audit-logs` | Lịch sử thay đổi per NPP | ✅ | Owner/Admin |

### Câu hỏi mở (để quyết định sau)

- Cơ hội hợp tác (Opportunity) có trong MVP không hay phase 2?
- Scoring versioning phức tạp: MVP làm đơn giản hay full spec?
- Import Excel: có trong MVP không?

---

<!-- Thêm session mới ở đây -->
