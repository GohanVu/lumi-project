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
