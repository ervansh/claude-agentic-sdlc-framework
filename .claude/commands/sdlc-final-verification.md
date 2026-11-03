---
description: Verify every approved FR, NFR, and AC of the story with actual evidence.
argument-hint: [Application] [Application Root] [Story ID] [SDLC Artifact Directory]
---

Launch the `verification-engineer` subagent with this task.

Context: $ARGUMENTS

Required: Application, Application Root, SDLC Artifact Directory.
Inputs: lifecycle artifacts in `<SDLC Artifact Directory>`, the application's source and tests.
Output: `<SDLC Artifact Directory>/verification.md`

If a required value is missing, ask for it and stop.
