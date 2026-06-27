"use client";

import styles from "./Header.module.css";

interface HeaderProps {
  title: string;
  onLogout?: () => void;
}

export function Header({ title, onLogout }: HeaderProps) {
  return (
    <header className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>
        {onLogout && (
          <button className={styles.logoutBtn} onClick={onLogout}>
            Đăng xuất
          </button>
        )}
      </div>
    </header>
  );
}
