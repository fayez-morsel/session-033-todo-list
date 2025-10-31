const { defineConfig, devices } = require("@playwright/test");

const baseURL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://127.0.0.1:5173";
const apiBaseURL =
  process.env.API_BASE_URL ||
  process.env.PLAYWRIGHT_API_BASE_URL ||
  "http://127.0.0.1:4000";
const frontendHost = new URL(baseURL).hostname || "127.0.0.1";
const frontendPort = new URL(baseURL).port || "5173";
const webServer =
  process.env.CI
    ? undefined
    : {
        command: `npm run dev -- --host ${frontendHost} --port ${frontendPort}`,
        url: baseURL,
        reuseExistingServer: true,
        env: {
          VITE_API_URL: apiBaseURL,
        },
        timeout: 120_000,
      };

module.exports = defineConfig({
  testDir: "./tests",
  timeout: 5 * 60 * 1000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [["github"], ["html", { outputFolder: "playwright-report", open: "never" }]]
    : "list",
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  ...(webServer ? { webServer } : {}),
});
