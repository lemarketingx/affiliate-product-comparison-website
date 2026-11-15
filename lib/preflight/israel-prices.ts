// Israeli reference prices, entered MANUALLY by the site owner only.
// Never scraped, guessed or estimated. Without an entry no gap is shown.
export type IsraelPrice = {
  typeId: string;
  /** What exactly was priced, e.g. "מצלמה סולארית WiFi, 4MP". */
  label: string;
  store: string;
  priceILS: number;
  url: string;
  checkedAt: string; // YYYY-MM-DD
};

export const ISRAEL_PRICES: IsraelPrice[] = [];

export function validIsraelPrice(p: IsraelPrice): boolean {
  return (
    Number.isFinite(p.priceILS) &&
    p.priceILS > 0 &&
    /^https:\/\//.test(p.url) &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.checkedAt) &&
    !!p.store.trim()
  );
}
export function pricesFor(typeId: string, list: IsraelPrice[] = ISRAEL_PRICES) {
  return list.filter((p) => p.typeId === typeId && validIsraelPrice(p));
}
