"""SessionStart hook: inject Agentic SDLC repository guardrails as session context."""

import json
import sys

ADDITIONAL_CONTEXT = """
Agentic SDLC repository guardrails are active.

Before performing lifecycle work:

1. Read CLAUDE.md.

2. Respect lifecycle artifact ownership:
   - Requirements Approval -> requirements.md
   - Architecture Approval -> architecture.md
   - Design Review Outcome -> design-review.md
   - Implementation Plan Approval and task status -> impl-plan.md
   - Implementation evidence -> implementation-log.md
   - Code Review Outcome -> code-review.md
   - Final Verification Outcome -> verification.md
   - Pull Request evidence -> pull-request.md

3. Never infer human approval.

4. Historical review metadata must not override later approval stored in the
   authoritative artifact.

5. Do not claim tests, builds, Git operations, remote pushes, or pull requests
   succeeded unless they were actually executed successfully.

6. Independent review agents must report required corrections rather than
   silently modifying reviewed production code.

7. Preserve human approval and acceptance gates.

8. If environment capability is unavailable, record the limitation instead of
   fabricating completion.
""".strip()


def read_input() -> dict:
    """Read stdin JSON; tolerate empty or invalid input."""
    try:
        raw = sys.stdin.read()
    except (OSError, ValueError):
        return {}
    if not raw.strip():
        return {}
    try:
        parsed = json.loads(raw)
    except ValueError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def main() -> None:
    read_input()
    output = {
        "hookSpecificOutput": {
            "hookEventName": "SessionStart",
            "additionalContext": ADDITIONAL_CONTEXT,
        }
    }
    sys.stdout.write(json.dumps(output))


if __name__ == "__main__":
    main()
