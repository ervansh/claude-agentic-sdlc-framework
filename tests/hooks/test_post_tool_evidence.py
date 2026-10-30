import json
import os
import shutil
import subprocess
import sys
import tempfile
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
POST_PATH = os.path.join(PROJECT_ROOT, ".claude", "hooks", "post_tool_evidence.py")
SCRATCH_ROOT = os.environ.get(
    "CLAUDE_TEST_SCRATCH_ROOT",
    "/tmp/claude-0/-home-claude/dbfde2b3-8537-50dc-a836-4e3af318c023/scratchpad",
)
MARKER = "marker-arg-7f3a"


def make_repo(test):
    os.makedirs(SCRATCH_ROOT, exist_ok=True)
    parent = tempfile.mkdtemp(prefix="post-evidence-", dir=SCRATCH_ROOT)
    test.addCleanup(shutil.rmtree, parent, True)
    repo = os.path.join(parent, "repo")
    os.makedirs(repo)
    subprocess.run(["git", "init", "-q", repo], check=True)
    return repo


def run_hook(payload, cwd=None):
    completed = subprocess.run(
        [sys.executable, POST_PATH],
        input=json.dumps(payload),
        capture_output=True,
        text=True,
        cwd=cwd,
        timeout=20,
    )
    return completed


def bash_payload(command, response=None, cwd=None):
    payload = {
        "tool_name": "Bash",
        "tool_input": {"command": command},
        "tool_response": response if response is not None else {"exit_code": 0},
    }
    if cwd is not None:
        payload["cwd"] = cwd
    return payload


class PostToolEvidenceTests(unittest.TestCase):
    def test_successful_verification_outputs_evidence_reminder(self):
        completed = run_hook(bash_payload("npm test"), cwd=PROJECT_ROOT)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        output = json.loads(completed.stdout)
        specific = output["hookSpecificOutput"]
        self.assertEqual(specific["hookEventName"], "PostToolUse")
        self.assertEqual(
            specific["additionalContext"],
            "Record the actual command, result, and evidence in the active SDLC artifact.",
        )

    def test_non_verification_command_outputs_empty_object(self):
        completed = run_hook(bash_payload("ls -la"), cwd=PROJECT_ROOT)
        self.assertEqual(json.loads(completed.stdout), {})

    def test_failed_verification_outputs_empty_object(self):
        completed = run_hook(bash_payload("npm test", {"exit_code": 1}), cwd=PROJECT_ROOT)
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(json.loads(completed.stdout), {})

    def test_audit_written_with_minimal_metadata_and_no_raw_arguments(self):
        repo = make_repo(self)
        command = f"npm test --{MARKER}"
        run_hook(bash_payload(command, cwd=repo), cwd=repo)

        audit_path = os.path.join(repo, ".git", "claude-hooks-audit.jsonl")
        self.assertTrue(os.path.isfile(audit_path))
        with open(audit_path, encoding="utf-8") as handle:
            raw = handle.read()
        self.assertNotIn(MARKER, raw)
        records = [json.loads(line) for line in raw.splitlines() if line.strip()]
        self.assertEqual(len(records), 1)
        record = records[0]
        self.assertEqual(set(record), {"timestamp", "tool_name", "command_family", "outcome"})
        self.assertEqual(record["tool_name"], "Bash")
        self.assertEqual(record["command_family"], "npm_test")
        self.assertEqual(record["outcome"], "success")
        self.assertTrue(record["timestamp"].endswith("Z"))

    def test_failure_is_recorded_as_failure_without_error_text(self):
        repo = make_repo(self)
        response = {"exit_code": 2, "error": f"secret-error-{MARKER}", "stderr": MARKER}
        run_hook(bash_payload("npx tsc --noEmit", response, cwd=repo), cwd=repo)

        with open(os.path.join(repo, ".git", "claude-hooks-audit.jsonl"), encoding="utf-8") as handle:
            raw = handle.read()
        self.assertNotIn(MARKER, raw)
        record = json.loads(raw.splitlines()[0])
        self.assertEqual(record["outcome"], "failure")
        self.assertEqual(record["command_family"], "typescript")

    def test_is_error_true_is_failure(self):
        repo = make_repo(self)
        run_hook(bash_payload("ls", {"is_error": True}, cwd=repo), cwd=repo)
        with open(os.path.join(repo, ".git", "claude-hooks-audit.jsonl"), encoding="utf-8") as handle:
            record = json.loads(handle.readline())
        self.assertEqual(record["outcome"], "failure")
        self.assertEqual(record["command_family"], "other")

    def test_no_audit_when_no_git_directory(self):
        parent = tempfile.mkdtemp(prefix="post-evidence-nogit-", dir=SCRATCH_ROOT)
        self.addCleanup(shutil.rmtree, parent, True)
        completed = run_hook(bash_payload("npm test"), cwd=parent)
        self.assertEqual(completed.returncode, 0, completed.stderr)
        self.assertFalse(os.path.exists(os.path.join(parent, "claude-hooks-audit.jsonl")))

    def test_invalid_input_is_tolerated(self):
        completed = subprocess.run(
            [sys.executable, POST_PATH],
            input="garbage",
            capture_output=True,
            text=True,
            timeout=20,
        )
        self.assertEqual(completed.returncode, 0)
        self.assertEqual(json.loads(completed.stdout), {})


if __name__ == "__main__":
    unittest.main()
