---
description: Create dependency-ordered IMP tasks for an approved story and stop for plan approval.
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory]"
---

Launch the `implementation-planner` subagent with this task.

Context: $ARGUMENTS

Required: Application, Application Root, SDLC Artifact Directory.
Inputs: `requirements.md`, `architecture.md`, `design-review.md` in `<SDLC Artifact Directory>`
Output: `<SDLC Artifact Directory>/impl-plan.md`
