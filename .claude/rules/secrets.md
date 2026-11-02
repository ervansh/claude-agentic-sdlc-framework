# Secrets Rules

## Never expose secrets
- Do not print, log, echo, copy into artifacts, or include in commit messages any token, password, API key, or `.env` value.
- Do not read `.env`, `.env.*` (except `.env.example`), or credential files to obtain a value. The MCP server reads credentials from environment variables. Use it.
- Do not construct REST or HTTP calls with credentials you discovered in a file or in the environment.
- When reporting a configuration problem, name the variable (for example `JIRA_API_TOKEN`), never its value.

## Files that must stay out of Git
These are git-ignored and must never be staged:
- `.env`, `.env.*` (keep `.env.example`, which holds empty placeholders only)
- `.mcp.local.json`, `.claude/settings.local.json`
- Any file containing a private key, certificate, or token

Before every commit, check the staged list. If any path above appears, unstage it and tell the human.

## Redaction
- Error messages and audit logs record metadata only: names, status codes, and counts. Never raw request arguments, response bodies, or stack traces that may echo a secret.

## Suspected leaks
If a secret is found in a repository file, in a commit, or in output:
1. Stop the current action.
2. Tell the human which file and line, without repeating the value.
3. Do not commit, push, or publish anything until the human decides how to handle it. Rotating the credential is the human's decision.

## Examples
Allowed: `JIRA_API_TOKEN is not set.`
Not allowed: `JIRA_API_TOKEN=<the actual token value>`
