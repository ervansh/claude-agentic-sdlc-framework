---
name: final-verification
description: Procedure for verifying every approved FR, NFR, and AC with real evidence and producing verification.md. Use when running final verification for a completed story.
---

# Final Verification

Read: lifecycle artifacts in `<SDLC Artifact Directory>`, plus the application's current source and tests.
Write: `<SDLC Artifact Directory>/verification.md`

## Procedure

1. Build a table of every FR, NFR, and AC from `requirements.md`.
2. Verify each item individually as `PASS`, `FAIL`, or `NOT VERIFIED`. Record the test name, command, or observation that supports it.
3. Also verify where they apply:
   - domain invariants and error paths
   - state and persistence
   - integrations
   - browser and user workflows
   - accessibility and responsiveness
   - performance
   - dependency status
   - documentation consistency
4. Run the checks and record exact commands, exit codes, and results.
5. Record observations and limitations.
6. Choose one outcome: `PASS`, `PASS WITH OBSERVATIONS`, or `FAIL`.
7. State whether Pull Request Preparation is `ALLOWED` or `BLOCKED`.

## Output header

```text
Current Stage: Final Verification
Application: <application>
Application Root: <application-root>
Target Artifact: <SDLC Artifact Directory>/verification.md
Final Verification Outcome: <PASS | PASS WITH OBSERVATIONS | FAIL>
Pull Request Preparation: <ALLOWED | BLOCKED>
```
