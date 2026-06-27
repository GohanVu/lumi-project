"use client";

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
  return (
    <div className={styles.layout}>
      <Sidebar userName={userName} userRole={userRole} />
      <Header title={title} onLogout={onLogout} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
