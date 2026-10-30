import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

// Pixel baselines were reviewed on macOS arm64. Do not silently regenerate them
// on Linux: CI runs all functional and geometry checks and publishes screenshots.
export default defineConfig({
  ...base,
  forbidOnly: true,
  globalTimeout: 15 * 60 * 1000,
  testIgnore: /visual.spec.ts/,
  projects: base.projects?.filter((project) => project.name !== "tablet"),
  webServer: {
    ...base.webServer,
    command: "npm run preview",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
  },
});
