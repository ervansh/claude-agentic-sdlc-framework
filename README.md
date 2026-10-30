# Claude Code Agentic SDLC Framework

A reusable Agentic SDLC framework for Claude Code. It drives software delivery
through explicit lifecycle stages, independent review roles, artifact-based
state, and human approval gates.

The framework is not bound to any application. Every run names an **Application**
and an **Application Root**. Source, tests, and SDLC artifacts stay under that root.

Originally ported from a GitHub Copilot framework. The application-specific
retrospective from that source is not included.

---

## Contents

1. [How it works](#how-it-works)
2. [Setup (Windows and macOS/Linux)](#setup)
3. [Running the lifecycle](#running-the-lifecycle)
4. [Story sessions](#story-sessions)
5. [Command reference](#command-reference)
6. [Examples](#examples)
7. [Troubleshooting](#troubleshooting)
8. [Project layout](#project-layout)
9. [Tests](#tests)
10. [Further reading](#further-reading)

---

## How it works

Lifecycle:

```text
Source (Jira / Confluence / Word)
  → Requirements  → [human approval]
  → Architecture  → Design Review  → [human approval]
  → Implementation Plan           → [human approval]
  → Implementation (one IMP-### task at a time) → [human acceptance per task]
  → Code Review → Final Verification
  → Pull Request preparation → [human review and merge]
```

Each stage writes evidence to files:

| Stage | Artifact |
| --- | --- |
| Requirements | `requirements.md` |
| Architecture | `architecture.md` |
| Design Review | `design-review.md` |
| Implementation Plan | `impl-plan.md` |
| Implementation | `implementation-log.md` |
| Code Review | `code-review.md` |
| Final Verification | `verification.md` |
| Pull Request | `pull-request.md` |

Artifacts live in `<application-root>/docs/sdlc/`, or in
`<application-root>/docs/sdlc/stories/<story-id>/` for managed story runs.

**Who does what:**

| Concept | Where | Role |
| --- | --- | --- |
| Project rules | `CLAUDE.md` | Always-on rules |
| Subagents | `.claude/agents/` | Specialists (requirements, architecture, reviewers, and so on) |
| Skills | `.claude/skills/` | Methodology loaded on demand |
| Slash commands | `.claude/commands/` | Start a workflow, for example `/sdlc-requirements` |
| Hooks | `.claude/settings.json` + `.claude/hooks/` (Python) | Deterministic guardrails |
| MCP server | `.mcp.json` + `mcp/sdlc_integrations/` | Jira, Confluence, GitHub access |

**Human gates are never inferred.** Words such as "ok", "continue", or "looks
good" do not approve anything. The framework waits for an explicit approval
statement.

---

## Setup

Run all commands from the project root, the folder that contains `.mcp.json`.

### Prerequisites

- **Git 2.23+**, with the project as a Git repository on a `main` (or `master`) branch
- **Python 3.12 or later**
- **Claude Code**, installed and logged in (`claude` must run in your terminal)
- Access tokens for the systems you use: an Atlassian API token (Jira and Confluence) and a GitHub token

### Step 1: Make the project a Git repository

```bash
git init -b main
git add .
git commit -m "Initial agentic SDLC framework"
```

Story sessions need a clean, committed working tree. Commit before starting a run.

### Step 2: Create `.env`

Copy the template. Keep `.env.example` as it is.

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

macOS / Linux:

```bash
cp .env.example .env
```

Fill in the values:

```dotenv
# Jira Cloud
JIRA_BASE_URL=https://your-site.atlassian.net
JIRA_EMAIL=you@example.com
JIRA_API_TOKEN=your-atlassian-api-token

# Confluence (optional; defaults to the Jira email and token)
CONFLUENCE_BASE_URL=https://your-site.atlassian.net/wiki
CONFLUENCE_EMAIL=
CONFLUENCE_API_TOKEN=

# GitHub (fine-grained token with repository access and Pull requests read/write)
GITHUB_TOKEN=your-github-token
GITHUB_API_URL=
```

Rules:
- `JIRA_BASE_URL` is the site root, for example `https://your-site.atlassian.net`.
- `CONFLUENCE_BASE_URL` includes `/wiki`.
- Do not use quotes around values.
- `.env` is git-ignored. Never commit it.

Create an Atlassian API token at your Atlassian account's security settings. Create
a GitHub fine-grained token at GitHub's developer settings.

### Step 3: Load `.env` into the terminal that starts Claude Code

Claude Code does not read `.env` itself. The MCP server reads these variables from
the environment of the terminal that starts Claude Code. Load them in that same
terminal, then start `claude`.

Windows PowerShell:

```powershell
Get-Content .env | ForEach-Object {
  if ($_ -match '^\s*([^#=]+?)\s*=\s*(.*)$') {
    [Environment]::SetEnvironmentVariable($matches[1], $matches[2], 'Process')
  }
}
```

macOS / Linux:

```bash
set -a; . ./.env; set +a
```

Check the values without printing the token:

```powershell
"JIRA_BASE_URL=" + $env:JIRA_BASE_URL
"JIRA_API_TOKEN set: " + [bool]$env:JIRA_API_TOKEN
```

Repeat this step in each new terminal before starting Claude Code.

### Step 4: Install the MCP server dependencies

Windows PowerShell (recommended: a virtual environment):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --default-timeout=120 --retries 10 -r mcp\requirements.txt
```

macOS / Linux:

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r mcp/requirements.txt
```

If you don't use a virtual environment, use the same `python -m pip install` line
without the venv steps. Activate the venv in the same terminal before starting Claude
Code, because `.mcp.json` runs `python`.

### Step 5: Check that the MCP server connects

Start Claude Code in the project root, in the same terminal as Step 3:

```bash
claude
```

Approve the project MCP server `sdlc-integrations` if Claude Code asks. Then run:

```text
/mcp
```

`sdlc-integrations` should show as connected, with seven tools. You can also check
from a normal terminal with `claude mcp list`.

### Step 6: Run the framework tests (optional, recommended)

```bash
python -m unittest discover -s tests -t . -v
```

---

## Running the lifecycle

### Option A: Full lifecycle with the orchestrator (recommended)

```text
/sdlc-orchestrate
Application: <name>
Application Root: <application-root>
Story Session: START
Story ID: <story-id>
Run Mode: START
Source Type: JIRA
Source Reference: <jira-key>
Publish User Story to Confluence: NO
```

The orchestrator runs in the main session and delegates each stage to a specialist.
It pauses at each gate and waits for your input.

### Option B: One stage at a time

Each stage also has its own command. Use them to inspect or redo a single stage:

```text
/sdlc-requirements
Application: <name>
Application Root: <application-root>
Source Type: <JIRA | CONFLUENCE | WORD>
Source Reference: <reference>
```

### What the run asks you for

| Gate | You do |
| --- | --- |
| Requirements clarifications | Answer `Q-001`, `Q-002`, and so on. The framework does not answer for you. |
| Requirements approval | Reply with an explicit approval statement. |
| Architecture approval | Explicit approval. |
| Implementation plan approval | Explicit approval. |
| Each implementation task | Accept the task explicitly before the next one starts. |
| Pull request creation | Approve the exact branch, title, and body. |
| Confluence publication | Only if `Publish User Story to Confluence: YES`. Approve the page title, space, and content. |

The framework never merges a pull request.

### Resuming a run

Run the same command with `Story Session: RESUME`. Keep `Run Mode` as it was. The
framework rebuilds its state from the story's artifact files.

### Between stages

After an approved gate, start a fresh Claude Code session and resume from the
artifacts. This keeps the context small. See `framework-docs/token-efficiency.md`.

---

## Story sessions

A story session is one Git branch, `story/<STORY-ID>`, checked out in your current
workspace. No worktrees are created.

| Action | What it does |
| --- | --- |
| `START` | Creates `story/<ID>` from the default branch and switches to it. Creates the artifact folder. |
| `RESUME` | Switches to an existing `story/<ID>`. |
| `STATUS` | Shows the current branch and whether the working tree is clean. Read-only. |
| `LIST` | Lists story branches and artifact folders. Read-only. |

The default branch is resolved in this order: `origin/HEAD`, then local `main`,
then local `master`.

Guards:
- `START` and `RESUME` refuse to switch while the working tree has uncommitted
  changes. Commit or stash your own changes, then retry.
- `START` refuses if the story branch already exists. Use `RESUME` instead.
- `RESUME` refuses if the story branch does not exist.
- The framework never stashes, resets, deletes, merges, or pushes on your behalf.

Use `Story Branch` only if you want a name other than `story/<ID>`. It must start
with `story/`.

You can run the helper directly, for example to check state before a run:

```bash
python .claude/scripts/story_sessions.py status --application-root order-tracking
python .claude/scripts/story_sessions.py list --application-root order-tracking
```

On Windows, use `python` as shown. Replace `python` with `python3` on macOS or Linux if needed.

---

## Command reference

| Command | Purpose | Required inputs |
| --- | --- | --- |
| `/sdlc-orchestrate` | Full lifecycle | Application, Application Root, Run Mode, Source Type, Source Reference, Publish flag. Story Session and Story ID for managed runs. |
| `/sdlc-requirements` | Requirements stage | Application, Application Root, Source Type, Source Reference |
| `/sdlc-architecture` | Architecture stage | Application, Application Root |
| `/sdlc-design-review` | Independent design review | Application, Application Root |
| `/sdlc-implementation-plan` | Implementation plan | Application, Application Root |
| `/sdlc-implement-task` | Implement one task | Application, Application Root, Task ID (`IMP-###`) |
| `/sdlc-code-review` | Independent code review | Application, Application Root |
| `/sdlc-final-verification` | Independent verification | Application, Application Root |
| `/sdlc-pr-preparation` | Changelog and pull request | Application, Application Root |
| `/publish-story-documentation` | Publish story docs to Confluence | Application, Application Root, Story ID, Confluence space |

Context keys:

```text
Application:                 <display name>
Application Root:            <folder at repo root>
Run Mode:                    START | RESUME
Story Session:               START | RESUME | STATUS | LIST     (optional)
Story ID:                    <id>                             (managed runs)
Story Branch:                story/<id>                       (optional)
Source Type:                 JIRA | CONFLUENCE | WORD
Source Reference:            <Jira key | Confluence page ID | .docx path>
Publish User Story to Confluence: YES | NO
```

---

## Examples

### 1. Orchestrate a new Jira story on its own branch

```text
/sdlc-orchestrate
Application: Order Tracking
Application Root: order-tracking
Story Session: START
Story ID: ORD-101
Run Mode: START
Source Type: JIRA
Source Reference: ORD-101
Publish User Story to Confluence: NO
```

Creates branch `story/ORD-101`, and artifacts go to
`order-tracking/docs/sdlc/stories/ORD-101/`.

### 2. Resume that story later

```text
/sdlc-orchestrate
Application: Order Tracking
Application Root: order-tracking
Story Session: RESUME
Story ID: ORD-101
Run Mode: START
Source Type: JIRA
Source Reference: ORD-101
Publish User Story to Confluence: NO
```

Use `Run Mode: START` until the first requirements artifact exists. After that,
use `RESUME`.

### 3. Check story state without changing anything

```text
/sdlc-orchestrate
Application: Order Tracking
Application Root: order-tracking
Story Session: STATUS
Story ID: ORD-101
Publish User Story to Confluence: NO
```

### 4. List all story sessions

```text
/sdlc-orchestrate
Application: Order Tracking
Application Root: order-tracking
Story Session: LIST
Publish User Story to Confluence: NO
```

### 5. Run an application without a story branch

Omit `Story Session` and `Story ID`. Artifacts go to `order-tracking/docs/sdlc/`.

```text
/sdlc-orchestrate
Application: Order Tracking
Application Root: order-tracking
Run Mode: START
Source Type: WORD
Source Reference: docs/order-tracking-story.docx
Publish User Story to Confluence: NO
```

### 6. Source from a Confluence page

```text
/sdlc-orchestrate
Application: Order Tracking
Application Root: order-tracking
Story Session: START
Story ID: ORD-102
Run Mode: START
Source Type: CONFLUENCE
Source Reference: 123456789
Publish User Story to Confluence: NO
```

### 7. Run one stage only

```text
/sdlc-requirements
Application: Order Tracking
Application Root: order-tracking
Source Type: JIRA
Source Reference: ORD-101
```

### 8. Publish the story documentation after the SDLC finishes

```text
/publish-story-documentation
Application: Order Tracking
Application Root: order-tracking
Story ID: ORD-101
Confluence Space: ORD
```

Confluence updates need explicit approval of the page title, space, and content.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Python was not found; run without arguments to install from the Microsoft Store` | The `python3` alias is a Store placeholder on Windows | Use `python`, or install Python from python.org and enable PATH |
| `ReadTimeoutError` or `from versions: none` during pip install | Network or proxy blocks PyPI | Retry with `--default-timeout=120 --retries 10`. Check `https://pypi.org/simple/mcp/` in a browser. |
| `sdlc-integrations` shows failed or missing in `/mcp` | Missing packages, or `python` not on PATH in that terminal | Run `python -c "import mcp.server.fastmcp, httpx"`. Activate the venv in the same terminal. |
| Log says a variable such as `JIRA_BASE_URL` is not set | `.env` was not loaded in the terminal that started `claude` | Repeat Step 3, then start `claude` from that terminal |
| `401` from Jira | Wrong email or API token | Create a new API token and update `.env` |
| `404` for the Jira issue | Wrong site URL, or issue not visible to your account | Check `JIRA_BASE_URL` and the issue key |
| `START` refused with "uncommitted changes" | Working tree is dirty | Commit or stash your own changes, then retry. The framework will not do it. |
| `START` refused with "already exists" | The story branch exists | Use `Story Session: RESUME` |
| `RESUME` refused with "No story branch" | Branch was never created or was renamed | Use `START`, or pass the correct `Story Branch` |
| `Cannot determine the default branch` | No `origin/HEAD`, `main`, or `master` locally | Create or check out `main` |
| GitHub push or PR returns `403` | This session or your token lacks repository access | Grant access to the repository, then retry |
| Orchestrator stops at requirements with `SOURCE ACCESS BLOCKED` | The Jira or Confluence MCP tools are unavailable | Fix the MCP connection (above), then resume |

---

## Project layout

```text
.
├── CLAUDE.md                          # Always-on rules
├── README.md
├── .gitignore
├── .env.example                       # Template (copy to .env, never commit .env)
├── .mcp.json                          # Project MCP server registration
├── .claude/
│   ├── agents/                        # 11 subagents (WHO)
│   ├── skills/                        # 9 skills (HOW)
│   ├── commands/                      # 10 slash commands (WHAT NOW)
│   ├── hooks/                         # Python hook handlers
│   ├── scripts/story_sessions.py      # Story branch helper
│   └── settings.json                  # Hooks and read-deny rules
├── mcp/
│   ├── requirements.txt
│   └── sdlc_integrations/             # Jira, Confluence, GitHub MCP server
├── framework-docs/
│   ├── agentic-sdlc-framework.md
│   ├── claude-customization-guide.md
│   └── token-efficiency.md
├── tests/                             # Framework tests
└── .github/workflows/framework-tests.yml
```

Application folders (for example `order-tracking/`) are created per application
and are not part of the framework.

---

## Tests

```bash
python -m unittest discover -s tests -t . -v
```

The tests cover the hook policy, the MCP server (with mocked HTTP), and the story
branch helper (in temporary Git repositories). They do not contact Jira,
Confluence, or GitHub.

Hook tests check the hook logic. They do not prove how a given Claude Code version
runs hooks. Verify that in your own environment before relying on it for governance.

---

## Further reading

- `CLAUDE.md`: the rules that apply to every run.
- `framework-docs/agentic-sdlc-framework.md`: lifecycle, gates, and artifact ownership.
- `framework-docs/claude-customization-guide.md`: how agents, skills, commands, hooks, and MCP fit together.
- `framework-docs/token-efficiency.md`: techniques that reduce token use.
