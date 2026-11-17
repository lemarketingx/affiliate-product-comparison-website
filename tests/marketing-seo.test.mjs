import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = async (path) => readFile(new URL("../" + path, import.meta.url), "utf8");

test("public SEO permits indexing while protecting private routes and affiliate redirects", async () => {
  const [layout, robots, sitemap] = await Promise.all([
    source("app/layout.tsx"), source("app/robots.ts"), source("app/sitemap.ts"),
  ]);
  assert.match(layout, /robots:\s*\{\s*index:\s*true,\s*follow:\s*true/);
  assert.match(robots, /allow:\s*"\/"/);
  for (const route of ["/admin/", "/api/", "/sign-in", "/go/", "/r/"]) {
    assert.ok(robots.includes(JSON.stringify(route)), route);
  }
  assert.match(robots, /sitemap\.xml/);
  assert.match(sitemap, /getCatalog/);
  assert.match(sitemap, /\/products\//);
  assert.match(sitemap, /\/brands\//);
  assert.doesNotMatch(sitemap, /paths\.add\("\/admin/);
  assert.doesNotMatch(sitemap, /return \[\];/);
});

test("marketing copy avoids promising exact checkout price or universally verified links", async () => {
  const [home, product, shell] = await Promise.all([
    source("app/dealpilot-home.tsx"), source("app/products/[id]/page.tsx"), source("app/public-shell.tsx"),
  ]);
  assert.match(home, /קונים עם יותר מידע/);
  assert.match(home, /המחיר הסופי נקבע בקופה/);
  assert.doesNotMatch(home, /המחיר האמיתי/);
  assert.doesNotMatch(home, /הקישור נבדק ומוביל לאותו מוצר/);
  assert.doesNotMatch(product, /הקישור נבדק ומוביל לאותו מוצר/);
  assert.doesNotMatch(shell, /קישורים שנבדקו ·/);
});
