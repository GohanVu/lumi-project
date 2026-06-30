import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { buildStoredFileName, validateUpload } from "@/lib/attachments";
import { saveAttachmentFile } from "@/lib/attachment-storage";

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

const attachmentSelect = {
  id: true,
  originalName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  uploadedBy: { select: { id: true, name: true } },
} as const;

/**
 * GET /api/companies/[id]/attachments — Danh sách file đính kèm của NPP.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const user = session.user as { id: string; role: string };
  const company = await findAccessibleCompany(id, user.id, user.role);
  if (!company) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const attachments = await prisma.attachment.findMany({
    where: { companyId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: attachmentSelect,
  });

  return NextResponse.json({ data: attachments });
}

/**
 * POST /api/companies/[id]/attachments — Upload file (multipart/form-data, field "file").
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await requireAuth();
  if (!session) {
    return NextResponse.json(
      { error: "Chưa đăng nhập", code: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const { id } = await params;
  const user = session.user as { id: string; role: string };
  const company = await findAccessibleCompany(id, user.id, user.role);
  if (!company) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Request không hợp lệ", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Thiếu file tải lên", code: "NO_FILE" },
      { status: 400 }
    );
  }

  const validation = validateUpload({ mimeType: file.type, size: file.size });
  if (!validation.ok) {
    return NextResponse.json(
      { error: validation.error, code: validation.code },
      { status: 422 }
    );
  }

  const fileName = buildStoredFileName(randomUUID(), file.type, file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  await saveAttachmentFile(fileName, buffer);

  const created = await prisma.attachment.create({
    data: {
      companyId: id,
      fileName,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      path: `/uploads/${fileName}`,
      uploadedById: user.id,
    },
    select: attachmentSelect,
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
