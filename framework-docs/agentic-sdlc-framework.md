# Agentic SDLC Framework

## Purpose

This document describes the reusable Agentic SDLC framework for Claude Code.

The framework guides software delivery through explicit lifecycle stages,
independent review roles, artifact traceability, and human approval gates. It
is repository-driven and does not depend on a single application domain.

Each run establishes an explicit Application and Application Root. Source, tests,
and SDLC artifacts remain isolated to that application.

## Core Principles

### 1. Framework First

Define the capability before applying it to an application:

1. define the subagent
2. define the skill
3. define the command
4. run the capability against the application
5. inspect the resulting artifact
6. perform the required human gate
7. continue to the next stage

Later stages must not silently perform work owned by an earlier stage.

### 2. Explicit Lifecycle Stages

1. Requirements Analysis
2. Requirements Review and Approval
3. Architecture
4. Design Review
5. Architecture Approval
6. Implementation Planning
7. Implementation
8. Code Review
9. Final Verification
10. Pull Request Preparation

Each stage has one responsibility and one output artifact.

### 3. Source-Driven Requirements

Requirements Analysis begins from an authoritative source, not a chat description
alone. Supported sources: Jira work item, Confluence page, Microsoft Word `.docx`.

Before asking questions, the Requirements Analyst must:

1. identify the source type
2. retrieve and read the source
3. record provenance
4. summarize only what the source states
5. identify gaps, ambiguities, and conflicts
6. ask only the missing clarification questions

Clarification items use stable IDs (`Q-001`, `Q-002`, ...). A response becomes a
confirmed decision only when the human explicitly answers it.

Requirements are written to `<SDLC Artifact Directory>/requirements.md` and stay
`PENDING APPROVAL` until a human approves them. The approved file is the
authoritative downstream contract for architecture and implementation.

If the source cannot be read, the stage reports `SOURCE ACCESS BLOCKED` and stops.

### 4. Human-in-the-Loop Gates

Claude may analyze, design, implement, review, and verify. Claude must not invent
human approval.

Human gates:

- Requirements Approval
- Architecture Approval
- Implementation Plan Approval
- Implementation Task Acceptance
- Confluence publication and PR creation (per-run approval)
- Pull Request review and merge

An agent stops when a required gate has not passed.

### 5. Independent Review

The agent that creates an artifact must not approve its own work.

- Solution Architect creates architecture; Design Reviewer reviews it.
- Implementation Engineer writes code; Code Reviewer reviews it.
- Verification Engineer independently verifies the final application.

Creation and review run in separate subagent invocations. Subagents cannot spawn
subagents, so the orchestrator runs in the main session.

### 6. Artifact-Based State

Lifecycle state lives in repository artifacts, not conversation history.

Each artifact owns specific decisions:

| Lifecycle decision | Authoritative artifact |
| --- | --- |
| Requirements Approval | `requirements.md` |
| Architecture Approval | `architecture.md` |
| Design Review Outcome | `design-review.md` |
| Implementation Plan Approval | `impl-plan.md` |
| Implementation Task Status | `impl-plan.md` |
| Implementation Evidence | `implementation-log.md` |
| Code Review Outcome | `code-review.md` |
| Final Verification Outcome | `verification.md` |
| PR Preparation Evidence | `pull-request.md` |

Historical review artifacts do not override later decisions. For example, a
`design-review.md` may record `Architecture Approval: PENDING HUMAN APPROVAL`
after `architecture.md` records `Architecture Approval: APPROVED`. The
architecture artifact owns the final approval state.

## Repository Structure

```text
<repository>/
├── CLAUDE.md                 # Always-on rules
├── .claude/
│   ├── agents/               # WHO
│   ├── skills/               # HOW
│   ├── commands/             # WHAT NOW
│   ├── hooks/                # Deterministic enforcement
│   ├── scripts/
│   └── settings.json
├── mcp/sdlc_integrations/    # External-system tools
├── .mcp.json
├── framework-docs/
├── tests/
├── <application-root>/
│   ├── docs/sdlc/            # Application SDLC artifacts
│   ├── src/
│   ├── tests/
│   └── CHANGELOG.md
└── README.md
```

