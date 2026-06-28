"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useMutation } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/auth-client";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import styles from "./AppLayout.module.css";

interface AppLayoutProps {
  children: React.ReactNode;
  title: string;
  userName?: string;
  userRole?: string;
  onLogout?: () => void;
}

export function AppLayout({
  children,
  title,
  userName,
  userRole,
  onLogout,
}: AppLayoutProps) {
  const router = useRouter();
  // useSyncExternalStore: server snapshot = false, client snapshot = true
  // React 18 hydrates with server snapshot rồi schedule re-render với client snapshot
  // → tránh hydration mismatch không cần useState + useEffect
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const { data: sessionData, isPending } = useSession();
  const sessionUser = sessionData?.user as
    | { name?: string; role?: string }
    | undefined;

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await signOut();
    },
    onSuccess: () => {
      router.replace("/login");
      router.refresh();
    },
  });

  useEffect(() => {
    if (!isPending && !sessionData) {
      router.replace("/login");
    }
  }, [isPending, router, sessionData]);

  if (!isMounted || isPending || !sessionData) {
    return <div className={styles.authLoading}>Đang kiểm tra đăng nhập...</div>;
  }

  const handleLogout = onLogout || (() => logoutMutation.mutate());

  return (
    <div className={styles.layout}>
      <Sidebar
        userName={sessionUser?.name || userName}
        userRole={sessionUser?.role || userRole}
      />
      <Header title={title} onLogout={handleLogout} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
