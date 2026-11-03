---
description: Run an independent code review of the story's implementation and tests.
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory]"
---

Launch the `code-reviewer` subagent with this task.

Context: $ARGUMENTS

Required: Application, Application Root, SDLC Artifact Directory.
Inputs: lifecycle artifacts in `<SDLC Artifact Directory>`, the application's source and tests.
Output: `<SDLC Artifact Directory>/code-review.md`

If a required value is missing, ask for it and stop.
