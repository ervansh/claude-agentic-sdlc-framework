# Code Quality Rules

These rules apply to every implementation, review, and verification stage.

## Correctness
- Behavior must match the approved `requirements.md` (FR, NFR, AC IDs). Cite the ID when a change implements or tests a requirement.
- Do not add behavior that no requirement or approved task asks for.

## Error handling
- Handle API failures, missing files, and empty inputs explicitly. Do not swallow exceptions.
- Report errors with clear messages. Never include tokens, credentials, or full response bodies in an error.

## Tests
- Every change needs tests for the happy path and for the edge cases: not-found, missing field, empty input, and invalid input.
- Run the relevant tests before reporting a task as implemented. Record the exact command and result.
- Do not weaken or delete a failing test to make a change pass. Fix the code or report the failure.

## Clarity
- Name functions and variables for what they do. Prefer clear logic over comments that explain confusing logic.
- Keep functions short and focused. Comments explain *why*, not *what*.

## Duplication
- Move logic that appears twice into one shared function, once the duplication is real (not speculative).

## Dependencies
- Do not add a dependency without stating why it is needed.
- Flag known-vulnerable versions. Do not run `npm audit fix --force` or any command that upgrades dependencies across major versions without approval.

## Scope
- Change only what the current task requires. Report unrelated problems separately instead of fixing them silently.
