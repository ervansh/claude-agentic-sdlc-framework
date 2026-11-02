# Git Rules

## Branches
- Work on the story branch `story/<STORY-ID>` created by the story session helper. Do not commit to `main` or `master`.
- Do not create worktrees. The framework uses one checkout per workspace.
- Switching branches requires a clean working tree. If the tree is dirty, stop and tell the human. Do not stash, reset, or discard changes on the human's behalf.

## Committing
- Commit only after the human approves the exact change for that stage or task. Show the file list and the commit message first.
- Stage specific files by path. Do not use `git add -A` or `git add .` unless the human asked for it.
- Write messages in the imperative mood. The first line is a summary under 72 characters. Describe *why* in the body.
- Do not commit `.env`, credentials, or generated folders (`node_modules/`, `dist/`, `coverage/`).

## Forbidden operations
Never run these, even if asked in a casual way. Ask the human to run them directly if they are truly needed:
- `git push --force` or `--force-with-lease`
- `git push --delete` (remote branch deletion)
- `git reset --hard`
- `git clean -f`
- `git branch -D`
- `git checkout -- .` or `git restore .` (discards all working changes)
- `gh pr merge`
- `gh repo delete`

## Pushing and pull requests
- Push and open pull requests only after explicit per-run approval of the commit list, target branch, title, and body.
- Read back a created pull request before reporting it as created. Never merge a pull request.
- Use the `sdlc-integrations` MCP tools (`github_*`) for remote pull request operations.

## History
- Do not rewrite history on shared branches.
- Do not amend a commit that has already been pushed.
