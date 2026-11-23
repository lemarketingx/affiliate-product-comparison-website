import type { Metadata } from "next";
import { ConsentBasedAnalytics } from "./consent-based-analytics";
import { siteOrigin } from "../lib/site-url";
import "./globals.css";
import "./dealpilot.css";
import "./welcoming.css";
import "./storefront.css";
import "./bottomline.css";
import "./showroom.css";

export const metadata: Metadata = {
  title: "DealPilot | מותגים מוכרים ומחירים שנבדקו ב־AliExpress",
  description:
    "מוצרי מותגים ב־AliExpress עם מחיר בשקלים, בדיקות מחיר לאורך זמן והערכת מסי יבוא לישראל. משווים נתונים לפני שקונים. המחיר הסופי נקבע בקופה.",
  metadataBase: new URL(siteOrigin()),
  openGraph: {
    title: "DealPilot | בודקים מחיר לפני שקונים",
    description: "מחירים בשקלים, בדיקות לאורך זמן והערכת מסי יבוא למוצרי מותגים מ־AliExpress. בדקו את הפרטים לפני קנייה.",
    locale: "he_IL",
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "DealPilot: מותגים שאתם מכירים. בודקים לפני שקונים." }],
  },
  twitter: { card: "summary_large_image", images: ["/og.png"] },
  robots: { index: true, follow: true },
  verification: { google: "uHRr4qQiJ7sZvzp_X-cN0OzNIMyoXDHVKwsb_76xjdc" },
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
      <body>{children}<ConsentBasedAnalytics /></body>
    </html>
  );
}
