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
        : process.env.DEALPILOT_CHROMIUM_PATH
          ? { executablePath: process.env.DEALPILOT_CHROMIUM_PATH }
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
        DEALPILOT_FX_DISABLED: "true",
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
    {
      command:
        "node --import ./tests/fixtures/provider.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3103",
      url: "http://127.0.0.1:3103/api/health",
      reuseExistingServer: false,
      env: {
        NEXTAUTH_SECRET: process.env.DEALPILOT_QA_SECRET,
        NEXTAUTH_URL: "http://127.0.0.1:3103",
        GITHUB_ID: "local-test-client",
        GITHUB_SECRET: "local-test-secret",
        DEALPILOT_ADMIN_GITHUB_IDS: "123",
        ALIEXPRESS_APP_KEY: "fixture-only-never-real",
        ALIEXPRESS_APP_SECRET: "fixture-only-never-real",
        ALIEXPRESS_ORDER_REPORTS_ENABLED: "false",
        DEALPILOT_FIXTURE_SET: "missions",
        DEALPILOT_CACHE_NAMESPACE: `qa-missions-${Date.now()}`,
      },
    },
    {
      command:
        "node --import ./tests/fixtures/provider.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3104",
      url: "http://127.0.0.1:3104/api/health",
      reuseExistingServer: false,
      env: {
        NEXTAUTH_SECRET: process.env.DEALPILOT_QA_SECRET,
        NEXTAUTH_URL: "http://127.0.0.1:3104",
        GITHUB_ID: "local-test-client",
        GITHUB_SECRET: "local-test-secret",
        DEALPILOT_ADMIN_GITHUB_IDS: "123",
        ALIEXPRESS_APP_KEY: "fixture-only-never-real",
        ALIEXPRESS_APP_SECRET: "fixture-only-never-real",
        ALIEXPRESS_ORDER_REPORTS_ENABLED: "false",
        DEALPILOT_FIXTURE_SET: "catalog",
        DEALPILOT_CATALOG_REQUEST_BUDGET: "200",
        ALIEXPRESS_TRACKING_ID: "dealpilot-qa",
        DEALPILOT_CACHE_NAMESPACE: `qa-catalog-${Date.now()}`,
      },
    },
    {
      // Persistent catalog store: fixture provider + fixture Supabase (pglite running the real migration).
      command:
        "node --import ./tests/fixtures/provider.mjs --import ./tests/fixtures/store.mjs node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 3105",
      url: "http://127.0.0.1:3105/api/health",
      reuseExistingServer: false,
      env: {
        NEXTAUTH_SECRET: process.env.DEALPILOT_QA_SECRET,
        NEXTAUTH_URL: "http://127.0.0.1:3105",
        GITHUB_ID: "local-test-client",
        GITHUB_SECRET: "local-test-secret",
        DEALPILOT_ADMIN_GITHUB_IDS: "123",
        ALIEXPRESS_APP_KEY: "fixture-only-never-real",
        ALIEXPRESS_APP_SECRET: "fixture-only-never-real",
        ALIEXPRESS_ORDER_REPORTS_ENABLED: "false",
        ALIEXPRESS_TRACKING_ID: "dealpilot-qa",
        DEALPILOT_FIXTURE_SET: "catalog",
        DEALPILOT_FX_DISABLED: "true",
        DEALPILOT_SUPABASE_URL: "https://fixture-only.supabase.co",
        DEALPILOT_SUPABASE_SERVICE_ROLE_KEY: "fixture-only-never-real",
        CRON_SECRET: "fixture-cron-secret-0123456789abcdef",
        DEALPILOT_IMPORT_MAX_CALLS: "30",
        DEALPILOT_PRICE_MAX_CALLS: "10",
        DEALPILOT_CACHE_NAMESPACE: `qa-store-${Date.now()}`,
      },
    },
  ],
});
