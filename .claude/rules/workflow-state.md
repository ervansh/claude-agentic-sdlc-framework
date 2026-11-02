# Workflow State Rules

Lifecycle state is stored in artifacts, not in chat history.

## Source of truth
- The current stage is determined only by the artifacts in the run's `SDLC Artifact Directory`:
  `requirements.md`, `architecture.md`, `design-review.md`, `impl-plan.md`,
  `implementation-log.md`, `code-review.md`, `verification.md`, `pull-request.md`.
- A managed story run uses `<application-root>/docs/sdlc/stories/<story-id>/`. Ignore legacy root artifacts for that story.
- Never read another application's or story's artifacts to infer state.

## Status values
Each artifact records its status in a single, labelled line that is easy to grep, for example:
- `Requirements Status: CLARIFICATION REQUIRED | PENDING HUMAN APPROVAL | APPROVED`
- `Design Review Result: PASS | PASS WITH MINOR CHANGES | REWORK REQUIRED`
- Task status in `impl-plan.md`: `READY | BLOCKED | IMPLEMENTED — PENDING HUMAN ACCEPTANCE | DONE`

When updating a status, change every stale statement that contradicts it. Re-read the file and confirm it is consistent.

## Gates
- Gates that need a human decision: requirements approval, architecture approval, plan approval, task acceptance, pull request review.
- Only an explicit approval statement passes a gate. Words such as "ok", "continue", "next", or "looks good" do not.
- Record an approval in the owning artifact, with the date and the exact wording the human used.

## Resume
- On `RESUME`, find the earliest incomplete gate from the artifacts and continue from there.
- Do not repeat an approved stage or an accepted task.
- If artifacts conflict (for example, a later review contradicts an approval), stop and report the conflict. Do not resolve it silently.

## Transitions
- Before moving to the next stage, confirm the artifact exists at its canonical path and no competing copy was created.
- If a downstream stage finds a missing or changed requirement, return the work to requirements analysis. Do not decide the requirement downstream.
