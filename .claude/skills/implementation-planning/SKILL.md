---
name: implementation-planning
description: Procedure for converting approved requirements, architecture, and design review into dependency-ordered IMP tasks in impl-plan.md. Use when creating or revising the implementation plan.
---

# Implementation Planning

Read: `requirements.md`, `architecture.md`, `design-review.md` in `<SDLC Artifact Directory>`
Write: `<SDLC Artifact Directory>/impl-plan.md`

## Procedure

1. Confirm the approval sources: Requirements from `requirements.md`, Architecture from `architecture.md`, and the Design Review outcome from `design-review.md`. A later authoritative approval overrides older pending text.
2. Create `IMP-###` tasks. Each task has:
   - objective and priority
   - status
   - dependencies
   - requirement and AC traceability
   - architecture references
   - implementation scope
   - test expectations
   - completion criteria
   - risks and notes
3. Order tasks by dependency.
4. Set status at creation:
   - `READY` only when every dependency is `DONE`, and tasks with no dependencies qualify.
   - `BLOCKED` for every other task.
5. Ensure the application can build and test with its own package configuration, not another application's toolchain.
6. Record `Implementation Plan Status: PENDING HUMAN APPROVAL`. On explicit approval, set `APPROVED` and re-read the file for stale statements.

## Task state rules

- Allowed transitions: `BLOCKED → READY`, `READY → IMPLEMENTED — PENDING HUMAN ACCEPTANCE`, `IMPLEMENTED — PENDING HUMAN ACCEPTANCE → DONE`.
- A task becomes `DONE` only after explicit human acceptance.
- When a task becomes `DONE`, promote a dependent task from `BLOCKED` to `READY` only if all its dependencies are `DONE`.

## Output header

```text
Current Stage: Implementation Planning
Application: <application>
Application Root: <application-root>
Target Artifact: <SDLC Artifact Directory>/impl-plan.md
Implementation Plan Status: <PENDING HUMAN APPROVAL | APPROVED>
```
