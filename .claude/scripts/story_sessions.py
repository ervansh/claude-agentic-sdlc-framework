#!/usr/bin/env python3
"""Story sessions: one story branch per story, checked out in the current workspace.

No worktrees are created. A story session is:
  - a local Git branch (default `story/<STORY-ID>`), created from the default branch
  - an artifact directory `<application-root>/docs/sdlc/stories/<STORY-ID>/`

Guards (industry-standard, non-destructive):
  - START and RESUME refuse to switch branches when the working tree is dirty.
  - START refuses when the story branch already exists.
  - RESUME refuses when the story branch does not exist.
  - Nothing is stashed, reset, deleted, merged, pushed, or force-updated.

Usage:
  story_sessions.py start  --application-root <path> --story-id <id> [--story-branch <name>]
  story_sessions.py resume --story-id <id> [--story-branch <name>] [--application-root <path>]
  story_sessions.py status [--application-root <path>]
  story_sessions.py list   [--application-root <path>]

Output: one JSON object on stdout. Refusals print {"ok": false, "error": "..."} and exit 1.
Stdlib only. Git is invoked with argument lists, never through a shell.
"""

import argparse
import json
import os
import re
import subprocess
import sys

STORY_ID_PATTERN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9._-]{0,78}[A-Za-z0-9])?$")
BRANCH_PREFIX = "story/"
GIT_TIMEOUT_SECONDS = 60


class StorySessionError(Exception):
    """A refusal that is safe to report to the user."""


def run_git(args, cwd, check=True):
    """Run git with an argument list. Returns stripped stdout, or None when check=False and git fails."""
    try:
        result = subprocess.run(
            ["git", *args],
            cwd=cwd,
            capture_output=True,
            text=True,
            check=False,
            timeout=GIT_TIMEOUT_SECONDS,
        )
    except FileNotFoundError as error:
        raise StorySessionError("git is not installed or not on PATH.") from error
    except subprocess.TimeoutExpired as error:
        raise StorySessionError(f"git {args[0]} timed out.") from error

    if result.returncode != 0:
        if not check:
            return None
        lines = (result.stderr or result.stdout).strip().splitlines()
        detail = lines[0] if lines else "unknown error"
        raise StorySessionError(f"git {args[0]} failed: {detail}")
    return result.stdout.strip()


def repository_root(cwd):
    """Return the working-tree root. Refuses bare repositories and paths outside a repository."""
    root = run_git(["rev-parse", "--show-toplevel"], cwd, check=False)
    if not root:
        raise StorySessionError("Not inside a Git working tree.")
    if run_git(["rev-parse", "--is-bare-repository"], root) != "false":
        raise StorySessionError("Story sessions are not supported in a bare Git repository.")
    return os.path.realpath(root)


def normalize_story_id(story_id):
    if not isinstance(story_id, str) or not STORY_ID_PATTERN.match(story_id):
        raise StorySessionError(
            "Story ID must start and end with a letter or number, contain only letters, "
            "numbers, dot, underscore, or hyphen, and be at most 80 characters."
        )
    return story_id.upper()


def validate_application_root(repo_root, application_root):
    """Return the application root as a normalized relative path, inside the repository."""
    if not isinstance(application_root, str) or not application_root.strip():
        raise StorySessionError("Application Root must be a non-empty path relative to the repository root.")
    if os.path.isabs(application_root) or ".." in re.split(r"[\\/]", application_root):
        raise StorySessionError("Application Root must be relative and must not contain '..'.")
    normalized = os.path.normpath(application_root)
    resolved = os.path.realpath(os.path.join(repo_root, normalized))
    if os.path.commonpath([repo_root, resolved]) != repo_root:
        raise StorySessionError("Application Root must be inside the repository.")
    return normalized.replace(os.sep, "/")


def story_branch_name(story_id, story_branch):
    """Return the validated story branch name. Default: story/<STORY-ID>."""
    name = story_branch or f"{BRANCH_PREFIX}{story_id}"
    if not name.startswith(BRANCH_PREFIX):
        raise StorySessionError(f"Story Branch must start with '{BRANCH_PREFIX}'.")
    if run_git(["check-ref-format", "--branch", name], os.getcwd(), check=False) is None:
        raise StorySessionError(f"Story Branch is not a valid Git branch name: {name}")
    return name


def artifact_directory(application_root, story_id):
    return f"{application_root}/docs/sdlc/stories/{story_id}"


def branch_exists(repo_root, name):
    return run_git(["show-ref", "--verify", "--quiet", f"refs/heads/{name}"], repo_root, check=False) is not None


def current_branch(repo_root):
    return run_git(["branch", "--show-current"], repo_root)


def dirty_entries(repo_root):
    output = run_git(["status", "--porcelain"], repo_root)
    return [line for line in output.splitlines() if line] if output else []


def require_clean_tree(repo_root):
    entries = dirty_entries(repo_root)
    if entries:
        preview = entries[:10]
        raise StorySessionError(
            "Working tree has uncommitted changes. Commit or stash them yourself, then retry. "
            "Nothing was changed. Changed paths: " + "; ".join(preview)
            + (f" (and {len(entries) - 10} more)" if len(entries) > 10 else "")
        )


def default_branch(repo_root):
    """Resolve the default branch: origin/HEAD first, then local main, then local master."""
    remote_head = run_git(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], repo_root, check=False)
    if remote_head and remote_head.startswith("origin/"):
        candidate = remote_head[len("origin/"):]
        if branch_exists(repo_root, candidate):
            return candidate
    for candidate in ("main", "master"):
        if branch_exists(repo_root, candidate):
            return candidate
    raise StorySessionError("Cannot determine the default branch: no origin/HEAD, local main, or local master.")


