import type { Metadata } from "next";
import "./globals.css";
import "./dealpilot.css";
import "./welcoming.css";
import "./storefront.css";
import "./bottomline.css";

export const metadata: Metadata = {
  title: "DealPilot | מוצרי מותגים מ־AliExpress, עם מחיר שנבדק",
  description:
    "מגלים מוצרי מותגים מ־AliExpress: מחירים בשקלים עם זמן בדיקה, נתוני מכירות ספק ואומדן מסי יבוא לישראל. המחיר הסופי נקבע בקופה.",
  metadataBase: new URL(
    process.env.DEALPILOT_SITE_URL ||
      (process.env.VERCEL_URL
        ? "https://" + process.env.VERCEL_URL
        : "http://localhost:3100"),
  ),
  openGraph: {
    title: "DealPilot | מגלים מותגים מוכרים",
    description: "מותגים מוכרים ומוצרים מזוהים ב־AliExpress במקום אחד, עם כלים לקנייה חכמה לישראל.",
    locale: "he_IL",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <meta name="theme-color" content="#121417" />
        {/* The page h1 is the LCP element: fetch its bold Hebrew face with the HTML, not after the CSS. */}
        <link rel="preload" href="/fonts/storefront/ibm-plex-sans-hebrew-hebrew-700-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/storefront/ibm-plex-sans-hebrew-hebrew-400-normal.woff2" as="font" type="font/woff2" crossOrigin="" />
      </head>
      <body>{children}</body>
    </html>
  );
}
