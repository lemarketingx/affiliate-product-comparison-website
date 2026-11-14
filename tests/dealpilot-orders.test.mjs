import test from "node:test";
import assert from "node:assert/strict";
import {normalizeOrderPayload, unavailableOrderReport} from "../lib/aliexpress/orders-normalize.ts";

const order = {sub_order_id:"12345678901234567890", order_id:"1234567890", order_status:"Buyer Confirmed Receipt",
  estimated_paid_commission:"1.25", estimated_finished_commission:"1.20", settled_currency:"USD", effect_detail_status:"FullRefund"};
const payload = (rows, extra={}) => ({aliexpress_affiliate_order_list_response:{resp_result:{resp_code:200,
  result:{orders:{order:rows}, total_record_count:rows.length, current_page_no:1, total_page_no:1, ...extra}}}});

test("finished and refunded orders never become approved commission", () => {
  const result = normalizeOrderPayload(payload([order]), "list");
  assert.equal(result.available,true);
  assert.equal(result.orders[0].id,order.sub_order_id);
  assert.equal(result.orders[0].estimatedFinishedCommission,"1.20");
  assert.equal(result.orders[0].effectStatus,"FullRefund");
  assert.equal(result.orders[0].approvedCommission,null);
  assert.equal(result.approvedCommission,null);
});
test("unavailable reports distinguish unknown count from zero", () => {
  assert.equal(unavailableOrderReport("REPORTS_NOT_ENABLED").totalRecords,null);
  assert.equal(normalizeOrderPayload(payload([]),"list").totalRecords,0);
});
test("malformed response cannot masquerade as an empty report", () => {
  assert.equal(normalizeOrderPayload({},"list").available,false);
  const result = normalizeOrderPayload({aliexpress_affiliate_order_list_response:{resp_result:{resp_code:200,result:{}}}},"list");
  assert.equal(result.available,false);
});
test("supplier errors are sanitized", () => {
  const result = normalizeOrderPayload({error_response:{msg:"secret-app-key"}},"list");
  assert.equal(result.reason,"PROVIDER_REJECTED_REQUEST");
  assert.ok(!JSON.stringify(result).includes("secret-app-key"));
});
test("duplicates are removed and pagination is declared", () => {
  const result = normalizeOrderPayload(payload([order,order],{total_record_count:25,total_page_no:2}),"list");
  assert.equal(result.orders.length,1);
  assert.equal(result.hasMore,true);
});
test("invalid money is missing and unsafe numeric IDs fail closed", () => {
  const result = normalizeOrderPayload(payload([{...order,estimated_paid_commission:"NaN",settled_currency:"bad"}]),"list");
  assert.equal(result.orders[0].estimatedPaidCommission,null);
  assert.equal(result.orders[0].currency,null);
  assert.equal(normalizeOrderPayload(payload([{...order,sub_order_id:12345678901234567890}]),"list").available,false);
});
test("order.get supports single-object wrapper", () => {
  const result = normalizeOrderPayload({aliexpress_affiliate_order_get_response:{resp_result:{resp_code:"200",
    result:{orders:{order},current_record_count:1}}}},"get");
  assert.equal(result.orders.length,1);
  assert.equal(result.totalRecords,null);
});
