---
description: Run an independent design review of the story's architecture against its requirements.
argument-hint: [Application] [Application Root] [Story ID] [SDLC Artifact Directory]
---

Launch the `design-reviewer` subagent with this task.

Context: $ARGUMENTS

Required: Application, Application Root, SDLC Artifact Directory.
Inputs: `<SDLC Artifact Directory>/requirements.md`, `<SDLC Artifact Directory>/architecture.md`
Output: `<SDLC Artifact Directory>/design-review.md`

If a required value is missing, ask for it and stop.
