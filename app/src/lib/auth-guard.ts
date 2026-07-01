import { headers } from "next/headers";
import { auth } from "./auth";
import { prisma } from "./db";
import { resolveActiveSessionUser } from "./session-user";

/**
 * Get current authenticated session from API route.
 * Returns null if not authenticated.
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) return null;

  const sessionUser = session.user as typeof session.user & { id: string };
  const databaseUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, role: true, isActive: true },
  });
  const activeUser = resolveActiveSessionUser(sessionUser, databaseUser);

  if (!activeUser) {
    await prisma.session.deleteMany({ where: { userId: sessionUser.id } });
    return null;
  }

  return { ...session, user: activeUser };
}

/**
 * Require authentication. Returns session or throws Response.
 */
export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    return null;
  }
  return session;
}

/**
 * Require admin role. Returns session if admin, otherwise null.
 * Caller distinguishes 401 (no session) vs 403 (not admin) bằng cách
 * kiểm tra session trước.
 */
export async function requireAdmin() {
  const session = await getSession();
  if (!session) {
    return { session: null, isAdmin: false } as const;
  }
  const user = session.user as { role?: string };
  return { session, isAdmin: user.role === "ADMIN" } as const;
}
