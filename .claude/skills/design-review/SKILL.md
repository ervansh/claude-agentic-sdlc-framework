---
name: design-review
description: Procedure for an independent review of architecture.md against approved requirements, producing design-review.md with DR findings and a gate result. Use when reviewing architecture.md.
---

# Design Review

Read: `<SDLC Artifact Directory>/requirements.md`, `<SDLC Artifact Directory>/architecture.md`
Write: `<SDLC Artifact Directory>/design-review.md`

## Procedure

1. Reconcile each material architecture decision against an approved requirement.
2. Check the mandatory rework triggers. Require rework when architecture:
   - invents an unresolved product requirement
   - resolves a material Open Question without a confirmed decision
   - introduces identity or authentication semantics that were not approved
   - chooses lookup identifiers that were not approved
   - uses a local or mock data source where approved behavior needs an authoritative external source
   - weakens privacy or security requirements
   - lacks requirement traceability
   - makes an untestable acceptance claim
3. Review the remaining areas: component boundaries, data model and flow, integrations, validation and error handling, performance and reliability, accessibility, deployment, testability, and trade-offs.
4. Record each finding as `DR-###` with severity `BLOCKER`, `MAJOR`, `MINOR`, or `OBSERVATION`.
5. Choose exactly one outcome:
   - `PASS`: `Architecture Approval Gate: ALLOWED`
   - `PASS WITH MINOR CHANGES`: `Architecture Approval Gate: ALLOWED`
   - `REWORK REQUIRED`: `Architecture Approval Gate: BLOCKED`
   Never write APPROVED or a similar approval term as the outcome.
6. Route any material requirements gap to Requirements Analysis.

## Output header

```text
Current Stage: Design Review
Application: <application>
Application Root: <application-root>
Target Artifact: <SDLC Artifact Directory>/design-review.md
Design Review Result: <PASS | PASS WITH MINOR CHANGES | REWORK REQUIRED>
Architecture Approval Gate: <ALLOWED | BLOCKED>
```
