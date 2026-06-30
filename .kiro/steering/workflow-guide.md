# Workflow Guide — Cách làm việc với AI

## Workflow chuẩn của project

```
Brainstorm → Lưu context → Tạo steering → Tạo plan → Implement theo phase
```

**KHÔNG** làm theo kiểu: Prompt → Code ngay

## 1. Brainstorm Phase

Khi bắt đầu project hoặc feature mới:
- Brainstorm ý tưởng, CHƯA implement gì
- AI hỏi ngược lại để clarify requirements
- So sánh technical stack, phân tích trade-offs
- Liệt kê đầy đủ API endpoints (method, path, mô tả, role) trước khi chuyển sang Planning
- Khi đã đủ ý tưởng → lưu vào `docs/brainstorm.md`
- Cập nhật steering nếu có quy ước mới

## 2. Planning Phase

Sau brainstorm, tạo plan tại `docs/plan.md` bao gồm:
- Phases (P1, P2, P3...)
- Tasks trong mỗi phase (T1, T2, T3...)
- Dependencies giữa các phase
- Critical path
- Timeline ước tính

**Lưu ý:** Phase 1 (Setup) LUÔN phải bao gồm:
- Environment isolation (venv / Docker / Devcontainer)
- Đảm bảo portability: clone → 1 command → chạy toàn bộ
- .gitignore chuẩn, không commit artifacts local
- Lock files cho dependencies (pin versions)

## 3. Implementation Phase

Khi implement từng task:
1. Đọc steering + plan + audit log
2. Đối chiếu trạng thái thực tế giữa `docs/plan.md`, `git status`/`git diff`, source code và kết quả quality gates — đây là nguồn chân lý. `docs/audit-log.md` chỉ là log tham khảo, KHÔNG dùng làm bằng chứng trạng thái. Nếu lệch, PHẢI báo rõ và lấy source + quality gates làm bằng chứng; không tự suy diễn theo riêng plan hoặc audit log.
3. Xác nhận task cần làm và đổi task sang `🔄 In Progress` TRƯỚC khi sửa code
4. Implement
5. Nếu có mutation, chạy `Cache Consistency Gate`: map dữ liệu thay đổi → query keys bị ảnh hưởng → cách update/invalidate → regression/E2E test
6. Chạy đầy đủ quality gates trong container: lint, TypeScript check, test liên quan (bug fix bắt buộc có test)
7. Chỉ đổi task sang `✅ Done` khi code hoàn tất VÀ tất cả quality gates pass
8. Trong cùng session, ghi kết quả vào audit log rồi cập nhật plan; không được cập nhật một file mà bỏ file còn lại

### State Consistency Gate (bắt buộc)

- `Todo`: chưa có implementation đang thực hiện.
- `In Progress`: đã bắt đầu code, còn lỗi, chưa test xong hoặc session bị gián đoạn.
- `Done`: implementation hoàn chỉnh, quality gates pass, audit log và plan đã đồng bộ.
- Trước khi kết thúc session, PHẢI chạy lại `git status` và kiểm tra các task bị ảnh hưởng; code mới chưa commit vẫn phải được phản ánh đúng trong plan/audit.
- Nếu phát hiện task đã có code nhưng plan còn `Todo`, hoặc plan là `Done` nhưng audit/quality gates thiếu, PHẢI sửa trạng thái/doc ngay trong session trước khi làm task tiếp theo.
- Một task không được đánh dấu `Done` chỉ dựa trên việc file đã tồn tại hoặc UI nhìn có vẻ hoạt động.

### Cache Consistency Gate (bắt buộc khi có mutation)

- Query và mutation phải lấy key từ `src/lib/query-keys.ts`; không khai báo raw key riêng lẻ.
- Create phải làm stale/refetch collection; update/delete phải xử lý cả detail, list và aggregate liên quan.
- Nested mutation phải kiểm tra parent count/summary và dashboard có cần invalidate hay không.
- Redirect sau mutation chỉ chạy sau khi cache contract hoàn tất.
- Regression test tối thiểu phải fail nếu bỏ invalidation. Với luồng xuyên trang quan trọng, thêm E2E test khi browser runner khả dụng.

## 4. Review Phase (định kỳ)

- Security review: Gọi `#security-review` steering
- Documentation review: Gọi `#documentation-review` steering
- Kết quả lưu thành report trong repo

## Audit Log Convention

Mỗi session làm việc, ghi vào `docs/audit-log.md`:

```markdown
## [YYYY-MM-DD] Session Title

### Yêu cầu
- Người dùng yêu cầu gì

### Công việc đã làm
- AI đã thực hiện những gì

### Quyết định quan trọng
- Các technical decisions và lý do

### Kết quả
- Summary kết quả session

### Tasks liên quan
- Task IDs từ plan (nếu có)
```
