---
description: Create architecture.md for an approved story from its requirements.
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory]"
---

Launch the `solution-architect` subagent with this task.

Context: $ARGUMENTS

Required: Application, Application Root, SDLC Artifact Directory.
Input: `<SDLC Artifact Directory>/requirements.md` (must be APPROVED)
Output: `<SDLC Artifact Directory>/architecture.md`

If a required value is missing, ask for it and stop.
