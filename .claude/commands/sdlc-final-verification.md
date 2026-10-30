---
description: "Verify every approved FR/NFR/AC of the story with actual evidence."
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory]"
---

# SDLC Final Verification

Delegate to the `verification-engineer` subagent (.claude/agents/verification-engineer.md) and apply the `final-verification` skill (.claude/skills/final-verification/SKILL.md).

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

Verify every approved FR/NFR/AC with actual evidence.

Write:

`<SDLC Artifact Directory>/verification.md`

Do not modify production code or tests.
