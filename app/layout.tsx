import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DealPilot | מוצרים חכמים והזדמנויות שוות",
  description: "DealPilot: פלטפורמה לגילוי, בדיקה וניהול שיווק שותפים למוצרים מ-AliExpress. סביבת פיתוח, ללא נתוני מסחר מאומתים בשלב זה.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="he" dir="rtl"><body>{children}</body></html>;
}
