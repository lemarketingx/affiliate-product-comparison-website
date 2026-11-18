import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const file = path => readFile(new URL("../" + path, import.meta.url), "utf8");

test("every brand location shares the colored logo with visible brand name", async () => {
  const [component, home, directory, brandPage, productCard, css] = await Promise.all([
    file("app/brand-logo.tsx"),
    file("app/dealpilot-home.tsx"),
    file("app/brands/page.tsx"),
    file("app/brands/[slug]/page.tsx"),
    file("app/product-card.tsx"),
    file("app/bottomline.css")
  ]);
  assert.match(component, /dp-brand-mark/);
  assert.match(component, /dp-brand-monogram/);
  assert.match(component, /onError=\{\(\) => setBroken\(true\)\}/);
  for (const s of [home, directory, brandPage, productCard]) {
    assert.match(s, /<BrandLogo slug=\{/);
  }
  assert.match(productCard, /compact \/>/);
  assert.match(css, /\.dp-brand-lockup/);
  assert.match(css, /prefers-reduced-motion/);
});

test("every self-hosted brand logo exists, is SVG, and has its source documented", async () => {
  const component = await file("app/brand-logo.tsx");
  const doc = await file("docs/BRAND-ASSETS.md");
  const paths = [...component.matchAll(/file: "\/brands\/([a-z0-9-]+\.(?:svg|png))"/g)].map((m) => m[1]);
  assert.ok(paths.length >= 21);
  for (const p of paths) {
    if (p.endsWith(".svg")) {
      const svg = await file("public/brands/" + p);
      assert.match(svg, /<svg[\s>]/, p + " is an SVG");
      assert.doesNotMatch(svg, /<script|\son[a-z]+=|javascript:|<foreignObject/i, p + " has no script or handler");
    } else {
      const png = await readFile(new URL("../public/brands/" + p, import.meta.url));
      assert.equal(png.subarray(1, 4).toString("latin1"), "PNG", p + " is a PNG");
      assert.ok(png.length < 60_000, p + " stays small");
    }
    assert.ok(doc.includes("`" + p + "`"), p + " is documented in BRAND-ASSETS.md");
  }
  // No runtime third-party logo CDN.
  assert.doesNotMatch(component, /cdn\.jsdelivr\.net/);
});
