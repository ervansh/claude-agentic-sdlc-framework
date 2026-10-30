import importlib.util
import os
import shutil
import subprocess
import tempfile
import unittest

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODULE_PATH = os.path.join(PROJECT_ROOT, ".claude", "scripts", "story_sessions.py")

_spec = importlib.util.spec_from_file_location("story_sessions", MODULE_PATH)
story_sessions = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(story_sessions)

GIT_ENV = {
    "GIT_AUTHOR_NAME": "sdlc-test",
    "GIT_AUTHOR_EMAIL": "sdlc-test@example.invalid",
    "GIT_COMMITTER_NAME": "sdlc-test",
    "GIT_COMMITTER_EMAIL": "sdlc-test@example.invalid",
}


def git(args, cwd):
    result = subprocess.run(
        ["git", *args], cwd=cwd, capture_output=True, text=True, check=True,
        env={**os.environ, **GIT_ENV},
    )
    return result.stdout.strip()


class StorySessionTests(unittest.TestCase):
    def setUp(self):
        self.repo = tempfile.mkdtemp(prefix="story-sessions-")
        git(["init", "-q", "-b", "main"], self.repo)
        self.write("sample-app/README.md", "baseline\n")
        git(["add", "."], self.repo)
        git(["commit", "-q", "-m", "baseline"], self.repo)

    def tearDown(self):
        shutil.rmtree(self.repo, ignore_errors=True)

    def write(self, relative, content):
        path = os.path.join(self.repo, relative)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, "w", encoding="utf-8") as handle:
            handle.write(content)

    def commit_all(self, message):
        git(["add", "-A"], self.repo)
        git(["commit", "-q", "-m", message], self.repo)

    def branches(self):
        return git(["for-each-ref", "--format=%(refname:short)", "refs/heads/"], self.repo).splitlines()

    def test_start_creates_story_branch_from_default_branch_without_worktrees(self):
        result = story_sessions.start_session(self.repo, "sample-app", "STORY-1")
        self.assertEqual(result["storyBranch"], "story/STORY-1")
        self.assertEqual(result["baseBranch"], "main")
        self.assertEqual(git(["branch", "--show-current"], self.repo), "story/STORY-1")
        self.assertEqual(result["artifactDirectory"], "sample-app/docs/sdlc/stories/STORY-1")
        self.assertTrue(os.path.isdir(os.path.join(self.repo, "sample-app", "docs", "sdlc", "stories", "STORY-1")))
        self.assertEqual(len(git(["worktree", "list"], self.repo).splitlines()), 1)

    def test_start_refuses_dirty_working_tree(self):
        self.write("sample-app/README.md", "changed\n")
        with self.assertRaisesRegex(story_sessions.StorySessionError, "uncommitted changes"):
            story_sessions.start_session(self.repo, "sample-app", "STORY-1")
        self.assertEqual(git(["branch", "--show-current"], self.repo), "main")

    def test_start_refuses_existing_story_branch(self):
        story_sessions.start_session(self.repo, "sample-app", "STORY-1")
        git(["switch", "main"], self.repo)
        with self.assertRaisesRegex(story_sessions.StorySessionError, "already exists"):
            story_sessions.start_session(self.repo, "sample-app", "STORY-1")

    def test_resume_refuses_missing_story_branch(self):
        with self.assertRaisesRegex(story_sessions.StorySessionError, "No story branch"):
            story_sessions.resume_session(self.repo, "STORY-9")

    def test_two_stories_keep_their_own_files_and_switch_on_clean_tree_only(self):
        story_sessions.start_session(self.repo, "sample-app", "STORY-1")
        self.write("sample-app/story-1.txt", "story one work\n")
        self.commit_all("story 1 work")
        git(["switch", "main"], self.repo)
        story_sessions.start_session(self.repo, "sample-app", "STORY-2")
        self.assertFalse(os.path.exists(os.path.join(self.repo, "sample-app", "story-1.txt")))

        self.write("sample-app/story-2.txt", "uncommitted\n")
        with self.assertRaisesRegex(story_sessions.StorySessionError, "uncommitted changes"):
            story_sessions.resume_session(self.repo, "STORY-1")
        self.assertEqual(git(["branch", "--show-current"], self.repo), "story/STORY-2")

        self.commit_all("story 2 work")
        result = story_sessions.resume_session(self.repo, "STORY-1", application_root="sample-app")
        self.assertTrue(result["switched"])
        self.assertEqual(git(["branch", "--show-current"], self.repo), "story/STORY-1")
        self.assertTrue(os.path.exists(os.path.join(self.repo, "sample-app", "story-1.txt")))
        self.assertEqual(len(git(["worktree", "list"], self.repo).splitlines()), 1)

    def test_resume_on_current_branch_is_a_no_op_even_when_dirty(self):
        story_sessions.start_session(self.repo, "sample-app", "STORY-1")
        self.write("sample-app/README.md", "in progress\n")
        result = story_sessions.resume_session(self.repo, "STORY-1")
        self.assertFalse(result["switched"])

    def test_list_reports_branches_and_artifact_directories(self):
        story_sessions.start_session(self.repo, "sample-app", "STORY-1")
        git(["switch", "main"], self.repo)
        os.makedirs(os.path.join(self.repo, "sample-app", "docs", "sdlc", "stories", "STORY-3"))
        result = story_sessions.list_sessions(self.repo, "sample-app")
        by_id = {session["storyId"]: session for session in result["sessions"]}
        self.assertTrue(by_id["STORY-1"]["branchExists"])
        self.assertTrue(by_id["STORY-1"]["artifactDirectoryExists"])
        self.assertFalse(by_id["STORY-3"]["branchExists"])
        self.assertTrue(by_id["STORY-3"]["artifactDirectoryExists"])
        self.assertEqual(result["currentBranch"], "main")

    def test_status_reports_story_and_clean_state(self):
        story_sessions.start_session(self.repo, "sample-app", "STORY-1")
        self.write("sample-app/README.md", "dirty\n")
        result = story_sessions.status_session(self.repo, "sample-app")
        self.assertTrue(result["isStoryBranch"])
        self.assertEqual(result["storyId"], "STORY-1")
        self.assertFalse(result["workingTreeClean"])
        self.assertEqual(result["changedPathCount"], 1)

    def test_rejects_invalid_story_id_branch_and_application_root(self):
        with self.assertRaisesRegex(story_sessions.StorySessionError, "Story ID"):
            story_sessions.start_session(self.repo, "sample-app", "bad id;rm")
        with self.assertRaisesRegex(story_sessions.StorySessionError, "must start with 'story/'"):
            story_sessions.start_session(self.repo, "sample-app", "STORY-1", "feature/x")
        with self.assertRaisesRegex(story_sessions.StorySessionError, "not a valid Git branch"):
            story_sessions.start_session(self.repo, "sample-app", "STORY-1", "story/bad..name")
        with self.assertRaisesRegex(story_sessions.StorySessionError, "'..'"):
            story_sessions.start_session(self.repo, "../outside", "STORY-1")

    def test_default_branch_falls_back_to_master(self):
        git(["branch", "-m", "main", "master"], self.repo)
        self.assertEqual(story_sessions.default_branch(self.repo), "master")

    def test_default_branch_fails_when_none_found(self):
        git(["branch", "-m", "main", "trunk"], self.repo)
        with self.assertRaisesRegex(story_sessions.StorySessionError, "Cannot determine the default branch"):
            story_sessions.default_branch(self.repo)


if __name__ == "__main__":
    unittest.main()
