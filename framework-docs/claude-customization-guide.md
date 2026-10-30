# Claude Code Customization Guide

## Purpose

This guide explains how the framework uses Claude Code customization features.
Each feature solves a different problem. Do not put the same responsibility into
every file.

## Mental Model

```text
CLAUDE.md          = ALWAYS
Subagent           = WHO
Skill              = HOW
Command            = WHAT NOW
Hook               = DETERMINISTIC EVENT ENFORCEMENT
MCP                = EXTERNAL SYSTEMS
Orchestrator       = COORDINATOR (main session)
```

## Decision Guide

| Question | Use |
| --- | --- |
| Does the rule apply to almost every interaction in the repository? | `CLAUDE.md` |
| Is this a specialized role with responsibilities and boundaries? | Subagent in `.claude/agents/` |
| Is this reusable methodology for a class of task? | Skill in `.claude/skills/` |
| Is this a specific workflow to start now? | Command in `.claude/commands/` |
| Must it be enforced at a tool or session event? | Hook (`.claude/settings.json` + `.claude/hooks/`) |
| Does it need an external system? | MCP server (`.mcp.json` + `mcp/`) |

## 1. CLAUDE.md

`CLAUDE.md` at the repository root holds always-on rules: repository structure,
application path invariants, the lifecycle, human approval rules, and
framework-owned locations.

Good instruction:

```text
Always place application source under <application-root>/src/.
```

Bad instruction:

```text
Implement the weekly-generation algorithm using backtracking.
```

The second belongs in a specific task or architecture artifact.

## 2. Subagents (`.claude/agents/`)

One Markdown file per role, with frontmatter:

```markdown
---
name: code-reviewer
description: Independently reviews completed implementation work.
tools: Read, Glob, Grep, Bash
---
```

The body states identity, responsibility, scope, entry gates, owned artifact,
prohibited actions, and the stopping condition.

Rules:

- Subagents cannot spawn subagents. Specialists must not invoke other specialists.
- Restrict `tools` to what the role needs. Tool restriction supports role separation
  but does not replace behavioral rules in the body.
- Creation and review roles are separate subagents (for example
  `solution-architect` and `design-reviewer`).

## 3. Skills (`.claude/skills/`)

One directory per skill, each with a `SKILL.md`:

```markdown
---
name: design-review
description: Independently reviews an architecture before human approval.
---
```

A skill explains HOW to perform a class of task. Keep skills free of
application-specific detail. Put that in the application's artifacts.

Skill-specific helpers live beside the skill, for example
`.claude/skills/requirements-analysis/scripts/extract-docx.py`.

## 4. Slash Commands (`.claude/commands/`)

Each command is a Markdown file. The filename sets the command name: `sdlc-requirements.md`
becomes `/sdlc-requirements`.

```markdown
---
description: Run requirements analysis for an application.
argument-hint: "[Application] [Application Root] [Source Type] [Source Reference]"
---

Run context: $ARGUMENTS
```

A command states WHAT should happen now: the application context, the inputs to
read, the stage to run, and where to stop. Methodology stays in the skill; the
role stays in the subagent.

`/sdlc-orchestrate` runs in the main session because it invokes subagents.

## 5. Hooks (`.claude/settings.json` + `.claude/hooks/`)

Hook events and their matchers are configured in `.claude/settings.json`. Each
hook runs a Python script from `.claude/hooks/`.

Framework hooks:

- `SessionStart`: injects SDLC guardrail context.
- `PreToolUse`: denies destructive or unsafe shell operations (forced pushes, hard
  resets, forced cleanup, PR merges, `npm audit fix --force`).
- `PostToolUse`: reminds the agent to record verification evidence and writes
  minimal audit metadata. Failure outcomes (the reference `errorOccurred` behavior)
  are handled here with minimal metadata only.

No stop gate is configured. Completion artifacts differ by role.

Hooks are deterministic, so use them for rules that must hold regardless of agent
behavior. Hook unit tests are in `tests/hooks/`. Verify hook runtime behavior in
your Claude Code environment before relying on it for governance.

## 6. MCP (`.mcp.json` + `mcp/`)

`mcp/sdlc_integrations/` contains the `sdlc-integrations` server. `.mcp.json`
registers it for the project. Its tools:

- `jira_get_issue`, `jira_search`
- `confluence_get_page`, `confluence_search`, `confluence_upsert_page`
- `github_get_pull_request`, `github_create_pull_request`

Rules:

- Credentials come from environment variables loaded from an untracked `.env`.
  Never place credentials in `.mcp.json` or any tracked file.
- Agents use the MCP tools only. They do not read configuration files for tokens
  or make direct REST calls.
- If a tool is unavailable, report a source or tool blocker.
- Confluence writes and PR creation require explicit per-run human approval.

## 7. Local Settings

`.claude/settings.local.json` holds per-developer settings. It is git-ignored.
Put only shared, reviewed configuration in `.claude/settings.json`.

## Avoiding Duplication

Place each rule once:

| Rule | Location |
| --- | --- |
| Never infer human approval | `CLAUDE.md` |
| Implementation Engineer cannot accept its own task | `implementation-engineer.md` subagent |
| Verify dependencies before modifying code | `task-implementation/SKILL.md` skill |
| Specific invocation, `Task ID: IMP-007` | The command arguments |

## Naming

- Subagents: `<role>.md` in `.claude/agents/` (for example `solution-architect.md`)
- Skills: `lowercase-hyphenated/SKILL.md` in `.claude/skills/`
- Commands: `workflow-name.md` in `.claude/commands/` (for example `sdlc-architecture.md`)
- Hooks and scripts: lowercase, underscore-separated Python files (for example
  `pre_tool_policy.py`)

## Verification

Claude Code features and their exact configuration fields change over time. Check
current Claude Code documentation before depending on a feature for production
governance.
