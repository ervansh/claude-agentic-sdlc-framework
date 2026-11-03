---
description: Prepare the changelog and pull request for a verified story, with approval before any push or PR.
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory]"
---

Launch the `pr-preparer` subagent with this task.

Context: $ARGUMENTS

Required: Application, Application Root, SDLC Artifact Directory.
Outputs: `<application-root>/CHANGELOG.md`, `<SDLC Artifact Directory>/pull-request.md`

Request approval before any commit, push, or PR. Never merge.
If a required value is missing, ask for it and stop.
