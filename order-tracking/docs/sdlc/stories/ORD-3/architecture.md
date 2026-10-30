# Architecture: ORD-3 Locate and Track an Existing Order

Architecture Status: APPROVED

- Application: Order Tracking
- Application Root: order-tracking
- SDLC Artifact Directory: order-tracking/docs/sdlc/stories/ORD-3
- Story ID: ORD-3 (branch story/ORD-3)
- Authority: order-tracking/docs/sdlc/stories/ORD-3/requirements.md (Requirements Status: APPROVED, incl. ASSUMED A-1 to A-4 approved as written)

Entry gate result: requirements are APPROVED, with no unresolved material Open Questions. No requirements gaps found (see Requirements Gap Check).

## 1. Architecture Drivers

| Driver | Source | Consequence |
|---|---|---|
| Web delivery | FR-1, Q-009 | Browser-based UI, server hosted |
| Anonymous access | FR-4, Q-003 | No auth, sessions or accounts |
| Mock data only | Q-004 | In-memory/static fixture data behind a repository interface; no database |
| Order number required, ORD+7 digits | FR-2, Q-006 | Server-side format validation |
| Optional last name | FR-3, A-1 | Match logic has two modes |
| Normalization | FR-8, A-3 | One shared normalizer, applied before validation |
| Format error vs generic failure | FR-10, A-4 | Two distinct, strictly separated outcomes |
| Single generic failure message | FR-6, FR-9, AC-5 | Failure responses are built from constants only, never from order data |
| Perf 2 s p95 | NFR-1 | Trivial with in-memory data; must hold on mobile networks too |
| Browsers, responsive, WCAG 2.1 AA | NFR-2, NFR-3 | Semantic server-rendered HTML, minimal JS, accessible error handling |

## 2. Options and Trade-offs

Option A (chosen): Server-rendered web app (Node.js + TypeScript + Express), server-side lookup, HTML templates, optional progressive-enhancement JS.
- Pros: order data never leaves the server except on a successful match (AC-5); works without JS; strong accessibility baseline; simple to test; one deployable.
- Cons: full page loads per lookup (acceptable at 2 s p95).

Option B: SPA (React) with client-side mock data.
- Rejected: shipping the mock dataset to the browser exposes every order's data regardless of lookup outcome, which is contrary to the AC-5 design intent and would not model the future real backend.

Option C: SPA plus JSON API.
- Viable but adds two build units and CORS/API surface for no story benefit. Deferred; the lookup service layer is kept transport-independent so a JSON API can be added later without redesign.

Decision: Option A. See ADR-1.

## 3. Technology Stack

- Runtime: Node.js current LTS, TypeScript (strict).
- Web framework: Express with server-side templates (e.g. Nunjucks or EJS with auto-escaping on).
- Styling: plain responsive CSS (mobile-first, no framework required).
- Tests: Vitest (unit/integration), supertest (HTTP), Playwright (browser/accessibility), axe-core via @axe-core/playwright.
- Security middleware: helmet (headers), express body size limit.
- Stack is a technical choice and does not alter product behavior; the planner may substitute equivalents if approved.

## 4. Components

Located under order-tracking/src/ (to be created at implementation):

1. Web layer (`web/`): routes, templates, static assets. Responsible only for HTTP, rendering, and headers.
2. Input normalizer (`domain/normalize.ts`): pure functions implementing FR-8.
3. Validator (`domain/validate.ts`): order-number format check and required-field check (FR-2, FR-7, FR-10).
4. Lookup service (`domain/lookupOrder.ts`): orchestrates normalization, validation, repository query, last-name matching; returns a discriminated result.
5. Order repository interface (`data/OrderRepository.ts`) and mock implementation (`data/mockOrderRepository.ts`) backed by a fixture file (`data/mockOrders.ts`). Fixture is server-side only.
6. View model mapper (`domain/toTrackingView.ts`): projects an Order to the permitted display fields only (status, items, dates, order ID). Customer name and any other fields are not mapped.

Dependency direction: web -> domain -> data interface. Domain has no HTTP knowledge.

## 5. Data Model

Order (internal, mock):
- orderId: string `ORD#######`
- customerLastName: string (used only for matching; never rendered or logged)
- status: enum (e.g. PLACED, PROCESSING, SHIPPED, DELIVERED)
- items: array of { name, quantity }
- dates: { placed, estimatedDelivery?, delivered? } (ISO dates)

TrackingView (the only shape that may reach a template on success): { orderId, status, items, dates }.

LookupResult (discriminated union):
- `Success { view: TrackingView }`
- `MissingInput { field: "orderNumber" }`
- `FormatError` (no payload)
- `NotFoundOrNotValidated` (no payload)

Failure variants carry no order-derived data by type construction, enforcing FR-9 at compile time.

