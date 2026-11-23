import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const file = (path) => new URL("../" + path, import.meta.url);

test("internal catalog status report is removed from the public site", async () => {
  await assert.rejects(access(file("app/catalog-status/page.tsx")));
  for (const path of ["app/dealpilot-home.tsx", "app/catalog-browser.tsx", "app/public-shell.tsx"]) {
    const source = await readFile(file(path), "utf8");
    assert.ok(!source.includes('href="/catalog-status"'), path);
  }
});

test("affiliate financial interest remains clear near purchase and on disclosure page", async () => {
  const [product, catalog, disclosure, shell] = await Promise.all(
    ["app/products/[id]/page.tsx", "app/catalog-browser.tsx", "app/disclosure/page.tsx", "app/public-shell.tsx"]
      .map((path) => readFile(file(path), "utf8")),
  );
  assert.match(product, /קישור שותפים: רכישה לאחר מעבר/);
  assert.match(catalog, /עשויים לזכות אותנו בעמלה/);
  assert.match(disclosure, /קישורים מסחריים \(קישורי שותפים\)/);
  assert.match(shell, /קישורי הקנייה עשויים לזכות אותנו בעמלה/);
  assert.doesNotMatch(shell, /האתר משתמש בקישורי שותפים/);
});
