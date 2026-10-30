# Implementation Plan: ORD-3 Locate and Track an Existing Order

Implementation Plan Status: APPROVED

- Application: Order Tracking
- Application Root: order-tracking
- SDLC Artifact Directory: order-tracking/docs/sdlc/stories/ORD-3
- Story ID: ORD-3 (branch story/ORD-3)
- Authority: requirements.md (APPROVED, incl. ASSUMED A-1 to A-4 approved as written); architecture.md (APPROVED, incl. Section 17 observations); design-review.md (PASS WITH MINOR CHANGES, context only)

## Approval Evidence

- Approver: the human (explicit approval relayed through the orchestrator)
- Approval wording: "I approve the ORD-3 implementation plan as written."
- Approval date: 2026-10-30
- Approval scope: order-tracking/docs/sdlc/stories/ORD-3/impl-plan.md as written, including the non-blocking items accepted as placeholders: the fixed message constants (P-3 to P-5), the manual browser and real-device Safari limitation, best-effort timing equalization, and optional throttling IMP-013 (low priority).
- Task states at approval: IMP-001 READY; all other tasks BLOCKED. No task is DONE or accepted.

## Entry Gate Check

- Requirements Status: APPROVED
- Architecture Status: APPROVED
- Design Review: PASS WITH MINOR CHANGES, Architecture Approval Gate ALLOWED. Progression permitted.

## Planning Decisions (technical, within architecture authority; no product behavior decided)

