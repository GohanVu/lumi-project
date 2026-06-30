import assert from "node:assert/strict";
import test from "node:test";
import {
  MAX_FILE_SIZE,
  buildStoredFileName,
  extensionFor,
  humanFileSize,
  validateUpload,
} from "./attachments";

test("validateUpload từ chối file rỗng", () => {
  const r = validateUpload({ mimeType: "application/pdf", size: 0 });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.code, "EMPTY");
});

test("validateUpload từ chối file quá lớn", () => {
  const r = validateUpload({ mimeType: "application/pdf", size: MAX_FILE_SIZE + 1 });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.code, "TOO_LARGE");
});

test("validateUpload từ chối MIME không hỗ trợ", () => {
  const r = validateUpload({ mimeType: "application/x-msdownload", size: 100 });
  assert.equal(r.ok, false);
  assert.equal(r.ok === false && r.code, "UNSUPPORTED_TYPE");
});

test("validateUpload chấp nhận PDF hợp lệ", () => {
  assert.equal(validateUpload({ mimeType: "application/pdf", size: 1024 }).ok, true);
});

test("buildStoredFileName dùng đuôi theo MIME, bỏ tên gốc (chống path traversal)", () => {
  const name = buildStoredFileName("abc123", "image/png", "../../etc/passwd");
  assert.equal(name, "abc123.png");
  assert.ok(!name.includes("/"));
  assert.ok(!name.includes(".."));
});

test("extensionFor fallback về đuôi tên gốc khi MIME lạ", () => {
  assert.equal(extensionFor("application/octet-stream", "report.CSV"), "csv");
  assert.equal(extensionFor("application/octet-stream", "noext"), "bin");
});

test("humanFileSize hiển thị B / KB / MB", () => {
  assert.equal(humanFileSize(512), "512 B");
  assert.equal(humanFileSize(2048), "2.0 KB");
  assert.equal(humanFileSize(3 * 1024 * 1024), "3.0 MB");
});
