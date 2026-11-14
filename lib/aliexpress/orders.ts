import "server-only";
import { configured, signAffiliateParams } from "./affiliate";
import {
  normalizeOrderPayload,
  unavailableOrderReport,
  type OrderMethod,
  type OrderReport,
} from "./orders-normalize";

const GATEWAY = "https://api-sg.aliexpress.com/sync";
export const ORDER_METHODS = {
  list: "aliexpress.affiliate.order.list",
  get: "aliexpress.affiliate.order.get",
} as const;

export function orderReportsEnabled() {
  return process.env.ALIEXPRESS_ORDER_REPORTS_ENABLED === "true";
}

function chinaTimestamp(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const p = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

// No cache of account reports, no scheduler and no automatic retry. Invoke only after private route authorization.
async function requestOrders(
  method: OrderMethod,
  input: Record<string, string>,
): Promise<OrderReport> {
  if (!orderReportsEnabled())
    return unavailableOrderReport("REPORTS_NOT_ENABLED");
  if (!configured()) return unavailableOrderReport("CREDENTIALS_MISSING");
  const params: Record<string, string> = {
    app_key: process.env.ALIEXPRESS_APP_KEY!.trim(),
    method: ORDER_METHODS[method],
    sign_method: "hmac",
    format: "json",
    v: "2.0",
    timestamp: chinaTimestamp(new Date()),
    ...input,
  };
  params.sign = signAffiliateParams(
    params,
    process.env.ALIEXPRESS_APP_SECRET!.trim(),
  );
  try {
    const response = await fetch(GATEWAY, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
      },
      body: new URLSearchParams(params),
      cache: "no-store",
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return unavailableOrderReport("PROVIDER_HTTP_ERROR");
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      return unavailableOrderReport("INVALID_JSON");
    }
    return normalizeOrderPayload(payload, method);
  } catch {
    return unavailableOrderReport("PROVIDER_UNREACHABLE");
  }
}

export type OrderListInput = {
  startTime: string;
  endTime: string;
  status: "Payment Completed" | "Buyer Confirmed Receipt";
};

export async function getOrderReport(
  input: OrderListInput,
): Promise<OrderReport> {
  // Dates must be explicit ISO instants. Limit interactive reports to 24 hours and one page (20 orders).
  const iso = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/;
  const start = Date.parse(input.startTime);
  const end = Date.parse(input.endTime);
  if (
    !iso.test(input.startTime) ||
    !iso.test(input.endTime) ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 86400000 ||
    end > Date.now() ||
    !["Payment Completed", "Buyer Confirmed Receipt"].includes(input.status)
  )
    return unavailableOrderReport("INVALID_REPORT_RANGE");
  return requestOrders("list", {
    start_time: chinaTimestamp(new Date(start)),
    end_time: chinaTimestamp(new Date(end)),
    status: input.status,
    page_no: "1",
    page_size: "20",
  });
}

export async function getOrderDetails(ids: string[]): Promise<OrderReport> {
  if (
    !Array.isArray(ids) ||
    ids.length < 1 ||
    ids.length > 20 ||
    ids.some((id) => typeof id !== "string" || !/^\d{1,32}$/.test(id))
  )
    return unavailableOrderReport("INVALID_ORDER_IDS");
  return requestOrders("get", { order_ids: [...new Set(ids)].join(",") });
}
