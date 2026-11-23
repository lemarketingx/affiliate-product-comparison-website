/** Hebrew product counts for public-facing copy, with correct singular grammar. */
export function productsCount(n: number): string {
  return n === 1 ? "מוצר אחד" : n.toLocaleString("he-IL") + " מוצרים";
}
export function identifiedProductsCount(n: number): string {
  return n === 1 ? "מוצר מזוהה אחד" : n.toLocaleString("he-IL") + " מוצרים מזוהים";
}
