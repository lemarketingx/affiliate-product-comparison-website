// Recording storage estimate. Transparent: every result lists its assumptions.
export type StorageInput = {
  cameras: number;
  resolution: "2MP" | "4MP" | "8MP";
  codec: "h264" | "h265";
  hoursPerDay: number;
  days: number;
  /** Optional bitrate from the product spec, Mbps. Overrides the assumption. */
  bitrateMbps?: number | null;
  media: "hdd" | "sd";
};
export type StorageResult =
  | { ok: true; gb: number; recommended: string; bitrateMbps: number; assumptions: string[] }
  | { ok: false; error: string };

// Typical default H.264 main-stream bitrates. Assumptions, not manufacturer data.
export const ASSUMED_H264_MBPS = { "2MP": 4, "4MP": 6, "8MP": 12 } as const;
export const H265_FACTOR = 0.5;
const HDD_TB = [1, 2, 3, 4, 6, 8, 10, 12, 14, 16, 18, 20];
const SD_GB = [32, 64, 128, 256, 512];

function valid(n: unknown, min: number, max: number): n is number {
  return typeof n === "number" && Number.isFinite(n) && n >= min && n <= max;
}

export function estimateStorage(input: StorageInput): StorageResult {
  if (!valid(input.cameras, 1, 64) || !Number.isInteger(input.cameras))
    return { ok: false, error: "מספר מצלמות צריך להיות מספר שלם בין 1 ל־64." };
  if (!valid(input.hoursPerDay, 0.1, 24)) return { ok: false, error: "שעות הקלטה ביום: בין 0.1 ל־24." };
  if (!valid(input.days, 1, 365) || !Number.isInteger(input.days))
    return { ok: false, error: "ימי שמירה: מספר שלם בין 1 ל־365." };
  if (!(input.resolution in ASSUMED_H264_MBPS)) return { ok: false, error: "רזולוציה לא מוכרת." };
  const custom = input.bitrateMbps;
  if (custom !== null && custom !== undefined && !valid(custom, 0.1, 100))
    return { ok: false, error: "ביטרייט: בין 0.1 ל־100 Mbps." };
  const assumptions: string[] = [];
  let mbps: number;
  if (custom) {
    mbps = custom;
    assumptions.push(`ביטרייט ${custom} Mbps לכל מצלמה, כפי שהזנתם מהמפרט.`);
  } else {
    const base = ASSUMED_H264_MBPS[input.resolution];
    mbps = input.codec === "h265" ? base * H265_FACTOR : base;
    assumptions.push(
      `הנחה: ${base} Mbps למצלמת ${input.resolution} ב־H.264` +
        (input.codec === "h265" ? `, וחצי מזה (${mbps} Mbps) ב־H.265.` : ".") +
        " זה ערך נפוץ, לא נתון יצרן. הביטרייט בפועל משתנה לפי סצנה והגדרות.",
    );
  }
  assumptions.push("החישוב: מצלמות × ביטרייט × שניות הקלטה ÷ 8 = נפח. 1GB = 1000MB.");
  const gb = (input.cameras * mbps * 3600 * input.hoursPerDay * input.days) / 8 / 1000;
  // Keep ~15% headroom for filesystem, events and bitrate peaks.
  const need = gb * 1.15;
  assumptions.push("הוספנו כ־15% מרווח לקבצי מערכת ולשיאי ביטרייט.");
  let recommended: string;
  if (input.media === "sd") {
    const size = SD_GB.find((s) => s >= need);
    recommended = size ? `כרטיס ${size}GB` : `יותר מ־512GB: קצרו את ימי השמירה או בחרו מכשיר עם דיסק`;
    assumptions.push("כשהכרטיס מתמלא, רוב המכשירים מוחקים את ההקלטה הישנה ביותר (Loop).");
  } else {
    const size = HDD_TB.find((s) => s * 1000 >= need);
    recommended = size ? `דיסק ${size}TB` : "יותר מ־20TB: צריך כמה דיסקים או מקליט גדול יותר";
    assumptions.push("בדקו שהמקליט תומך בנפח הזה (Max HDD capacity).");
  }
  return { ok: true, gb: Math.round(gb * 10) / 10, recommended, bitrateMbps: mbps, assumptions };
}
