// Explicit Node preload for the isolated populated-flow test server only.
// This module is never imported by application code and provides no HTTP bypass or route.
if (
  !["http://127.0.0.1:3102", "http://127.0.0.1:3103", "http://127.0.0.1:3104", "http://127.0.0.1:3105", "http://127.0.0.1:3199"].includes(process.env.NEXTAUTH_URL ?? "") ||
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
  const catalogSet = process.env.DEALPILOT_FIXTURE_SET === "catalog";
  // TEST FIXTURE exchange rate (Bank of Israel public API shape); never a real quote.
  if (url.startsWith("https://boi.org.il/PublicApi/GetExchangeRate"))
    return Response.json({ key: "USD", currentExchangeRate: 3.2, currentChange: 0, unit: 1, lastUpdate: "2026-11-13T10:00:00Z" });
  // Simulated redirect chain for generated banner links (catalog fixture only).
  if (catalogSet && url.startsWith("https://s.click.aliexpress.com/e/TEST_BANNER_")) {
    const id = url.split("TEST_BANNER_")[1].replace(/\D/g, "");
    return new Response(null, { status: 302, headers: { location: `https://www.aliexpress.com/item/${id}.html?aff_fixture=1` } });
  }
  if (catalogSet && url.startsWith("https://www.aliexpress.com/item/")) return new Response("<html>fixture item</html>", { status: 200 });
  if (url !== "https://api-sg.aliexpress.com/sync")
    return originalFetch(input, init);
  const params = new URLSearchParams(String(init?.body ?? ""));
  // Optional simulated provider latency (performance checks only).
  const latency = Number(process.env.DEALPILOT_FIXTURE_LATENCY_MS ?? 0);
  if (latency > 0) await new Promise((r) => setTimeout(r, Math.min(latency, 5000)));
  const wrap = (method, result) =>
    Response.json({ [method.replace(/\./g, "_") + "_response"]: { resp_result: { resp_code: 200, resp_msg: "ok", result } } });
  if (catalogSet && params.get("app_key") === "fixture-only-never-real" && init?.method === "POST") {
    const method = params.get("method");
    if (method === "aliexpress.affiliate.featuredpromo.get")
      return wrap(method, { promos: { promo: [
        { promo_name: "TEST FIXTURE Hot Product", promo_desc: "קמפיין בדיקה בלבד", product_num: 1200 },
        { promo_name: "TEST FIXTURE Ended Sale", promo_desc: "הסתיים", product_num: 30, promo_end_time: "2026-01-01 00:00:00" },
        { promo_name: "TEST FIXTURE Weekly Deals", product_num: 400, promo_start_time: "2026-01-01 00:00:00", promo_end_time: "2030-12-31 23:59:59" },
        { promo_name: "TEST FIXTURE Broken", product_num: 5 },
        { promo_name: "TEST FIXTURE Best Seller", product_num: 900 },
      ] } });
    if (method === "aliexpress.affiliate.featuredpromo.products.get") {
      const name = params.get("promotion_name") ?? "";
      let h = 11;
      for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 99991;
      const id = String(1005200000000 + h);
      return wrap(method, { products: { product: [{
        product_id: id, product_title: "TEST FIXTURE — " + name,
        product_main_image_url: `https://ae01.alicdn.com/kf/dealpilot-fixture-banner-${id}.jpg`,
        // Realistic: a localised detail URL with tracking-style query parameters.
        product_detail_url: name.includes("Broken") ? "https://evil.test/x" : `https://he.aliexpress.com/item/${id}.html?gatewayAdapt=glo2isr&aff_fixture=1`,
      }] } });
    }
    // Product-ID price check (TEST FIXTURE). Simulates a provider that rejects
    // target_currency=ILS with 402, to exercise the profile fallback to USD.
    // (Live run #6 points at tracking_id as the rejected parameter instead.)
    // USD answers carry the price +4% vs the search quote, another SKU, and
    // id 1005000000777 is never returned (stale-price scenario).
    if (method === "aliexpress.affiliate.productdetail.get") {
      if (params.get("country") !== "IL") throw new Error("Detail profile missing");
      if (params.get("target_currency") === "ILS")
        return Response.json({ aliexpress_affiliate_productdetail_get_response: { resp_result: { resp_code: 402, resp_msg: "The input parameter target_currency is invalid (TEST FIXTURE)" } } });
      const ids = (params.get("product_ids") ?? "").split(",").filter((id) => /^\d+$/.test(id) && id !== "1005000000777");
      if (ids.length > 20) throw new Error("Detail batch above 20");
      return Response.json({ aliexpress_affiliate_productdetail_get_response: { resp_result: { resp_code: 200, resp_msg: "ok", result: { products: { product: ids.map((id) => {
        const searchIls = 9.9 + (Number(id.slice(-3)) % 200) * 4;
        const usd = ((searchIls / 3.7) * 1.04).toFixed(2);
        return {
          product_id: id,
          product_title: "TEST FIXTURE — detail " + id,
          product_main_image_url: `https://ae01.alicdn.com/kf/dealpilot-fixture-${id}.jpg`,
          product_detail_url: `https://www.aliexpress.com/item/${id}.html`,
          sku_id: "99" + id.slice(-6),
          sale_price: usd, sale_price_currency: "USD",
          target_sale_price: usd, target_sale_price_currency: "USD",
        };
      }) } } } } });
    }
    if (method === "aliexpress.affiliate.link.generate") {
      const sources = (params.get("source_values") ?? "").split(",").filter(Boolean);
      // Simulated provider validation (TEST FIXTURE): tracking id required, canonical URLs only.
      const bad = (msg) => Response.json({ aliexpress_affiliate_link_generate_response: { resp_result: { resp_code: 402, resp_msg: msg } } });
      if (!params.get("tracking_id")) return bad("The input parameter tracking_id that is mandatory for processing this request is not supplied.");
      if (sources.some((src) => src.includes("?") || !src.startsWith("https://www.aliexpress.com/")))
        return bad("Invalid parameter source_values: " + sources.join(","));
      return wrap(method, {
        tracking_id: params.get("tracking_id"),
        total_result_count: sources.length,
        promotion_links: { promotion_link: sources.map((src) => ({
          source_value: src,
          promotion_link: "https://s.click.aliexpress.com/e/TEST_BANNER_" + src.replace(/\D/g, ""),
        })) },
      });
    }
  }
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
      lastest_volume: 12000,
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
  const pageNo = Number(params.get("page_no"));
  const pageSize = Number(params.get("page_size"));
  if (!Number.isInteger(pageNo) || pageNo < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 50)
    throw new Error("Invalid paging parameters");
  // Large deterministic catalog (3104) for pagination, dedupe and rejection checks.
  // Every product is labelled TEST FIXTURE; none of it is represented as live data.
  if (process.env.DEALPILOT_FIXTURE_SET === "catalog") {
    const keywords = params.get("keywords") ?? "";
    let h = 7;
    for (const ch of keywords) h = (h * 31 + ch.charCodeAt(0)) % 1000003;
    const rows = pageNo >= 3 ? 20 : pageSize; // third page is short: term exhausted
    const product = [];
    for (let row = 0; row < rows; row++) {
      // Rows 0–4 come from a shared pool, so different terms return duplicates.
      const id = row < 5 ? String(1005090000000 + row) : String(1005100000000 + h * 1000 + pageNo * 100 + row);
      const kind = Number(id.slice(-1));
      const base = {
        product_id: id,
        // Brand-first fixture: reject intentionally unbranded candidates.
        product_title: kind === 3
          ? `TEST FIXTURE — מוצר גנרי ${row} עמוד ${pageNo}`
          : `TEST FIXTURE — ${keywords.split(" ")[0]} מוצר קטלוג ${row} עמוד ${pageNo}`,
        shop_name: kind === 3 ? "Generic Store" : keywords.split(" ")[0] + " Store",
        target_sale_price: (9.9 + (Number(id.slice(-3)) % 200) * 4).toFixed(2), // 9.90–805.90 ₪: exempt and taxable
        target_sale_price_currency: "ILS",
        lastest_volume: kind === 0 ? 3000 : 5001 + (Number(id.slice(-4)) * 7) % 40000,
        commission_rate: "6%",
        product_main_image_url: `https://ae01.alicdn.com/kf/dealpilot-fixture-${id}.jpg`,
        product_detail_url: `https://www.aliexpress.com/item/${id}.html`,
        promotion_link: kind === 1 ? undefined : `https://s.click.aliexpress.com/e/TEST_CATALOG_${id}`,
      };
      if (kind === 2) {
        base.target_sale_price = undefined;
        base.sale_price = "3.50";
        base.sale_price_currency = "USD";
      }
      product.push(base);
    }
    return Response.json({
      aliexpress_affiliate_product_query_response: {
        resp_result: {
          resp_code: 200,
          result: { current_page_no: pageNo, current_record_count: rows, total_record_count: 2 * pageSize + 20, products: { product } },
        },
      },
    });
  }
  // Separate isolated server (3103) for pre-flight briefing checks: typed products only.
  if (process.env.DEALPILOT_FIXTURE_SET === "missions") {
    const mission = (id, title, price) => ({
      ...products[0],
      product_id: id,
      product_title: title,
      target_sale_price: price,
      product_main_image_url: "https://ae01.alicdn.com/dealpilot-test-fixture-cable.png",
      product_detail_url: `https://www.aliexpress.com/item/${id}.html`,
      promotion_link: `https://s.click.aliexpress.com/e/TEST_MISSION_${id}`,
    });
    return Response.json({
      aliexpress_affiliate_product_query_response: {
        resp_result: {
          resp_code: 200,
          result: {
            products: {
              product: [
                mission("1005005550001", "TEST FIXTURE — מצלמת דרך קדמית ואחורית Dash Cam 4K", "149.90"),
                mission("1005005550002", "TEST FIXTURE — מקליט NVR 8CH PoE H.265 למצלמות", "389.00"),
              ],
            },
          },
        },
      },
    });
  }
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
