# Verification: ORD-3 Locate and Track an Existing Order

Final Verification Outcome: VERIFIED WITH HUMAN WAIVER (e2e criterion waived)
Final Verification Decision: VERIFIED WITH HUMAN WAIVER (e2e criterion waived). The e2e suite did NOT pass. See "Human Waiver" section.
Pull Request Preparation: ALLOWED (solely because the human waived the e2e criterion on 2026-11-02; the waiver covers only that criterion)

Status: the earlier verification run (2026-11-01) ended FAILED. That evidence is kept intact below. On 2026-11-02 the human waived the e2e criterion, which changed the recorded outcome. The e2e criterion is not recorded as PASSED or VERIFIED.

Reason for the earlier FAILED result (retained as historical evidence): `npm run test:e2e` exited 1 (2 failed, 3 skipped, 65 passed). A required check exiting non-zero forces FAILED. All other commands exited 0. A diagnostic re-run with `--workers=2` exited 0, but it does not replace the required run (see E2E section).

- Application: Order Tracking
- Application Root: order-tracking
- SDLC Artifact Directory: order-tracking/docs/sdlc/stories/ORD-3
- Story ID: ORD-3 (branch story/ORD-3)
- Verifier: verification-engineer (separate context from implementation and code review)
- Date: 2026-11-01

## Entry Gate

code-review.md: PASS WITH MINOR CHANGES, Final Verification ALLOWED. Gate satisfied. Code Review did not run perf or e2e; both were run here.

## Commands Run (from order-tracking/, no pipes, output redirected to files)

| # | Command | Exit code | Summary |
|---|---------|-----------|---------|
| 1 | `npm run typecheck` | 0 | `tsc -p tsconfig.json --noEmit`, no diagnostics |
| 2 | `npm run build` | 0 | `tsc -p tsconfig.json`, no diagnostics |
| 3 | `npm test` | 0 | Test Files 14 passed (14); Tests 119 passed (119) |
| 4 | `npx vitest run` | 0 | Test Files 14 passed (14); Tests 119 passed (119) |
| 5 | `npm run test:perf` | 0 | 1 file, 1 test passed. `PERF-SMOKE n=250 p50=2.53ms p95=3.33ms max=5.00ms limit=2000ms statuses={"200":250}` |
| 6 | `npm run test:e2e` | **1** | 70 tests, 10 workers: 2 failed, 3 skipped, 65 passed (59.9s) |
| 6b | `npm run test:e2e -- --workers=2` (diagnostic only, not a substitute) | 0 | 67 passed, 3 skipped, 0 failed (1.2m) |

No install, ci, audit, audit fix, playwright install, or upgrade was run. No file other than this one was modified.

Note on perf: all 250 requests returned status 200 (`statuses={"200":250}`), including the mix of failure inputs, because failure results re-render with 200. This is consistent with the app design (routes smoke test asserts 200 for not-found), not a 429 throttle. The p95 is far under the 2000 ms limit. This is a mock-data, in-process smoke measure, not a network or browser measure.

## E2E per-project counts (required run, command 6, exit 1)

Playwright config defines 5 projects, 14 tests each (a11y.spec 11 + lookup.spec 6 minus overlap as run: 70 total).

| Project | Passed | Failed | Skipped |
|---------|--------|--------|---------|
| chromium | 14 | 0 | 0 |
| firefox | 14 | 0 | 0 |
| webkit | 12 | 1 | 1 |
| mobile-chrome | 13 | 0 | 1 |
| mobile-safari | 12 | 1 | 1 |
| Total | 65 | 2 | 3 |

Failures:

1. `[webkit] lookup.spec.ts:10 order lookup flows > happy path shows tracking view`: 30000 ms timeout at `locator.click` on the "Track order" button ("waiting for element to be visible, enabled and stable").
2. `[mobile-safari] a11y.spec.ts:18 axe scans > form`: 30000 ms timeout in `AxeBuilder.analyze` (`frame.evaluate`), 35.0 s.

Skips (3): `keyboard-only operation` on mobile-chrome, mobile-safari, webkit (known limitation, below).

Assessment: both failures are timeouts on the first WebKit-engine test to run under 10 parallel workers, not assertion failures about product behavior. Both pass in the same project when run with 2 workers (diagnostic 6b). That points to load-dependent flakiness in the WebKit projects (likely contention with the openssl-based TLS proxy and 10 workers), but this is an inference, not proven. The config sets no retries and no worker cap. The required command is red, so this stage cannot pass. Recommended routing: Implementation to cap workers or add retries/timeouts for WebKit, then re-verify. This verifier did not change config.

## Working Tree vs Implementation Log

`git status --short` and `git diff --stat` (read-only) show:

