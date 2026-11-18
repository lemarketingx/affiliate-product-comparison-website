"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

const MEASUREMENT_ID = "G-0X26MGR3RJ";
const STORAGE_KEY = "dealpilot_analytics_consent_v1";
type Consent = "accepted" | "declined" | null;

export function ConsentBasedAnalytics() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent>(null);
  const [initialized, setInitialized] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [scriptFailed, setScriptFailed] = useState(false);
  const configured = useRef(false);
  const lastSentPath = useRef<string | null>(null);

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
    if (value !== "accepted") {
      setScriptLoaded(false);
      setScriptFailed(false);
      configured.current = false;
      lastSentPath.current = null;
    }
  }

  // Wait for the external GA4 library to load before initializing the tag.
  // This avoids firing a page_view before the script is ready.
  useEffect(() => {
    if (!initialized || consent !== "accepted" || !scriptLoaded) return;
    const analyticsWindow = window as Window & {
      dataLayer?: unknown[][];
      gtag?: (...args: unknown[]) => void;
    };
    analyticsWindow.dataLayer ??= [];
    analyticsWindow.gtag ??= (...args: unknown[]) => {
      analyticsWindow.dataLayer?.push(args);
    };

    if (!configured.current) {
      analyticsWindow.gtag("js", new Date());
      analyticsWindow.gtag("config", MEASUREMENT_ID, { send_page_view: false });
      configured.current = true;
    }

    // Track route changes explicitly, without URL query strings or fragments.
    if (pathname && lastSentPath.current !== pathname) {
      lastSentPath.current = pathname;
      analyticsWindow.gtag("event", "page_view", {
        page_path: pathname,
        page_location: window.location.origin + pathname,
        page_title: document.title,
      });
    }
  }, [initialized, consent, pathname, scriptLoaded]);

  if (!initialized) return null;

  return (
    <>
      {consent === "accepted" && (
        <Script
          id="dealpilot-ga4-library"
          src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
          strategy="afterInteractive"
          onLoad={() => { setScriptLoaded(true); setScriptFailed(false); }}
          onReady={() => { setScriptLoaded(true); setScriptFailed(false); }}
          onError={() => { setScriptFailed(true); setScriptLoaded(false); }}
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
      {consent === "accepted" && scriptFailed && (
        <p role="status" style={{ position: "fixed", bottom: 42, left: 8, zIndex: 9991, padding: 8, borderRadius: 6, background: "#202735", color: "#fff", fontSize: 11 }}>
          מערכת המדידה נחסמה או לא נטענה. אפשר לגלוש באתר כרגיל.
        </p>
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
