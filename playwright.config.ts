import { defineConfig, devices } from "@playwright/test";

const external = process.env.BASE_URL;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? "github" : "list",
  expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.002 } },
  use: {
    baseURL: external ?? "http://127.0.0.1:4321/portfolio-site/",
    permissions: ["clipboard-read", "clipboard-write"],
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: external
    ? undefined
    : {
        command: "pnpm exec astro preview --ignore-lock --host 127.0.0.1 --port 4321",
        url: "http://127.0.0.1:4321/portfolio-site/",
        reuseExistingServer: !process.env.CI,
      },
});
