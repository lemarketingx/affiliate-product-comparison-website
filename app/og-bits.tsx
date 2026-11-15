/* Visual signatures of the "Originals" identity: banknote guilloche,
   the authenticity seal and the DealPilot wordmark. */
import Link from "next/link";

/* Hypotrochoid rosettes, like the security pattern on a banknote. */
export function Guilloche({
  size = 520,
  rings = 5,
  className = "",
}: {
  size?: number;
  rings?: number;
  className?: string;
}) {
  const c = size / 2;
  const paths: string[] = [];
  for (let k = 0; k < rings; k++) {
    const R = c * (0.92 - k * 0.11);
    const r = R / (7 + k * 2);
    const d = r * (2.4 + k * 0.35);
    let p = "";
    const steps = 720;
    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * Math.PI * 2;
      const x = c + (R - r) * Math.cos(t) + d * Math.cos(((R - r) / r) * t);
      const y = c + (R - r) * Math.sin(t) - d * Math.sin(((R - r) / r) * t);
      p += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
    }
    paths.push(p);
  }
  return (
    <svg
      className={"og-guilloche " + className}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {paths.map((p, i) => (
        <path key={i} d={p} fill="none" strokeWidth={0.6} />
      ))}
    </svg>
  );
}

export function Seal({ id, size = 132, label = "ORIGINAL · OFFICIAL STORE · AUTHENTIC · " }: { id: string; size?: number; label?: string }) {
  return (
    <svg className="og-seal" width={size} height={size} viewBox="0 0 132 132" aria-hidden="true">
      <defs>
        <path id={"og-ring-" + id} d="M66 66m-50 0a50 50 0 1 1 100 0a50 50 0 1 1-100 0" />
      </defs>
      <circle cx="66" cy="66" r="63" className="og-seal-outer" />
      <circle cx="66" cy="66" r="40" className="og-seal-inner" />
      <g className="og-seal-spin">
        <text className="og-seal-text">
          <textPath href={"#og-ring-" + id} textLength="312" lengthAdjust="spacing">{label}</textPath>
        </text>
      </g>
      <path d="M50 67l11 11 22-24" className="og-seal-check" />
    </svg>
  );
}

export function Wordmark({ light = false }: { light?: boolean }) {
  return (
    <Link href="/" className={"og-logo" + (light ? " is-light" : "")} aria-label="DealPilot בית">
      <svg width="34" height="34" viewBox="0 0 34 34" aria-hidden="true">
        <circle cx="17" cy="17" r="15.5" className="og-logo-ring" />
        <circle cx="17" cy="17" r="11" className="og-logo-dot" />
        <path d="M11.5 17.5l3.8 3.8 7.4-8" className="og-logo-check" />
      </svg>
      <span dir="ltr">
        Deal<em>Pilot</em>
      </span>
    </Link>
  );
}

export function serial(id: string) {
  return "No. " + id.slice(-6);
}
