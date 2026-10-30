# Claude Code Agentic SDLC Framework

## Purpose

A reusable Agentic SDLC framework for Claude Code. It guides software delivery
through explicit lifecycle stages, independent review roles, artifact-based
state, and human approval gates.

It is a port of a GitHub Copilot framework. The framework is not bound to any
application: each run names an Application and an Application Root, and all
source, tests, and SDLC artifacts stay under that root.

The Meal Planner retrospective from the source repository is application-specific
and is not included here.

## Directory Structure

```text
.
├── CLAUDE.md                         # Always-on repository rules
├── README.md
├── .gitignore
├── .env.example                      # Template for local secrets (copy to .env)
├── .mcp.json                         # Project MCP server registration
├── .claude/
│   ├── agents/                       # Subagents (WHO)
│   ├── skills/                       # Reusable methodology (HOW)
│   ├── commands/                     # Slash commands (WHAT NOW)
│   ├── hooks/                        # Python hook handlers
│   ├── scripts/                      # Python helpers (e.g. story sessions)
│   └── settings.json                 # Hook configuration
├── mcp/
│   └── sdlc_integrations/            # sdlc-integrations MCP server (Jira, Confluence, GitHub)
├── framework-docs/
│   ├── agentic-sdlc-framework.md
│   └── claude-customization-guide.md
├── tests/                            # Framework tests (hooks, MCP, scripts)
└── .github/workflows/
    └── framework-tests.yml           # CI for framework tests
```

Application directories are created per application at
`<application-root>/` and are not part of the framework.

## Lifecycle

```text
Authoritative User Story Source
        ↓
Requirements Source Intake
        ↓
Clarification and Gap Resolution
        ↓
requirements.md
        ↓
Human Requirements Approval
        ↓
Architecture
        ↓
Independent Design Review
        ↓
Human Architecture Approval
        ↓
Implementation Planning
        ↓
Human Plan Approval
        ↓
Task-by-Task Implementation
        ↓
Human Task Acceptance
        ↓
Independent Code Review
        ↓
Independent Final Verification
        ↓
Pull Request Preparation
        ↓
Human Pull Request Review
```

Each stage writes its evidence to `<application-root>/docs/sdlc/` (or
`<application-root>/docs/sdlc/stories/<story-id>/` for managed story runs).

## Copilot to Claude Code Mapping

| Copilot concept | Claude Code equivalent | Location |
| --- | --- | --- |
| `.github/copilot-instructions.md` | `CLAUDE.md` (project memory) | root |
| `.github/agents/X.agent.md` | Subagent `X.md` | `.claude/agents/` |
| `.github/skills/<name>/SKILL.md` | Skill `<name>/SKILL.md` | `.claude/skills/` |
| `.github/prompts/X.prompt.md` | Slash command `/X` | `.claude/commands/X.md` |
| `.github/hooks/` (JSON config + scripts) | Hook config + Python hooks | `.claude/settings.json`, `.claude/hooks/` |
| Atlassian / GitHub MCP | `sdlc-integrations` MCP server | `mcp/sdlc_integrations/`, `.mcp.json` |
| `.github/scripts/` (Node scripts) | Python scripts | `.claude/scripts/` |

## Gap Table

| Copilot hook event | Claude Code handling | Notes |
| --- | --- | --- |
| `errorOccurred` | Folded into `post_tool_evidence.py` | Records failure outcome and minimal metadata only |
| `agentStop` | Not implemented, intentionally | Specialist roles have different completion artifacts |

Hooks are Python, not Node.js.

## Integrations

Jira, Confluence, and GitHub access goes through the `sdlc-integrations` MCP
server, which exposes:

- `jira_get_issue`, `jira_search`
- `confluence_get_page`, `confluence_search`, `confluence_upsert_page`
- `github_get_pull_request`, `github_create_pull_request`

Access depends on the environment variables configured in `.env`. Without them,
the affected tools are unavailable and the workflow reports a blocker. Confluence
writes and PR creation require explicit per-run human approval.

## Setup

1. Copy the environment template and fill in values:

   ```bash
   cp .env.example .env
   ```

   Never commit `.env`. It is ignored by `.gitignore`.

2. Export the variables or load them into your shell before starting Claude Code:

   ```bash
   set -a; . ./.env; set +a
   ```

3. Install MCP server dependencies. Use a virtual environment, or add
   `--break-system-packages` on systems that require it:

   ```bash
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1          # Windows PowerShell
   # source .venv/bin/activate            # macOS / Linux
   pip install -r mcp/requirements.txt
   ```

   or:

   ```bash
   pip install --break-system-packages -r mcp/requirements.txt
   ```

4. Start Claude Code in the repository root.

## Running Tests

```bash
python -m unittest discover -s tests -t . -v
```

The hook scripts have unit tests. Their runtime behavior inside a given Claude
Code version is not established by those tests. Verify hook behavior in your own
environment before relying on it for governance.

## Starting a Run

Run the requirements stage with the slash command:

```text
/sdlc-requirements
```

Provide the context:

```text
Application: <name>
Application Root: <application-root>
Source Type: <JIRA | CONFLUENCE | WORD>
Source Reference: <reference>
```

For orchestration of the full lifecycle, use `/sdlc-orchestrate` with
`Run Mode: START | RESUME`. Human approvals are explicit and are never inferred
from a command invocation.

## Status

This port has not been run end-to-end. The framework tests and CI workflow are
present; no run of the lifecycle, MCP server, or hooks is claimed as verified.

## Token Efficiency

See `framework-docs/token-efficiency.md` for applied and recommended techniques.
