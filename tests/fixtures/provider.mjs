// Explicit Node preload for the isolated populated-flow test server only.
// This module is never imported by application code and provides no HTTP bypass or route.
if (
  process.env.NEXTAUTH_URL !== "http://127.0.0.1:3102" ||
  process.env.ALIEXPRESS_APP_KEY !== "fixture-only-never-real" ||
  process.env.ALIEXPRESS_APP_SECRET !== "fixture-only-never-real"
) {
  throw new Error(
    "Provider fixture requires isolated local test server and fake credentials",
  );
}
const originalFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url;
  if (url !== "https://api-sg.aliexpress.com/sync")
    return originalFetch(input, init);
  const params = new URLSearchParams(String(init?.body ?? ""));
  if (
    init?.method !== "POST" ||
    params.get("method") !== "aliexpress.affiliate.product.query" ||
    params.get("app_key") !== "fixture-only-never-real"
  ) {
    throw new Error("Unexpected provider fixture request");
  }
  if (
    params.get("target_language") !== "HE" ||
    params.get("ship_to_country") !== "IL" ||
    params.get("sort") !== "LAST_VOLUME_DESC" ||
    params.get("target_currency") !== "ILS"
  )
    throw new Error("Hebrew/Israel discovery profile missing");
  const products = [
    {
      product_id: "1005001234567",
      product_title: "TEST FIXTURE — מארגן כבלים לבדיקה בלבד",
      target_sale_price: "12.50",
      target_sale_price_currency: "ILS",
      lastest_volume: 1200,
      commission_rate: "5%",
      // Deliberately unsupported fields must not grant publication eligibility.
      evaluate_rate: "98.0%",
      rating: 5,
      ship_to_country: "IL",
      israel_review_count: 99,
      product_main_image_url:
        "https://ae01.alicdn.com/dealpilot-test-fixture-cable.png",
      product_detail_url: "https://www.aliexpress.com/item/1005001234567.html",
      promotion_link: "https://s.click.aliexpress.com/e/TEST_FIXTURE_ONLY",
    },
    {
      product_id: "1005007654321",
      product_title: "TEST FIXTURE — מועמד ללא מחיר וקידום",
      product_main_image_url:
        "https://ae01.alicdn.com/dealpilot-test-fixture-missing.png",
      product_detail_url: "https://www.aliexpress.com/item/1005007654321.html",
    },
  ];
  products.push({
    ...products[0],
    product_id: "1005001111111",
    product_title: "TEST FIXTURE — מחיר דולר שאסור להציג כשקלים",
    target_sale_price: undefined,
    target_sale_price_currency: "ILS",
    sale_price: "3.50",
    sale_price_currency: "USD",
    product_detail_url: "https://www.aliexpress.com/item/1005001111111.html",
    promotion_link: "https://s.click.aliexpress.com/e/TEST_USD_FIXTURE_ONLY",
  });
  const custom = {
    ...products[0],
    product_id: "1005003333333",
    product_title: "TEST FIXTURE — תוצאה מותאמת לשמירה בלשונית",
    target_sale_price: "17.75",
    product_detail_url: "https://www.aliexpress.com/item/1005003333333.html",
    promotion_link: "https://s.click.aliexpress.com/e/TEST_CUSTOM_FIXTURE_ONLY",
  };
  return Response.json({
    aliexpress_affiliate_product_query_response: {
      resp_result: {
        resp_code: 200,
        result: {
          products: {
            product:
              params.get("keywords") === "custom fixture" ? [custom] : products,
          },
        },
      },
    },
  });
};
