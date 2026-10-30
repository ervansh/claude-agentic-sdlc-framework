---
description: "Run an independent code review of the story's approved artifacts, implementation, and tests."
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory]"
---

# SDLC Code Review

Delegate to the `code-reviewer` subagent (.claude/agents/code-reviewer.md) and apply the `code-review` skill (.claude/skills/code-review/SKILL.md).

Run context (passed as arguments to this command):

$ARGUMENTS

Expected keys:

```text
Application: <name>
Application Root: <application-root>
Story ID: <stable-story-id, when managed>
SDLC Artifact Directory: <resolved-sdlc-artifact-directory>
```

If required values are missing, ask for them and stop.

Review only the selected application's approved artifacts, implementation, and tests.

Write:

`<SDLC Artifact Directory>/code-review.md`

Do not modify production code or tests.
