import { headers } from "next/headers";
import { auth } from "./auth";

/**
 * Get current authenticated session from API route.
 * Returns null if not authenticated.
 */
export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
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
