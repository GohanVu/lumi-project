import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { createContactSchema } from "@/lib/validation/contact";

/**
 * GET /api/companies/[id]/contacts — Danh sách contacts của 1 NPP
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

  // Check access to this company
  const company = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "ADMIN" ? { assignedToId: user.id } : {}),
    },
    select: { id: true },
  });

  if (!company) {
    return NextResponse.json(
      { error: "Không tìm thấy NPP", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  const contacts = await prisma.contact.findMany({
    where: { companyId: id, deletedAt: null },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      fullName: true,
      position: true,
      phone: true,
      email: true,
      isPrimary: true,
      influence: true,
      notes: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ data: contacts });
}

/**
 * POST /api/companies/[id]/contacts — Thêm contact
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

  // Check access
  const company = await prisma.company.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(user.role !== "ADMIN" ? { assignedToId: user.id } : {}),
    },
    select: { id: true },
  });

  if (!company) {
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

  const parseResult = createContactSchema.safeParse(body);
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

  const contact = await prisma.$transaction(async (tx) => {
    if (data.isPrimary) {
      await tx.contact.updateMany({
        where: { companyId: id, isPrimary: true, deletedAt: null },
        data: { isPrimary: false },
      });
    }

    return tx.contact.create({
      data: {
        companyId: id,
        fullName: data.fullName,
        position: data.position || null,
        phone: data.phone || null,
        email: data.email || null,
        isPrimary: data.isPrimary,
        influence: data.influence || null,
        notes: data.notes || null,
        createdById: user.id,
      },
    });
  });

  return NextResponse.json({ data: contact }, { status: 201 });
}
