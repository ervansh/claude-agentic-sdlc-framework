# Design Review: ORD-3 Locate and Track an Existing Order

Review Outcome: PASS WITH MINOR CHANGES

Architecture Approval Gate: ALLOWED (no blocking findings; minor findings DR-001 to DR-004 are recommended for solution-architect to address, and the human decides whether to require them before approval)

Design Review does not grant Architecture Approval. Only the human may approve Architecture.

- Application: Order Tracking
- Application Root: order-tracking
- SDLC Artifact Directory: order-tracking/docs/sdlc/stories/ORD-3
- Story ID: ORD-3 (branch story/ORD-3)
- Reviewed: requirements.md (Requirements Status: APPROVED, incl. ASSUMED A-1 to A-4 approved as written) and architecture.md (Architecture Status: DRAFT, PENDING DESIGN REVIEW)
- Reviewer scope: independent; architecture claims were reconciled against requirements.md, not accepted on their own statement.

## Mandatory Check Results

| Check | Result |
|---|---|
| Invents an unresolved product requirement | None found. Throttling is labelled technical; customer-visible throttling is deferred as a follow-up (see DR-005). |
| Resolves a material Open Question without a confirmed decision | None. Requirements have no blocking open questions; A-1 to A-4 are applied as approved. |
| Introduces unapproved authentication/identity semantics | None. No auth, sessions, or accounts (FR-4). No URL-based or token-based access. |
| Chooses unapproved lookup identifiers | None. Order number (required) and last name (optional) only. |
| Local/mock source where authoritative external source required | Not applicable. Q-004 confirms mock data; repository interface isolates later integration. |
| Weakens privacy/security requirements | No. AC-5 and FR-9 are strengthened by server-side only data, payload-free failure types, uniform failure output, and logging limits. |
| Lacks traceability | No. Section 16 covers FR-1 to FR-10, NFR-1 to NFR-3, A-1 to A-4, Q-004. AC-1 to AC-5 are covered (see matrix). |
| Untestable acceptance claim | Mostly testable. One test claim is ambiguous as written (DR-001). |

## Requirement Traceability Matrix (independently verified)

| Requirement | Architecture coverage | Verdict |
|---|---|---|
| FR-1 web entry | Sec 6 GET form | Covered |
| FR-2 ORD+7 digits required | Sec 6 steps 2-3, validator | Covered |
| FR-3 / A-1 optional last name, mismatch = not found | Sec 6 step 5, ADR-6 | Covered |
| FR-4 anonymous | Sec 1, no auth components | Covered |
| FR-5 / AC-1 tracking view (status, items, dates, order ID) | Sec 6 step 6, Sec 12, TrackingView | Covered. Rendered in the POST response rather than a navigation (see DR-004) |
| FR-6 / AC-2 single generic message | Sec 7, ADR-4 | Covered |
| FR-7 / AC-3 missing field named | Sec 6 step 2, Sec 9 | Covered |
| FR-8 / AC-4 / A-3 normalization | Sec 6 step 1, normalizer | Covered. Matches all FR-8 rules (trim, case, optional single space or hyphen after ORD) |
| FR-9 / AC-5 no private data on failure | Sec 5, 7, 8, ADR-3 | Covered |
| FR-10 / A-4 format error, no lookup | Sec 6 step 3, Sec 9 | Covered. Format error is static and does not echo input, as the requirements constraint demands |
| NFR-1 / A-2 2 s p95 | Sec 10 | Covered, smoke-level test |
| NFR-2 / A-2 browsers, responsive | Sec 11, Sec 14 item 3 | Covered, with a limitation noted for real-device Safari |
| NFR-3 / A-2 WCAG 2.1 AA | Sec 11, Sec 14 item 4 | Covered |
| Q-004 mock data | Sec 5, ADR-5 | Covered |

No product decision beyond requirements was found. Technology stack (Node/Express/TypeScript, server-rendered) is a technical choice and does not alter approved behavior.

## Last-Name Trade-off Accuracy Check

The trade-off in architecture Section 8 and ADR-6 is accurately recorded:
- It states that omitting last name lets anyone who knows or guesses a valid order number see that order. This matches the reviewer note in requirements.md AC-5 Consistency Re-check and the human acknowledgement in Approval Evidence.
- It correctly attributes the cause to Q-002 and A-1, not to AC-5, and correctly says this is a successful identification and not an AC-5 violation.
- The exposure scope claim (only Q-005 fields, no customer name or contact data) is consistent with FR-5 and the view mapper.
- The 10^7 order-number space is arithmetically correct.
- It does not change approved behavior and routes any future change to a requirements decision, consistent with CLAUDE.md.
- Gap: it does not state explicitly that, in the omitted-last-name mode, the success-versus-failure outcome itself reveals whether an order number exists (see DR-002). Impact is bounded because the success data is already the permitted exposure.

