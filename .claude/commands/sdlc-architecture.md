---
description: "Create the architecture document for an approved story from its requirements."
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory]"
---

# SDLC Architecture

Delegate to the `solution-architect` subagent (.claude/agents/solution-architect.md) and apply the `architecture-design` skill (.claude/skills/architecture-design/SKILL.md).

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

Read:

`<SDLC Artifact Directory>/requirements.md`

Entry gate:

`Requirements Status: APPROVED`

Write:

`<SDLC Artifact Directory>/architecture.md`

Do not re-derive product requirements from Jira/Confluence/Word during normal Architecture.

If requirements are missing or ambiguous, return to Requirements Analysis.
