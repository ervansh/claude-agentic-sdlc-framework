import json
import os
import subprocess
import sys
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SESSION_START_PATH = os.path.join(PROJECT_ROOT, ".claude", "hooks", "session_start.py")


def run_hook(stdin_text):
    completed = subprocess.run(
        [sys.executable, SESSION_START_PATH],
        input=stdin_text,
        capture_output=True,
        text=True,
        timeout=20,
    )
    return completed


class SessionStartTests(unittest.TestCase):
    def assert_context_output(self, completed):
        self.assertEqual(completed.returncode, 0, completed.stderr)
        output = json.loads(completed.stdout)
        specific = output["hookSpecificOutput"]
        self.assertEqual(specific["hookEventName"], "SessionStart")
        self.assertIsInstance(specific["additionalContext"], str)
        return specific["additionalContext"]

    def test_output_shape_and_guardrail_text(self):
        context = self.assert_context_output(run_hook(json.dumps({"session_id": "s"})))
        self.assertIn("Agentic SDLC repository guardrails are active.", context)
        self.assertIn("Read CLAUDE.md.", context)
        self.assertIn("CLAUDE.md", context)
        self.assertIn("Pull Request evidence -> pull-request.md", context)
        self.assertIn("8. If environment capability is unavailable", context)

    def test_empty_input_is_tolerated(self):
        self.assert_context_output(run_hook(""))

    def test_invalid_input_is_tolerated(self):
        self.assert_context_output(run_hook("not json at all"))


if __name__ == "__main__":
    unittest.main()
