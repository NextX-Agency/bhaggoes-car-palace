import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  workers: 2,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", trace: "retain-on-failure", ...devices["Desktop Chrome"] },
  webServer: { command: "npm run dev -- --port 3000", url: "http://localhost:3000", reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
