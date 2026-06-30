/**
 * Tiện ích thuần cho file đính kèm NPP (T25/T26).
 * Không phụ thuộc fs/Prisma để dễ test; route API dùng lại các hàm này.
 */

/** Giới hạn kích thước file — khớp `client_max_body_size 10M` của Nginx. */
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

/** MIME được phép: ảnh, PDF, Word, Excel, text. */
export const ALLOWED_MIME_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
};

export type UploadValidation =
  | { ok: true }
  | { ok: false; error: string; code: "EMPTY" | "TOO_LARGE" | "UNSUPPORTED_TYPE" };

/** Kiểm tra một file upload theo kích thước và loại MIME. */
export function validateUpload(file: { mimeType: string; size: number }): UploadValidation {
  if (file.size <= 0) {
    return { ok: false, error: "File rỗng", code: "EMPTY" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return {
      ok: false,
      error: `File vượt quá ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB`,
      code: "TOO_LARGE",
    };
  }
  if (!(file.mimeType in ALLOWED_MIME_TYPES)) {
    return {
      ok: false,
      error: "Định dạng file không được hỗ trợ",
      code: "UNSUPPORTED_TYPE",
    };
  }
  return { ok: true };
}

/** Lấy đuôi file ưu tiên theo MIME, fallback về đuôi của tên gốc. */
export function extensionFor(mimeType: string, originalName: string): string {
  const byMime = ALLOWED_MIME_TYPES[mimeType];
  if (byMime) return byMime;
  const dot = originalName.lastIndexOf(".");
  if (dot >= 0 && dot < originalName.length - 1) {
    return originalName
      .slice(dot + 1)
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }
  return "bin";
}

/**
 * Sinh tên file lưu trên đĩa: ngẫu nhiên, không phụ thuộc tên gốc (tránh path
 * traversal / trùng tên). `id` là chuỗi ngẫu nhiên do caller cung cấp.
 */
export function buildStoredFileName(
  id: string,
  mimeType: string,
  originalName: string,
): string {
  return `${id}.${extensionFor(mimeType, originalName)}`;
}

/** Hiển thị kích thước file gọn cho UI. */
export function humanFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
