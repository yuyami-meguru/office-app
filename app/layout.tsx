import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "事務所管理アプリ",
  description: "クリエイター事務所向けの管理アプリケーション",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
