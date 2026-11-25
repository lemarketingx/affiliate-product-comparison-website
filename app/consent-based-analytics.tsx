"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

// One Google tag for the DealPilot GA4 Web Stream.
// Analytics loads only after explicit opt-in. Advertising storage stays denied.
const MEASUREMENT_ID = "G-0X26MGR3RJ";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
};

export function ConsentBasedAnalytics() {
  const pathname = usePathname();
  const [configured, setConfigured] = useState(false);
  const [choice, setChoice] = useState<"yes" | "no" | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try { const v = localStorage.getItem("dealpilot_analytics_choice_v2"); if (v === "yes" || v === "no") setChoice(v); } catch {}
    setReady(true);
  }, []);
  function choose(v: "yes" | "no") {
    try { localStorage.setItem("dealpilot_analytics_choice_v2", v); } catch {}
    if (v === "no") (window as AnalyticsWindow).gtag?.("consent", "update", { analytics_storage: "denied" });
    setChoice(v);
    if (v === "no" && initialized.current) window.location.reload();
  }
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const initialized = useRef(false);
  const lastPageView = useRef<string | null>(null);

  useEffect(() => {
    if (choice !== "yes" || initialized.current) return;
    initialized.current = true;

    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.dataLayer ??= [];
    analyticsWindow.gtag ??= (...args: unknown[]) => {
      analyticsWindow.dataLayer?.push(args);
    };

    // Explicit analytics opt-in precedes config; advertising remains denied.
    analyticsWindow.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    analyticsWindow.gtag("set", "ads_data_redaction", true);
    analyticsWindow.gtag("js", new Date());
    analyticsWindow.gtag("config", MEASUREMENT_ID, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });

    // The old opt-in preference is obsolete; it must not grant consent.
    try {
      localStorage.removeItem("dealpilot_analytics_consent_v1");
    } catch {
      // Browsers may block localStorage; no storage permission is assumed.
    }
    setConfigured(true);
  }, [choice]);

  useEffect(() => {
    if (choice !== "yes" || !configured || !scriptLoaded || !pathname) return;
    if (lastPageView.current === pathname) return;
    const analyticsWindow = window as AnalyticsWindow;
    lastPageView.current = pathname;
    analyticsWindow.gtag?.("event", "page_view", {
      page_path: pathname,
      // Exclude query parameters and fragments, which may contain search text.
      page_location: window.location.origin + pathname,
      page_title: document.title,
    });
  }, [choice, configured, scriptLoaded, pathname]);

  if (!ready) return null;

  return (
    <>
    {choice === null ? <section aria-label="העדפות מדידה" style={{position:"fixed",bottom:16,left:16,right:16,zIndex:1000,background:"#fff",color:"#121417",padding:16,border:"1px solid #aaa",borderRadius:12,maxWidth:480}}><p>האם לאפשר מדידת שימוש באתר באמצעות Google Analytics? הבחירה אינה משפיעה על הגלישה.</p><div style={{display:"flex",gap:12,flexWrap:"wrap"}}><button type="button" onClick={()=>choose("yes")}>אישור מדידה</button><button type="button" onClick={()=>choose("no")}>ללא מדידה</button><a href="/privacy">פרטיות</a></div></section> : <button type="button" style={{position:"fixed",bottom:8,left:8,zIndex:900,background:"#fff",color:"#121417",padding:6,border:"1px solid #aaa",borderRadius:6}} onClick={()=>{ if(choice==="yes") choose("no"); else setChoice(null); }}>{choice==="yes"?"ביטול מדידה":"העדפות מדידה"}</button>}
    {choice === "yes" && configured && <Script
      id="dealpilot-ga4-library"
      src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
      strategy="afterInteractive"
      onReady={() => setScriptLoaded(true)}
      onLoad={() => setScriptLoaded(true)}
    />}
    </>
  );
}
