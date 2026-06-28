interface AssignmentActor {
  id: string;
  role: string;
}

/**
 * User thường luôn tự nhận NPP; chỉ Admin được chọn assignee từ request.
 */
export function resolveCompanyAssigneeId(
  actor: AssignmentActor,
  requestedAssigneeId?: string | null
) {
  if (actor.role !== "ADMIN") {
    return actor.id;
  }

  return requestedAssigneeId?.trim() || null;
}
