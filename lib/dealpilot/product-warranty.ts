/**
 * Product-level warranty evidence. Affiliate product.query does not provide a
 * reliable warranty provider, service country/address or coverage duration.
 * Populate ONLY from an owner-verified merchant policy or written proof.
 */
export type WarrantyEvidence = {
  provider: string;
  serviceCountry: string;
  serviceAddress: string | null;
  durationMonths: number | null;
  sourceUrl: string;
  checkedAt: string;
  scope: string | null;
};

const verifiedByProduct: Record<string, WarrantyEvidence> = {
  // Example (never publish demo data):
  // "product-id": { provider: "...", serviceCountry: "...", serviceAddress: null,
  //   durationMonths: 12, sourceUrl: "https://...", checkedAt: "2026-11-15", scope: null },
};

export function warrantyFor(productId: string): WarrantyEvidence | null {
  const row = verifiedByProduct[productId];
  if (!row) return null;
  if (!row.provider?.trim() || !row.serviceCountry?.trim() || !row.sourceUrl.startsWith("https://") ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.checkedAt) ||
      !Number.isFinite(Date.parse(row.checkedAt)) || Date.parse(row.checkedAt) > Date.now() ||
      (row.durationMonths !== null && (!Number.isInteger(row.durationMonths) || row.durationMonths < 1)))
    return null;
  return row;
}