Mock data: at least 5 orders covering each status, plus a case with a shared last name across different orders and a case-variant/whitespace-variant exercise. Fixture contains only fictional data.

## 6. Lookup Flow

Web entry: `GET /` (or `/track`) renders the lookup form with fields Order number (required) and Last name (optional, labelled "optional"). Submit: `POST /track` (form post; body only, never query string, so identifiers do not appear in URLs, logs, or Referer).

Server steps:
1. Normalize (FR-8): trim both fields; uppercase order number; remove one optional single space or hyphen after `ORD`; lowercase and trim last name for comparison.
2. Required check (FR-7, AC-3): if the order number is empty after trimming, return MissingInput naming "Order number". No lookup.
3. Format check (FR-10, A-4): if the normalized order number does not match `^ORD[0-9]{7}$`, return FormatError. No lookup. Text describes only the expected format, e.g. "Enter an order number in the format ORD followed by 7 digits (for example ORD1234567)." It must not echo the submitted value.
4. Repository lookup by orderId.
5. Match: if no order, return NotFoundOrNotValidated. If last name was supplied (non-empty after trim) and does not equal the order's last name (case-insensitive, trimmed), return NotFoundOrNotValidated. If last name omitted, accept on order number alone (A-1). Otherwise Success.
6. Response: on Success the server renders the Order Tracking view directly in the POST response (FR-5, AC-1) with `Cache-Control: no-store`. Redirecting to a URL such as `/orders/{id}` is explicitly avoided because that GET would have no way to re-verify last name and would let a URL alone grant access even when a last name had been supplied. Browser back or refresh may prompt form resubmission; this is accepted for this story.
7. Last name entered as whitespace only is treated as omitted. Compatible with FR-8 trim rule.

Ordering note: the order-number-missing and format checks run before any data access, so FormatError cannot reveal anything.

## 7. Generic Failure Message (FR-6, FR-9)

- Single constant string, defined once in the domain/web layer: "We could not find or validate that order. Check your details and try again." (exact wording is an implementation detail provided it contains the "could not be found or validated" meaning.)
- Identical text, status code, and page structure for unknown order number and for last-name mismatch. No branching on cause is available to the template because the result type has no distinguishing payload.
- HTTP status (fixed decision, DR-006): every NotFoundOrNotValidated failure returns HTTP 200 with the form re-rendered, for both unknown order and last-name mismatch. Tests assert this single status. The order number is retained in the form only if it passes the format check; last name is never echoed back, to avoid unnecessary reflection of data. The plan must keep a test that the message conveys the FR-6 meaning ("could not be found or validated").
- Failure responses do not include order data, customer name, or hints such as "last name incorrect".
- Form is re-rendered with message in an element with `role="alert"`.

## 8. Data-Protection Design for AC-5

1. Server-side only lookup; mock data is never sent to the client or bundled in static assets.
2. Typed result union: failure variants cannot carry order data.
3. Uniform failure output: one constant message and one response shape for both unknown number and name mismatch. Scope (DR-002): when a last name is supplied, the failure output gives no oracle distinguishing "order exists" from "order does not exist". When the last name is omitted, Success versus NotFoundOrNotValidated necessarily reveals whether the order number exists (inherent in A-1; see trade-off below).
4. Timing: lookup performs the same path whether or not the order exists (a single map lookup and a constant-time-style compare on a dummy value when absent) to reduce a timing oracle. Best effort; not a guarantee with in-memory data.
5. Format-error and missing-field messages are static strings; they never include submitted or stored values.
6. Projection: only TrackingView fields are rendered; customer last name never appears in any response.
7. Logging (DR-003): log outcome category (success, missing, format, not-found) and a request ID only. Nothing that identifies the order or customer is logged: no last name, no order number in full, partial, masked or hashed form. Hashes are excluded because over a 10^7 space they are reversible by enumeration, and a keyed HMAC is excluded because it would introduce a secret, contradicting Section 13. Logs never contain order details.
8. POST body only for identifiers; `Cache-Control: no-store` on all lookup responses; helmet defaults including CSP, `Referrer-Policy: no-referrer`; autoescaped templates; request body size limit.
9. Error handling: a global error handler returns a generic error page with no stack traces or data.
10. Reduce enumeration: recommended (technical, non-customer-visible-semantics) basic per-IP request throttling at the edge or via middleware. Throttling is optional for the implementation plan and is not an acceptance criterion, since no requirement mandates it (DR-005). If throttling produces a customer-visible message, that message must be non-order-revealing; the exact behavior would be a product decision and is noted as a candidate follow-up story, not designed here.

### Documented Security Trade-off: optional last name (A-1)

