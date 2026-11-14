# AliExpress reports: verification and activation

Research date: 2026-11-14. No account permission was verified merely by inspecting code or public documentation.

Official Alibaba documentation lists both [`aliexpress.affiliate.order.list`](https://developer.alibaba.com/docs/doc.htm?articleId=45802&docType=2&treeId=674) and [`aliexpress.affiliate.order.get`](https://developer.alibaba.com/docs/doc.htm?articleId=45807&docType=2&treeId=674). These pages are in a category explicitly marked deprecated. The current AliExpress documentation SPA could not be retrieved by the research tool. Therefore the method names have historical official support, but current availability and this application's entitlement remain unverified. Do not change a working product-search gateway based on legacy report documentation.

The historical list contract requires start/end timestamps and an order status; the detail contract uses sub-order IDs. Both document estimated paid/finished commissions. These estimates and a completed order do not establish approved, settled or payable earnings. Refund/antispam details remain visible. No approved commission is inferred and no currencies are aggregated.

The official [access workflow](https://developer.alibaba.com/docs/doc.htm?articleId=118193&docType=1&treeId=674) describes developer/application approval using the affiliate account. A documentation label saying no user authorization is required does not prove an app has API access.

## Implemented boundary

- `orders.ts` is server-only and disabled unless `ALIEXPRESS_ORDER_REPORTS_ENABLED=true`; credentials remain server-side.
- Call only from an authenticated private action. The provider deliberately does not authorize requests itself.
- Reports accept explicit UTC start/end times spanning at most 24 hours, one supported status and one page of 20 orders. `hasMore` marks a partial report; never label it an account total.
- `getOrderDetails` accepts at most 20 numeric sub-order IDs.
- No cron, automatic retries, report replication or database creation. Errors return sanitized unavailable states and unknown totals remain `null`.
- Twelve-second request timeout; provider response fields are normalized conservatively. Invalid shapes never silently become zero orders.

## Required before activation

1. Verify current contracts and gateway in the application's authorized AliExpress console.
2. Verify method entitlements, commission units/currency and known report data against AliExpress Portals.
3. Configure the opt-in environment flag through the hosting secret/configuration UI, then make one bounded request from the private interface.
4. If rejected, retain the unavailable state and resolve permissions with AliExpress; do not scrape reports or bypass authorization.

AliExpress remains the source of truth. This is a cautious integration foundation, not a declaration that account reporting is connected.
