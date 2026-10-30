---
description: "Run an independent design review of the story's requirements and architecture."
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory]"
---

# SDLC Design Review

Delegate to the `design-reviewer` subagent (.claude/agents/design-reviewer.md) and apply the `design-review` skill (.claude/skills/design-review/SKILL.md).

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

Review:

- `<SDLC Artifact Directory>/requirements.md`
- `<SDLC Artifact Directory>/architecture.md`

Write:

`<SDLC Artifact Directory>/design-review.md`

Perform an independent review. Do not edit architecture directly and do not grant human Architecture Approval.
