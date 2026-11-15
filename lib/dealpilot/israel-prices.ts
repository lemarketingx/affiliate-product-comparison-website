/* Israeli retail prices, entered BY HAND by the site owner only.
   Every entry needs the store, a link and the date it was checked.
   No scraping, no estimates. Products without an entry show no comparison,
   and an entry older than MAX_AGE_DAYS is hidden as stale. */
export type IsraelPrice = {
  productId: string;
  price: number; // ILS, including VAT, as shown by the store
  store: string;
  url: string;
  checkedAt: string; // YYYY-MM-DD
  /* Official Israeli importer warranty, if the store states it. */
  importerWarranty?: boolean;
};

export const MAX_AGE_DAYS = 30;

export const israelPrices: IsraelPrice[] = [];

export function israelPriceFor(productId: string, now = Date.now()) {
  const p = israelPrices.find((x) => x.productId === productId);
  if (!p) return null;
  const age = (now - Date.parse(p.checkedAt)) / 86400000;
  if (!Number.isFinite(age) || age > MAX_AGE_DAYS || age < -1) return null;
  return p;
}
