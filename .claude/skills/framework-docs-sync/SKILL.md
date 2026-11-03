---
name: framework-docs-sync
description: Procedure for updating framework-docs/ and README.md so they match the framework's actual agents, skills, commands, hooks, rules, and CLAUDE.md. Use after framework changes.
---

# Framework Docs Sync

## Sources of truth

`CLAUDE.md`, `.claude/agents/`, `.claude/skills/`, `.claude/commands/`, `.claude/rules/`, `.claude/hooks/`, `.claude/settings.json`, and `.mcp.json`. Application artifacts are examples, not framework rules.

## Procedure

1. Inspect `git status` and the diff, if Git is available.
2. Identify framework changes and the docs they affect.
3. Update only those docs. Keep the framework multi-application. Use generic paths: `<application-root>/src/`, `<application-root>/tests/`, `<application-root>/docs/sdlc/`. Named applications may appear only as examples.
4. Cross-check terminology, paths, gates, statuses, and links against the sources.
5. Verify any external product claim against official documentation before writing it.
6. Review the documentation diff.

## Concept map to keep current

- `CLAUDE.md`: always-on rules
- Subagent: who performs a role
- Skill: how the work is done
- Command: entry point that launches a subagent or skill
- Rule: standing project constraint
- Hook: deterministic enforcement
- MCP: external systems
- Orchestrator: `sdlc-orchestrator` agent that preloads the `sdlc-orchestration` skill, run in the main session

## Completion

Report the files changed and any framework inconsistency you did not fix.
