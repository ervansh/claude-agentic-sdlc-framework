# Token Efficiency

Each technique below states whether it is **Applied** in this framework or
**Recommended** (documented, not yet enforced).

| # | Technique | Why it saves tokens | Status |
|---|---|---|---|
| 1 | Keep `CLAUDE.md` short | It loads on every turn. Methodology lives in skills, which load on demand. | Applied (short Token Efficiency section; keep it brief) |
| 2 | Model tiers per subagent | Routine publishing and doc sync use `haiku`. Judgment roles use `sonnet`. The orchestrator inherits. | Applied (`model:` in each agent) |
| 3 | Deny reads of secrets and generated folders | Stops accidental loads of `.env`, `node_modules`, `dist`, `coverage`, `.git`, and lockfiles. Also reduces secret exposure. | Applied (`permissions.deny` in `.claude/settings.json`) |
| 4 | Status-only reads | The orchestrator Greps for `Status:` and `Approval:` lines instead of reading whole artifacts. | Applied (orchestrator agent) |
| 5 | Pass paths, not content | Specialists read artifacts themselves. The orchestrator never pastes artifact text into delegations. | Applied (orchestrator delegation rules) |
| 6 | Rotate sessions between gates | Lifecycle state lives in artifacts and the story branch. A fresh session resumes from them and avoids carrying a long transcript. | Applied as guidance (`/sdlc-orchestrate` and CLAUDE.md); use `/clear` or a new session after each approved gate |
| 7 | Compact helper output | `story_sessions.py` returns compact JSON and lists file names only. | Applied |
| 8 | Short hook context | Hooks inject one-line reminders, not full guardrail text, after each shell command. | Applied (PostToolUse). SessionStart injects a bounded guardrail summary. |
| 9 | Targeted reads | Use `Grep` with `head_limit`, and `Read` with `offset` and `limit`, for large files. | Recommended (specialist skills) |
| 10 | Cache the retrieved source | Save the fetched Jira or Confluence text once with its SHA-256 and reuse it on `RESUME` unless the hash changed. | Recommended. It adds an artifact and needs your approval. |
| 11 | Concise artifacts | Reference requirement IDs (`FR-001`) instead of restating requirements in architecture and plans. | Recommended (artifact templates) |
| 12 | No repeated work | Do not re-read a file just edited, and do not repeat a search that already returned. | Applied (CLAUDE.md) |

## Rules for maintainers

- Measure before adding context: a new always-loaded instruction costs tokens on every turn.
- Prefer a skill over CLAUDE.md for anything used by only one stage.
- Prefer a reference ID over restating content.
- Keep hook output to one line unless a rule must be shown.
