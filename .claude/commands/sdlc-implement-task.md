---
description: "Implement exactly one approved IMP-### task in the active application and record evidence."
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory] [Task ID]"
---

# SDLC Implement One Task

Delegate to the `implementation-engineer` subagent (.claude/agents/implementation-engineer.md) and apply the `task-implementation` skill (.claude/skills/task-implementation/SKILL.md).

Run context (passed as arguments to this command):

$ARGUMENTS

Expected keys:

```text
Application: <name>
Application Root: <application-root>
Story ID: <stable-story-id, when managed>
SDLC Artifact Directory: <resolved-sdlc-artifact-directory>
Task ID: IMP-###
```

If required values are missing, ask for them and stop.

Do not proceed with unresolved placeholders in the context.

Implement exactly the specified approved task in the active application.

Run relevant checks, record evidence, and finish with:

`IMPLEMENTED — PENDING HUMAN ACCEPTANCE`

Do not self-accept the task.
