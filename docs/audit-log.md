# Audit Log

> Nhật ký ghi lại toàn bộ quá trình làm việc với AI.
> Mục đích: tracking quyết định, tránh lặp lỗi, giữ context giữa các session.

---

## 2026-06-27 — Session 1: Brainstorm & Planning

### Yêu cầu
- Người dùng yêu cầu đọc tài liệu đặc tả Word (`Dac_ta_web_CRM_quan_ly_NPP_LUMI.docx`) và brainstorm

### Công việc đã làm
- Đọc toàn bộ steering files và docs template
- Extract nội dung file Word sang text bằng python-docx
- Brainstorm tech stack, clarify requirements qua Q&A
- Ghi kết quả vào docs/brainstorm.md
- Tạo docs/plan.md với 6 phases, 33 tasks

### Quyết định quan trọng
- **Desktop-first** (không mobile) → giảm phức tạp UI
- **Vanilla CSS + CSS Modules** → tuân thủ rule, không dùng Tailwind
- **Next.js 15 full-stack** → 1 repo, AI vibe code hiệu quả nhất
- **Better Auth** thay NextAuth → nhẹ hơn, role-based tốt hơn
- **TanStack Query** → tránh bất đồng bộ gây đơ UI (rule project)
- **File lưu local** → đơn giản cho self-host VPS rẻ
- **Scoring full spec** → có versioning, ghi đè, lịch sử (theo đặc tả section 7)
- **Opportunity/Import Excel** → ngoài MVP, để Phase 2

### Kết quả
- docs/brainstorm.md: đã fill đầy đủ context session 1
- docs/plan.md: 6 phases, 33 tasks, critical path rõ ràng
- Sẵn sàng bắt đầu Phase 1 (Setup & Foundation)

### Tasks liên quan
- T1 → T8 (Phase 1 — Setup)

---

<!-- Thêm session mới ở đây -->
