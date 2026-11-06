---
description: Publish the finished story's documentation to Confluence, updating existing pages.
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory] [Confluence Space]"
---

Launch the `user-story-documenter` subagent with this task.

Context: $ARGUMENTS

Required: Application, Application Root, Story ID, SDLC Artifact Directory, Confluence Space.
Scope: publication only. Do not change SDLC state, code, tests, or Jira.