- Modified, tracked: `order-tracking/README.md`, `docs/sdlc/stories/ORD-3/impl-plan.md`, `docs/sdlc/stories/ORD-3/implementation-log.md`, `package.json` (+1 line), `playwright.config.ts`. Diff stat: 5 files, 736 insertions, 53 deletions.
- Untracked: `code-review.md`, `src/data/`, `src/domain/{lookupOrder,messages,toTrackingView,validate}.ts`, `src/server.ts`, `src/web/`, `tests/e2e/`, `tests/integration/`, `tests/performance/`, unit tests (failureResultShape, logger, lookupOrder, mockOrderRepository, toTrackingView, validate), `vitest.perf.config.ts`.
- All of this is uncommitted and pre-existing relative to this verification run; this run changed none of it. Only the last commit (`6ade820`) is committed; the story's implementation is not yet committed. The file set matches what the implementation scope describes (source, tests, perf config, e2e, README). The 119 unit/integration tests and the e2e suite exist and ran, which corroborates that the claimed test files are present. I did not independently verify each implementation-log claim line by line.

## Requirements Verification

Legend: PASS = verified by a test that ran green in this run. Count is 18 approved items (FR-1 to FR-10, NFR-1 to NFR-3, AC-1 to AC-5).

| ID | Result | Evidence |
|----|--------|----------|
| FR-1 web entry point | PASS | integration `routes.test.ts` smoke; e2e `lookup.spec.ts` "happy path shows tracking view" (chromium, firefox, mobile-chrome pass; webkit and mobile-safari see failure note: mobile-safari passed, webkit timed out in required run, passed in diagnostic run) |
| FR-2 order number required and format | PASS | `validate.test.ts` (18 tests); `lookup.test.ts` "A-4 rejects non-conforming shapes without any lookup" |
| FR-3 optional last name | PASS | `lookup.test.ts` "A-1 omitted last name succeeds", "A-1 / FR-6 supplied wrong last name fails with the generic message and no details"; `lookupOrder.test.ts` |
| FR-4 no authentication | PASS (indirect, limitation) | No direct automated test. Every lookup test succeeds anonymously with no credentials or session. Recorded as known limitation |
| FR-5 tracking view contents | PASS | `lookup.test.ts` "AC-1 returns the tracking view with a last name: id, status, items, dates, 200, no-store, no redirect"; `toTrackingView.test.ts`; e2e happy path |
| FR-6 single generic not-found message | PASS | `lookup.test.ts` "A-1 / FR-6 wrong last name and unknown order produce identical failure messages"; "AC-2 shows the generic could-not-find-or-validate message with 200 and no order details" |
| FR-7 missing order number names field | PASS | `lookup.test.ts` "AC-3 empty order number names the order number and performs no lookup", "AC-3 whitespace-only and absent order numbers perform no lookup"; e2e "missing order number shows required message" |
| FR-8 normalization | PASS | `normalize.test.ts` (12 tests); `lookup.test.ts` AC-4 cases (lowercase, `ORD-` separator, `ORD` space, padded whitespace, last-name case and padding, combined) |
| FR-9 no data revealed on failure | PASS | `dataProtection.test.ts` "no failure response contains any fixture value, and the submitted last name is never echoed"; "wrong last name and unknown order are indistinguishable once the echoed order number is masked"; `failureResultShape.test.ts`; `fixtureExposure.test.ts` |
| FR-10 malformed number format error, no lookup | PASS | `lookup.test.ts` "A-4 shows the format error, not the generic message, with zero repository calls", "A-4 format-error body does not contain the submitted value"; e2e "format error shows format message" |
| NFR-1 p95 under 2 s | PASS | `tests/performance/p95.test.ts`: p95=3.33 ms, n=250 (mock data, in-process) |
| NFR-2 browsers, responsive | PARTIAL, not fully verified | e2e on chromium, firefox, webkit, mobile-chrome, mobile-safari emulation; "320px reflow without horizontal scroll" and "touch targets at least 44px" pass on those that ran. webkit and mobile-safari have one failure each in the required run. Edge, real-device Safari, "latest two versions" not tested |
| NFR-3 WCAG 2.1 AA | PARTIAL, not fully verified | axe (wcag2a, wcag2aa, wcag21a, wcag21aa, zero serious/critical) on form, missing, format, not-found, result: pass on chromium, firefox, webkit, mobile-chrome; mobile-safari "form" scan timed out in required run (other four mobile-safari scans passed). `lookup.test.ts` NFR-3 markup assertions pass. 200% zoom, screen-reader, focus-order and manual checklist not performed |
| AC-1 successful lookup | PASS | see FR-5 evidence |
| AC-2 no match, clear message | PASS | see FR-6; e2e "not found shows generic message in error summary" passes on all 5 projects |
| AC-3 missing info identified | PASS | see FR-7; e2e passes on all 5 projects |
| AC-4 harmless formatting | PASS | see FR-8, `lookup.test.ts` "AC-4 / FR-8 / A-3 normalization in one submission" group |
| AC-5 data protection | PASS | see FR-9; additional `dataProtection.test.ts` cases: Cache-Control no-store, Referrer-Policy and CSP headers, identifiers not accepted from query string, logging carries only category and request ID |

Counts: 18 approved items. 15 PASS (including FR-4 indirect). 2 PARTIAL (NFR-2, NFR-3, both owing to untested scope and the two e2e failures). Zero items have no evidence at all. FR-4 has only indirect evidence. The PARTIAL items are accepted known limitations by human decision, but the e2e failures are new, not previously known, defects in the test run.

