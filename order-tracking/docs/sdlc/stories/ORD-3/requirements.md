# Requirements: ORD-3 Locate and Track an Existing Order

Requirements Status: APPROVED

No blocker remains (Q-010 closed). Items Q-011 to Q-014 are ASSUMED (proposed defaults) and were approved as written by the human (see Approval Evidence).

- Application: Order Tracking
- Application Root: order-tracking
- SDLC Artifact Directory: order-tracking/docs/sdlc/stories/ORD-3
- Story ID: ORD-3 (branch story/ORD-3)

## Provenance

- Source Type: JIRA
- Source Reference: ORD-3 (https://ervanshsingh.atlassian.net/browse/ORD-3), status In Progress, priority Medium
- Retrieved via sdlc-integrations `jira_get_issue`. No comments or attachments.
- Retrieval note: the description returned by the tool was truncated (`description_truncated: true`) in the middle of AC-5. The AC-5 text was subsequently supplied by the human (see AC-5 below); Jira was not called again.

## Source Facts (SOURCE)

- Story: As a customer, I want to find my order using information associated with the order, so I can check status without contacting support.
- An entry point must let a customer identify an existing order.
- After valid tracking information is supplied, the customer is taken to the Order Tracking view for that order.
- Order information must not be exposed when the supplied information cannot be validated.
- Identifying information must balance ease of use and protection of order data.
- AC-1 Successful lookup displays tracking information for the order.
- AC-2 No match: no order details shown; clear message that the order could not be found or validated.
- AC-3 Missing required information: lookup prevented; missing information identified.
- AC-4 Harmless formatting differences are handled without re-entry.
- AC-5 (CONFIRMED; provenance: human-supplied, Jira ORD-3 AC-5 (previously truncated)), verbatim:

  > AC-5 — Data protection
  > Given an unsuccessful order-identification attempt,
  > then the application must not reveal private information about another customer's order.

## Clarification Decision Log

| ID | Decision | Class |
|----|----------|-------|
| Q-001 | Nothing after AC-5; story complete as retrieved | CONFIRMED |
| Q-002 | Order number required; all other identifying fields optional | CONFIRMED |
| Q-003 | Login not required in initial phase; anonymous lookup | CONFIRMED |
| Q-004 | Any mock data acceptable | CONFIRMED |
| Q-005 | Displayed fields: order status, items, dates, order ID | CONFIRMED |
| Q-006 | Order ID format `ORD` + 7 digits (ORD#######) | CONFIRMED |
| Q-007 | Secondary identifier is last name | CONFIRMED |
| Q-008 | Superseded by Q-012 | see Q-012 |
| Q-009 | Delivery channel is web | CONFIRMED |
| Q-010 | AC-5 text supplied verbatim by human (see Source Facts) | CLOSED / CONFIRMED |
| Q-011 | Is last name required? | ASSUMED (proposed default; human directed proceed without answer) |
| Q-012 | Performance and browser targets | ASSUMED (proposed default; human directed proceed without answer) |
| Q-013 | Normalization rules | ASSUMED (proposed default; human directed proceed without answer) |
| Q-014 | Malformed order number behavior | ASSUMED (proposed default; human directed proceed without answer) |

## Requirements

- FR-1 (SOURCE, Q-009 CONFIRMED): Web entry point for order lookup.
- FR-2 (Q-002, Q-006 CONFIRMED): Order number is required and must match `ORD` followed by exactly seven digits.
- FR-3 (Q-007 CONFIRMED; required-ness per Q-011 ASSUMED): Last name is an optional secondary identifier. When supplied and it does not match the order, the lookup is treated as not found or validated (AC-2). When omitted, the lookup uses the order number alone.
- FR-4 (Q-003 CONFIRMED): No authentication; anonymous lookup.
- FR-5 (AC-1, Q-005 CONFIRMED): On valid match, navigate to the Order Tracking view showing order status, items, dates, and order ID.
- FR-6 (AC-2 SOURCE): On no match, show no order details and a clear "could not be found or validated" message. Per AC-5 check, this single message is used for every unsuccessful identification (order not found, or last name mismatch) and discloses nothing about any order.
- FR-7 (AC-3 SOURCE): Missing required input (order number) blocks lookup and names the missing field.
- FR-8 (AC-4 SOURCE; rules per Q-013 ASSUMED): Normalization: trim leading/trailing whitespace; order number case-insensitive (`ord1234567` accepted); last name case-insensitive and whitespace-trimmed; optional single space or hyphen after `ORD` (`ORD-1234567`) accepted.
- FR-9 (AC-5 CONFIRMED): On any unsuccessful order-identification attempt, the application must not reveal private information about another customer's order (including order details, customer name, or any field of an order other than as permitted by a successful match). Messages, validation errors, and responses for unsuccessful attempts must not contain data from any order.
- FR-10 (Q-014 ASSUMED): A malformed order number (not matching ORD + 7 digits after normalization) is shown as a format validation error and no lookup is performed.
- NFR-1 (Q-012 ASSUMED): Lookup result returned within 2 seconds at 95th percentile against mock data.
- NFR-2 (Q-012 ASSUMED): Supported browsers are the latest two major versions of Chrome, Edge, Firefox, and Safari (desktop and mobile); responsive layout.
- NFR-3 (Q-012 ASSUMED): Accessibility target WCAG 2.1 AA is in scope.
- Data source (Q-004 CONFIRMED): mock data; no real integration or persistence in this story.

## AC-5 Consistency Re-check

- A-1 (last name optional): CONSISTENT with AC-5, no conflict. AC-5 governs unsuccessful attempts. Under A-1 with Q-002 (CONFIRMED: order number is the only required field), an existing order number without last name is a successful identification, not an unsuccessful one, so nothing is revealed on a failure. An unsuccessful attempt (unknown number, or supplied last name mismatch) returns no order data. Note for reviewer: omitting last name means anyone knowing a valid order number sees that order; this follows from the confirmed Q-002 and the story's "balance ease of use and protection" statement, not from AC-5, and is flagged for the human to confirm at approval.
- A-4 (malformed order number gives a format error): CONSISTENT with AC-5. No lookup occurs, so no order data can be revealed. Constraint: the format error text must describe only the expected format and must not echo or reference any order data.
- FR-6 message wording ("could not be found or validated"): CONSISTENT with AC-5. It is generic and does not distinguish unknown order number from last-name mismatch, so it does not confirm that another customer's order exists.

## Open Questions

None blocking. Q-010 is closed. Q-011 to Q-014 are ASSUMED proposed defaults (see Assumptions).

## Assumptions (approved as written)

All items below remain classified ASSUMED (proposed default; human directed proceed without answer) and were approved as written by the human at Requirements Approval.

- A-1 (Q-011): Last name is optional, consistent with Q-002. If supplied and not matching, lookup is rejected as not found or validated. If omitted, an order is returned on order number alone. Checked against AC-5: consistent (see re-check).
- A-2 (Q-012): 2 s p95 on mock data; latest two major versions of Chrome, Edge, Firefox, Safari (desktop and mobile); responsive layout; WCAG 2.1 AA.
- A-3 (Q-013): Normalization rules as in FR-8.
- A-4 (Q-014): Malformed order number yields a format validation error, not the generic not-found message. Checked against AC-5: consistent.

## Out of Scope

- Authentication/login, real order system integration, persistence, other tracking features (downstream stories).

## Approval Evidence

- Status: APPROVED
- Approver: the human (requirements owner)
- Approval wording: "approved", given in response to the approval request for order-tracking/docs/sdlc/stories/ORD-3/requirements.md
- Approval scope: requirements.md as written, including ASSUMED items A-1 (last name optional), A-2 (performance and browser targets, WCAG 2.1 AA), A-3 (normalization), and A-4 (malformed order number gets a format error, no lookup). These remain listed as ASSUMED and are approved as written.
- Reviewer note on last name (omitting last name lets anyone who knows a valid order number see that order) was acknowledged by the human.
- Requirement content was not changed by this approval record.
