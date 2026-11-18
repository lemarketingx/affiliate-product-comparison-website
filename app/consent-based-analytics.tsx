"use client";

import { useEffect, useRef, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

// One Google tag for the DealPilot GA4 Web Stream.
// Advanced Consent Mode is used without an on-page consent button:
// all storage permissions remain denied, so only cookieless pings may be sent.
const MEASUREMENT_ID = "G-0X26MGR3RJ";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[][];
  gtag?: (...args: unknown[]) => void;
};

export function ConsentBasedAnalytics() {
  const pathname = usePathname();
  const [configured, setConfigured] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const initialized = useRef(false);
  const lastPageView = useRef<string | null>(null);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const analyticsWindow = window as AnalyticsWindow;
    analyticsWindow.dataLayer ??= [];
    analyticsWindow.gtag ??= (...args: unknown[]) => {
      analyticsWindow.dataLayer?.push(args);
    };

    // Consent defaults must be queued BEFORE any config or event calls.
    // No analytics/advertising storage is granted by this implementation.
    analyticsWindow.gtag("consent", "default", {
      analytics_storage: "denied",
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
  }, []);

  useEffect(() => {
    if (!configured || !scriptLoaded || !pathname) return;
    if (lastPageView.current === pathname) return;
    const analyticsWindow = window as AnalyticsWindow;
    lastPageView.current = pathname;
    analyticsWindow.gtag?.("event", "page_view", {
      page_path: pathname,
      // Exclude query parameters and fragments, which may contain search text.
      page_location: window.location.origin + pathname,
      page_title: document.title,
    });
  }, [configured, scriptLoaded, pathname]);

  if (!configured) return null;

  return (
    <Script
      id="dealpilot-ga4-library"
      src={`https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`}
      strategy="afterInteractive"
      onReady={() => setScriptLoaded(true)}
      onLoad={() => setScriptLoaded(true)}
    />
  );
}