Framework locations and application locations must not be mixed.

## Capability Model

| Concept | Role | Location |
| --- | --- | --- |
| Instructions = ALWAYS | Repository-wide rules | `CLAUDE.md` |
| Subagent = WHO | Role, scope, gates, stopping conditions | `.claude/agents/` |
| Skill = HOW | Reusable methodology | `.claude/skills/` |
| Command = WHAT NOW | Starts a specific workflow | `.claude/commands/` |
| Hook = DETERMINISTIC | Enforcement at tool and session events | `.claude/settings.json`, `.claude/hooks/` |
| MCP = EXTERNAL SYSTEMS | Jira, Confluence, GitHub access | `mcp/`, `.mcp.json` |
| Orchestrator = COORDINATOR | Sequences stages, performs no specialist work | `/sdlc-orchestrate` + `sdlc-orchestrator` |

Skills should stay reusable across applications. Commands provide application
context; they do not duplicate methodology.

## Subagents

| Subagent | Output |
| --- | --- |
| sdlc-orchestrator | Lifecycle progression and delegation decisions |
| requirements-analyst | `requirements.md` |
| user-story-documenter | Story-scoped Confluence documentation |
| solution-architect | `architecture.md` |
| design-reviewer | `design-review.md` |
| implementation-planner | `impl-plan.md` |
| implementation-engineer | `implementation-log.md` and one approved task |
| code-reviewer | `code-review.md` |
| verification-engineer | `verification.md` |
| pr-preparer | `pull-request.md`, `CHANGELOG.md`, PR operations |
| framework-docs-maintainer | `framework-docs/*.md`, `README.md` |

The orchestrator never performs specialist work, edits specialist-owned artifacts,
infers approval, or merges pull requests.

## Lifecycle Artifacts

Non-managed application runs write to `<application-root>/docs/sdlc/`:

```text
requirements.md
architecture.md
design-review.md
impl-plan.md
implementation-log.md
code-review.md
verification.md
pull-request.md
```

Managed story runs write the same set to
`<application-root>/docs/sdlc/stories/<story-id>/`.

## Stage Details

### Architecture

Solution Architect inputs: approved requirements and repository instructions.
Output: `architecture.md` covering drivers, components, data model, flows,
persistence, validation boundaries, NFR treatment, ADRs, and risks. The
architecture must not add product requirements.

### Design Review

Independent Design Reviewer inputs: `requirements.md`, `architecture.md`.
Output: `design-review.md` with findings graded `BLOCKER`, `MAJOR`, `MINOR`, or
`OBSERVATION`, and one outcome:

- `PASS`
- `PASS WITH MINOR CHANGES`
- `REWORK REQUIRED`

The reviewer does not approve architecture.

### Implementation Planning

Implementation Planner inputs: approved requirements, approved architecture, and
a successful design review. Output: `impl-plan.md` with dependency-ordered tasks
(`IMP-001`, `IMP-002`, ...), priorities, requirement and architecture mappings,
test expectations, completion criteria, and blockers. The plan does not write
production code.

### Implementation

Implementation is performed one approved task at a time:

```text
IMP-### = READY
  ↓ dependency check
  ↓ implementation
  ↓ tests and verification
IMPLEMENTED — PENDING HUMAN ACCEPTANCE
  ↓ human acceptance
IMP-### = DONE
```

Dependent tasks become eligible only after the prerequisite is `DONE`. The
implementation agent must not mark its own task accepted and must not start another
task automatically.

`implementation-log.md` records files added and modified, tests, commands,
results, deviations, known issues, and human acceptance.

### Code Review

Independent Code Reviewer inspects actual code and tests, not implementation
summaries. Review areas: correctness, architecture compliance, error handling,
security and privacy, test quality, maintainability, meaningful duplication,
dependency safety, and scope compliance. Outcomes: `PASS`,
`PASS WITH MINOR CHANGES`, `REWORK REQUIRED`.

### Final Verification

Verification Engineer checks each functional requirement, non-functional
requirement, and acceptance criterion individually. Each item is `PASS`, `FAIL`,
or `NOT VERIFIED`. A requirement is not `PASS` because the plan says it was
implemented.

