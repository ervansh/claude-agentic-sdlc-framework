---
description: Turn a Jira, Confluence, or Word source into requirements.md, pausing for clarification and approval.
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory] [Source Type] [Source Reference]"
---

Launch the `requirements-analyst` subagent with this task.

Context: $ARGUMENTS

Required: Application, Application Root, SDLC Artifact Directory, Source Type (JIRA | CONFLUENCE | WORD), Source Reference.
Output: `<SDLC Artifact Directory>/requirements.md`
