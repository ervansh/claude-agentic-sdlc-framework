---
description: "Coordinate the complete agentic SDLC lifecycle for a story by invoking specialist subagents."
argument-hint: "[Application] [Application Root] [Story Session] [Story ID] [Story Branch] [Run Mode] [Source Type] [Source Reference] [Publish User Story to Confluence]"
---

# Run Complete Agentic SDLC

Run this command in the main session, not as a subagent; the orchestrator must invoke specialist subagents, and subagents cannot spawn subagents.

Act as the SDLC orchestrator in this main session, applying the rules in
`.claude/agents/sdlc-orchestrator.md`. Do not run the orchestrator itself as a
subagent. Delegate only specialist stages, using the Agent tool, to:
requirements-analyst, solution-architect, design-reviewer, implementation-planner,
implementation-engineer, code-reviewer, verification-engineer, pr-preparer,
and user-story-documenter (only when publishing is requested).

Run context (passed as arguments to this command):

$ARGUMENTS

Expected keys:

```text
Application: <name>
Application Root: <application-root>
Story Session: <START | RESUME | STATUS | LIST, optional>
Story ID: <stable-story-id, required for managed START/RESUME/STATUS, omitted for LIST>
Story Branch: <story/<name>, optional, default story/<Story ID>>
Run Mode: <START | RESUME, required for lifecycle work but not LIST>
Source Type: <JIRA | CONFLUENCE | WORD>
Source Reference: <reference>
Publish User Story to Confluence: <YES | NO>
```

If required values are missing, ask for them and stop.

Coordinate the complete lifecycle by invoking specialist subagents.

Mandatory orchestration rules:
1. The orchestrator must use the Agent tool to delegate specialist work to subagents in .claude/agents/.
2. The orchestrator must not use shell execution or repository editing to perform specialist work.
3. Requirements may not be approved while material product questions remain.
4. Architecture may not invent missing product requirements.
5. Design Review must be performed by `design-reviewer` in a separate delegated context.
6. Implementation Planning must model dependency-blocked tasks accurately.
7. Implementation must produce changed-file evidence plus test/check evidence.
8. Code Review and Final Verification remain independent lifecycle stages.
9. External Jira/Confluence access must use the sdlc-integrations MCP server rather than direct credential-based REST calls.
10. Never merge the PR.
11. For managed story sessions, use only `.claude/scripts/story_sessions.py` (story branches in the current workspace, no worktrees). START and RESUME refuse a dirty working tree; report the helper's error and stop. Store managed artifacts under `<application-root>/docs/sdlc/stories/<story-id>/` and ignore legacy root artifacts for that story.

At every transition report:

```text
Delegated Agent: <agent-name>
Delegation Result: <status>
```