## Findings

### DR-001 (MINOR) Test claim for byte-identical failure responses is not satisfiable as written
Section 14 item 2 asserts that responses for "unknown number vs wrong last name" are byte-identical apart from allowed variation. Section 7 retains the order number in the re-rendered form on failure. The two cases necessarily use different order numbers (or the same number in which case the unknown-order case cannot be paired), so the echoed value makes bodies differ. As written the test is either unsatisfiable or silently weakened.
Recommended fix (solution-architect): specify that the comparison uses a normalization step that masks the echoed order-number field, or compare a known-existing number with wrong last name against a different unknown number with the echoed value masked, and state that status code, headers, message, and structure must be identical.

### DR-002 (MINOR) Existence-oracle claim is stated more broadly than it holds
Section 8 item 3 and ADR-4 say there is "no oracle distinguishing exists from doesn't". This is true for any attempt that supplies a last name. For order-number-only attempts, Success versus NotFoundOrNotValidated reveals existence. This is inherent in approved A-1 and covered by the trade-off, but the claim should be scoped.
Recommended fix (solution-architect): qualify the claim and add the existence-by-success point to the trade-off bullets. No requirement change.

### DR-003 (MINOR) Logging of a salted hash of the order number gives weak protection
Section 8 item 7 allows logging a "salted hash or masked form" of the order number. Over a 10^7 space a hash is trivially reversible by enumeration, so it is effectively the identifier. The stronger and simpler position is to log outcome category and request ID only, with masking (for example last 3 digits) if correlation is needed, or a keyed HMAC with a secret from environment.
Recommended fix (solution-architect): tighten the wording. Also record that if a keyed HMAC is chosen, it introduces a secret and contradicts Section 13 "no secrets required in this story".

### DR-004 (MINOR) POST-rendered result and no shareable URL has customer-visible consequences that are not flagged to the human
ADR-2 renders the tracking view in the POST response, so there is no bookmarkable or shareable tracking URL, and back or refresh may prompt resubmission (accepted in Section 6). The rationale (AC-5, no URL-only access) is sound and FR-5 "taken to the Order Tracking view" is reasonably satisfied. However, this is a customer-visible behavior choice, and Section 17 does not list it among observations for the human.
Recommended fix (solution-architect): add it to Section 17 as a non-blocking observation for the human. It is not a requirement gap, so no routing to requirements-analyst unless the human wants bookmarkable tracking.

### DR-005 (OBSERVATION) Throttling recommendation is correctly bounded
Section 8 item 10 recommends technical per-IP throttling, and defers any customer-visible behavior as a follow-up. This stays within architecture authority. The planner should treat throttling as optional, not as an acceptance criterion, since no requirement mandates it.

### DR-006 (OBSERVATION) Section 7 leaves HTTP status as "200 or 404, one choice"
It recommends 200 with a preserved form. Fine, but the planner should fix a single choice in the plan so tests can assert it. Also, the requirement wording "could not be found or validated" is preserved in meaning by the suggested string "We could not find or validate that order"; the plan should keep a test that checks the meaning (FR-6).

### DR-007 (OBSERVATION) Accessibility detail
`autocomplete="off"` on the last name field is acceptable, but WCAG 1.3.5 favors `autocomplete="family-name"` for that field. Not required for AA conformance in this context, since the field is not a user-account identity field. The planner may decide.

### DR-008 (OBSERVATION) Complexity and boundaries
Component boundaries (web, domain, data interface), dependency direction, data model, and typed result union are appropriately sized for the story. No excess complexity. Options B and C are rejected or deferred for stated, valid reasons. Deployment (single Node service, TLS, HSTS, env-only config) is proportionate. Testability section is strong and maps to FR/AC/NFR IDs, subject to DR-001.

## Blocking Findings

None. No BLOCKER or MAJOR findings.

## Routing

- DR-001, DR-002, DR-003, DR-004: solution-architect (architecture wording and testability; non-blocking).
- Requirements-analyst: no routing. No true requirement gap was found.

## Progression Decision

PASS WITH MINOR CHANGES. The architecture is approval-ready. The Architecture Approval Gate is ALLOWED for the human to decide, and no Architecture Approval is recorded by this review.
