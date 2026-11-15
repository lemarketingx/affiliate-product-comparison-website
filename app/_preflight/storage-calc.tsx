"use client";
import { useId, useState } from "react";
import { estimateStorage, type StorageInput } from "../../lib/preflight/storage-calc";
import { Term } from "./term";

const num = (v: string) => (v.trim() === "" ? NaN : Number(v));

export function StorageCalc({ media, defaults }: { media: "hdd" | "sd"; defaults?: Partial<Record<"cameras" | "hours" | "days", number>> }) {
  const id = useId();
  const [cameras, setCameras] = useState(String(defaults?.cameras ?? (media === "sd" ? 1 : 4)));
  const [resolution, setResolution] = useState<StorageInput["resolution"]>("4MP");
  const [codec, setCodec] = useState<StorageInput["codec"]>("h265");
  const [hours, setHours] = useState(String(defaults?.hours ?? (media === "sd" ? 2 : 24)));
  const [days, setDays] = useState(String(defaults?.days ?? (media === "sd" ? 7 : 14)));
  const [bitrate, setBitrate] = useState("");
  const result = estimateStorage({
    cameras: num(cameras),
    resolution,
    codec,
    hoursPerDay: num(hours),
    days: num(days),
    bitrateMbps: bitrate.trim() ? num(bitrate) : null,
    media,
  });
  return (
    <section className="fp-calc" aria-labelledby={id + "t"}>
      <span className="fp-kicker">מחשבון</span>
      <h2 id={id + "t"}>{media === "sd" ? "איזה כרטיס זיכרון צריך?" : "כמה דיסק צריך?"}</h2>
      <div className="fp-calc-grid">
        <label>
          <span>מספר מצלמות</span>
          <input inputMode="numeric" value={cameras} onChange={(e) => setCameras(e.target.value)} />
        </label>
        <label>
          <span>רזולוציה</span>
          <select value={resolution} onChange={(e) => setResolution(e.target.value as StorageInput["resolution"])}>
            <option value="2MP">2MP (1080p)</option>
            <option value="4MP">4MP (2K)</option>
            <option value="8MP">8MP (4K)</option>
          </select>
        </label>
        <label>
          <span>קידוד <Term id="h265" /></span>
          <select value={codec} onChange={(e) => setCodec(e.target.value as StorageInput["codec"])}>
            <option value="h265">H.265</option>
            <option value="h264">H.264</option>
          </select>
        </label>
        <label>
          <span>{media === "sd" ? "שעות נסיעה / הקלטה ביום" : "שעות הקלטה ביום"}</span>
          <input inputMode="decimal" value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label>
          <span>כמה ימים לשמור</span>
          <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} />
        </label>
        <label>
          <span>ביטרייט מהמפרט (Mbps, לא חובה)</span>
          <input inputMode="decimal" value={bitrate} placeholder="למשל 4" onChange={(e) => setBitrate(e.target.value)} />
        </label>
      </div>
      <div className="fp-calc-out" role="status" aria-live="polite">
        {result.ok ? (
          <>
            <p>
              צריך בערך <strong dir="ltr">{result.gb >= 1000 ? (result.gb / 1000).toFixed(1) + " TB" : result.gb + " GB"}</strong>.
              המלצה: <strong>{result.recommended}</strong>.
            </p>
            <details>
              <summary>ההנחות שמאחורי המספר</summary>
              <ul>{result.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
            </details>
          </>
        ) : (
          <p className="fp-calc-err">{result.error}</p>
        )}
      </div>
    </section>
  );
}
