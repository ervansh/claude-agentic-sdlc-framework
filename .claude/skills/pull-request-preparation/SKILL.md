---
name: pull-request-preparation
description: Procedure for preparing a changelog entry and a pull request after verification, with per-run approval before any commit, push, or PR. Use when preparing a story for review.
---

# Pull Request Preparation

Write: `<application-root>/CHANGELOG.md`, `<SDLC Artifact Directory>/pull-request.md`

## Procedure

1. Inspect Git state: repository root, current branch, base branch, remote, working tree, staged and unstaged diffs, and any existing PR for the head branch.
2. Write the changelog entry and `pull-request.md`. Use the verification evidence actually recorded.
3. Present for approval:
   - files and diff to commit
   - commit message
   - remote, head branch, and base branch
   - PR title
   - complete PR body
4. Wait for one explicit approval. Then stage by path, commit, and push with Git.
5. Immediately before creating the PR, check for an existing PR for the head branch with `github_get_pull_request`. If one exists, report its verified URL and do not create a duplicate.
6. Create the PR with `github_create_pull_request`.
7. Read the PR back with `github_get_pull_request`. Verify repository, URL, head, base, and open state before you report success.

## PR body sections

- Summary
- Changes Made
- Test Evidence
- Known Limitations
- Reviewer Checklist

## Terminal status (use exactly one)

- `PULL REQUEST CREATED — READY FOR HUMAN REVIEW`: created and verified.
- `PULL REQUEST PREPARED — REMOTE CREATION BLOCKED`: artifacts are ready, but push or PR creation could not be completed. Record the reason separately.

Git push authentication and `sdlc-integrations` authentication are separate prerequisites. Report whichever is missing.

## Output header

```text
Current Stage: Pull Request Preparation
Application: <application>
Application Root: <application-root>
Target Artifact: <SDLC Artifact Directory>/pull-request.md
Pull Request Status: <terminal status>
```
