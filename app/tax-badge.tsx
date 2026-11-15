import { IMPORT_TAX } from "../lib/preflight/import-tax";
import { estimateImportTax, type UsdRate } from "../lib/preflight/tax-estimate";

const TONE = { exempt: "is-go", near: "is-wait", vat: "is-tax", vat_customs: "is-tax", unknown: "is-hold" } as const;

/** Per-product import-tax indicator. Server- and client-safe (pure). */
export function TaxBadge({ price, usdRate, detail = false }: { price: string | null; usdRate: UsdRate | null; detail?: boolean }) {
  const n = price !== null && Number.isFinite(Number(price)) ? Number(price) : null;
  const est = estimateImportTax(n, usdRate, IMPORT_TAX);
  return (
    <span className={"fp-tax " + TONE[est.status]} title={est.detail}>
      <span className="fp-tax-label">{est.label}</span>
      {detail && <span className="fp-tax-detail">{est.detail}</span>}
    </span>
  );
}
