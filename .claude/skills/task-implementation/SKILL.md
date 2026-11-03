---
name: task-implementation
description: Procedure for implementing exactly one approved IMP task with tests and recorded evidence. Use when implementing a single task from impl-plan.md.
---

# Task Implementation

Read: `requirements.md`, `architecture.md`, `design-review.md`, `impl-plan.md` in `<SDLC Artifact Directory>`
Write: source and tests for the task, and `<SDLC Artifact Directory>/implementation-log.md`

## Procedure

1. Confirm the entry gate: plan `APPROVED`, task `READY`, and every dependency `DONE`.
2. Before editing, inspect the files the task touches and check whether the work already exists.
3. Implement the task. Add tests for the happy path and for not-found, missing-field, and invalid-input cases.
4. Run the relevant tests and checks. Record the exact command and its exit code.
5. Record in `implementation-log.md`:
   - files created, modified, and deleted
   - Git status or diff when Git is available
   - commands run, with results
   - which requirement IDs the task covers
6. Check generated paths before finishing. Ensure `node_modules/`, `dist/`, and `coverage/` are git-ignored. Keep lockfiles trackable.
7. Set `Task Status: IMPLEMENTED — PENDING HUMAN ACCEPTANCE`.

## Acceptance (only when the human delegates acceptance)

1. Record the acceptance wording in `implementation-log.md`.
2. Mark the task `DONE` in `impl-plan.md`.
3. Promote newly eligible `BLOCKED` tasks to `READY`.
4. Stop. Do not implement the next task in the same run.

## Evidence rules

- A passing pre-existing test does not prove the task was implemented. Link each task to its file changes and its test evidence.
- Implementation requires both change evidence and verification evidence.

## Output header

```text
Current Stage: Implementation
Application: <application>
Application Root: <application-root>
Task ID: IMP-###
Task Status: IMPLEMENTED — PENDING HUMAN ACCEPTANCE
```
