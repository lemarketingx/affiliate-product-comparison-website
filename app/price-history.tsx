import type { PriceHistory } from "../lib/catalog-store/price-view";
import { formatMoney } from "../lib/dealpilot/urls";

// Server-rendered step chart of the prices our scheduled checks received from
// AliExpress. A price holds until the next check, so the line steps. No client
// JS: each point carries a native tooltip, and the full list is a table.
const W = 640, H = 220, PAD = { top: 20, right: 20, bottom: 44, left: 116 };
const dateFmt = new Intl.DateTimeFormat("he-IL", { day: "numeric", month: "numeric", timeZone: "Asia/Jerusalem" });
const fullFmt = new Intl.DateTimeFormat("he-IL", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jerusalem" });

export function PriceHistoryChart({ history }: { history: PriceHistory }) {
  const { points, currency, min, max } = history;
  const t0 = Date.parse(history.first), t1 = Date.parse(history.last);
  const flat = max === min;
  const pad = flat ? Math.max(min * 0.05, 1) : (max - min) * 0.15;
  const lo = Math.max(0, min - pad), hi = max + pad;
  const x = (iso: string) => PAD.left + ((Date.parse(iso) - t0) / Math.max(1, t1 - t0)) * (W - PAD.left - PAD.right);
  const y = (v: number) => PAD.top + (1 - (v - lo) / (hi - lo)) * (H - PAD.top - PAD.bottom);
  let d = `M${x(points[0].at).toFixed(1)},${y(points[0].price).toFixed(1)}`;
  for (let i = 1; i < points.length; i++) d += ` H${x(points[i].at).toFixed(1)} V${y(points[i].price).toFixed(1)}`;
  const money = (v: number) => formatMoney(String(v), currency);
  const gridValues = flat ? [min] : [min, max];
  const last = points[points.length - 1];

  return (
    <section className="bl-section bl-history" aria-labelledby="bl-history-h">
      <h2 id="bl-history-h">היסטוריית המחיר שבדקנו</h2>
      <p className="bl-history-summary">
        {flat
          ? `המחיר לא השתנה ב־${history.checks} הבדיקות מאז ${fullFmt.format(new Date(history.first))}.`
          : `${history.checks} בדיקות מאז ${fullFmt.format(new Date(history.first))}. הנמוך ביותר שראינו: `}
        {!flat && <strong dir="ltr">{money(min)}</strong>}
        {!flat && " · הגבוה ביותר: "}
        {!flat && <strong dir="ltr">{money(max)}</strong>}
      </p>
      <svg
        className="bl-history-chart"
        viewBox={`0 0 ${W} ${H}`}
        direction="ltr"
        role="img"
        aria-label={`גרף מחיר: ${history.checks} בדיקות, בין ${money(min)} ל־${money(max)}`}
      >
        {gridValues.map((v) => (
          <g key={v}>
            <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="bl-history-grid" />
            <text x={PAD.left - 8} y={y(v) + 4} textAnchor="end" className="bl-history-axis">{money(v)}</text>
          </g>
        ))}
        <text x={PAD.left} y={H - 6} textAnchor="start" className="bl-history-axis">{dateFmt.format(new Date(history.first))}</text>
        <text x={W - PAD.right} y={H - 6} textAnchor="end" className="bl-history-axis">{dateFmt.format(new Date(history.last))}</text>
        <path d={d} className="bl-history-line" />
        {points.map((p) => (
          <circle key={p.at} cx={x(p.at)} cy={y(p.price)} r={p === last ? 5 : 4} className={"bl-history-dot" + (p === last ? " is-last" : "")}>
            <title>{`${fullFmt.format(new Date(p.at))}: ${money(p.price)}`}</title>
          </circle>
        ))}
      </svg>
      <details className="bl-history-table">
        <summary>כל הבדיקות בטבלה</summary>
        <table>
          <thead>
            <tr><th scope="col">מועד הבדיקה</th><th scope="col">מחיר</th></tr>
          </thead>
          <tbody>
            {[...points].reverse().map((p) => (
              <tr key={p.at}><td>{fullFmt.format(new Date(p.at))}</td><td dir="ltr">{money(p.price)}</td></tr>
            ))}
          </tbody>
        </table>
      </details>
      <p className="bl-fine">
        מחירים שהתקבלו מ־AliExpress בבדיקות המתוזמנות שלנו, לאותה וריאציה ובאותו מטבע. זו לא היסטוריה מלאה של המוצר ולא הבטחה למחיר בעתיד.
      </p>
    </section>
  );
}
