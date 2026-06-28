import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { createInteractionSchema } from "@/lib/validation/interaction";

/**
 * GET /api/companies/[id]/interactions — Timeline tương tác của một NPP
 * Admin xem tất cả; User chỉ xem NPP được phân công cho mình.
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

  const interactions = await prisma.interaction.findMany({
    where: { companyId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      type: true,
      content: true,
      result: true,
      contactName: true,
      followUpAt: true,
      createdAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ data: interactions });
}

/**
 * POST /api/companies/[id]/interactions — Ghi nhận tương tác mới.
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body không hợp lệ", code: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const parseResult = createInteractionSchema.safeParse(body);
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
  const interaction = await prisma.interaction.create({
    data: {
      companyId: id,
      type: data.type,
      content: data.content,
      result: data.result || null,
      contactName: data.contactName || null,
      followUpAt: data.followUpAt ? new Date(data.followUpAt) : null,
      createdById: user.id,
    },
    select: {
      id: true,
      type: true,
      content: true,
      result: true,
      contactName: true,
      followUpAt: true,
      createdAt: true,
      createdBy: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return NextResponse.json({ data: interaction }, { status: 201 });
}
