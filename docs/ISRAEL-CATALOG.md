# Israeli audience and shekel catalog

Updated 2026-11-14. This is a category selection rationale, not a ranking of Israeli AliExpress sales. No country-level AliExpress sales dataset is available to this project.

## Evidence used

- [Wolt / Kantar online consumer report 2025, publisher's release](https://press.wolt.com/he-IL/259534-78-61-70/): among online shoppers, 90% reported fashion purchases, 75% electronics and 66% toys. These are survey purchase-incidence figures across online commerce, not spending shares, unit sales, AliExpress-only purchases or mutually exclusive shares. Food and supermarket categories are prominent but do not fit this affiliate storefront.
- [Bank Hapoalim, Financial Life in Israel 2025](https://www.fingrow.co.il/sites/default/files/2026-01/Consumer_Report_2025_full_report.pdf), printed page 22: clothing, grooming and gadgets feature among the surveyed online purchases. The report also cites previous-year figures; those must not be treated as 2025 observations or combined with Wolt's different population.
- [Redbox Parcel customer survey reported by MegaPro](https://www.megapro.org.il/%D7%9E%D7%92%D7%94-%D7%AA%D7%A2%D7%A9%D7%99%D7%95%D7%AA/%D7%9B%D7%AA%D7%91%D7%95%D7%AA/%D7%9E%D7%92%D7%94-%D7%AA%D7%A2%D7%A9%D7%99%D7%95%D7%AA-%D7%A4%D7%9C%D7%95%D7%A1/%D7%9E%D7%94-%D7%94%D7%9C%D7%A7%D7%95%D7%97%D7%95%D7%AA-%D7%94%D7%99%D7%A9%D7%A8%D7%90%D7%9C%D7%99%D7%9D-%D7%94%D7%9B%D7%99-%D7%9E%D7%97%D7%A4%D7%A9%D7%99%D7%9D-%D7%9C%D7%A7%D7%A0%D7%95%D7%AA-%D7%91%D7%97%D7%9534%D7%9C): November 2025, 859 customers, multiple answers allowed. Supports fashion, technology, grooming, games, housewares and sports as cross-border shopping interests. Customer sample and secondary publication limit generalization to all Israeli buyers.

## Implementation decisions

Expanded four categories to eight: fashion/accessories, technology, home/kitchen, grooming accessories, games/leisure, sports/outdoors, car accessories and organization. Existing URLs remain valid. The new categories and query phrases are editorial choices guided by those surveys; they are not measured market ranks. Category assignment follows the supplier search used for discovery, and individual results still require review.

Supplier requests use Hebrew HE, destination IL and target_currency=ILS. The public catalog admits only returned ILS quotes; no fixed exchange rate or currency-symbol substitution is used. Amount and currency are taken together from one quote. The versioned catalog cache invalidates earlier USD queries. Product detail and storefront copy explain supplier prices in shekels and the final checkout price at AliExpress.

The >500 reported purchases filter and pending-verification disclosures remain. Survey category popularity does not prove that a particular item has Israeli reviews, a 4.7 star rating or delivery to Israel.
