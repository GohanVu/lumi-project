export interface AuthoritativeUser {
  id: string;
  role: string;
  isActive: boolean;
}

/**
 * Trộn session user với trạng thái mới nhất trong DB.
 * Null nghĩa là session không còn được phép truy cập.
 */
export function resolveActiveSessionUser<T extends { id: string }>(
  sessionUser: T,
  databaseUser: AuthoritativeUser | null
): (T & AuthoritativeUser) | null {
  if (!databaseUser?.isActive || databaseUser.id !== sessionUser.id) return null;
  return { ...sessionUser, ...databaseUser };
}
