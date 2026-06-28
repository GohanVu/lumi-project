import { createAuthClient } from "better-auth/react";

// Không hardcode port: browser luôn gọi Better Auth trên cùng origin hiện tại.
export const authClient = createAuthClient();

export const { signIn, signUp, signOut, useSession } = authClient;
