import type { Metadata } from "next";
import "./globals.css";
import "./dealpilot.css";
import "./welcoming.css";
import "./storefront.css";

export const metadata: Metadata = {
  title: "DealPilot | המותגים שאתם מכירים, מהחנות הרשמית",
  description:
    "שיאומי, אנקר, יוגרין, דרימי ועוד: מוצרים מהחנויות הרשמיות של המותגים ב־AliExpress, במחירים בשקלים ועם גילוי שותפים ברור.",
  metadataBase: new URL(
    process.env.DEALPILOT_SITE_URL ||
      (process.env.VERCEL_URL
        ? "https://" + process.env.VERCEL_URL
        : "http://localhost:3100"),
  ),
  openGraph: {
    title: "DealPilot | המותגים שאתם מכירים, מהחנות הרשמית",
    description: "מוצרים מקוריים מהחנויות הרשמיות של המותגים ב־AliExpress, במחירים בשקלים.",
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
      <head>
        <meta name="theme-color" content="#0D4A33" />
      </head>
      <body>{children}</body>
    </html>
  );
}
