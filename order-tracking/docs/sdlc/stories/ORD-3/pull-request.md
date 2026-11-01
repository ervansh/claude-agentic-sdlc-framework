# Pull Request Preparation: ORD-3

- Application: Order Tracking
- Application Root: order-tracking
- SDLC Artifact Directory: order-tracking/docs/sdlc/stories/ORD-3
- Story branch: story/ORD-3 (current branch)
- Base branch: main (see Git Observations)
- Remote: origin https://github.com/ervansh/claude-agentic-sdlc-framework.git
- Pull Request Status: PREPARED, NOT CREATED. Nothing staged, committed, pushed, or opened.

## Entry Gate

verification.md: VERIFIED WITH HUMAN WAIVER (e2e criterion waived on 2026-11-02). Pull Request Preparation ALLOWED. code-review.md: PASS WITH MINOR CHANGES.

## Git Observations (read-only)

- Working tree: 5 modified tracked files, 36 untracked files, all under `order-tracking/`. Nothing staged.
- `node_modules/`, `dist/`, `test-results/` exist locally but are ignored by `order-tracking/.gitignore`. They are not proposed for staging.
- No secrets, `.env`, or certificates found among changed paths. `tests/e2e/support/tls-proxy.mjs` generates a test-only certificate at runtime via openssl; no certificate file is in the change set.
- `package-lock.json` is unchanged.
- Local `main` (bf19dd8) differs from `origin/main` (1a9a9bf). `git log main..story/ORD-3` therefore lists 8 commits, several of them already-merged work. HEAD (6ade820) sits on top of origin/main, so the intended base is likely `origin/main`. The human must confirm the base before approval.
- No existing PR was checked yet; it will be rechecked via `github_get_pull_request` immediately before creation.

## Proposed Commit Message

```
Add order-tracking lookup application (ORD-3)

Implement anonymous order lookup with normalization, validation, a single
generic not-found message, data-protection controls, mock data, and
unit, integration, perf, and e2e tests. Final Verification is VERIFIED
WITH HUMAN WAIVER: the e2e criterion was waived and is not passed.
Includes the ORD-3 SDLC artifacts, README, and CHANGELOG.

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>
```

Note: the task requested the trailer `Co-Authored-By: Claude Haiku 5.5 <noreply@anthropic.com>`. The session attribution instruction specifies `Claude Sonnet 5.5`. The trailer above follows the session instruction. The human should choose before approval.

## Exact Paths to Stage

Modified:
- order-tracking/README.md
- order-tracking/package.json
- order-tracking/playwright.config.ts
- order-tracking/docs/sdlc/stories/ORD-3/impl-plan.md
- order-tracking/docs/sdlc/stories/ORD-3/implementation-log.md

New (this stage):
- order-tracking/CHANGELOG.md
- order-tracking/docs/sdlc/stories/ORD-3/pull-request.md

Untracked, SDLC artifacts:
- order-tracking/docs/sdlc/stories/ORD-3/code-review.md
- order-tracking/docs/sdlc/stories/ORD-3/verification.md

Untracked, source:
- order-tracking/src/server.ts
- order-tracking/src/data/OrderRepository.ts
- order-tracking/src/data/mockOrderRepository.ts
- order-tracking/src/data/mockOrders.ts
- order-tracking/src/domain/lookupOrder.ts
- order-tracking/src/domain/messages.ts
- order-tracking/src/domain/toTrackingView.ts
- order-tracking/src/domain/validate.ts
- order-tracking/src/web/app.ts
- order-tracking/src/web/errorHandler.ts
- order-tracking/src/web/logger.ts
- order-tracking/src/web/routes.ts
- order-tracking/src/web/throttle.ts
- order-tracking/src/web/public/enhance.js
- order-tracking/src/web/public/styles.css
- order-tracking/src/web/views/error.njk
- order-tracking/src/web/views/form.njk
- order-tracking/src/web/views/layout.njk
- order-tracking/src/web/views/tracking.njk

Untracked, tests and config:
- order-tracking/vitest.perf.config.ts
- order-tracking/tests/e2e/a11y.spec.ts
- order-tracking/tests/e2e/lookup.spec.ts
- order-tracking/tests/e2e/manual-checklist.md
- order-tracking/tests/e2e/support/tls-proxy.mjs
- order-tracking/tests/integration/app.test.ts
- order-tracking/tests/integration/dataProtection.test.ts
- order-tracking/tests/integration/fixtureExposure.test.ts
- order-tracking/tests/integration/helpers.ts
- order-tracking/tests/integration/lookup.test.ts
- order-tracking/tests/integration/routes.test.ts
- order-tracking/tests/integration/throttle.test.ts
- order-tracking/tests/performance/p95.test.ts
- order-tracking/tests/unit/failureResultShape.test.ts
- order-tracking/tests/unit/logger.test.ts
- order-tracking/tests/unit/lookupOrder.test.ts
- order-tracking/tests/unit/mockOrderRepository.test.ts
- order-tracking/tests/unit/toTrackingView.test.ts
- order-tracking/tests/unit/validate.test.ts

