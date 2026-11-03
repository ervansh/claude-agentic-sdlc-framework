---
name: code-review
description: Procedure for an independent review of a completed implementation against requirements, architecture, and tests, producing code-review.md with CR findings. Use when reviewing a finished story's code.
---

# Code Review

Read: lifecycle artifacts in `<SDLC Artifact Directory>`, plus the application's source and tests.
Write: `<SDLC Artifact Directory>/code-review.md`

## Procedure

1. Check the approved tasks in `impl-plan.md` and the evidence in `implementation-log.md`.
2. Review each area:
   - correctness against the FR, NFR, and AC IDs
   - architecture compliance
   - validation and error handling
   - security and privacy
   - test quality, including not-found and missing-field cases
   - maintainability and duplication
   - dependency safety and known-vulnerable versions
   - scope compliance
3. Run read-only checks, such as the test and lint commands, and record the exact commands and results.
4. Record each finding as `CR-###` with severity `BLOCKER`, `MAJOR`, `MINOR`, or `OBSERVATION`.
5. Choose one outcome: `PASS`, `PASS WITH MINOR CHANGES`, or `REWORK REQUIRED`.
6. State whether Final Verification is `ALLOWED` or `BLOCKED`.

## Output header

```text
Current Stage: Code Review
Application: <application>
Application Root: <application-root>
Target Artifact: <SDLC Artifact Directory>/code-review.md
Code Review Outcome: <PASS | PASS WITH MINOR CHANGES | REWORK REQUIRED>
Final Verification: <ALLOWED | BLOCKED>
```
