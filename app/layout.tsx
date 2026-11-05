import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מאי פיננסים — תוכנית השותפים",
  description: "מערכת השותפים שמחברת בין אנשים, הזדמנויות ומשכנתאות.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
