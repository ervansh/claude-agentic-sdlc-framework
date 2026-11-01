# Code Review: ORD-3 Locate and Track an Existing Order

Code Review Status: PASS WITH MINOR CHANGES
Final Verification: ALLOWED

- Application: Order Tracking
- Application Root: order-tracking
- SDLC Artifact Directory: order-tracking/docs/sdlc/stories/ORD-3
- Story ID: ORD-3 (branch story/ORD-3)
- Reviewer: code-reviewer (separate context from implementation)

## Review Scope

- order-tracking/src/ (config, data, domain, web, views, public assets, server)
- order-tracking/tests/ (unit, integration, performance, e2e, e2e/support/tls-proxy.mjs)
- order-tracking/playwright.config.ts, vitest.config.ts, vitest.perf.config.ts, package.json, tsconfig.json, README.md

Entry gate: impl-plan.md shows IMP-001 to IMP-014 all `DONE - ACCEPTED` (IMP-012 "with known limitations", by human decision). Gate satisfied.

## References Used

- requirements.md: Requirements Status APPROVED (human approval evidence recorded; A-1 to A-4 approved as written). Used FR-1 to FR-10, AC-1 to AC-5, NFR-1 to NFR-3.
- architecture.md: Architecture approved (approval recorded at its end). Used Section 8 security items 1 to 10 (DR-001, DR-003, DR-005).
- design-review.md, impl-plan.md, implementation-log.md: context only. No self-reported claim was relied on without checking code or a test run.

## Findings

### Blocking

None. No BLOCKER and no MAJOR findings.

### Non-blocking (MINOR)

**CR-001 MINOR - Dead template and duplicated error markup.**
`src/web/views/error.njk` is never rendered (`grep error.njk src tests` returns no reference). `src/web/errorHandler.ts:4-18` instead embeds a second copy of the same error page as a string constant. Two copies of the page can drift, and the unused template misleads maintainers. Fix: delete `error.njk`, or render it from the handlers.

**CR-002 MINOR - HTTP-to-HTTPS redirect builds its target from the Host header.**
`src/web/app.ts:52` redirects to `https://${req.hostname}...`. With `BEHIND_PROXY=true`, `trust proxy` is 1 (app.ts:29), so `req.hostname` can come from client-supplied `X-Forwarded-Host`/`Host`. A crafted request can produce a redirect to an attacker-chosen host (open redirect, response only sent to the requester, so low impact). Fix: take the canonical host from configuration (for example a `PUBLIC_HOST` env var) rather than request headers.

**CR-003 MINOR - Throttle scans the entire map on every request.**
`src/web/throttle.ts:32-34` iterates all `hits` entries on every POST to purge expired ones. That is O(n) per request, where n is the number of distinct IPs in the window. Memory is bounded by the window, but a many-source flood makes each request costlier. Fix: purge lazily per key, or on a timer or every N requests. Also note the limiter is only wired in `src/server.ts:11`, so `createApp` used alone is unthrottled (expected, but the test helper app is never throttled except in throttle.test.ts).

**CR-004 MINOR - Static and view paths depend on process.cwd().**
`src/web/app.ts:24` uses `path.join(process.cwd(), "src", "web")`. The compiled server (`node dist/src/server.js`) works only if started from `order-tracking/` and only because `src/web/views` and `public` are served from the source tree rather than `dist/`. Starting from another directory fails at the first render. `tests/integration/fixtureExposure.test.ts:25` makes the same assumption. Fix: derive the path from `import.meta.url`, or document the constraint (README already says run from `order-tracking/`, which partly mitigates).

**CR-005 MINOR - A few assertions are vacuous or incidental.**
- `tests/performance/p95.test.ts:69`: `expect(statuses.size).toBeGreaterThan(0)` is always true after 250 requests. The guard that matters (200 seen, no 429) is on lines 67-68. Nothing asserts that failure outcomes were exercised.
- `tests/integration/throttle.test.ts:106`: `appWith(0 + 1)` is a leftover expression; harmless but unclear.
- `tests/unit/scaffold.test.ts:5-7`: `expect(1 + 1).toBe(2)` asserts nothing about the product. Safe to delete now that real tests exist.
None of these hide a defect; the meaningful tests around them are strong.

### Observations (non-blocking, no change required)

**CR-006 OBSERVATION - Order-number-only lookups remain an existence oracle.** `lookupOrder.ts:20-25` and `dataProtection.test.ts:189-201` show that a known order number with no last name succeeds, so anyone who guesses a valid number sees that order. This is the approved A-1 behavior (human acknowledged at Requirements Approval) and is tested explicitly. Mitigation is the optional throttle (IMP-013). Revisit when a real backend lands (architecture Section 8).

**CR-007 OBSERVATION - Production CSP `upgrade-insecure-requests` and HSTS (helmet defaults, `app.ts:39`) break the page when the app is served over plain HTTP on a non-localhost host without `BEHIND_PROXY=true`.** This is what forced the WebKit e2e proxy. README documents `BEHIND_PROXY`; an explicit deployment note that HTTPS is required would help.

