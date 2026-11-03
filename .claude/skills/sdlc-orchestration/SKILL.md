---
name: sdlc-orchestration
description: Procedure for coordinating a full Agentic SDLC run in the main session by delegating each stage to specialist subagents and pausing at human gates. Use when the human runs /sdlc-orchestrate.
---

# SDLC Orchestration

Runs in the main session. Delegates stage work with the Agent tool. Never performs specialist work itself.

## Run context

Establish: Application, Application Root, Run Mode (`START` | `RESUME`), Source Type and Source Reference for a new requirements run, and for managed stories: Story Session, Story ID, optional Story Branch. The explicit Application Root is authoritative.

## Story sessions

When `Story Session` is given, run only the helper:

- `START`: `python .claude/scripts/story_sessions.py start --application-root <root> --story-id <id> [--story-branch <name>]`
- `RESUME`: `python .claude/scripts/story_sessions.py resume --story-id <id> [--story-branch <name>] --application-root <root>`
- `STATUS`: `python .claude/scripts/story_sessions.py status --application-root <root>`
- `LIST`: `python .claude/scripts/story_sessions.py list --application-root <root>`

If the helper returns `"ok": false`, report its error and stop. Do not retry with other flags, stash, or commit. After `START` or `RESUME`, continue with the `Run Mode`. After `STATUS` or `LIST`, stop.

## Delegation

Every delegation includes:

```text
Application: <application>
Application Root: <application-root>
SDLC Artifact Directory: <resolved-directory>
Story ID: <id>            (managed runs only)
```

`SDLC Artifact Directory` is `<application-root>/docs/sdlc/stories/<story-id>/` for managed runs, otherwise `<application-root>/docs/sdlc/`. Pass paths only, never pasted artifact content.

## Stage routing

| Stage | Subagent | Entry condition |
|---|---|---|
| Requirements | `requirements-analyst` | new run, or requirements not `APPROVED` |
| Architecture | `solution-architect` | requirements `APPROVED` |
| Design Review | `design-reviewer` | architecture draft exists. Run in a separate context. |
| Implementation Planning | `implementation-planner` | architecture approved, design review permits |
| Implementation | `implementation-engineer` | plan `APPROVED`. One dependency-ready `READY` task at a time. |
| Code Review | `code-reviewer` | all approved tasks `DONE` |
| Final Verification | `verification-engineer` | code review allows it |
| Pull Request Preparation | `pr-preparer` | verification allows it |
| Confluence publication | `user-story-documenter` | only when `Publish User Story to Confluence: YES`, as a separate step |

## Lifecycle state

Read only the status lines in the run's artifacts (Grep for `Status:`, `Result:`, `Outcome:`, `Gate:`). Read whole artifacts only when a specialist needs them. Determine the earliest incomplete gate from those lines. Do not repeat approved stages or accepted tasks. Do not use another application's or story's artifacts.

## Human gates

Ask the human, and wait, at each of these:

- answers to clarification questions. Present them unchanged. Never answer them yourself.
- Requirements Approval
- Architecture Approval
- Implementation Plan Approval
- task acceptance, one task at a time
- pull request review

Record each approval by delegating the exact approval statement back to the owning specialist. Only an explicit approval statement passes a gate. "ok", "continue", "next", or "looks good" do not.

## Rework

- Route review findings to the owning stage. Do not fix them yourself.
- After three correction cycles without an approval-ready result, stop for human attention.
- If a downstream stage finds a changed requirement, return to Requirements Analysis.

## Rules

- Never edit repository files, call Jira or Confluence directly, read credentials, implement code, or review your own output.
- Never merge a pull request.
- Never invoke `user-story-documenter` automatically. After the terminal handoff, you may tell the human that publication is available.

## Reporting

At each stage transition, report:

```text
Delegated Agent: <agent-name>
Delegation Result: <status>
```

Terminal result: `PULL REQUEST CREATED — READY FOR HUMAN REVIEW`, or the accurate blocked or prepared status.
