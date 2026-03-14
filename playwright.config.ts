import { defineConfig } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://oscars.alexhacks.life";

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // Tests have ordering dependencies within files
  retries: 0,
  workers: 1, // Sequential — tests share live DB state
  reporter: [["html", { open: "never" }], ["list"]],
  use: {
    baseURL: BASE_URL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
  ],
});
