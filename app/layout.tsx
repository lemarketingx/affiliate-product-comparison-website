import type { Metadata } from "next";
import "./globals.css";
import "./dealpilot.css";

export const metadata: Metadata = {
  title: "DealPilot | מוצרים חכמים והזדמנויות שוות",
  description:
    "מוצרים שימושיים, גאדג׳טים והפתעות מ־AliExpress. מגלים מוצרים חכמים, עם נתוני ספק וגילוי שותפים ברור.",
  metadataBase: new URL(
    process.env.DEALPILOT_SITE_URL ||
      (process.env.VERCEL_URL
        ? "https://" + process.env.VERCEL_URL
        : "http://localhost:3100"),
  ),
  openGraph: {
    title: "DealPilot | מגלים מוצרים חכמים",
    description: "קצת סקרנות. הרבה שימושיות. מוצרים מ־AliExpress במקום אחד.",
    locale: "he_IL",
    type: "website",
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
