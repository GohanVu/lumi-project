import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LUMI CRM — Quản lý NPP",
  description: "Hệ thống CRM quản lý Nhà Phân Phối LUMI",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
