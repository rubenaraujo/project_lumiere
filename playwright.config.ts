import { defineConfig } from "@playwright/test";

const PORT = 8081;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${PORT}/project_lumiere/`,
    locale: "pt-PT",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 390, height: 844 }, hasTouch: true } },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}/project_lumiere/`,
    reuseExistingServer: !process.env.CI,
    env: { VITE_TMDB_API_KEY: "e2e-key" },
  },
});
