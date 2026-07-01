import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { resolveCompanyAssigneeId } from "@/lib/company-assignment";
import { updateCompanySchema } from "@/lib/validation/company";
import { hasPrismaErrorCode } from "@/lib/prisma-errors";

/**
 * GET /api/companies/[id] — Chi tiết 1 NPP
 * Phân quyền: Admin thấy tất cả, User chỉ thấy NPP assigned cho mình
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

  const company = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      // Role-based: User chỉ thấy NPP của mình
      ...(user.role !== "ADMIN" ? { assignedToId: user.id } : {}),
    },
    include: {
      assignedTo: {
        select: { id: true, name: true, email: true },
      },
      _count: {
        select: {
          contacts: true,
          interactions: true,
          tasks: true,
          scoreResults: true,
          attachments: true,
        },
      },
    },
  });

  if (!company) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: company });
}

/**
 * PUT /api/companies/[id] — Cập nhật NPP
 */
export async function PUT(
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

  // Check company exists and user has access
  const existing = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "ADMIN" ? { assignedToId: user.id } : {}),
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body không hợp lệ", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const parseResult = updateCompanySchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
        details: parseResult.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const data = parseResult.data;
  let assignedToId = data.assignedToId;

  if (data.assignedToId !== undefined) {
    assignedToId = resolveCompanyAssigneeId(user, data.assignedToId) ?? undefined;
    if (!assignedToId) {
      return NextResponse.json(
        { error: "ASM phụ trách không hợp lệ", code: "INVALID_ASSIGNEE" },
        { status: 400 }
      );
    }

    const assignee = await prisma.user.findFirst({
      where: { id: assignedToId, isActive: true },
      select: { id: true },
    });
    if (!assignee) {
      return NextResponse.json(
        { error: "ASM phụ trách không hợp lệ", code: "INVALID_ASSIGNEE" },
        { status: 400 }
      );
    }
  }

  // Check duplicate taxCode if changed
  if (data.taxCode && data.taxCode !== existing.taxCode) {
    const dup = await prisma.company.findFirst({
      where: { taxCode: data.taxCode, deletedAt: null, id: { not: id } },
      select: { id: true, name: true },
    });
    if (dup) {
      return NextResponse.json(
        {
          error: `MST "${data.taxCode}" đã tồn tại (NPP: ${dup.name})`,
          code: "DUPLICATE_TAX_CODE",
        },
        { status: 409 }
      );
    }
  }

  // Check duplicate phone if changed
  if (data.phone && data.phone !== existing.phone) {
    const dup = await prisma.company.findFirst({
      where: { phone: data.phone, deletedAt: null, id: { not: id } },
      select: { id: true, name: true },
    });
    if (dup) {
      return NextResponse.json(
        {
          error: `SĐT "${data.phone}" đã tồn tại (NPP: ${dup.name})`,
          code: "DUPLICATE_PHONE",
        },
        { status: 409 }
      );
    }
  }

  let updated;
  try {
    updated = await prisma.company.update({
      where: { id },
      data: {
        ...data,
        ...(data.taxCode !== undefined && { taxCode: data.taxCode || null }),
        ...(data.phone !== undefined && { phone: data.phone || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.address !== undefined && { address: data.address || null }),
        ...(data.province !== undefined && { province: data.province || null }),
        ...(data.district !== undefined && { district: data.district || null }),
        ...(data.ward !== undefined && { ward: data.ward || null }),
        ...(data.source !== undefined && { source: data.source || null }),
        ...(data.notes !== undefined && { notes: data.notes || null }),
        ...(assignedToId !== undefined && { assignedToId }),
        updatedBy: user.id,
      },
    });
  } catch (error) {
    if (hasPrismaErrorCode(error, "P2002")) {
      return NextResponse.json(
        { error: "Mã số thuế đã được sử dụng", code: "DUPLICATE_TAX_CODE" },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/companies/[id] — Soft delete NPP (Admin only)
 */
export async function DELETE(
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

  if (user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Chỉ Admin mới được xóa NPP", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  const existing = await prisma.company.findFirst({
    where: { id, deletedAt: null },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  // Soft delete
  await prisma.company.update({
    where: { id },
    data: { deletedAt: new Date(), updatedBy: user.id },
  });

  return NextResponse.json({ success: true });
}
