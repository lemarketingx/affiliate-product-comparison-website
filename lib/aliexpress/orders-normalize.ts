// Pure provider boundary. Monetary values remain decimal strings in the supplier currency.
export type AffiliateOrder = {
  id: string;
  parentId: string | null;
  productId: string | null;
  productTitle: string | null;
  status: string | null;
  effectStatus: string | null;
  currency: string | null;
  estimatedPaidCommission: string | null;
  estimatedFinishedCommission: string | null;
  approvedCommission: null;
};

export type OrderMethod = "list" | "get";
export type OrderReport = {
  available: boolean;
  reason: string | null;
  orders: AffiliateOrder[];
  totalRecords: number | null;
  hasMore: boolean;
  approvedCommission: null;
  source: "aliexpress_affiliate_api";
};

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function text(value: unknown): string | null {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
}
function decimal(value: unknown): string | null {
  const amount = text(value);
  return amount !== null && /^\d+(?:\.\d+)?$/.test(amount) ? amount : null;
}
function count(value: unknown): number | null {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}
export function unavailableOrderReport(reason: string): OrderReport {
  return {
    available: false,
    reason,
    orders: [],
    totalRecords: null,
    hasMore: false,
    approvedCommission: null,
    source: "aliexpress_affiliate_api",
  };
}

export function normalizeOrderPayload(
  payload: unknown,
  method: OrderMethod,
): OrderReport {
  const root = record(payload);
  if (!root) return unavailableOrderReport("INVALID_RESPONSE");
  // Never surface raw supplier messages; they may echo request credentials.
  if (root.error_response)
    return unavailableOrderReport("PROVIDER_REJECTED_REQUEST");
  const response = record(
    root[`aliexpress_affiliate_order_${method}_response`],
  );
  const dto = record(response?.resp_result);
  if (!dto || String(dto.resp_code) !== "200")
    return unavailableOrderReport("PROVIDER_REPORT_UNAVAILABLE");
  const result = record(dto.result);
  if (!result) return unavailableOrderReport("INVALID_RESPONSE");
  const container = result.orders;
  const wrapped = record(container);
  const raw = Array.isArray(container) ? container : wrapped?.order;
  // An explicitly empty list is valid. A missing list is only valid with a zero record count.
  if (
    raw == null &&
    count(result.total_record_count ?? result.current_record_count) !== 0
  )
    return unavailableOrderReport("INVALID_RESPONSE");
  const rows = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  const unique = new Map<string, AffiliateOrder>();
  for (const value of rows) {
    const row = record(value);
    if (!row) return unavailableOrderReport("INVALID_ORDER_DATA");
    // Unsafe numeric IDs have already lost precision; fail rather than invent an ID.
    const identifier = row.sub_order_id ?? row.order_number;
    if (typeof identifier === "number" && !Number.isSafeInteger(identifier))
      return unavailableOrderReport("INVALID_ORDER_ID");
    const id = text(identifier);
    if (!id || !/^\d{1,32}$/.test(id))
      return unavailableOrderReport("INVALID_ORDER_ID");
    const currency = text(row.settled_currency);
    unique.set(id, {
      id,
      parentId: text(row.order_id ?? row.parent_order_number),
      productId: text(row.product_id),
      productTitle: text(row.product_title),
      status: text(row.order_status),
      effectStatus: text(row.effect_detail_status),
      currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : null,
      estimatedPaidCommission: decimal(row.estimated_paid_commission),
      estimatedFinishedCommission: decimal(row.estimated_finished_commission),
      // Buyer Confirmed Receipt and estimated_finished_commission do NOT establish payment approval.
      approvedCommission: null,
    });
  }
  const page = count(result.current_page_no);
  const pages = count(result.total_page_no);
  return {
    available: true,
    reason: null,
    orders: [...unique.values()],
    totalRecords: count(result.total_record_count),
    hasMore: page !== null && pages !== null && page < pages,
    approvedCommission: null,
    source: "aliexpress_affiliate_api",
  };
}
