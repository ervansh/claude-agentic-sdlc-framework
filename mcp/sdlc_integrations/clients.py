"""Configuration, HTTP transport, and text converters for sdlc-integrations.

Credentials and base URLs come only from environment variables. Error messages
name variables but never include a secret value or a response body.

Tests replace ``make_client`` in this module (``mock.patch.object``) to route
requests through ``httpx.MockTransport``.
"""

from __future__ import annotations

import os
import re
from html.parser import HTMLParser
from typing import Any

import httpx

REQUEST_TIMEOUT_SECONDS = 30.0
DEFAULT_GITHUB_API_URL = "https://api.github.com"
SERVICE_LABELS = {"jira": "Jira", "confluence": "Confluence", "github": "GitHub"}
SECRET_ENV_VARS = ("JIRA_API_TOKEN", "CONFLUENCE_API_TOKEN", "GITHUB_TOKEN")
REDACTED = "[REDACTED]"


class SdlcError(Exception):
    """Error whose message is safe to show to the agent (contains no secrets)."""


# --------------------------------------------------------------------------
# Configuration (environment only; empty values count as unset)
# --------------------------------------------------------------------------

def _env(name: str) -> str:
    return os.environ.get(name, "").strip()


def _first_set(*names: str) -> str:
    for name in names:
        value = _env(name)
        if value:
            return value
    raise SdlcError(f"Required environment variable {' or '.join(names)} is not set.")


def _https_url(name: str, value: str) -> str:
    value = value.rstrip("/")
    if not value.startswith("https://"):
        raise SdlcError(f"Environment variable {name} must be an https:// URL.")
    return value


def service_base_url(service: str) -> str:
    """Base URL for a service, without trailing slash.

    Jira: JIRA_BASE_URL (e.g. https://your-site.atlassian.net)
    Confluence: CONFLUENCE_BASE_URL (e.g. https://your-site.atlassian.net/wiki)
        Required. It is not derived from JIRA_BASE_URL because the /wiki path differs.
    GitHub: GITHUB_API_URL, default https://api.github.com
    """
    if service == "jira":
        return _https_url("JIRA_BASE_URL", _first_set("JIRA_BASE_URL"))
    if service == "confluence":
        return _https_url("CONFLUENCE_BASE_URL", _first_set("CONFLUENCE_BASE_URL"))
    if service == "github":
        return _https_url("GITHUB_API_URL", _env("GITHUB_API_URL") or DEFAULT_GITHUB_API_URL)
    raise SdlcError("Unknown service.")


def basic_credentials(service: str) -> tuple[str, str]:
    """(email, api token) for Jira or Confluence.

    Confluence email and token fall back to the Jira values when unset.
    """
    if service == "jira":
        return _first_set("JIRA_EMAIL"), _first_set("JIRA_API_TOKEN")
    if service == "confluence":
        return (
            _first_set("CONFLUENCE_EMAIL", "JIRA_EMAIL"),
            _first_set("CONFLUENCE_API_TOKEN", "JIRA_API_TOKEN"),
        )
    raise SdlcError("Unknown service.")


