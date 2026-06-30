import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { deleteAttachmentFile, readAttachmentFile } from "@/lib/attachment-storage";

async function findAccessibleCompany(id: string, userId: string, role: string) {
  return prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(role !== "ADMIN" ? { assignedToId: userId } : {}),
    },
    select: { id: true },
  });
}

/** Bao tên file vào Content-Disposition an toàn (RFC 5987 cho ký tự unicode). */
function contentDisposition(originalName: string): string {
  const ascii = originalName.replace(/[^\x20-\x7E]/g, "_").replace(/"/g, "'");
  const encoded = encodeURIComponent(originalName);
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

/**
 * GET /api/companies/[id]/attachments/[attachmentId] — Tải / xem file (có kiểm soát quyền).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id, attachmentId } = await params;
  const user = session.user as { id: string; role: string };
  const company = await findAccessibleCompany(id, user.id, user.role);
  if (!company) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, companyId: id, deletedAt: null },
    select: { fileName: true, originalName: true, mimeType: true },
  });
  if (!attachment) {
    return NextResponse.json(
      { error: "Không tìm thấy file", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  let data: Buffer;
  try {
    data = await readAttachmentFile(attachment.fileName);
  } catch {
    return NextResponse.json(
      { error: "File không tồn tại trên hệ thống", code: "FILE_MISSING" },
      { status: 404 }
    );
  }

  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": contentDisposition(attachment.originalName),
      "Content-Length": String(data.length),
    },
  });
}

/**
 * DELETE /api/companies/[id]/attachments/[attachmentId] — Xóa file (soft delete + xóa đĩa).
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; attachmentId: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id, attachmentId } = await params;
  const user = session.user as { id: string; role: string };
  const company = await findAccessibleCompany(id, user.id, user.role);
  if (!company) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const attachment = await prisma.attachment.findFirst({
    where: { id: attachmentId, companyId: id, deletedAt: null },
    select: { id: true, fileName: true },
  });
  if (!attachment) {
    return NextResponse.json(
      { error: "Không tìm thấy file", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  await prisma.attachment.update({
    where: { id: attachment.id },
    data: { deletedAt: new Date() },
  });
  await deleteAttachmentFile(attachment.fileName);

  return NextResponse.json({ data: { id: attachment.id } });
}
