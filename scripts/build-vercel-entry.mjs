import { mkdir, readFile, writeFile } from "node:fs/promises";

// Vercel serves the entry URL; Sites retains the authenticated app and D1.
const root = new URL("../", import.meta.url);
const config = JSON.parse(await readFile(new URL("vercel.json", root), "utf8"));
const redirect = config.redirects.find(rule => rule.source === "/:path*");
const target = new URL(redirect.destination);
if (target.protocol !== "https:") throw new Error("The application URL must use HTTPS.");
const escape = value => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
const destination = escape(target.href);
const html = [
  '<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=' + destination + '">',
  '<title>קשר — מערכת שותפים למשכנתאות</title>',
  '<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f7f8fc;color:#292d48;font:16px Arial,sans-serif}main{text-align:center;padding:32px}h1{font-size:38px}p{line-height:1.8;color:#70748a}a{display:inline-block;background:#7970d9;color:white;border-radius:10px;padding:14px 24px;text-decoration:none}</style>',
  '</head><body><main><h1>קשר</h1><p>פותחים את מערכת השותפים שלך.</p>',
  '<a href="' + destination + '">כניסה למערכת</a></main></body></html>',
].join("");
const output = new URL(config.outputDirectory + "/", root);
await mkdir(output, { recursive: true });
await writeFile(new URL("index.html", output), html);
console.log("Kesher entry point built.");