def make_client(service: str) -> httpx.Client:
    """One-shot HTTP client with auth for a service. Tests monkeypatch this."""
    if service == "github":
        token = _first_set("GITHUB_TOKEN")
        headers = {
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        auth = None
    else:
        email, token = basic_credentials(service)
        headers = {"Accept": "application/json"}
        auth = httpx.BasicAuth(email, token)
    return httpx.Client(
        auth=auth,
        headers=headers,
        timeout=REQUEST_TIMEOUT_SECONDS,
        follow_redirects=False,
    )


def redact(text: str) -> str:
    """Replace any configured secret value found in text."""
    for name in SECRET_ENV_VARS:
        secret = _env(name)
        if secret and secret in text:
            text = text.replace(secret, REDACTED)
    return text


# --------------------------------------------------------------------------
# HTTP
# --------------------------------------------------------------------------

def request_json(service: str, method: str, path: str, *,
                 params: dict[str, Any] | None = None,
                 json_body: Any = None) -> Any:
    """Send one request and return parsed JSON (or None for empty bodies).

    Status mapping: 401/403 auth or permission failure, 404 not found,
    429 rate limited, other 4xx/5xx status code. Response bodies are never
    included in errors.
    """
    label = SERVICE_LABELS[service]
    url = service_base_url(service) + path
    try:
        with make_client(service) as client:
            response = client.request(method, url, params=params, json=json_body)
    except SdlcError:
        raise
    except httpx.HTTPError:
        raise SdlcError(f"{label} request failed: network error or timeout.") from None

    status = response.status_code
    if status in (401, 403):
        raise SdlcError(f"authentication or permission failure for {label}.")
    if status == 404:
        raise SdlcError(f"{label} resource not found.")
    if status == 429:
        raise SdlcError(f"{label} request rate limited; retry later.")
    if status >= 400 or status < 200 or status >= 300:
        raise SdlcError(f"{label} request failed with status {status}.")
    if status == 204 or not response.content:
        return None
    try:
        return response.json()
    except ValueError:
        raise SdlcError(f"{label} returned a non-JSON response.") from None


# --------------------------------------------------------------------------
# Atlassian Document Format (ADF) to plain text
# --------------------------------------------------------------------------

def adf_to_text(node: Any) -> str:
    """Convert an ADF node (or plain string) to plain text."""
    return re.sub(r"\n{3,}", "\n\n", _adf_render(node)).strip()


def _adf_render(node: Any) -> str:
    if isinstance(node, str):
        return node
    if isinstance(node, list):
        return "".join(_adf_render(child) for child in node)
    if not isinstance(node, dict):
        return ""

    kind = node.get("type", "")
    children = node.get("content") or []
    attrs = node.get("attrs") or {}

    if kind == "text":
        return str(node.get("text", ""))
    if kind == "hardBreak":
        return "\n"
    if kind in ("mention", "emoji"):
        return str(attrs.get("text", ""))
    if kind == "rule":
        return "---\n\n"
    if kind == "heading":
        level = max(1, min(int(attrs.get("level", 1)), 6))
        return "#" * level + " " + _adf_render(children).strip() + "\n\n"
    if kind == "paragraph":
        return _adf_render(children).strip() + "\n\n"
    if kind == "codeBlock":
        return _adf_render(children) + "\n\n"
    if kind == "blockquote":
        quoted = _adf_render(children).strip()
        return "\n".join("> " + line for line in quoted.splitlines()) + "\n\n"
    if kind in ("bulletList", "orderedList"):
        lines = []
        for index, item in enumerate(children, start=1):
            marker = f"{index}." if kind == "orderedList" else "-"
            lines.append(f"{marker} {_adf_render(item).strip()}")
        return "\n".join(lines) + "\n\n"
    if kind == "table":
        return _adf_render(children) + "\n"
    if kind == "tableRow":
        return " | ".join(_adf_render(cell).strip() for cell in children) + "\n"
    if kind in ("tableCell", "tableHeader"):
        return _adf_render(children).strip()
    if "text" in node and not children:
        return str(node["text"])
    # doc, listItem, panel, expand, mediaSingle and unknown containers
    return _adf_render(children)


# --------------------------------------------------------------------------
# Confluence storage format (XHTML) to plain text
# --------------------------------------------------------------------------

_BLOCK_TAGS = {
    "p", "br", "div", "li", "tr", "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "ul", "ol", "pre", "blockquote",
}


class _StorageTextParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _BLOCK_TAGS:
            self.parts.append("\n")

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def storage_to_text(markup: str) -> str:
    """Strip tags from Confluence storage markup, keeping line structure."""
    parser = _StorageTextParser()
    parser.feed(markup or "")
    parser.close()
    text = "".join(parser.parts)
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n\n", text)
    return text.strip()