With last name omitted, anyone who knows or guesses a valid order number (ORD + 7 digits, a space of 10^7) sees the full permitted tracking view for that order. This follows from approved Q-002 and A-1 and the story's ease-of-use balance; it is not an AC-5 violation because the attempt is successful, not unsuccessful. The architecture does not change this behavior. Residual risks and mitigations within approved behavior:
- With last name omitted, the success-versus-failure outcome itself reveals whether an order number exists (existence by success). The revealed data is bounded to the permitted display fields, and this is inherent in A-1 (DR-002).
- Exposure is limited to the displayed fields approved in Q-005 (status, items, dates, order ID); no customer name, address, payment or contact data is ever displayed.
- Enumeration across a 10^7 space is mitigated only by throttling (item 10) and monitoring of outcome-category logs.
- When the real order backend is integrated in a later story, order-number-only access should be revisited (e.g. require last name or other factor); that is a requirements decision flagged for the human, accepted as acknowledged at Requirements Approval.
- Order-number-only access is isolated in one place (the match step in lookupOrder) so a later requirement change is a small change.

## 9. Validation and Error Handling Summary

| Condition | Outcome | Message source | Lookup performed |
|---|---|---|---|
| Order number empty | MissingInput | static, names "Order number" | No |
| Malformed after normalization | FormatError | static, format description | No |
| Unknown order | NotFoundOrNotValidated | static generic | Yes |
| Last name supplied, mismatch | NotFoundOrNotValidated | static generic (identical) | Yes |
| Last name omitted, order exists | Success | n/a | Yes |
| Last name supplied, match | Success | n/a | Yes |
| Unexpected server error | Generic error page | static | n/a |

Errors are shown inline next to the field and in a summary; focus moves to the error summary on re-render (accessibility).

Client-side JS (optional progressive enhancement) may pre-validate for convenience but server validation is authoritative.

## 10. Performance and Reliability (NFR-1)

- In-memory lookup is O(1); expected server time in single-digit milliseconds. Target 2 s p95 end to end (including rendering) is met with a large margin.
- Verification: automated test hitting POST /track repeatedly (for example 200 requests) asserting p95 under 2 s on the CI/dev environment; documented as a smoke-level check against mock data, not a load test.
- Static assets small (CSS only, minimal JS) to protect mobile performance.
- No persistence, so no data reliability concerns in this story. Stateless server allows horizontal scale.
- Health endpoint `GET /healthz` returns no order data.

## 11. Browser, Responsive and Accessibility Targets (NFR-2, NFR-3)

- Supported: latest two major versions of Chrome, Edge, Firefox, Safari, desktop and mobile.
- Avoid features not supported in these; no polyfill-dependent APIs. Base functionality requires no JS.
- Responsive: mobile-first CSS, viewport meta, fluid layout, touch targets of at least 44x44 CSS px, reflow at 320 px width with no horizontal scroll.
- WCAG 2.1 AA: visible labels bound to inputs; "optional" indicated in label text; errors identified in text with `role="alert"` and `aria-describedby`, not by colour alone; error summary receives focus; contrast at least 4.5:1; visible focus indicator; semantic headings and landmarks; results rendered as a definition list/table with headers; page `lang` and titles; zoom to 200% with no loss.
- `autocomplete="off"` on both fields; no input masking that hampers paste.

## 12. Order Tracking View (FR-5)

Rendered content: order ID, status (text, not colour alone), items (name, quantity), dates (placed, estimated delivery, delivered where present, formatted unambiguously). Includes a link back to look up another order. No customer name or other fields.

## 13. Deployment

- Single Node service container (or PaaS) serving HTML and static assets, behind TLS terminating at the platform; HTTP redirected to HTTPS; HSTS set.
- Configuration through environment variables (port); no secrets required in this story.
- No database, no external integrations (Jira, Confluence, external order system not involved at runtime).
- Local run through npm scripts defined by the implementation plan.

## 14. Testability and Recommended Test Approach (for the implementation planner)

Tests live under order-tracking/tests/. Recommend a test pyramid:

1. Unit (Vitest), domain layer:
   - normalize: whitespace, case, `ORD-1234567`, `ORD 1234567`, `ord1234567`, last name case/whitespace, whitespace-only last name treated as omitted.
   - validate: empty, too short/long, wrong prefix, non-digits, double separators.
   - lookupOrder: each LookupResult variant with the mock repository; type-level and runtime assertion that failure variants contain no order-derived fields.
   - toTrackingView: only permitted fields are present (customer last name absent).
