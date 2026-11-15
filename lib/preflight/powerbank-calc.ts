export type PowerbankInput = {
  bankMah: number;
  phoneMah: number;
  /** Fraction of energy that reaches the phone. Assumption, editable. */
  efficiency?: number;
};
export type PowerbankResult =
  | { ok: true; charges: number; bankWh: number; over100Wh: boolean; assumptions: string[] }
  | { ok: false; error: string };

export const CELL_VOLTAGE = 3.7;
export const PHONE_VOLTAGE = 3.85;
export const DEFAULT_EFFICIENCY = 0.65;

export function estimateCharges(input: PowerbankInput): PowerbankResult {
  const eff = input.efficiency ?? DEFAULT_EFFICIENCY;
  if (!Number.isFinite(input.bankMah) || input.bankMah < 500 || input.bankMah > 100000)
    return { ok: false, error: "קיבולת הסוללה הניידת: בין 500 ל־100,000 mAh." };
  if (!Number.isFinite(input.phoneMah) || input.phoneMah < 500 || input.phoneMah > 20000)
    return { ok: false, error: "סוללת הטלפון: בין 500 ל־20,000 mAh." };
  if (!Number.isFinite(eff) || eff <= 0 || eff > 1) return { ok: false, error: "יעילות: בין 0 ל־1." };
  const bankWh = (input.bankMah * CELL_VOLTAGE) / 1000;
  const phoneWh = (input.phoneMah * PHONE_VOLTAGE) / 1000;
  const charges = Math.floor(((bankWh * eff) / phoneWh) * 10) / 10;
  return {
    ok: true,
    charges,
    bankWh: Math.round(bankWh * 10) / 10,
    over100Wh: bankWh > 100,
    assumptions: [
      `הקיבולת הכתובה נמדדת במתח התא, ${CELL_VOLTAGE}V: ${Math.round(bankWh * 10) / 10}Wh.`,
      `הנחה: כ־${Math.round(eff * 100)}% מהאנרגיה מגיעים לטלפון. השאר הולך לאיבודי המרה וחום. בסוללות זולות היעילות לעיתים נמוכה יותר.`,
      `סוללת הטלפון חושבה לפי ${PHONE_VOLTAGE}V.`,
    ],
  };
}