def artifact_files(repo_root, application_root, story_id):
    if not application_root:
        return None
    directory = os.path.join(repo_root, *artifact_directory(application_root, story_id).split("/"))
    if not os.path.isdir(directory):
        return []
    return sorted(name for name in os.listdir(directory) if os.path.isfile(os.path.join(directory, name)))


def start_session(cwd, application_root, story_id, story_branch=None):
    repo_root = repository_root(cwd)
    story_id = normalize_story_id(story_id)
    app_root = validate_application_root(repo_root, application_root)
    branch = story_branch_name(story_id, story_branch)

    if branch_exists(repo_root, branch):
        raise StorySessionError(f"Story branch already exists: {branch}. Use RESUME to switch to it.")
    require_clean_tree(repo_root)
    base = default_branch(repo_root)

    run_git(["switch", "-c", branch, base], repo_root)
    os.makedirs(os.path.join(repo_root, *artifact_directory(app_root, story_id).split("/")), exist_ok=True)
    return {
        "ok": True,
        "action": "START",
        "storyId": story_id,
        "storyBranch": branch,
        "baseBranch": base,
        "currentBranch": branch,
        "artifactDirectory": artifact_directory(app_root, story_id),
        "artifacts": [],
    }


def resume_session(cwd, story_id, story_branch=None, application_root=None):
    repo_root = repository_root(cwd)
    story_id = normalize_story_id(story_id)
    branch = story_branch_name(story_id, story_branch)
    app_root = validate_application_root(repo_root, application_root) if application_root else None

    if not branch_exists(repo_root, branch):
        raise StorySessionError(f"No story branch named {branch}. Use START to create it.")

    switched = current_branch(repo_root) != branch
    if switched:
        require_clean_tree(repo_root)
        run_git(["switch", branch], repo_root)

    return {
        "ok": True,
        "action": "RESUME",
        "storyId": story_id,
        "storyBranch": branch,
        "switched": switched,
        "currentBranch": branch,
        "artifactDirectory": artifact_directory(app_root, story_id) if app_root else None,
        "artifacts": artifact_files(repo_root, app_root, story_id),
    }


def status_session(cwd, application_root=None):
    repo_root = repository_root(cwd)
    app_root = validate_application_root(repo_root, application_root) if application_root else None
    branch = current_branch(repo_root) or None
    is_story = bool(branch and branch.startswith(BRANCH_PREFIX))
    story_id = branch[len(BRANCH_PREFIX):].upper() if is_story else None
    entries = dirty_entries(repo_root)
    return {
        "ok": True,
        "action": "STATUS",
        "currentBranch": branch,
        "isStoryBranch": is_story,
        "storyId": story_id,
        "workingTreeClean": not entries,
        "changedPathCount": len(entries),
        "artifactDirectory": artifact_directory(app_root, story_id) if (app_root and story_id) else None,
        "artifacts": artifact_files(repo_root, app_root, story_id) if (app_root and story_id) else None,
    }


def list_sessions(cwd, application_root=None):
    repo_root = repository_root(cwd)
    app_root = validate_application_root(repo_root, application_root) if application_root else None
    branch_output = run_git(["for-each-ref", "--format=%(refname:short)", f"refs/heads/{BRANCH_PREFIX}"], repo_root)
    branches = {}
    for name in branch_output.splitlines() if branch_output else []:
        branches[name[len(BRANCH_PREFIX):].upper()] = name

    artifact_ids = set()
    if app_root:
        stories_dir = os.path.join(repo_root, *f"{app_root}/docs/sdlc/stories".split("/"))
        if os.path.isdir(stories_dir):
            for entry in os.listdir(stories_dir):
                if os.path.isdir(os.path.join(stories_dir, entry)) and STORY_ID_PATTERN.match(entry):
                    artifact_ids.add(entry.upper())

    active = current_branch(repo_root)
    sessions = []
    for story_id in sorted(set(branches) | artifact_ids):
        branch = branches.get(story_id)
        sessions.append({
            "storyId": story_id,
            "storyBranch": branch,
            "branchExists": branch is not None,
            "isCurrent": branch is not None and branch == active,
            "artifactDirectory": artifact_directory(app_root, story_id) if app_root else None,
            "artifactDirectoryExists": story_id in artifact_ids,
        })
    return {"ok": True, "action": "LIST", "currentBranch": active or None, "sessions": sessions}


def build_parser():
    parser = argparse.ArgumentParser(description="Story sessions on story branches in the current workspace.")
    commands = parser.add_subparsers(dest="command", required=True)

    start = commands.add_parser("start", help="create a story branch and switch to it")
    start.add_argument("--application-root", required=True)
    start.add_argument("--story-id", required=True)
    start.add_argument("--story-branch")

    resume = commands.add_parser("resume", help="switch to an existing story branch")
    resume.add_argument("--story-id", required=True)
    resume.add_argument("--story-branch")
    resume.add_argument("--application-root")

    status = commands.add_parser("status", help="show the current branch and story state")
    status.add_argument("--application-root")

    listing = commands.add_parser("list", help="list story branches and artifact directories")
    listing.add_argument("--application-root")
    return parser


def main(argv=None, cwd=None):
    args = build_parser().parse_args(argv)
    working_directory = cwd or os.getcwd()
    try:
        if args.command == "start":
            result = start_session(working_directory, args.application_root, args.story_id, args.story_branch)
        elif args.command == "resume":
            result = resume_session(working_directory, args.story_id, args.story_branch, args.application_root)
        elif args.command == "status":
            result = status_session(working_directory, args.application_root)
        else:
            result = list_sessions(working_directory, args.application_root)
    except StorySessionError as error:
        print(json.dumps({"ok": False, "error": str(error)}, indent=2))
        return 1
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
