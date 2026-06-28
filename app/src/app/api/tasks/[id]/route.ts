import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/db";
import { updateTaskSchema } from "@/lib/validation/task";

/**
 * PATCH /api/tasks/[id] — Cập nhật nhiệm vụ
 * Admin: cập nhật mọi task.
 * User: chỉ cập nhật task thuộc NPP được phân công.
 * Khi status → DONE: tự động set completedAt.
 * Khi status ← DONE: tự động xóa completedAt.
 */
export async function PATCH(
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

  const task = await prisma.task.findFirst({
    where: { id },
    include: {
      company: { select: { id: true, assignedToId: true, deletedAt: true } },
    },
  });

  if (!task || task.company.deletedAt) {
    return NextResponse.json(
      { error: "Không tìm thấy nhiệm vụ", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (user.role !== "ADMIN" && task.company.assignedToId !== user.id) {
    return NextResponse.json(
      { error: "Không có quyền cập nhật nhiệm vụ này", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body không hợp lệ", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const result = updateTaskSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      {
        error: result.error.errors[0]?.message ?? "Dữ liệu không hợp lệ",
        code: "VALIDATION_ERROR",
      },
      { status: 422 }
    );
  }

  const { title, description, status, priority, dueDate } = result.data;

  // Tự động quản lý completedAt theo status
  let completedAt: Date | null | undefined = undefined;
  if (status === "DONE" && task.status !== "DONE") {
    completedAt = new Date();
  } else if (status !== undefined && status !== "DONE" && task.status === "DONE") {
    completedAt = null;
  }

  const updated = await prisma.task.update({
    where: { id },
    data: {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(status !== undefined && { status }),
      ...(priority !== undefined && { priority }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
      ...(completedAt !== undefined && { completedAt }),
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      dueDate: true,
      completedAt: true,
      createdAt: true,
      updatedAt: true,
      assignedTo: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}

/**
 * DELETE /api/tasks/[id] — Xóa nhiệm vụ
 * Admin: xóa mọi task.
 * User: chỉ xóa task thuộc NPP được phân công.
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

  const task = await prisma.task.findFirst({
    where: { id },
    include: {
      company: { select: { id: true, assignedToId: true, deletedAt: true } },
    },
  });

  if (!task || task.company.deletedAt) {
    return NextResponse.json(
      { error: "Không tìm thấy nhiệm vụ", code: "NOT_FOUND" },
      { status: 404 }
    );
  }

  if (user.role !== "ADMIN" && task.company.assignedToId !== user.id) {
    return NextResponse.json(
      { error: "Không có quyền xóa nhiệm vụ này", code: "FORBIDDEN" },
      { status: 403 }
    );
  }

  await prisma.task.delete({ where: { id } });

  return new NextResponse(null, { status: 204 });
}
