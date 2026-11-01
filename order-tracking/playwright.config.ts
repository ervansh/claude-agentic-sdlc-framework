import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.PORT ?? 3000);
// WebKit upgrades http://localhost requests because of the production CSP
// `upgrade-insecure-requests` directive, so all projects use a test-only TLS proxy.
const tlsPort = Number(process.env.E2E_TLS_PORT ?? 3443);

export default defineConfig({
  testDir: "tests/e2e",
  outputDir: "test-results",
  reporter: [["list"]],
  use: { baseURL: `https://localhost:${tlsPort}`, ignoreHTTPSErrors: true },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
    { name: "mobile-chrome", use: { ...devices["Pixel 5"] } },
    { name: "mobile-safari", use: { ...devices["iPhone 12"] } },
  ],
  webServer: [
    {
      command: "npm run build && npm start",
      url: `http://localhost:${port}/healthz`,
      reuseExistingServer: !process.env.CI,
      env: { PORT: String(port) },
    },
    {
      command: "node tests/e2e/support/tls-proxy.mjs",
      url: `https://localhost:${tlsPort}/healthz`,
      ignoreHTTPSErrors: true,
      reuseExistingServer: !process.env.CI,
      env: { PORT: String(port), E2E_TLS_PORT: String(tlsPort) },
    },
  ],
});
