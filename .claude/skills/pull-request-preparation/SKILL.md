---
name: pull-request-preparation
description: Safe PR-preparation methodology using the active application's verified lifecycle evidence.
---

# Pull Request Preparation Skill

Entry gate: verification permits PR preparation.

Write:

- `<application-root>/CHANGELOG.md`
- `<SDLC Artifact Directory>/pull-request.md`

PR description must include:

- Summary
- Changes Made
- Test Evidence
- Known Limitations
- Reviewer Checklist

Inspect Git/remote/gh state before claiming commit, push, or PR creation.

## Safe GitHub PR Workflow

1. Confirm the active application's final verification permits PR preparation.
2. Inspect the repository root, current branch, base branch, remote, working tree state,
   staged and unstaged diffs, and any existing PR for the head branch.
3. In a managed story session, remain on that story's `story/<id>` branch in
   the current workspace. Never switch branches, discard work, or stage unrelated changes.
   If the branch is the default branch or the correct base/remote is ambiguous,
   stop and ask the human to resolve it.
4. Prepare the changelog and PR artifact with actual verification evidence.
5. Present the exact files/diff, proposed commit message, remote, head/base,
   PR title, and complete PR body. Request one explicit per-run approval before
   staging/committing PR changes, pushing, or creating the PR.
6. After approval, use Git for local commit and push. Recheck through the
   sdlc-integrations MCP server for an existing PR immediately before creation
   to avoid a concurrent duplicate (mcp__sdlc-integrations__github_get_pull_request).
   Use the sdlc-integrations MCP server for remote lookup, creation
   (mcp__sdlc-integrations__github_create_pull_request), and read-back
   verification (mcp__sdlc-integrations__github_get_pull_request).
   Do not use direct HTTP, configuration-file credentials, or an unapproved
   CLI fallback.
7. If an equivalent PR already exists, report its verified URL and status;
   do not create a duplicate.
8. Verify the created PR's repository, URL, head, base, and open state before
   reporting `PULL REQUEST CREATED — READY FOR HUMAN REVIEW`.

Git push authentication and sdlc-integrations MCP server authentication are separate. If either
is missing or a remote operation fails, report the specific blocker and use
`PULL REQUEST PREPARED — REMOTE CREATION BLOCKED`.

Never force push or merge.
