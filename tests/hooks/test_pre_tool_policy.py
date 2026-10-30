import json
import os
import subprocess
import sys
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
POLICY_PATH = os.path.join(PROJECT_ROOT, ".claude", "hooks", "pre_tool_policy.py")


def run_hook(stdin_text):
    completed = subprocess.run(
        [sys.executable, POLICY_PATH],
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=20,
    )
    return completed.returncode, completed.stdout, completed.stderr


def evaluate(command, tool_name="Bash"):
    payload = {"tool_name": tool_name, "tool_input": {"command": command}}
    code, stdout, stderr = run_hook(json.dumps(payload))
    if code != 0:
        raise AssertionError(f"hook exited {code}: {stderr}")
    return json.loads(stdout)


def assert_denied(test, command):
    decision = evaluate(command)
    test.assertEqual(decision["hookSpecificOutput"]["hookEventName"], "PreToolUse")
    test.assertEqual(decision["hookSpecificOutput"]["permissionDecision"], "deny", command)
    test.assertTrue(decision["hookSpecificOutput"]["permissionDecisionReason"], command)


class PreToolPolicyTests(unittest.TestCase):
    # Ported from the reference pre-tool-policy test
    def test_denies_force_push(self):
        assert_denied(self, "git push --force")

    def test_denies_pull_request_merge(self):
        assert_denied(self, "gh pr merge 123")

    def test_leaves_normal_push_to_regular_permission_flow(self):
        self.assertEqual(evaluate("git push origin feature/example"), {})

    def test_does_not_inspect_non_shell_tool_arguments(self):
        payload = {"tool_name": "Read", "tool_input": {"command": "git push --force"}}
        code, stdout, _ = run_hook(json.dumps(payload))
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(stdout), {})

    # Additional cases required by the port
    def test_non_bash_tool_is_allowed(self):
        payload = {"tool_name": "Write", "tool_input": {"file_path": "x", "content": "git reset --hard"}}
        _, stdout, _ = run_hook(json.dumps(payload))
        self.assertEqual(json.loads(stdout), {})

    def test_invalid_json_is_denied(self):
        code, stdout, _ = run_hook("{not valid json")
        self.assertEqual(code, 0)
        decision = json.loads(stdout)
        self.assertEqual(decision["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_non_object_json_is_denied(self):
        code, stdout, _ = run_hook("[1, 2, 3]")
        self.assertEqual(code, 0)
        decision = json.loads(stdout)
        self.assertEqual(decision["hookSpecificOutput"]["permissionDecision"], "deny")

    def test_empty_input_is_allowed(self):
        code, stdout, _ = run_hook("")
        self.assertEqual(code, 0)
        self.assertEqual(json.loads(stdout), {})

    def test_denies_git_push_force(self):
        assert_denied(self, "git push --force")

    def test_denies_git_push_short_force_flag(self):
        assert_denied(self, "git push origin main -f")

    def test_denies_git_push_force_with_lease(self):
        assert_denied(self, "git push --force-with-lease origin feature/x")

    def test_denies_git_reset_hard_head(self):
        assert_denied(self, "git reset --hard HEAD")

    def test_denies_npm_audit_fix_force(self):
        assert_denied(self, "npm audit fix --force")

    def test_denies_gh_pr_merge(self):
        assert_denied(self, "gh pr merge 1")

    def test_denies_remote_branch_deletion(self):
        assert_denied(self, "git push origin --delete feature/x")

    def test_denies_forced_branch_deletion(self):
        assert_denied(self, "git branch -D feature/x")

    def test_denies_forced_git_clean(self):
        assert_denied(self, "git clean -fd")

    def test_denies_repository_wide_checkout_discard(self):
        assert_denied(self, "git checkout -- .")

    def test_denies_repository_wide_restore(self):
        assert_denied(self, "git restore .")

    def test_denies_gh_repo_delete(self):
        assert_denied(self, "gh repo delete owner/repo --yes")

    def test_denies_broad_recursive_deletion(self):
        assert_denied(self, "rm -rf .")

    def test_denies_case_insensitively(self):
        assert_denied(self, "GIT RESET --HARD HEAD")

    def test_npm_test_is_allowed(self):
        self.assertEqual(evaluate("npm test"), {})

    def test_safe_git_status_is_allowed(self):
        self.assertEqual(evaluate("git status --short"), {})

    def test_reading_readme_text_through_non_bash_tool_is_allowed(self):
        payload = {
            "tool_name": "Read",
            "tool_input": {"file_path": "README.md", "content": "git push --force"},
        }
        _, stdout, _ = run_hook(json.dumps(payload))
        self.assertEqual(json.loads(stdout), {})


if __name__ == "__main__":
    unittest.main()
