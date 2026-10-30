---
description: "Create dependency-ordered IMP-### implementation tasks for an approved story and stop for plan approval."
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory]"
---

# SDLC Implementation Plan

Delegate to the `implementation-planner` subagent (.claude/agents/implementation-planner.md) and apply the `implementation-planning` skill (.claude/skills/implementation-planning/SKILL.md).

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

Read the active application's requirements, architecture, and design review.

Verify authoritative approvals.

Write:

`<SDLC Artifact Directory>/impl-plan.md`

Create dependency-ordered `IMP-###` tasks and stop for explicit human plan approval.
