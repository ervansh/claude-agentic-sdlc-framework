---
description: "Publish the finalized documentation for one completed story to Confluence using the user-story-documenter specialist."
argument-hint: "[Application] [Application Root] [Story ID] [SDLC Artifact Directory] [Confluence Space]"
---

Publish or update the human-readable Confluence documentation package for this story.

Delegate to the `user-story-documenter` subagent (.claude/agents/user-story-documenter.md).

Run context (passed as arguments to this command):

$ARGUMENTS

Expected keys:

```text
Application: <name>
Application Root: <application-root>
Story ID / Source Reference: <stable-story-id>
SDLC Artifact Directory: <resolved-sdlc-artifact-directory>
Confluence Space: <space-key>
```

If required values are missing, ask for them and stop.

Treat repository SDLC artifacts under the supplied `SDLC Artifact Directory`
as authoritative for managed stories; otherwise use
`<application-root>/docs/sdlc/`.

This is a documentation publication task only:
- do not change SDLC lifecycle state
- do not change source code or tests
- do not modify Jira
- do not invent missing HLD/LLD decisions
- update existing pages instead of creating duplicates
- use the Story ID as the documentation root
- publish only content supported by finalized repository artifacts

This request explicitly authorizes create/update operations only for the bounded story documentation package in the specified Confluence space.

Do not delete, move, or change permissions on unrelated Confluence content.

At completion, verify the resulting page tree and return the publication report.
