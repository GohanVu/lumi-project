"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Sidebar.module.css";

const navItems = [
  {
    section: "Chính",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: "📊" },
      { label: "Nhà phân phối", href: "/companies", icon: "🏢" },
    ],
  },
  {
    section: "Quản lý",
    items: [
      { label: "Nhiệm vụ", href: "/tasks", icon: "✅" },
      { label: "Chấm điểm", href: "/scoring", icon: "⭐" },
    ],
  },
  {
    section: "Hệ thống",
    items: [
      { label: "Người dùng", href: "/users", icon: "👥" },
    ],
  },
];

interface SidebarProps {
  userName?: string;
  userRole?: string;
}

export function Sidebar({ userName = "Admin", userRole = "admin" }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className={styles.sidebar} aria-label="Sidebar navigation">
      <div className={styles.logo}>
        <div className={styles.logoText}>LUMI CRM</div>
        <div className={styles.logoSub}>Quản lý NPP</div>
      </div>

      <nav className={styles.nav}>
        {navItems.map((section) => (
          <div key={section.section} className={styles.navSection}>
            <div className={styles.navSectionTitle}>{section.section}</div>
            <ul className={styles.navList}>
              {section.items.map((item) => (
                <li key={item.href} className={styles.navItem}>
                  <Link
                    href={item.href}
                    className={`${styles.navLink} ${
                      pathname.startsWith(item.href) ? styles.navLinkActive : ""
                    }`}
                  >
                    <span className={styles.navIcon}>{item.icon}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className={styles.userSection}>
        <div className={styles.userInfo}>
          <div className={styles.userAvatar}>
            {userName.charAt(0).toUpperCase()}
          </div>
          <div className={styles.userDetails}>
            <div className={styles.userName}>{userName}</div>
            <div className={styles.userRole}>{userRole}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
