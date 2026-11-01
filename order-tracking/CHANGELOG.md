# Changelog

## ORD-3 - Locate and Track an Existing Order (2026-11-02)

- Added the order-tracking web application: an anonymous lookup form (order number required, last name optional) that shows order status, items, and dates, backed by mock data.
- Input normalization and format validation; one generic not-found message that reveals no order data and does not distinguish unknown orders from wrong last names.
- Security and privacy controls: no-store caching, CSP/Referrer-Policy headers, optional request throttle, logs limited to outcome category and request ID.
- Tests: 119 unit and integration tests pass; perf smoke p95 3.33 ms (mock data, in-process).
- Verification: VERIFIED WITH HUMAN WAIVER. The e2e criterion (`npm run test:e2e` must exit 0) was WAIVED by the human on 2026-11-02. It is not passed: the required run exited 1 (65 passed, 2 failed, 3 skipped; both failures were WebKit-engine timeouts).
- Known limitations: code review items CR-001 to CR-005 are open (including CR-002, a host-header-based open redirect); NFR-2 and NFR-3 only partly verified.
