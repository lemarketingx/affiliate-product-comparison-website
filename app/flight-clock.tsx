"use client";
import { useEffect, useState } from "react";

/* Israel local time for the departures board. Renders a placeholder on the server
   so hydration never mismatches. */
export default function FlightClock() {
  const [now, setNow] = useState<string | null>(null);
  useEffect(() => {
    const f = new Intl.DateTimeFormat("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Jerusalem",
    });
    const tick = () => setNow(f.format(new Date()));
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);
  return (
    <span className="fp-clock" dir="ltr" aria-label="שעון ישראל">
      {now ?? "--:--"}
    </span>
  );
}
