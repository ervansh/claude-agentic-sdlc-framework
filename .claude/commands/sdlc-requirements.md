---
description: "Analyze a Jira, Confluence, or Word source into requirements.md, looping on clarifications until it is ready for explicit human approval."
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory] [Source Type] [Source Reference]"
---

# SDLC Requirements — Source Driven

Delegate to the `requirements-analyst` subagent (.claude/agents/requirements-analyst.md) and apply the `requirements-analysis` skill (.claude/skills/requirements-analysis/SKILL.md).

Run context (passed as arguments to this command):

$ARGUMENTS

Expected keys:

```text
Application: <name>
Application Root: <application-root>
Story ID: <stable-story-id, when managed>
SDLC Artifact Directory: <resolved-sdlc-artifact-directory>
Source Type: <JIRA | CONFLUENCE | WORD>
Source Reference: <reference>
```

If required values are missing, ask for them and stop.

Target:

`<SDLC Artifact Directory>/requirements.md`

Workflow:

1. retrieve/read the source
2. report source provenance and explicit facts
3. ask only material clarification questions
4. wait for human answers
5. repeat until blocking questions = 0
6. create requirements.md as PENDING APPROVAL
7. stop for explicit human approval
8. after explicit approval, record APPROVED

Do not invent the source story.
Do not use another application's paths.
A requirements commit is optional operational evidence and is not an Architecture entry gate.
