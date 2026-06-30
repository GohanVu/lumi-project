import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Lưu trữ file đính kèm trên đĩa (server-only).
 * Mặc định ghi vào `<cwd>/uploads` — trong container là `/app/uploads`,
 * được mount tới `./uploads` và Nginx phục vụ tại `/uploads/`.
 */
function getUploadDir(): string {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
}

/** Đường dẫn tuyệt đối của file lưu trữ, chặn path traversal. */
function resolveStoredPath(fileName: string): string {
  const dir = getUploadDir();
  const resolved = path.resolve(dir, fileName);
  if (resolved !== path.join(dir, path.basename(fileName))) {
    throw new Error("Tên file không hợp lệ");
  }
  return resolved;
}

export async function saveAttachmentFile(
  fileName: string,
  data: Buffer,
): Promise<void> {
  const dir = getUploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(resolveStoredPath(fileName), data);
}

export async function readAttachmentFile(fileName: string): Promise<Buffer> {
  return readFile(resolveStoredPath(fileName));
}

/** Xóa file trên đĩa; bỏ qua nếu file không tồn tại. */
export async function deleteAttachmentFile(fileName: string): Promise<void> {
  try {
    await unlink(resolveStoredPath(fileName));
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}
