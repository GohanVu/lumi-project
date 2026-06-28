import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { updateContactSchema } from "@/lib/validation/contact";

/**
 * Helper: check user has access to the contact's company
 */
async function checkContactAccess(contactId: string, userId: string, role: string) {
  const contact = await prisma.contact.findFirst({
    where: { id: contactId, deletedAt: null },
    include: {
      company: {
        select: { id: true, assignedToId: true, deletedAt: true },
      },
    },
  });

  if (!contact || contact.company.deletedAt) return null;
  if (role !== "ADMIN" && contact.company.assignedToId !== userId) return null;
  return contact;
}

/**
 * PUT /api/contacts/[id] — Sửa contact
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

  const contact = await checkContactAccess(id, user.id, user.role);
  if (!contact) {
    return NextResponse.json(
      { error: "Không tìm thấy liên hệ", code: "NOT_FOUND" },
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

  const parseResult = updateContactSchema.safeParse(body);
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

  const updated = await prisma.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.contact.updateMany({
        where: {
          companyId: contact.companyId,
          isPrimary: true,
          deletedAt: null,
          id: { not: id },
        },
        data: { isPrimary: false },
      });
    }

    return tx.contact.update({
      where: { id },
      data: {
        ...data,
        email: data.email || null,
        influence: data.influence || null,
        updatedBy: user.id,
      },
    });
  });

  return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/contacts/[id] — Soft delete contact
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

  const contact = await checkContactAccess(id, user.id, user.role);
  if (!contact) {
    return NextResponse.json(
      { error: "Không tìm thấy liên hệ", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  await prisma.contact.update({
    where: { id },
    data: { deletedAt: new Date(), updatedBy: user.id },
  });

  return NextResponse.json({ success: true });
}
