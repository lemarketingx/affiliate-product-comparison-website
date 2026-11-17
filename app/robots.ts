import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  // Public storefront may be indexed; user accounts, API and tracked
  // affiliate redirects should never appear in search results.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin/", "/api/", "/sign-in", "/setup", "/reset-password", "/go/", "/r/"],
    },
    sitemap: "https://affiliate-product-comparison-websit.vercel.app/sitemap.xml",
  };
}