**CR-008 OBSERVATION - Keyboard-only e2e test is skipped for touch projects and WebKit (`tests/e2e/lookup.spec.ts:48-51`).** The skip is justified inline and backed by `tests/e2e/manual-checklist.md`, and is a recorded known limitation accepted for IMP-012. Not a silent weakening. I did not run the Playwright suite (see Verification), so cross-browser e2e results are unverified by this review.

**CR-009 OBSERVATION - Default logger writes to console, so the test run prints JSON log lines.** Content is outcome category and request ID only (correct). Optionally inject a silent sink in tests to reduce noise.

## What I Verified and How

| Area | Method | Result |
|------|--------|--------|
| Type safety | `npx tsc -p tsconfig.json --noEmit` | exit 0 |
| Unit and integration tests | `npx vitest run` (no pipes) | 14 files, 119 tests passed |
| FR-2 / FR-10 format and A-4 | Read `validate.ts`, `messages.ts`, `lookupOrder.ts:31-35`; validation runs before `findByOrderId`; tests assert zero repository calls (spy repository) | Correct |
| FR-7 / AC-3 | `validate.ts:8-10` trims and rejects empty; `routes.ts:73-79` names the field with static text | Correct |
| FR-8 / A-3 normalization | `normalize.ts`: trim, uppercase, one optional space or hyphen after ORD; last name lowercase and trim; whitespace-only last name treated as omitted | Correct per FR-8; consistent with A-1 |
| FR-6 / AC-2 generic message | One `NOT_FOUND_MESSAGE` constant (`routes.ts:14`) for unknown order and last-name mismatch; result type is payload-free (`types.ts:30-38`) | Correct |
| AC-5 / FR-9 | `toTrackingView.ts` excludes customer name; failure paths render only static messages; order number echoed only if it matches the format pattern (`routes.ts:89-91`), last name never echoed; DR-001 test masks the echo and compares bodies and headers byte for byte, with a guard against vacuous masking (`dataProtection.test.ts:56-65`) | Correct; test would fail on a leak |
| Query-string identifiers | POST body only (`routes.ts:55-62`); test confirms GET/POST query ignored with zero repo calls | Correct |
| Logging | `logger.ts` accepts only category and request ID; request ID server-generated (`app.ts:33-36`); `dataProtection.test.ts:99-140` checks logged lines and that console is silent | No order number or last name logged |
| Error handling | `errorHandler.ts` renders a static page, never the message or stack; status limited to 4xx else 500; 413 test and `/boom` test | No internals leaked |
| Headers | helmet defaults (CSP, HSTS, nosniff), `Referrer-Policy: no-referrer`, `x-powered-by` disabled, `Cache-Control: no-store` on lookup, error and health responses; 4 kb body limit; autoescape on in nunjucks; no inline script (`enhance.js` is external, so default CSP `script-src 'self'` holds) | Sound |
| Timing equalization | `lookupOrder.ts:20-25` uses same path with dummy value and `timingSafeEqual` over SHA-256 digests; documented best-effort | Acceptable |
| Test-only TLS proxy | Referenced only from `playwright.config.ts:65` and README; lives in `tests/e2e/support/tls-proxy.mjs`; not in `tsconfig.json` `include`, not imported by `src/` (grep), not in `package.json` start or build scripts; uses a throwaway openssl cert in the OS temp dir | Test-only, cannot ship in the runtime path |
| Dependencies | Read `package.json`; runtime deps are express, helmet, nunjucks; test tooling is in devDependencies. No install, audit or upgrade was run | No concern found |
| Scope | Compared source files against impl-plan IMP-001 to IMP-014; throttle is IMP-013 (optional, accepted); `/healthz` and `BEHIND_PROXY` redirect map to architecture Section 8 items | No unapproved features |
| Skipped or weakened tests | `grep` for skip, only, todo: one justified `test.skip` (CR-008); no `.only` or `.todo` | None problematic |

Not verified: Playwright e2e and the performance test were not run. The instructions forbid browser installation, and browsers were not confirmed present. Their evidence is the implementer's log only. Final Verification should run `npm run test:perf` and, where browsers exist, `npm run test:e2e`.

Note: the working tree has uncommitted changes (expected before PR preparation); this review covered the working tree as it stands.

## Progression Decision

**PASS WITH MINOR CHANGES.**

Reason: the implementation satisfies AC-1 to AC-5 and FR-1 to FR-10 as approved, typecheck is clean, and all 119 unit and integration tests pass. The data-protection and no-enumeration tests are meaningful and would fail against a leaking implementation. Security controls match the architecture, and the TLS proxy is confirmed test-only. Open items are five MINOR findings (CR-001 to CR-005), which are cleanup and hardening and are not blockers.

Final Verification: ALLOWED. The minor changes may be done before or alongside PR preparation, at the human's discretion.

Counts: BLOCKER 0, MAJOR 0, MINOR 5, OBSERVATION 4.