2. Integration (supertest) against the Express app:
   - AC-1 success with and without last name; AC-2 unknown order; AC-3 missing order number names the field; AC-4 formatting variants succeed without re-entry; A-1/A-4 behaviors; FR-10 no repository call (spy on repository).
   - AC-5 / FR-9 tests: for unknown number vs wrong last name, compare two cases: (a) an existing order number with a wrong last name, and (b) a different, unknown order number with any last name (DR-001). Comparison rule: status code, response headers, message text, and DOM structure must be identical; the only permitted difference is the value of the echoed order-number input, which the test masks (replaces with a fixed placeholder) in both bodies before an exact string comparison, plus any per-request token such as a request ID or CSRF-like token if present, masked the same way. After masking, bodies must be byte-identical. Also assert body contains none of the fixture values (names, items, dates, ids of other orders) using a scan over the whole fixture; assert no last name echo; assert `Cache-Control: no-store`; assert logs contain no last name or order details.
   - Format-error response must not echo submitted input.
3. Browser/E2E (Playwright) on Chromium, Firefox, WebKit (Edge via Chromium channel where available), plus mobile viewports: happy path, error paths, keyboard-only operation, focus management.
4. Accessibility: axe-core scans on form, error states, and result page with zero serious/critical violations; manual checklist for items axe cannot verify (focus order, 200% zoom, 320 px reflow, screen reader spot check).
5. Performance smoke: p95 check per Section 10.
6. Traceability: each test names its FR/AC/NFR ID so the plan and verification can map coverage.

Real-device Safari and latest-two-versions coverage beyond what Playwright provides is a manual verification step, recorded as a limitation if not performed.

## 15. Architecture Decision Records

- ADR-1: Server-rendered Express/TypeScript web app, server-side lookup. Rationale: AC-5 containment, accessibility, simplicity. Alternatives: Options B and C.
- ADR-2: Render tracking view directly from POST response instead of redirect to an identifier-only URL. Rationale: avoid URL-only access that bypasses last-name check; identifiers kept out of URLs/logs.
- ADR-3: Result as a discriminated union with payload-free failure variants. Rationale: compile-time enforcement of FR-9.
- ADR-4: Single generic failure message and response for unknown order and last-name mismatch. Rationale: FR-6, AC-5, no existence oracle when a last name is supplied (with last name omitted, success itself reveals existence; see Section 8 trade-off).
- ADR-5: Repository interface with mock implementation. Rationale: Q-004 mock now, real integration later without changing domain.
- ADR-6: Optional last name accepted per A-1 with documented trade-off (Section 8).

## 16. Traceability

| Requirement | Design element |
|---|---|
| FR-1 | Section 6 web entry, GET form |
| FR-2 | Validator, Section 6 step 3 |
| FR-3, A-1 | Section 6 step 5, ADR-6, Section 8 trade-off |
| FR-4 | No auth components; Section 1 |
| FR-5, AC-1 | Section 6 step 6, Section 12, view mapper |
| FR-6, AC-2 | Section 7, ADR-4 |
| FR-7, AC-3 | Section 6 step 2 |
| FR-8, AC-4, A-3 | Normalizer, Section 6 step 1 |
| FR-9, AC-5 | Sections 5, 7, 8, ADR-3 |
| FR-10, A-4 | Section 6 step 3, Section 9 |
| NFR-1, A-2 | Section 10 |
| NFR-2, A-2 | Section 11 |
| NFR-3, A-2 | Section 11, Section 14 item 4 |
| Q-004 | Section 5 mock data, ADR-5 |

## 17. Requirements Gap Check

No missing, ambiguous, or conflicting requirements found that block architecture. Observations for the human, not blocking and not decided here:
- Brute-force/enumeration throttling is not a stated requirement; this document recommends technical throttling only, and any customer-visible throttling behavior would need Requirements Analysis.
- The exact wording of the generic and format messages is not specified; FR-6 meaning is preserved and the implementation may finalize wording.
- Customer-visible effect of ADR-2 (DR-004): the tracking view is rendered in the POST response, so there is no bookmarkable or shareable tracking URL, and browser back or refresh may show a form-resubmission prompt. FR-5 "taken to the Order Tracking view" is considered satisfied. This is not a requirement gap; if the human wants bookmarkable tracking, it would need Requirements Analysis because it interacts with the last-name check.
- Accessibility observation (DR-007): `autocomplete="family-name"` on the last name field would align with WCAG 1.3.5; `autocomplete="off"` in Section 11 is acceptable for AA here. The planner may decide.
- Design Review observation DR-008 (component boundaries and complexity appropriately sized) requires no change.

## 18. Approval State

Architecture Status is APPROVED.

- Approver: the human (explicit Architecture Approval).
- Approval wording: "approved", given in response to the pending request for this architecture.md, with design-review.md (PASS WITH MINOR CHANGES, DR-001 to DR-008 applied).
- Approval scope: architecture.md as written, including the Section 17 open observations (no bookmarkable tracking URL, generic and format-error message wording not specified, rate limiting optional for the plan). The last-name trade-off is acknowledged.
- Design Review evidence of record: order-tracking/docs/sdlc/stories/ORD-3/design-review.md.
