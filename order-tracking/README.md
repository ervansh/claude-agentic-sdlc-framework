# Order Tracking

Server-rendered Node.js + TypeScript + Express app for locating and tracking an existing order (story ORD-3).

Requires Node.js >= 22. Run all commands from `order-tracking/`.

## Setup

```
npm install
```

## Run

```
npm run build       # tsc -p tsconfig.json; compiles to dist/
npm start           # node dist/src/server.js; serves the built app. PORT env var, default 3000
npm run dev         # tsx watch src/server.ts; watch mode, no build needed
```

`npm start` requires `npm run build` to have been run first. Set `BEHIND_PROXY=true` when the app sits behind an HTTPS-terminating proxy (enables the HTTP to HTTPS redirect; `/healthz` is exempt).

## Check and test

```
npm run typecheck          # tsc -p tsconfig.json --noEmit
npm test                   # vitest run: all Vitest tests (unit and integration)
npm run test:unit          # vitest run tests/unit
npm run test:integration   # vitest run tests/integration
npm run test:perf          # performance smoke test (NFR-1: POST /track p95 under 2 s), uses vitest.perf.config.ts
npm run test:e2e           # playwright test: browser and accessibility checks
```

`npm test` does not include the performance test (`tests/performance/`) or the Playwright specs (`tests/e2e/`); run `npm run test:perf` and `npm run test:e2e` separately.

### End-to-end tests

- Browsers: Playwright projects are chromium, firefox, webkit, mobile-chrome (Pixel 5), and mobile-safari (iPhone 12).
- Browser binaries: if they are not yet installed, install them once with `npx playwright install` (this downloads browsers; it is not part of the normal test run).
- `npm run test:e2e` starts the app (`npm run build && npm start`, port `PORT`, default 3000) and a test-only TLS reverse proxy (`tests/e2e/support/tls-proxy.mjs`) on port 3443 (override with `E2E_TLS_PORT`). Tests run against `https://localhost:3443`.
- The TLS proxy needs the `openssl` CLI on the PATH. It uses it to generate a throwaway self-signed certificate in the OS temp directory at startup; nothing is committed.
- Reason for the proxy: WebKit honors the production CSP `upgrade-insecure-requests` directive on plain-http localhost, which broke the page there. The proxy leaves the app's responses unmodified.
- A manual accessibility and browser checklist is in `tests/e2e/manual-checklist.md`; it is not automated.