Other checks: domain invariants and error paths (413, `/boom` generic error page, throttle 429 generic body) PASS via `app.test.ts` and `throttle.test.ts`. State and persistence: none by design (mock data). Integrations: none in scope. Dependency status: see npm audit limitation. Documentation consistency: README was modified; I did not re-audit it line by line. NOT VERIFIED.

## Known Limitations (human decisions, recorded, not counted as failures)

Code Review items, none fixed:

- CR-001: `src/web/views/error.njk` is never rendered; `src/web/errorHandler.ts:4-18` holds a duplicate inline error page that can drift.
- CR-002 (security-relevant): `src/web/app.ts:52` builds the HTTP-to-HTTPS redirect target from `req.hostname`. With `BEHIND_PROXY=true`, `trust proxy` is 1 (`app.ts:29`), so a client-supplied `Host` or `X-Forwarded-Host` can steer the redirect to an attacker-chosen host. This is an open redirect. Impact is low because the redirect is returned only to the requesting client, but it is a real risk. The human chose to proceed with it recorded. Fix, when taken up: set the canonical host from configuration (for example a `PUBLIC_HOST` variable).
- CR-003: `src/web/throttle.ts:32-34` scans the whole `hits` map on every POST (O(n) per request). The limiter is wired only in `src/server.ts:11`.
- CR-004: view and static paths use `process.cwd()` (`src/web/app.ts:24`; same assumption in `tests/integration/fixtureExposure.test.ts:25`). The server works only when started from `order-tracking/`.
- CR-005: weak assertions at `tests/performance/p95.test.ts:69` (`statuses.size > 0`, always true), `tests/integration/throttle.test.ts:106` (`appWith(0 + 1)`), and `tests/unit/scaffold.test.ts:5-7` (`1 + 1`).

Other limitations:

- IMP-012 accepted with known limitations: Edge not tested; real-device Safari not tested; keyboard-only e2e test skipped on touch projects and WebKit (`tests/e2e/lookup.spec.ts:47-51`; skips confirmed in this run, 3 skipped).
- npm audit findings from IMP-001 (6 dev-tooling vulnerabilities) remain open. No audit was run or fixed here.
- The `openssl` CLI needed by the e2e TLS proxy (`tests/e2e/support/tls-proxy.mjs`) is not checked in CI.
- 200% zoom, screen-reader and focus-order checks, and the manual checklist were not performed.
- FR-4 has no direct automated test. NFR-2 and NFR-3 are partial.

## Top Findings

1. FAIL: required `npm run test:e2e` exits 1 with 2 timeouts, both in WebKit-engine projects (webkit happy path; mobile-safari axe form scan). Passed at `--workers=2`, so likely load flakiness, but unproven and unfixed. No retries or worker cap in `playwright.config.ts`.
2. All unit, integration, perf, typecheck, and build checks pass (119 of 119 tests; p95 3.33 ms).
3. The flaky WebKit projects are the same ones where NFR-2 and NFR-3 evidence is already weakest, so the browser claim for Safari is currently unreliable.
4. CR-002 open redirect remains open under the human decision.
5. All story work is uncommitted in the working tree.

## Human Waiver

Date: 2026-11-02

Human decision (verbatim): "Waive the e2e criterion"

Context: given in reply to the question of whether to waive the e2e criterion and record it as a waiver, with the stated note that it would not be recorded as a pass.

Waived criterion (exact): the required check `npm run test:e2e` must exit 0.

Known evidence (exact):

- Before the waiver, Final Verification outcome was FAILED.
- `npm run test:e2e` exited 1 with 65 passed, 2 failed, 3 skipped.
- Failure 1: webkit happy-path test (`lookup.spec.ts:10`), 30 s timeout on the "Track order" click.
- Failure 2: mobile-safari axe scan of the form (`a11y.spec.ts:18`), 30 s timeout.
- A diagnostic run with `--workers=2` passed (67 passed, 3 skipped). That it points to load-dependent flakiness is an inference, not proven.
- A WebKit fix cycle was started and then stopped by the human's instruction before it completed. Its partial state is not verified and is not cited as a fix.

Scope: the waiver covers only the e2e criterion. Every other check (typecheck, build, `npm test`, `npx vitest run`, `npm run test:perf`) exited 0 in the earlier verification run.

This waiver does not claim the e2e suite passes. The e2e criterion is WAIVED, not PASSED and not VERIFIED.

Remaining known limitations, unchanged: CR-001 to CR-005; NFR-2 and NFR-3 partial; FR-4 indirect evidence only; IMP-001 npm audit findings open; openssl dependency unchecked in CI; 200% zoom and manual checks not performed. (Details in "Known Limitations" above.)

## Final Verification Decision (original, 2026-11-01, superseded by Human Waiver above)

FAILED. Reason: `npm run test:e2e` exited 1 (2 failed). Pull Request Preparation: BLOCKED until the e2e run exits 0 in the required configuration and Final Verification is re-run. Known limitations above do not by themselves block; they would support VERIFIED WITH KNOWN LIMITATIONS if e2e were green.