- P-1 Stack per architecture Section 3: Node.js LTS, TypeScript strict, Express, Nunjucks (autoescape on), helmet, Vitest, supertest, Playwright, @axe-core/playwright. All tooling is declared in `order-tracking/package.json` (the application's own package configuration). Nothing borrows another application's node_modules and nothing is installed at repository root.
- P-2 HTTP status for every NotFoundOrNotValidated is 200 with the form re-rendered (DR-006, architecture Section 7). Tests assert 200. FormatError and MissingInput also re-render the form with HTTP 200 for consistent handling; tests assert this single choice.
- P-3 Generic failure message constant: "We could not find or validate that order. Check your details and try again." A test asserts the FR-6 meaning (matches /could not find or validate/i).
- P-4 Format error text constant: "Enter an order number in the format ORD followed by 7 digits (for example ORD1234567)." Never echoes input.
- P-5 Missing input text names the field: "Enter your order number." (contains "order number"), shown in inline error and summary.
- P-6 DR-007: keep `autocomplete="off"` on both fields as written in architecture Section 11 (acceptable for AA). Not changed here.
- P-7 Throttling is optional and not an acceptance criterion (DR-005). Planned as IMP-013 with LOW priority, no customer-visible message beyond a non-order-revealing generic one, and it may be skipped by the human at acceptance.
- P-8 Every test names its FR/AC/NFR ID in the test title (architecture Section 14 item 6).

## Dependency Graph (summary)

IMP-001 -> IMP-002 -> IMP-003 -> IMP-005 -> IMP-007 -> {IMP-009, IMP-010, IMP-011, IMP-008 -> IMP-012} -> IMP-014
IMP-001 -> IMP-004 -> IMP-005
IMP-001 -> IMP-006 -> IMP-007
IMP-006 -> IMP-013 -> IMP-014

## Task Summary

| ID | Title | Priority | Status |
|---|---|---|---|
| IMP-001 | Project scaffold and tooling | High | DONE — ACCEPTED (human decision) |
| IMP-002 | Domain types and input normalizer | High | READY |
| IMP-003 | Validator | High | BLOCKED (IMP-002) |
| IMP-004 | Order model, repository interface, mock data | High | READY |
| IMP-005 | View mapper and lookup service | High | BLOCKED (IMP-002, IMP-003, IMP-004) |
| IMP-006 | Express app shell, security middleware, safe logging, health | High | READY |
| IMP-007 | Routes and accessible templates (form, errors, tracking view) | High | BLOCKED (IMP-005, IMP-006) |
| IMP-008 | Responsive CSS and accessibility styling | Medium | BLOCKED (IMP-007) |
| IMP-009 | Integration tests: AC-1 to AC-4, A-1, A-4 | High | BLOCKED (IMP-007) |
| IMP-010 | Data-protection tests: AC-5 / FR-9 | High | BLOCKED (IMP-007) |
| IMP-011 | Performance smoke test (NFR-1) | Medium | BLOCKED (IMP-007) |
| IMP-012 | Browser E2E and accessibility checks (NFR-2, NFR-3) | High | BLOCKED (IMP-008) |
| IMP-013 | Optional per-IP request throttling | Low | BLOCKED (IMP-006) |
| IMP-014 | Implementation regression and readiness checks | High | BLOCKED (IMP-009 to IMP-013) |

---

## IMP-001 Project scaffold and tooling

- Objective: Create a buildable, testable TypeScript project with its own dependencies and npm scripts.
- Priority: High
- Status: DONE — ACCEPTED (human decision, 2026-10-30)
- Acceptance: Human stated "I accept IMP-001." after reviewing implementation-log.md and the scaffold files. The decision was made by the human, not by the implementation engineer. See implementation-log.md.
- Dependencies: none
- Requirement/AC traceability: enabler for all; Q-004 (no database), FR-1 (web delivery)
- Architecture references: Sections 3, 4, 13; ADR-1
- Implementation scope: `order-tracking/package.json` (scripts: `build`, `start`, `dev`, `test`, `test:unit`, `test:integration`, `test:e2e`, `typecheck`; dependencies per P-1), `order-tracking/tsconfig.json` (strict), `order-tracking/vitest.config.ts`, `order-tracking/playwright.config.ts` (Chromium, Firefox, WebKit, mobile viewports, webServer pointing at the app), `order-tracking/.gitignore` (node_modules, dist, test results), `order-tracking/README.md` (run/test commands), empty `order-tracking/src/` and `order-tracking/tests/` structure with one trivial passing placeholder test under `order-tracking/tests/unit/`. Port from env `PORT` (default 3000).
- Test expectations: placeholder test passes; typecheck and build succeed from `order-tracking/` using only its own `node_modules`.
- Completion criteria: `npm install`, `npm run typecheck`, `npm run build`, `npm test` all succeed run from `order-tracking/`; lockfile committed to the working tree; no files outside `order-tracking/` changed.
- Verification commands: `cd order-tracking && npm install && npm run typecheck && npm run build && npm test`
- Risks/notes: Playwright browser binaries need `npx playwright install` (record outcome; a failure is a recorded limitation, not a blocker for this task). Node LTS version should be recorded in `engines`.

## IMP-002 Domain types and input normalizer

- Objective: Implement shared domain types and the pure normalizer for FR-8.
- Priority: High
- Status: READY
- Dependencies: IMP-001 (DONE)
- Requirement/AC traceability: FR-8, AC-4, A-3; FR-3 (whitespace-only last name treated as omitted); FR-9 (LookupResult types)
- Architecture references: Sections 4 (item 2), 5 (LookupResult), 6 step 1 and step 7; ADR-3
- Implementation scope: `order-tracking/src/domain/types.ts` (TrackingView, LookupResult discriminated union with payload-free failure variants: `MissingInput { field: "orderNumber" }`, `FormatError`, `NotFoundOrNotValidated`, `Success { view }`), `order-tracking/src/domain/normalize.ts`; tests `order-tracking/tests/unit/normalize.test.ts`.
- Test expectations (A-3 / AC-4 / FR-8): trims whitespace; `ord1234567` -> `ORD1234567`; `ORD-1234567` and `ORD 1234567` -> `ORD1234567`; mixed case; leading/trailing whitespace; `ORD--1234567` and `ORD  1234567` (double separators) are NOT collapsed and remain invalid for IMP-003; last name lowercased and trimmed; whitespace-only last name normalizes to omitted.
- Completion criteria: all normalizer tests pass; functions are pure with no HTTP or repository knowledge; types compile under strict mode.
- Verification commands: `cd order-tracking && npm run typecheck && npx vitest run tests/unit/normalize.test.ts`
- Risks/notes: Only one optional separator is allowed (FR-8); do not be lenient beyond it.

## IMP-003 Validator

- Objective: Implement required-field and order-number format checks.
- Priority: High
- Status: BLOCKED. Blocking dependency: IMP-002
- Dependencies: IMP-002
- Requirement/AC traceability: FR-2, FR-7, AC-3, FR-10, A-4
- Architecture references: Sections 4 (item 3), 6 steps 2 and 3, 9
- Implementation scope: `order-tracking/src/domain/validate.ts` (empty check returning MissingInput; regex `^ORD[0-9]{7}$` check returning FormatError); constants for format and missing-field message text (static, P-4, P-5) in `order-tracking/src/domain/messages.ts`; tests `order-tracking/tests/unit/validate.test.ts`.
- Test expectations: empty and whitespace-only -> MissingInput naming orderNumber; too short, too long, wrong prefix, non-digits, double separators -> FormatError; valid values pass; assert message constants do not interpolate any value (A-4: format error text never echoes input).
- Completion criteria: all validator tests pass.
- Verification commands: `cd order-tracking && npm run typecheck && npx vitest run tests/unit/validate.test.ts`
- Risks/notes: Validation must run on normalized input and before any data access.

## IMP-004 Order model, repository interface, mock data

- Objective: Provide server-side-only mock order data behind a repository interface.
- Priority: High
- Status: READY
- Dependencies: IMP-001 (DONE)
- Requirement/AC traceability: Q-004, FR-5 (displayable fields), FR-3 (last-name matching data)
- Architecture references: Sections 4 (item 5), 5; ADR-5
- Implementation scope: `order-tracking/src/data/OrderRepository.ts` (interface `findByOrderId(orderId): Promise<Order | undefined>`), `order-tracking/src/data/mockOrders.ts` (at least 5 fictional orders covering PLACED, PROCESSING, SHIPPED, DELIVERED, plus a second order sharing a last name with another, and an order with mixed-case-friendly last name and one exercising optional dates), `order-tracking/src/data/mockOrderRepository.ts`; Order type; tests `order-tracking/tests/unit/mockOrderRepository.test.ts`.
- Test expectations: known id returns the order; unknown returns undefined; fixture has at least 5 orders, covers each status, has a shared last name, all ids match `ORD[0-9]{7}`; fixture is not imported by any file under `src/web/` static assets (checked in IMP-010).
- Completion criteria: tests pass; fixture contains only fictional data.
- Verification commands: `cd order-tracking && npm run typecheck && npx vitest run tests/unit/mockOrderRepository.test.ts`
- Risks/notes: Fixture must never be bundled into static assets.

## IMP-005 View mapper and lookup service

- Objective: Implement toTrackingView and lookupOrder orchestrating normalization, validation, repository query and last-name matching.
- Priority: High
- Status: BLOCKED. Blocking dependencies: IMP-002, IMP-003, IMP-004
- Dependencies: IMP-002, IMP-003, IMP-004
- Requirement/AC traceability: FR-3, A-1, FR-5, AC-1, FR-6, AC-2, FR-7, AC-3, FR-8, AC-4, FR-9, AC-5, FR-10, A-4
- Architecture references: Sections 4 (items 4, 6), 5, 6 steps 1-7, 8 items 2, 3, 4, 6, 9 table; ADR-3, ADR-4, ADR-6
- Implementation scope: `order-tracking/src/domain/toTrackingView.ts` (maps only orderId, status, items, dates; no customer name), `order-tracking/src/domain/lookupOrder.ts` (repository injected; order-number-only acceptance isolated in a single match step; same code path whether or not the order exists, with a dummy-value compare when absent as best-effort timing equalization); tests `order-tracking/tests/unit/toTrackingView.test.ts`, `order-tracking/tests/unit/lookupOrder.test.ts`.
- Test expectations: each LookupResult variant (Success with last name, Success without last name, whitespace-only last name treated as omitted, last-name mismatch -> NotFoundOrNotValidated, unknown order -> NotFoundOrNotValidated, MissingInput, FormatError); FR-10: repository spy shows zero calls for MissingInput and FormatError; AC-4 variants succeed (`ord-1234567`, ` ORD 1234567 `, last name `  SMITH `); toTrackingView output has exactly keys orderId, status, items, dates and no last name (JSON scan for the fixture last name); runtime assertion that failure results have no keys other than their discriminant (and `field` for MissingInput); type-level assertion that failure variants carry no order-derived fields.
- Completion criteria: all unit tests pass; typecheck passes.
- Verification commands: `cd order-tracking && npm run typecheck && npx vitest run tests/unit`
- Risks/notes: Timing equalization is best effort only; do not claim a guarantee.

## IMP-006 Express app shell, security middleware, safe logging, health

- Objective: Create the Express app factory with security headers, body limit, global error handler, outcome-only logging and `/healthz`.
- Priority: High
- Status: READY
- Dependencies: IMP-001 (DONE)
- Requirement/AC traceability: FR-1, FR-4 (no auth), FR-9, AC-5 (logging, headers, generic error), NFR-1 (small assets)
- Architecture references: Sections 4 (item 1), 8 items 7, 8, 9, 10 (n/a here), 10 (healthz), 13
- Implementation scope: `order-tracking/src/web/app.ts` (`createApp({ repository })` factory for test injection; helmet defaults incl. CSP and `Referrer-Policy: no-referrer`; body size limit; urlencoded parser; static assets from `src/web/public`; Nunjucks configured with autoescape on), `order-tracking/src/web/logger.ts` (logs only outcome category and request ID; no order number in any form, no last name), `order-tracking/src/web/errorHandler.ts` (generic error page, no stack or data), `order-tracking/src/server.ts` (reads `PORT`, HSTS behaviour via helmet, HTTP-to-HTTPS redirect only when behind a configured proxy flag), `GET /healthz` returning no order data; tests `order-tracking/tests/integration/app.test.ts`.
- Test expectations: `/healthz` returns 200 with no order data; response includes helmet headers and `Referrer-Policy: no-referrer`; oversized body rejected; forced internal error returns generic page with no stack trace; logger unit test shows only category and request ID are emitted (feeds IMP-010 log assertions).
- Completion criteria: tests pass; app boots with `npm start`.
- Verification commands: `cd order-tracking && npm run typecheck && npx vitest run tests/integration/app.test.ts`
- Risks/notes: No secrets are introduced (architecture Section 13); do not add HMAC logging (DR-003).

## IMP-007 Routes and accessible templates

- Objective: Implement `GET /` (and `/track`), `POST /track`, and templates for the form, error states and Order Tracking view.
- Priority: High
- Status: BLOCKED. Blocking dependencies: IMP-005, IMP-006
- Dependencies: IMP-005, IMP-006
- Requirement/AC traceability: FR-1, FR-2, FR-3, FR-4, FR-5, AC-1, FR-6, AC-2, FR-7, AC-3, FR-8, AC-4, FR-9, AC-5, FR-10, A-4, NFR-3 (markup)
- Architecture references: Sections 6, 7, 8 items 5, 6, 8, 9 and the table in 9, 11 (markup items), 12; ADR-2, ADR-4
- Implementation scope: `order-tracking/src/web/routes.ts`, `order-tracking/src/web/views/layout.njk`, `form.njk`, `tracking.njk`, `error.njk` (the last owns only the generic error page), optional `order-tracking/src/web/public/enhance.js` (progressive enhancement only; may be omitted). Behaviour: POST body only, never query string; tracking view rendered directly in the POST response with `Cache-Control: no-store` (no redirect); all lookup responses carry `no-store`; HTTP 200 for every failure outcome (P-2); failure messages are constants only (P-3, P-4, P-5); order number retained in the form only when it passes the format check, last name never echoed; message in `role="alert"` element with `aria-describedby` association, an error summary that receives focus on re-render, inline error beside the field; labels bound to inputs, "optional" in the last name label text, `lang` and page titles, semantic headings and landmarks; tracking view as a definition list or table with headers showing order ID, status as text, items (name, quantity), dates (placed, estimated delivery, delivered where present, unambiguous format) and a link back to look up another order; `autocomplete="off"` (P-6).
- Test expectations: smoke checks only here (full suites in IMP-009, IMP-010, IMP-012): GET / renders the form; POST valid order returns tracking view; POST unknown returns generic message; build and typecheck pass.
- Completion criteria: manual `npm start` workflow works for success, not-found, missing and format paths; no template references customer last name.
- Verification commands: `cd order-tracking && npm run typecheck && npm run build && npm test`; `npm start` then exercise the four paths (record the actual results).
- Risks/notes: A redirect to an identifier-only URL is prohibited (ADR-2). Customer-visible consequence (no bookmarkable URL, resubmission prompt) is an approved Section 17 observation; do not change it.

## IMP-008 Responsive CSS and accessibility styling

- Objective: Provide mobile-first, accessible styling.
- Priority: Medium
- Status: BLOCKED. Blocking dependency: IMP-007
- Dependencies: IMP-007
- Requirement/AC traceability: NFR-2, NFR-3
- Architecture references: Section 11
- Implementation scope: `order-tracking/src/web/public/styles.css`; viewport meta confirmed in the layout template; no polyfill-dependent features.
- Test expectations: verified by IMP-012; here do a manual check at 320 px width and 200% zoom and record results.
- Completion criteria: reflow at 320 px with no horizontal scroll; touch targets at least 44x44 CSS px; contrast at least 4.5:1; visible focus indicator; errors not conveyed by colour alone; fluid layout.
- Verification commands: `cd order-tracking && npm run build && npm test`; manual viewport check recorded in implementation log.
- Risks/notes: Contrast values should be computed or checked with a tool, not asserted.

## IMP-009 Integration tests: AC-1 to AC-4, A-1, A-4

- Objective: Add supertest integration coverage of the lookup behaviours.
- Priority: High
- Status: BLOCKED. Blocking dependency: IMP-007
- Dependencies: IMP-007
- Requirement/AC traceability: FR-1 to FR-8, FR-10, AC-1 to AC-4, A-1, A-3, A-4, NFR-3 (markup assertions)
- Architecture references: Section 14 item 2
- Implementation scope: `order-tracking/tests/integration/lookup.test.ts`, `order-tracking/tests/integration/helpers.ts` (app factory with spy repository).
- Test expectations: AC-1 success with and without last name (renders order ID, status, items, dates; HTTP 200; `Cache-Control: no-store`; no redirect); AC-2 unknown order shows generic message meaning "could not find or validate" (FR-6, DR-006) with HTTP 200 and no order details; AC-3 empty order number names "order number" and performs no lookup; AC-4 normalization variants (lowercase, `ORD-`, `ORD `, padded whitespace, last name case/whitespace) succeed in one submission without re-entry (A-3); A-1 last name omitted succeeds, last name supplied and wrong fails; A-4/FR-10 malformed number shows the format error (not the generic message) and the repository spy records zero calls; format-error body does not contain the submitted value; GET `/track?orderNumber=...` does not perform a lookup; markup assertions: `role="alert"`, label associations, error summary present.
- Completion criteria: all tests pass; each test title contains its FR/AC ID.
- Verification commands: `cd order-tracking && npx vitest run tests/integration/lookup.test.ts`
- Risks/notes: none.

## IMP-010 Data-protection tests: AC-5 / FR-9

- Objective: Prove that unsuccessful attempts reveal nothing about any order.
- Priority: High
- Status: BLOCKED. Blocking dependency: IMP-007
- Dependencies: IMP-007
- Requirement/AC traceability: AC-5, FR-9, FR-6, AC-2, A-1 (scoped existence claim), A-4
- Architecture references: Sections 7, 8 (items 1 to 9), 14 item 2 (DR-001 comparison rule); ADR-3, ADR-4
- Implementation scope: `order-tracking/tests/integration/dataProtection.test.ts`, `order-tracking/tests/unit/failureResultShape.test.ts` (if not already covered in IMP-005), `order-tracking/tests/integration/fixtureExposure.test.ts`.
- Test expectations: (1) Compare case (a) an existing order number with a wrong last name against case (b) a different unknown order number with any last name: status code, response headers, message text and DOM structure identical; mask the echoed order-number input value and any per-request token with fixed placeholders, then assert byte-identical bodies (DR-001). (2) For every failure outcome (wrong last name, unknown order, missing, format) scan the response body against the whole fixture (every customer last name, item name, date, and order id of every order other than the permitted echo) and assert none appear; assert the last name submitted is never echoed; assert `Cache-Control: no-store` on all lookup responses. (3) Capture log output during failure and success requests and assert no last name, no order number (full, partial, masked or hashed), no order details; only category and request ID. (4) Assert the generic failure message is one shared constant and the result type for NotFoundOrNotValidated has no payload. (5) Assert the fixture module is not referenced by static assets or served by any route (request known fixture paths and the static directory, scan static files). (6) Assert Referrer-Policy and CSP headers present; identifiers are not accepted from the query string. (7) Assert the global error handler response contains no stack trace or data. (8) Assert the scope statement of the existence oracle: with last name supplied, the two failure cases are indistinguishable (case 1); do not assert indistinguishability for order-number-only attempts (inherent in A-1).
- Completion criteria: all tests pass, titles include AC-5 / FR-9.
- Verification commands: `cd order-tracking && npx vitest run tests/integration/dataProtection.test.ts tests/integration/fixtureExposure.test.ts tests/unit/failureResultShape.test.ts`
- Risks/notes: A masking step that is too broad would silently weaken the test; the masking must replace only the echoed order-number value and a request-ID token, and the test should assert the placeholder substitution occurred.

## IMP-011 Performance smoke test (NFR-1)

- Objective: Provide the smoke-level p95 check from architecture Section 10.
- Priority: Medium
- Status: BLOCKED. Blocking dependency: IMP-007
- Dependencies: IMP-007
- Requirement/AC traceability: NFR-1, A-2
- Architecture references: Section 10
- Implementation scope: `order-tracking/tests/performance/p95.test.ts` (a mix of at least 200 sequential `POST /track` requests including success and failure, computing p95 of latency, asserting under 2000 ms); script `test:perf` in `order-tracking/package.json`.
- Test expectations: p95 under 2 s; measured p95 printed for recording.
- Completion criteria: test passes and measured value recorded; documented as a smoke check against mock data on the local environment, not a load test or a mobile-network measurement.
- Verification commands: `cd order-tracking && npm run test:perf`
- Risks/notes: Mobile-network end to end timing is not covered; record as a limitation.

## IMP-012 Browser E2E and accessibility checks (NFR-2, NFR-3)

- Objective: Run Playwright flows and axe scans across browsers and viewports.
- Priority: High
- Status: BLOCKED. Blocking dependency: IMP-008
- Dependencies: IMP-008
- Requirement/AC traceability: NFR-2, NFR-3, FR-1, FR-5, FR-6, FR-7, FR-10, AC-1 to AC-3
- Architecture references: Sections 11, 14 items 3 and 4
- Implementation scope: `order-tracking/tests/e2e/lookup.spec.ts` (happy path, not-found, missing field, format error; keyboard-only operation; focus moves to error summary on re-render), `order-tracking/tests/e2e/a11y.spec.ts` (axe-core scans on form, each error state, and result page asserting zero serious or critical violations; 320 px reflow no horizontal scroll check; touch target size check), `order-tracking/docs` is not touched; manual checklist file `order-tracking/tests/e2e/manual-checklist.md` (focus order, 200% zoom, 320 px reflow, screen reader spot check, real-device Safari, latest-two-versions coverage) with outcomes recorded in the implementation log.
- Test expectations: projects Chromium, Firefox, WebKit, Edge via Chromium channel where available, plus mobile viewports; all specs pass; any browser or channel that could not be run is recorded as a limitation.
- Completion criteria: automated specs pass on available browsers; manual checklist items marked performed or recorded as not performed with reason.
- Verification commands: `cd order-tracking && npx playwright install && npm run test:e2e`
- Risks/notes: Axe cannot verify all WCAG 2.1 AA criteria; do not claim full conformance from axe alone.

## IMP-013 Optional per-IP request throttling

- Objective: Add basic technical throttling to reduce enumeration (architecture Section 8 item 10).
- Priority: Low (optional; not an acceptance criterion, DR-005)
- Status: BLOCKED. Blocking dependency: IMP-006
- Dependencies: IMP-006
- Requirement/AC traceability: FR-9 / AC-5 hardening only; no requirement mandates it
- Architecture references: Section 8 item 10, Section 17 observation
- Implementation scope: `order-tracking/src/web/throttle.ts` (in-memory per-IP limiter on `POST /track`, limits via env vars with safe defaults); tests `order-tracking/tests/integration/throttle.test.ts`. When throttled, return a generic response that contains no order data and does not distinguish order existence.
- Test expectations: requests above the limit are throttled; throttled response contains no fixture data; limiter does not affect normal test traffic (limits are configurable and defaults permit the performance smoke test, IMP-011).
- Completion criteria: tests pass, or the human defers this task at acceptance. Customer-visible throttling wording is a candidate follow-up story and must not be decided here.
- Verification commands: `cd order-tracking && npx vitest run tests/integration/throttle.test.ts && npm test`
- Risks/notes: Must not break IMP-011 timings or IMP-010 byte-identical comparison. The throttled customer-visible message is a product question, routed to Requirements Analysis if the human wants more than a generic response.

## IMP-014 Implementation regression and readiness checks

- Objective: Run the whole task-level regression suite and confirm the implementation is complete and self-contained before independent stages begin. This does not replace Code Review or Final Verification.
- Priority: High
- Status: BLOCKED. Blocking dependencies: IMP-009, IMP-010, IMP-011, IMP-012, IMP-013
- Dependencies: IMP-009, IMP-010, IMP-011, IMP-012, IMP-013
- Requirement/AC traceability: FR-1 to FR-10, AC-1 to AC-5, NFR-1 to NFR-3
- Architecture references: Sections 10, 13, 14
- Implementation scope: no new features; fix only regressions found in earlier tasks, within their scope; update `order-tracking/README.md` run/test instructions; confirm a clean install from `order-tracking/` works without dependencies from any other application or the repository root; produce a requirement-to-test traceability listing in the implementation log (owned by implementation-engineer).
- Test expectations: full clean run of typecheck, build, unit, integration, perf and e2e suites; every FR, AC and NFR ID appears in at least one test title; record limitations (browsers, real-device Safari, mobile-network timing).
- Completion criteria: all suites pass with recorded actual output; limitations stated honestly.
- Verification commands: `cd order-tracking && rm -rf node_modules && npm ci && npm run typecheck && npm run build && npm test && npm run test:perf && npm run test:e2e`
- Risks/notes: Independent Code Review and Final Verification are separate lifecycle stages and are intentionally not planned here.

---

## Requirement and Architecture Gap Check

No blocking gaps found. Non-blocking observations, none decided here:

- Exact wording of generic, format and missing-field messages is not specified by requirements. This plan fixes technical constant strings (P-3 to P-5) that preserve the FR-6, FR-10 and FR-7 meanings. The human accepted this wording as written at plan approval.
- FR-7 requires "names the missing field". The plan uses "Enter your order number." as the missing-field text. If a different literal is required it is a wording change only.
- Throttling (IMP-013) is optional; any customer-visible throttle behavior would need Requirements Analysis.
- No bookmarkable tracking URL (approved Section 17 observation); not changed.
- Success versus failure reveals order existence when last name is omitted (inherent in A-1, acknowledged). Tests scope the existence-oracle claim accordingly.
- Architecture Section 8 item 4 timing equalization is best effort; no test asserts timing equality.
- NFR-2 coverage of "latest two major versions" and real-device Safari cannot be fully proven by Playwright; recorded as a manual verification limitation.
