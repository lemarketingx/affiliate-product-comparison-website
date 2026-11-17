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