Total: 43 paths (5 modified, 38 new). Stage by explicit path, not `git add -A`.

## Proposed PR

Remote: origin. Head: story/ORD-3. Base: main (to be confirmed, see Git Observations).

Title: `ORD-3: Add order tracking lookup application (e2e criterion waived)`

Body:

```
## Summary
Delivers story ORD-3, "Locate and Track an Existing Order". Customers can look up an order anonymously with an order number (required) and last name (optional) and see status, items, and dates. The data source is mock data. Failed lookups show one generic message and reveal no order data.

Final Verification: VERIFIED WITH HUMAN WAIVER. The e2e criterion was waived by the human on 2026-11-02. It did not pass.

## Changes Made
- Web app (Express + Nunjucks): lookup form, tracking view, error handling, optional request throttle, structured logging limited to outcome category and request ID.
- Domain: normalization, order-number validation, lookup, tracking view mapping, single generic not-found message.
- Mock order repository and fixtures.
- Security headers, no-store caching, no echo of submitted last name.
- Tests: unit, integration, performance smoke, Playwright e2e and axe accessibility scans, manual checklist.
- README, CHANGELOG, and ORD-3 SDLC artifacts (plan, implementation log, code review, verification, pull request).

## Test Evidence
From verification.md (run 2026-11-01):
- `npm run typecheck`: exit 0
- `npm run build`: exit 0
- `npm test` and `npx vitest run`: exit 0, 14 files, 119 tests passed
- `npm run test:perf`: exit 0, p95 3.33 ms (n=250, mock data, in-process; limit 2000 ms)
- `npm run test:e2e`: exit 1, 65 passed, 2 failed, 3 skipped. Failures were 30 s timeouts in WebKit-engine projects (webkit happy path; mobile-safari axe form scan). A diagnostic run with `--workers=2` exited 0 (67 passed, 3 skipped); that it indicates load flakiness is an inference, not proven.
- E2E WAIVER: the criterion "`npm run test:e2e` must exit 0" was waived by the human on 2026-11-02. It is waived, not passed and not verified.
- Code review: PASS WITH MINOR CHANGES. Requirements: 15 of 18 items PASS (FR-4 indirect only), NFR-2 and NFR-3 PARTIAL.

## Known Limitations
- E2E criterion waived (above).
- CR-001: `error.njk` is never rendered; duplicate inline error page in `errorHandler.ts`.
- CR-002: HTTP-to-HTTPS redirect target is built from the Host header (open redirect, low impact, security-relevant). Human chose to proceed.
- CR-003: throttle scans the whole map on every POST.
- CR-004: static/view paths depend on `process.cwd()`; start the server from `order-tracking/`.
- CR-005: a few vacuous or incidental assertions.
- NFR-2 and NFR-3 partly verified; Edge, real-device Safari, 200% zoom, screen reader, focus order, and manual checklist not tested.
- Keyboard-only e2e test skipped on touch projects and WebKit.
- IMP-001 npm audit findings (6 dev-tooling) remain open; `openssl` needed by the e2e TLS proxy is not checked in CI.
- Order-number-only lookup is allowed by approved assumption A-1 (existence oracle, CR-006).

## Reviewer Checklist
- [ ] Confirm the base branch and that the diff contains only ORD-3 changes
- [ ] Review the waived e2e criterion and accept or reject the waiver
- [ ] Review CR-002 open redirect risk and decide whether to fix before merge
- [ ] Confirm failure responses leak no order data (dataProtection tests)
- [ ] Confirm no secrets or generated certificates are committed
- [ ] Re-run typecheck, build, and unit/integration tests locally
- [ ] Review README accuracy

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

## Verification Status Summary

- Outcome: VERIFIED WITH HUMAN WAIVER. The e2e criterion is WAIVED. It is not passed.
- Everything else (typecheck, build, 119 tests, perf smoke) exited 0 in the 2026-11-01 run. No tests or builds were re-run for this stage.
- Known limitations: listed in the PR body above (CR-001 to CR-005, partial NFR-2 and NFR-3, open npm audit findings, and others).

## Approval Gate

Awaiting explicit per-run human approval of this exact commit contents and PR text before staging, committing, pushing, or creating the PR.
