"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

const MEASUREMENT_ID = "G-0X26MGR3RJ";
const STORAGE_KEY = "dealpilot_analytics_consent_v1";
type Consent = "accepted" | "declined" | null;

export function ConsentBasedAnalytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      setConsent(saved === "accepted" || saved === "declined" ? saved : null);
    } catch {
      setConsent(null);
    }
    setInitialized(true);
  }, []);

  function choose(value: Consent) {
    try {
      if (value) localStorage.setItem(STORAGE_KEY, value);
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Consent remains session-only when storage is blocked.
    }
    setConsent(value);
  }

  useEffect(() => {
    if (!initialized || consent !== "accepted") return;
    const dataLayerWindow = window as Window & { dataLayer?: unknown[][] };
    const dataLayer = (dataLayerWindow.dataLayer ??= []);
    const gtag = (...args: unknown[]) => dataLayer.push(args);

    // The browser history navigation is tracked manually. Avoid sending
    // arbitrary query strings, which can contain search terms or personal data.
    gtag("js", new Date());
    gtag("config", MEASUREMENT_ID, { send_page_view: false });
    gtag("event", "page_view", {
      page_path: pathname,
      page_location: window.location.origin + pathname,
    });
  }, [initialized, consent, pathname]);

  if (!initialized) return null;

  return (
    <>
      {consent === "accepted" && (
        <Script
          id="dealpilot-ga4-library"
          src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
      )}
      {consent === null && (
        <section
          aria-label="העדפות מדידה"
          role="dialog"
          aria-modal="false"
          style={{
            position: "fixed",
            bottom: 16,
            left: 16,
            right: 16,
            zIndex: 9999,
            maxWidth: 560,
            marginInline: "auto",
            borderRadius: 12,
            padding: 16,
            color: "#ffffff",
            background: "#202735",
            border: "1px solid #ffffff33",
            boxShadow: "0 8px 30px #0006",
          }}
        >
          <p style={{ margin: "0 0 12px", fontSize: 14, lineHeight: 1.65 }}>
            אפשר לאשר מדידה סטטיסטית באמצעות Google Analytics כדי לשפר
            את האתר. המדידה אינה נדרשת לגלישה; אפשר לסרב או לשנות בחירה.
            מידע נוסף בדף <a style={{ color: "#a9d5ff" }} href="/privacy">הפרטיות</a>.
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" onClick={() => choose("accepted")} style={{ padding: "8px 15px", borderRadius: 8, background: "#9bdecc", color: "#182029", border: 0, cursor: "pointer" }}>
              מאשר מדידה
            </button>
            <button type="button" onClick={() => choose("declined")} style={{ padding: "8px 15px", borderRadius: 8, background: "transparent", color: "#ffffff", border: "1px solid #ffffff88", cursor: "pointer" }}>
              לא מעוניין
            </button>
          </div>
        </section>
      )}
      {consent !== null && (
        <button
          type="button"
          onClick={() => choose(null)}
          aria-label="שינוי העדפות מדידה"
          style={{ position: "fixed", bottom: 8, left: 8, zIndex: 9990, padding: "4px 8px", fontSize: 11, borderRadius: 6, background: "#202735", color: "#fff", border: "1px solid #fff5", cursor: "pointer" }}
        >
          העדפות מדידה
        </button>
      )}
    </>
  );
}
