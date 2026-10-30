"""PreToolUse hook: deterministically deny selected destructive shell operations.

Only Bash tool calls are inspected. Unparseable input is denied (fail closed).
"""

import json
import re
import sys

DENY_UNPARSEABLE = (
    "SDLC pre-tool policy could not parse the tool request. Tool execution is "
    "denied rather than bypassing the safety policy."
)

# (pattern, reason). Patterns are matched with re.IGNORECASE against the
# whitespace-normalized command text, mirroring the reference pre-tool-policy rules.
RULES = [
    (
        r"\bgit\s+push\b[^;&|]*(?:--force-with-lease|--force|-f(?:\s|$))",
        "Force-pushing is blocked by the Agentic SDLC repository policy. "
        "A human must perform any history-rewriting push explicitly.",
    ),
    (
        r"\bgit\s+push\b[^;&|]*--delete\b",
        "Remote branch deletion is blocked by the Agentic SDLC repository policy.",
    ),
    (
        r"\bgit\s+reset\s+--hard\b",
        "git reset --hard is blocked because it can destroy uncommitted repository work.",
    ),
    (
        r"\bgit\s+clean\b[^;&|]*-[a-z]*f[a-z]*\b",
        "Forced git clean is blocked because it can permanently delete untracked work.",
    ),
    (
        r"\bgit\s+branch\s+-D\b",
        "Forced branch deletion is blocked by the Agentic SDLC repository policy.",
    ),
    (
        r"\bgit\s+checkout\s+--\s+\.\s*(?:$|[;&|])",
        "Destructive checkout of the working tree is blocked because it can discard user changes.",
    ),
    (
        r"\bgit\s+restore\s+(?:--worktree\s+)?\.\s*(?:$|[;&|])",
        "Repository-wide destructive restore is blocked because it can discard user changes.",
    ),
    (
        r"\bgh\s+pr\s+merge\b",
        "Automated pull-request merging is blocked. The framework stops at human PR review.",
    ),
    (
        r"\bgh\s+repo\s+delete\b",
        "Repository deletion is blocked by the Agentic SDLC safety policy.",
    ),
    (
        r"\bnpm\s+audit\s+fix\b[^;&|]*--force\b",
        "npm audit fix --force is blocked because it can introduce unreviewed breaking dependency changes.",
    ),
    (
        r"\brm\s+-[a-z]*rf[a-z]*\s+(?:\/|\.|\.\.|\.git)(?:\s|$)",
        "Broad recursive filesystem deletion is blocked by the Agentic SDLC safety policy.",
    ),
    (
        r"\bremove-item\b[^;&|]*-recurse\b[^;&|]*-force\b[^;&|]*(?:\.git|(?:^|\s)\.(?:\s|$))",
        "Broad recursive PowerShell deletion is blocked by the Agentic SDLC safety policy.",
    ),
]

COMPILED_RULES = [(re.compile(pattern, re.IGNORECASE), reason) for pattern, reason in RULES]


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


def deny_output(reason):
    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }


def read_payload():
    """Return (payload, ok). Empty input yields ({}, True); invalid input yields (None, False)."""
    try:
        raw = sys.stdin.read()
    except (OSError, ValueError):
        return None, False
    if not raw.strip():
        return {}, True
    try:
        parsed = json.loads(raw)
    except ValueError:
        return None, False
    if not isinstance(parsed, dict):
        return None, False
    return parsed, True


def evaluate(payload):
    """Return the hook output dict for a parsed payload."""
    tool_name = str(payload.get("tool_name") or "").lower()
    if tool_name != "bash":
        return {}

    tool_input = payload.get("tool_input")
    if tool_input is None:
        tool_input = {}

    command_text = re.sub(r"\s+", " ", " ".join(collect_strings(tool_input))).strip()

    for pattern, reason in COMPILED_RULES:
        if pattern.search(command_text):
            return deny_output(reason)
    return {}


def main():
    payload, ok = read_payload()
    if not ok:
        output = deny_output(DENY_UNPARSEABLE)
    else:
        output = evaluate(payload)
    sys.stdout.write(json.dumps(output))


if __name__ == "__main__":
    main()
