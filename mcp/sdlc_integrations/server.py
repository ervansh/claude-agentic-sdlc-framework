"""sdlc-integrations: authorized, credential-safe MCP access to Jira, Confluence and GitHub.

Transport: stdio (FastMCP). Configuration: environment variables only.
Run from the repo root: python mcp/sdlc_integrations/server.py

Tools (names are exact; agents depend on them):
  jira_get_issue, jira_search
  confluence_get_page, confluence_search, confluence_upsert_page (needs human_approved=true)
  github_get_pull_request, github_create_pull_request (needs human_approved=true, read-back verified)

Deliberately absent: no merge tool, no delete tool, no force-push tool, no issue-write tool.
Confluence upsert never deletes pages.
"""

import functools
import os
import re
import sys
from typing import Any

_HERE = os.path.dirname(os.path.abspath(__file__))
if _HERE not in sys.path:
    sys.path.insert(0, _HERE)

from mcp.server.fastmcp import FastMCP  # noqa: E402

from clients import (  # noqa: E402
    SdlcError,
    adf_to_text,
    redact,
    request_json,
    service_base_url,
    storage_to_text,
)

mcp = FastMCP("sdlc-integrations")

ISSUE_KEY_RE = re.compile(r"[A-Z][A-Z0-9]+-\d+")
REPO_PART_RE = re.compile(r"[A-Za-z0-9_.-]+")
NUMERIC_ID_RE = re.compile(r"\d+")
SPACE_KEY_RE = re.compile(r"[A-Za-z0-9_~-]{1,255}")
MAX_RESULTS = 100
DESCRIPTION_CHAR_LIMIT = 2000
JIRA_ISSUE_FIELDS = "summary,description,status,priority,issuetype,labels,comment,attachment"
CONFLUENCE_APPROVAL_MESSAGE = "Confluence writes require explicit human approval (human_approved=true)."
GITHUB_APPROVAL_MESSAGE = "GitHub writes require explicit human approval (human_approved=true)."


def _guarded(fn):
    """Strip secrets from errors and hide unexpected exception text."""

    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except SdlcError as exc:
            raise SdlcError(redact(str(exc))) from None
        except Exception as exc:  # noqa: BLE001 - message text may contain secrets
            raise SdlcError(f"{fn.__name__} failed unexpectedly ({type(exc).__name__}).") from None

    return wrapper


# --------------------------------------------------------------------------
# Validation and shaping helpers
# --------------------------------------------------------------------------

