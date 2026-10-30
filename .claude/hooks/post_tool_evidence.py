"""PostToolUse hook for Bash: verification evidence reminder and minimal audit.

- On a successful verification command, reminds the agent to record evidence.
- Appends minimal metadata (timestamp, tool_name, command_family, outcome) to
  <git-dir>/claude-hooks-audit.jsonl when a Git directory exists.
- Never writes raw command arguments, tool output, stack traces, or messages.
- Failure detection replaces the source errorOccurred hook.
"""

import datetime
import json
import os
import re
import subprocess
import sys

AUDIT_FILE_NAME = "claude-hooks-audit.jsonl"

EVIDENCE_REMINDER = (
    "Record the actual command, result, and evidence in the active SDLC artifact."
)

# Order matters: browser tests must be checked before the generic npm test family.
VERIFICATION_FAMILIES = [
    ("browser_test", re.compile(r"\bnpm\s+run\s+test:browser\b|\bplaywright\b", re.IGNORECASE)),
    ("npm_test", re.compile(r"\bnpm\s+test\b|\bnpm\s+run\s+test\b", re.IGNORECASE)),
    ("lint", re.compile(r"\bnpm\s+run\s+lint\b", re.IGNORECASE)),
    ("typescript", re.compile(r"\bnpx\s+tsc\b|(?:^|\s|/)tsc(?:\s|$)", re.IGNORECASE)),
    ("build", re.compile(r"\bnpm\s+run\s+build\b", re.IGNORECASE)),
    ("npm_audit", re.compile(r"\bnpm\s+audit\b", re.IGNORECASE)),
]


def collect_strings(value, output=None):
    """Recursively collect every string inside a JSON-like value."""
    if output is None:
        output = []
    if isinstance(value, str):
        output.append(value)
    elif isinstance(value, list):
        for item in value:
            collect_strings(item, output)
    elif isinstance(value, dict):
        for item in value.values():
            collect_strings(item, output)
    return output


def read_payload():
    """Read stdin JSON; tolerate empty or invalid input."""
    try:
        raw = sys.stdin.read()
    except (OSError, ValueError):
        return {}
    if not raw.strip():
        return {}
    try:
        parsed = json.loads(raw)
    except ValueError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def classify_command(payload):
    """Return the verification command family, or None if not a verification command."""
    tool_input = payload.get("tool_input")
    if tool_input is None:
        tool_input = {}
    command_text = re.sub(r"\s+", " ", " ".join(collect_strings(tool_input))).strip()
    for family, pattern in VERIFICATION_FAMILIES:
        if pattern.search(command_text):
            return family
    return None


def is_failure(tool_response):
    """Detect failure: non-zero exit_code, is_error true, or an error field present."""
    if not isinstance(tool_response, dict):
        return False
    exit_code = tool_response.get("exit_code")
    if exit_code is not None:
        try:
            if int(exit_code) != 0:
                return True
        except (TypeError, ValueError):
            return True
    if tool_response.get("is_error") is True:
        return True
    if tool_response.get("error") not in (None, "", False):
        return True
    return False


def resolve_git_dir(cwd):
    """Return the absolute Git directory, or None when unavailable. Never raises."""
    try:
        completed = subprocess.run(
            ["git", "rev-parse", "--git-dir"],
            cwd=cwd,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            timeout=3,
            check=False,
        )
    except Exception:
        return None
    if completed.returncode != 0:
        return None
    git_dir = completed.stdout.strip()
    if not git_dir:
        return None
    if not os.path.isabs(git_dir):
        git_dir = os.path.join(cwd, git_dir)
    return os.path.abspath(git_dir)


def append_audit_record(cwd, record):
    """Best-effort audit append. Never raises."""
    try:
        git_dir = resolve_git_dir(cwd)
        if not git_dir or not os.path.isdir(git_dir):
            return
        with open(os.path.join(git_dir, AUDIT_FILE_NAME), "a", encoding="utf-8") as handle:
            handle.write(json.dumps(record) + "\n")
    except Exception:
        return


def main():
    payload = read_payload()
    tool_name = str(payload.get("tool_name") or "")

    if tool_name.lower() != "bash":
        sys.stdout.write("{}")
        return

    cwd = payload.get("cwd")
    if not isinstance(cwd, str) or not os.path.isdir(cwd):
        cwd = os.getcwd()

    family = classify_command(payload)
    failed = is_failure(payload.get("tool_response"))
    outcome = "failure" if failed else "success"

    append_audit_record(
        cwd,
        {
            "timestamp": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
            "tool_name": "Bash",
            "command_family": family or "other",
            "outcome": outcome,
        },
    )

    if family is not None and not failed:
        output = {
            "hookSpecificOutput": {
                "hookEventName": "PostToolUse",
                "additionalContext": EVIDENCE_REMINDER,
            }
        }
        sys.stdout.write(json.dumps(output))
    else:
        sys.stdout.write("{}")


if __name__ == "__main__":
    main()