Scope: unit and integration tests, browser workflows, lint, type checks, build,
runtime startup, performance, persistence, failure behavior, accessibility and
responsive evidence, dependency audit, and documentation consistency.

Outcomes: `PASS`, `PASS WITH OBSERVATIONS`, or `FAIL`. A `FAIL` routes work back
to the owning earlier stage for re-verification.

### Pull Request Preparation

Inputs: completed implementation, Code Review `PASS`, and Final Verification `PASS`
or `PASS WITH OBSERVATIONS`.

Outputs: `CHANGELOG.md`, `pull-request.md`, and, after explicit per-run approval, a
Git commit and push plus a GitHub pull request created through the
`sdlc-integrations` MCP server.

Required PR sections: Summary, Changes Made, Test Evidence, Known Limitations,
Reviewer Checklist.

Before any commit, push, or PR creation, the preparer presents the exact changes,
remote, head and base branches, title, and body for approval. It reads the PR back
through `github_get_pull_request` before reporting success. It never merges.

If Git, remote access, authentication, or MCP access is unavailable, the outcome is a
prepared-but-blocked status with the specific reason. A PR is never reported as created
without verification.

## Story Work Sessions

A story session is a Git branch, `story/<STORY-ID>`, checked out in the current
workspace. The framework does not use worktrees.

`/sdlc-orchestrate` accepts `Story Session: START | RESUME | STATUS | LIST`.
`Story Session` selects the Git branch. `Run Mode` controls lifecycle processing.
A stable Story ID and Application Root identify each session. An optional
`Story Branch` overrides the default `story/<Story ID>` name.

- `START` creates the story branch from the default branch and switches to it.
- `RESUME` switches to an existing story branch.
- `START` and `RESUME` refuse to switch while the working tree has uncommitted
  changes. The human commits or stashes, then retries.
- `STATUS` and `LIST` are read-only.

Managed artifacts live in `<application-root>/docs/sdlc/stories/<story-id>/`.
The framework never stashes, resets, deletes, merges, or pushes on the human's behalf.
A Claude Code session transcript is not restored; lifecycle state comes from the
story branch and the artifact directory.

## Rework Loops

```text
Architecture → Design Review → REWORK REQUIRED → Architecture rework → Design Review again
Implementation → Code Review → REWORK REQUIRED → Implementation correction → Code Review again
Final Verification → FAIL → appropriate earlier stage → re-verification
```

Explicit return paths are preferred over silently correcting defects during review.

## Traceability

```text
Requirement → Architecture → Implementation Task → Code → Test → Verification Evidence
```

This answers: why does this code exist, which requirement it satisfies, which
architecture decision owns it, which test verifies it, and whether it was
independently verified.

## Failure Handling

Agents stop rather than fabricate success.

- Architecture Approval missing: stop Implementation Planning.
- Dependency task not `DONE`: stop task implementation.
- Browser or runtime execution unavailable: record `NOT VERIFIED`, not `PASS`.
- Git metadata unavailable: prepare PR evidence and do not claim a PR exists.
- Source tool unavailable: report `SOURCE ACCESS BLOCKED`.

Pre-existing work is distinguished from changes made during a task.

## Security

Do not expose secrets, commit credentials, force push, destructively reset user
work, run `npm audit fix --force`, merge pull requests, or broaden scope without
approval.

Credentials are supplied through environment variables loaded from an untracked
`.env` file. External access uses the MCP server only. Agents do not read
credential-bearing configuration or construct direct REST calls with discovered
credentials.

Hooks enforce deterministic restrictions on destructive commands (for example
forced pushes, hard resets, PR merges, and `npm audit fix --force`).

## Hook Status

Implemented events: `SessionStart`, `PreToolUse`, `PostToolUse`, with the
`errorOccurred` behavior folded into `PostToolUse` handling. There is no generic
stop gate.

Hook unit tests exist under `tests/hooks/`. Runtime behavior inside a given Claude
Code version is not established by those tests. Verify hooks in your environment
before relying on them for operational governance.

## Official Documentation

Verify current Claude Code documentation for hook events, subagent frontmatter,
MCP configuration, and plan availability before adopting this framework for
production governance. Feature availability can change.