def _non_empty(value: Any, name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise SdlcError(f"{name} must not be empty.")
    return value.strip()


def _validate_issue_key(issue_key: Any) -> str:
    if not isinstance(issue_key, str) or not ISSUE_KEY_RE.fullmatch(issue_key):
        raise SdlcError("issue_key must look like PROJ-123 (uppercase project key, dash, number).")
    return issue_key


def _validate_repo(owner: Any, repo: Any) -> tuple[str, str]:
    for label, value in (("owner", owner), ("repo", repo)):
        if not isinstance(value, str) or not REPO_PART_RE.fullmatch(value) or value in (".", ".."):
            raise SdlcError(f"{label} may contain only letters, digits, '_', '.' and '-'.")
    return owner, repo


def _validate_pr_number(number: Any) -> int:
    if isinstance(number, bool) or not isinstance(number, int) or number < 1:
        raise SdlcError("number must be a positive integer.")
    return number


def _validate_numeric_id(value: Any, name: str) -> str:
    text = str(value) if value is not None else ""
    if not NUMERIC_ID_RE.fullmatch(text):
        raise SdlcError(f"{name} must be a numeric Confluence page id.")
    return text


def _validate_space_key(space_key: Any) -> str:
    if not isinstance(space_key, str) or not SPACE_KEY_RE.fullmatch(space_key):
        raise SdlcError("space_key contains invalid characters.")
    return space_key


def _clamp_limit(value: int) -> int:
    return max(1, min(int(value), MAX_RESULTS))


def _expect_dict(data: Any, label: str) -> dict:
    if not isinstance(data, dict):
        raise SdlcError(f"{label} returned an unexpected response.")
    return data


def _nested_name(obj: Any) -> Any:
    return obj.get("name") if isinstance(obj, dict) else None


def _display_name(obj: Any) -> Any:
    return obj.get("displayName") if isinstance(obj, dict) else None


def _cql_quote(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"')


def _page_url(data: dict) -> Any:
    links = data.get("_links") or {}
    if links.get("base") and links.get("webui"):
        return links["base"] + links["webui"]
    return None


def _pr_summary(data: dict) -> dict:
    return {
        "number": data.get("number"),
        "title": data.get("title"),
        "state": data.get("state"),
        "draft": data.get("draft"),
        "html_url": data.get("html_url"),
        "head_ref": (data.get("head") or {}).get("ref"),
        "base_ref": (data.get("base") or {}).get("ref"),
        "merged": data.get("merged"),
        "mergeable_state": data.get("mergeable_state"),
    }


# --------------------------------------------------------------------------
# Jira
# --------------------------------------------------------------------------

@mcp.tool(name="jira_get_issue")
@_guarded
def jira_get_issue(issue_key: str) -> dict:
    """Get a Jira issue: summary, status, priority, labels, plain-text description and comments, attachment names."""
    key = _validate_issue_key(issue_key)
    data = _expect_dict(
        request_json("jira", "GET", f"/rest/api/3/issue/{key}", params={"fields": JIRA_ISSUE_FIELDS}),
        "Jira",
    )
    fields = data.get("fields") or {}
    description = adf_to_text(fields.get("description"))
    comments = [
        {
            "author": _display_name(comment.get("author")),
            "created": comment.get("created"),
            "body": adf_to_text(comment.get("body")),
        }
        for comment in (fields.get("comment") or {}).get("comments", [])
    ]
    return {
        "key": data.get("key", key),
        "url": f"{service_base_url('jira')}/browse/{key}",
        "summary": fields.get("summary"),
        "status": _nested_name(fields.get("status")),
        "priority": _nested_name(fields.get("priority")),
        "issue_type": _nested_name(fields.get("issuetype")),
        "labels": fields.get("labels") or [],
        "description": description[:DESCRIPTION_CHAR_LIMIT],
        "description_truncated": len(description) > DESCRIPTION_CHAR_LIMIT,
        "comments": comments,
        "attachments": [a.get("filename") for a in fields.get("attachment") or []],
    }


@mcp.tool(name="jira_search")
@_guarded
def jira_search(jql: str, max_results: int = 25) -> list:
    """Search Jira with JQL. Returns key, url, summary, status and issue type. max_results is capped at 100."""
    query = _non_empty(jql, "jql")
    data = _expect_dict(
        request_json(
            "jira",
            "POST",
            "/rest/api/3/search/jql",
            json_body={
                "jql": query,
                "maxResults": _clamp_limit(max_results),
                "fields": ["summary", "status", "issuetype"],
            },
        ),
        "Jira",
    )
    base = service_base_url("jira")
    results = []
    for issue in data.get("issues") or []:
        key = issue.get("key")
        fields = issue.get("fields") or {}
        results.append({
            "key": key,
            "url": f"{base}/browse/{key}" if key else None,
            "summary": fields.get("summary"),
            "status": _nested_name(fields.get("status")),
            "issue_type": _nested_name(fields.get("issuetype")),
        })
    return results


# --------------------------------------------------------------------------
# Confluence
# --------------------------------------------------------------------------

@mcp.tool(name="confluence_get_page")
@_guarded
def confluence_get_page(page_id: str) -> dict:
    """Get a Confluence page: title, space key, version number, url and plain-text body."""
    pid = _validate_numeric_id(page_id, "page_id")
    data = _expect_dict(
        request_json("confluence", "GET", f"/rest/api/content/{pid}",
                     params={"expand": "body.storage,version,space"}),
        "Confluence",
    )
    storage = ((data.get("body") or {}).get("storage") or {}).get("value", "")
    return {
        "id": data.get("id", pid),
        "title": data.get("title"),
        "space_key": (data.get("space") or {}).get("key"),
        "version": (data.get("version") or {}).get("number"),
        "url": _page_url(data),
        "body_text": storage_to_text(storage),
    }


@mcp.tool(name="confluence_search")
@_guarded
def confluence_search(cql: str, limit: int = 25) -> list:
    """Search Confluence with CQL. Returns id, title, type, space key and url. limit is capped at 100."""
    query = _non_empty(cql, "cql")
    data = _expect_dict(
        request_json("confluence", "GET", "/rest/api/content/search",
                     params={"cql": query, "limit": _clamp_limit(limit)}),
        "Confluence",
    )
    return [
        {
            "id": item.get("id"),
            "title": item.get("title"),
            "type": item.get("type"),
            "space_key": (item.get("space") or {}).get("key"),
            "url": _page_url(item),
        }
        for item in data.get("results") or []
    ]


@mcp.tool(name="confluence_upsert_page")
@_guarded
def confluence_upsert_page(
    space_key: str,
    title: str,
    body_storage_html: str,
    parent_id: str | None = None,
    human_approved: bool = False,
) -> dict:
    """Create or update a Confluence page by title in a space (idempotent). Requires human_approved=true. Never deletes."""
    if human_approved is not True:
        raise SdlcError(CONFLUENCE_APPROVAL_MESSAGE)
    key = _validate_space_key(space_key)
    page_title = _non_empty(title, "title")
    body = _non_empty(body_storage_html, "body_storage_html")
    parent = _validate_numeric_id(parent_id, "parent_id") if parent_id not in (None, "") else None

    cql = f'type=page AND space="{_cql_quote(key)}" AND title="{_cql_quote(page_title)}"'
    found = _expect_dict(
        request_json("confluence", "GET", "/rest/api/content/search",
                     params={"cql": cql, "limit": 2, "expand": "version"}),
        "Confluence",
    )
    matches = found.get("results") or []
    if len(matches) > 1:
        raise SdlcError("Multiple Confluence pages match this space and title; refusing to pick one.")

    storage = {"storage": {"value": body, "representation": "storage"}}
    if matches:
        current = matches[0]
        page_id = _validate_numeric_id(current.get("id"), "page id")
        current_version = (current.get("version") or {}).get("number")
        if not isinstance(current_version, int):
            raise SdlcError("Confluence did not return the current page version.")
        data = request_json(
            "confluence",
            "PUT",
            f"/rest/api/content/{page_id}",
            json_body={
                "id": page_id,
                "type": "page",
                "title": page_title,
                "version": {"number": current_version + 1},
                "body": storage,
            },
        )
        action = "updated"
    else:
        payload: dict[str, Any] = {
            "type": "page",
            "title": page_title,
            "space": {"key": key},
            "body": storage,
        }
        if parent:
            payload["ancestors"] = [{"id": parent}]
        data = request_json("confluence", "POST", "/rest/api/content", json_body=payload)
        action = "created"

    data = _expect_dict(data, "Confluence")
    return {
        "id": data.get("id"),
        "url": _page_url(data),
        "action": action,
        "title": page_title,
        "space_key": key,
        "version": (data.get("version") or {}).get("number"),
    }


# --------------------------------------------------------------------------
# GitHub
# --------------------------------------------------------------------------

@mcp.tool(name="github_get_pull_request")
@_guarded
def github_get_pull_request(owner: str, repo: str, number: int) -> dict:
    """Get a pull request: number, title, state, draft, html_url, head/base refs, merged, mergeable_state."""
    o, r = _validate_repo(owner, repo)
    n = _validate_pr_number(number)
    data = _expect_dict(request_json("github", "GET", f"/repos/{o}/{r}/pulls/{n}"), "GitHub")
    return _pr_summary(data)


@mcp.tool(name="github_create_pull_request")
@_guarded
def github_create_pull_request(
    owner: str,
    repo: str,
    title: str,
    body: str,
    head: str,
    base: str,
    draft: bool,
    human_approved: bool,
) -> dict:
    """Open a pull request. Requires human_approved=true. Returns verified=true only after a read-back GET succeeds. Never merges."""
    if human_approved is not True:
        raise SdlcError(GITHUB_APPROVAL_MESSAGE)
    o, r = _validate_repo(owner, repo)
    pr_title = _non_empty(title, "title")
    head_ref = _non_empty(head, "head")
    base_ref = _non_empty(base, "base")

    created = _expect_dict(
        request_json(
            "github",
            "POST",
            f"/repos/{o}/{r}/pulls",
            json_body={
                "title": pr_title,
                "body": body or "",
                "head": head_ref,
                "base": base_ref,
                "draft": bool(draft),
            },
        ),
        "GitHub",
    )
    number = created.get("number")
    if not isinstance(number, int) or isinstance(number, bool):
        raise SdlcError("GitHub did not return a pull request number.")

    result = {
        "number": number,
        "html_url": created.get("html_url"),
        "state": created.get("state"),
        "verified": False,
    }
    try:
        readback = _expect_dict(
            request_json("github", "GET", f"/repos/{o}/{r}/pulls/{number}"), "GitHub"
        )
    except SdlcError as exc:
        result["verify_error"] = f"read-back failed: {exc}"
        return result
    result["verified"] = readback.get("number") == number
    return result


if __name__ == "__main__":
    mcp.run()
