---
description: Implement exactly one approved IMP task and record its evidence.
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory] [Task ID]"
---

Launch the `implementation-engineer` subagent with this task.

Context: $ARGUMENTS

Required: Application, Application Root, SDLC Artifact Directory, Task ID (`IMP-###`).

If a required value is missing or still a placeholder, ask for it and stop.
