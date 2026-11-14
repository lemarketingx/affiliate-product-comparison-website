import { defineConfig } from "@playwright/test";
import { randomBytes } from "node:crypto";
process.env.DEALPILOT_QA_SECRET ??= randomBytes(40).toString("hex");
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3101",
    launchOptions:
      process.platform === "win32"
        ? {
            executablePath:
              "C:/Program Files/Google/Chrome/Application/chrome.exe",
          }
        : {},
  },
  webServer: [
    {
      command:
        "node node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3101",
      url: "http://127.0.0.1:3101/api/health",
      reuseExistingServer: false,
      env: {
        NEXTAUTH_SECRET: process.env.DEALPILOT_QA_SECRET,
        NEXTAUTH_URL: "http://127.0.0.1:3101",
        GITHUB_ID: "local-test-client",
        GITHUB_SECRET: "local-test-secret",
        DEALPILOT_ADMIN_GITHUB_IDS: "123",
        ALIEXPRESS_APP_KEY: "",
        ALIEXPRESS_APP_SECRET: "",
        ALIEXPRESS_ORDER_REPORTS_ENABLED: "false",
      },
    },
    {
      command:
        "node --import ./tests/fixtures/provider.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3102",
      url: "http://127.0.0.1:3102/api/health",
      reuseExistingServer: false,
      env: {
        NEXTAUTH_SECRET: process.env.DEALPILOT_QA_SECRET,
        NEXTAUTH_URL: "http://127.0.0.1:3102",
        GITHUB_ID: "local-test-client",
        GITHUB_SECRET: "local-test-secret",
        DEALPILOT_ADMIN_GITHUB_IDS: "123",
        ALIEXPRESS_APP_KEY: "fixture-only-never-real",
        ALIEXPRESS_APP_SECRET: "fixture-only-never-real",
        ALIEXPRESS_ORDER_REPORTS_ENABLED: "false",
        DEALPILOT_CACHE_NAMESPACE: `qa-fixture-${Date.now()}`,
      },
    },
  ],
});
