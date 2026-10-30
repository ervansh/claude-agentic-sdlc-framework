"""Unit tests for mcp/sdlc_integrations. No real network: httpx.MockTransport only."""

import asyncio
import json
import os
import sys
import unittest
from unittest import mock

import httpx

_REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
_PKG_DIR = os.path.join(_REPO_ROOT, "mcp", "sdlc_integrations")
if _PKG_DIR not in sys.path:
    sys.path.insert(0, _PKG_DIR)

import clients  # noqa: E402

_REAL_MAKE_CLIENT = clients.make_client
import server  # noqa: E402
from clients import SdlcError  # noqa: E402

JIRA_URL = "https://your-site.example.test"
CONF_URL = "https://your-site.example.test/wiki"
JIRA_TOKEN = "jira-token-SECRET-4f9a"
GH_TOKEN = "fake-gh-token-for-tests-7c2e"
SDLC_VARS = [
    "JIRA_BASE_URL", "JIRA_EMAIL", "JIRA_API_TOKEN",
    "CONFLUENCE_BASE_URL", "CONFLUENCE_EMAIL", "CONFLUENCE_API_TOKEN",
    "GITHUB_TOKEN", "GITHUB_API_URL",
]


def full_env(**overrides):
    env = {
        "JIRA_BASE_URL": JIRA_URL,
        "JIRA_EMAIL": "user@example.test",
        "JIRA_API_TOKEN": JIRA_TOKEN,
        "CONFLUENCE_BASE_URL": CONF_URL,
        "GITHUB_TOKEN": GH_TOKEN,
    }
    env.update(overrides)
    return {k: v for k, v in env.items() if v is not None}


class ConfiguredTestCase(unittest.TestCase):
    """Replaces the process environment with a known SDLC environment per test."""

    def setUp(self):
        for name in SDLC_VARS:
            patcher = mock.patch.dict(os.environ, {}, clear=False)
            patcher.start()
            self.addCleanup(patcher.stop)
            os.environ.pop(name, None)
        for name, value in self.env_overrides_full().items():
            os.environ[name] = value

    def env_overrides_full(self):
        return full_env()

    def use_handler(self, handler):
        """Route every client made by clients.make_client through a MockTransport."""
        seen = []

        def recording(request):
            seen.append(request)
            return handler(request)

        def factory(service):
            return httpx.Client(
                transport=httpx.MockTransport(recording),
                follow_redirects=False,
                timeout=30.0,
            )

        patcher = mock.patch.object(clients, "make_client", side_effect=factory)
        patcher.start()
        self.addCleanup(patcher.stop)
        return seen


def json_response(status, payload):
    return httpx.Response(status, json=payload)


class ConfigTests(ConfiguredTestCase):
    def test_missing_jira_base_url_names_only_variable(self):
        os.environ.pop("JIRA_BASE_URL", None)
        with self.assertRaises(SdlcError) as cm:
            server.jira_get_issue("ABC-1")
        message = str(cm.exception)
        self.assertIn("JIRA_BASE_URL", message)
        self.assertNotIn(JIRA_TOKEN, message)
        self.assertNotIn(JIRA_URL, message)

    def test_missing_github_token_names_only_variable(self):
        os.environ.pop("GITHUB_TOKEN", None)
        with self.assertRaises(SdlcError) as cm:
            clients.make_client("github")
        self.assertIn("GITHUB_TOKEN", str(cm.exception))
        self.assertNotIn(GH_TOKEN, str(cm.exception))

    def test_missing_jira_token_names_only_variable(self):
        os.environ.pop("JIRA_API_TOKEN", None)
        with self.assertRaises(SdlcError) as cm:
            clients.make_client("jira")
        self.assertIn("JIRA_API_TOKEN", str(cm.exception))

    def test_confluence_credentials_fall_back_to_jira_values(self):
        email, token = clients.basic_credentials("confluence")
        self.assertEqual(email, "user@example.test")
        self.assertEqual(token, JIRA_TOKEN)

    def test_github_api_url_defaults(self):
        self.assertEqual(clients.service_base_url("github"), "https://api.github.com")


class ValidationTests(ConfiguredTestCase):
    def test_invalid_issue_keys_rejected(self):
        seen = self.use_handler(lambda request: json_response(200, {}))
        for bad in ["abc-1", "X-", "PROJ123", "PROJ-1; DROP", "", "A-1-2", "1ABC-5"]:
            with self.subTest(key=bad), self.assertRaises(SdlcError) as cm:
                server.jira_get_issue(bad)
            self.assertIn("issue_key", str(cm.exception))
        self.assertEqual(seen, [])

    def test_valid_issue_key_accepted(self):
        self.use_handler(lambda request: json_response(200, {"key": "ABC-12", "fields": {}}))
        result = server.jira_get_issue("ABC-12")
        self.assertEqual(result["key"], "ABC-12")
        self.assertEqual(result["url"], JIRA_URL + "/browse/ABC-12")

    def test_search_rejects_empty_jql(self):
        with self.assertRaises(SdlcError):
            server.jira_search("   ")

    def test_github_owner_regex(self):
        with self.assertRaises(SdlcError):
            server.github_get_pull_request("bad owner", "repo", 1)


class AdfConversionTests(unittest.TestCase):
    def test_adf_to_plain_text(self):
        adf = {
            "type": "doc",
            "version": 1,
            "content": [
                {"type": "heading", "attrs": {"level": 2},
                 "content": [{"type": "text", "text": "Scope"}]},
                {"type": "paragraph", "content": [
                    {"type": "text", "text": "Hello "},
                    {"type": "mention", "attrs": {"id": "x", "text": "@Ann"}},
                ]},
                {"type": "bulletList", "content": [
                    {"type": "listItem", "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "one"}]}]},
                    {"type": "listItem", "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "two"}]}]},
                ]},
            ],
        }
        self.assertEqual(clients.adf_to_text(adf), "## Scope\n\nHello @Ann\n\n- one\n- two")

    def test_adf_handles_none_and_plain_string(self):
        self.assertEqual(clients.adf_to_text(None), "")
        self.assertEqual(clients.adf_to_text("plain"), "plain")

    def test_storage_to_text_strips_tags(self):
        markup = "<h1>Title</h1><p>Some <strong>bold</strong> text &amp; more</p>"
        text = clients.storage_to_text(markup)
        self.assertNotIn("<", text)
        self.assertIn("Title", text)
        self.assertIn("Some bold text & more", text)


class JiraToolTests(ConfiguredTestCase):
    def test_get_issue_returns_text_comments_and_attachment_names(self):
        payload = {
            "key": "ABC-1",
            "fields": {
                "summary": "Login",
                "status": {"name": "To Do"},
                "priority": {"name": "High"},
                "issuetype": {"name": "Story"},
                "labels": ["auth"],
                "description": {"type": "doc", "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Desc"}]}]},
                "comment": {"comments": [{
                    "author": {"displayName": "Ann"},
                    "created": "2026-01-01",
                    "body": {"type": "doc", "content": [
                        {"type": "paragraph", "content": [{"type": "text", "text": "Hi"}]}]},
                }]},
                "attachment": [{"filename": "spec.pdf"}],
            },
        }
        seen = self.use_handler(lambda request: json_response(200, payload))
        result = server.jira_get_issue("ABC-1")
        request = seen[0]
        self.assertEqual(request.url.path, "/rest/api/3/issue/ABC-1")
        self.assertEqual(result["description"], "Desc")
        self.assertEqual(result["comments"][0]["body"], "Hi")
        self.assertEqual(result["attachments"], ["spec.pdf"])
        self.assertEqual(result["status"], "To Do")

    def test_search_uses_new_endpoint_and_caps_results(self):
        seen = self.use_handler(lambda request: json_response(200, {"issues": [
            {"key": "ABC-2", "fields": {"summary": "S", "status": {"name": "Done"},
                                        "issuetype": {"name": "Bug"}}}]}))
        result = server.jira_search("project = ABC", max_results=500)
        request = seen[0]
        self.assertEqual(request.method, "POST")
        self.assertEqual(request.url.path, "/rest/api/3/search/jql")
        body = json.loads(request.content)
        self.assertEqual(body["maxResults"], 100)
        self.assertEqual(body["jql"], "project = ABC")
        self.assertEqual(result[0]["key"], "ABC-2")


class ConfluenceToolTests(ConfiguredTestCase):
    def test_get_page_returns_metadata_and_text(self):
        payload = {
            "id": "42", "title": "Design", "version": {"number": 3},
            "space": {"key": "ENG"},
            "body": {"storage": {"value": "<p>Hello <b>world</b></p>"}},
            "_links": {"base": CONF_URL, "webui": "/spaces/ENG/pages/42"},
        }
        seen = self.use_handler(lambda request: json_response(200, payload))
        result = server.confluence_get_page("42")
        self.assertEqual(seen[0].url.path, "/wiki/rest/api/content/42")
        self.assertEqual(result["space_key"], "ENG")
        self.assertEqual(result["version"], 3)
        self.assertEqual(result["body_text"], "Hello world")
        self.assertEqual(result["url"], CONF_URL + "/spaces/ENG/pages/42")

    def test_upsert_refuses_without_approval_and_makes_no_calls(self):
        seen = self.use_handler(lambda request: json_response(200, {}))
        with self.assertRaises(SdlcError) as cm:
            server.confluence_upsert_page("ENG", "T", "<p>x</p>", None, False)
        self.assertEqual(str(cm.exception),
                         "Confluence writes require explicit human approval (human_approved=true).")
        self.assertEqual(seen, [])

    def test_upsert_creates_when_no_match(self):
        def handler(request):
            if request.method == "GET":
                return json_response(200, {"results": []})
            return json_response(200, {"id": "99", "version": {"number": 1},
                                       "_links": {"base": CONF_URL, "webui": "/x/99"}})

        seen = self.use_handler(handler)
        result = server.confluence_upsert_page(
            "ENG", "New Page", "<p>x</p>", "10", True)
        search = seen[0]
        self.assertIn('type=page AND space="ENG" AND title="New Page"',
                      search.url.params["cql"])
        create = seen[1]
        self.assertEqual(create.method, "POST")
        self.assertEqual(create.url.path, "/wiki/rest/api/content")
        body = json.loads(create.content)
        self.assertEqual(body["ancestors"], [{"id": "10"}])
        self.assertEqual(result["action"], "created")
        self.assertEqual(result["id"], "99")
        self.assertEqual(result["url"], CONF_URL + "/x/99")

    def test_upsert_updates_with_version_plus_one_when_match(self):
        def handler(request):
            if request.method == "GET":
                return json_response(200, {"results": [{"id": "5", "version": {"number": 3}}]})
            return json_response(200, {"id": "5", "version": {"number": 4}})

        seen = self.use_handler(handler)
        result = server.confluence_upsert_page("ENG", "Same", "<p>new</p>", None, True)
        put = seen[1]
        self.assertEqual(put.method, "PUT")
        self.assertEqual(put.url.path, "/wiki/rest/api/content/5")
        body = json.loads(put.content)
        self.assertEqual(body["version"]["number"], 4)
        self.assertEqual(body["body"]["storage"]["value"], "<p>new</p>")
        self.assertEqual(result["action"], "updated")
        self.assertEqual(len(seen), 2)

    def test_upsert_never_deletes(self):
        def handler(request):
            self.assertNotEqual(request.method, "DELETE")
            if request.method == "GET":
                return json_response(200, {"results": []})
            return json_response(200, {"id": "1"})

        seen = self.use_handler(handler)
        server.confluence_upsert_page("ENG", "T", "<p>x</p>", None, True)
        self.assertNotIn("DELETE", [r.method for r in seen])

    def test_upsert_rejects_ambiguous_match(self):
        self.use_handler(lambda request: json_response(200, {"results": [
            {"id": "1", "version": {"number": 1}}, {"id": "2", "version": {"number": 1}}]}))
        with self.assertRaises(SdlcError):
            server.confluence_upsert_page("ENG", "T", "<p>x</p>", None, True)


class GithubToolTests(ConfiguredTestCase):
    def test_get_pull_request_summary(self):
        payload = {"number": 7, "title": "T", "state": "open", "draft": False,
                   "html_url": "https://github.example.test/o/r/pull/7",
                   "head": {"ref": "feat"}, "base": {"ref": "main"},
                   "merged": False, "mergeable_state": "clean"}
        seen = self.use_handler(lambda request: json_response(200, payload))
        result = server.github_get_pull_request("o", "r", 7)
        self.assertEqual(seen[0].url.path, "/repos/o/r/pulls/7")
        self.assertEqual(result["head_ref"], "feat")
        self.assertEqual(result["base_ref"], "main")
        self.assertEqual(result["mergeable_state"], "clean")

    def test_create_pull_request_refuses_without_approval(self):
        seen = self.use_handler(lambda request: json_response(201, {}))
        with self.assertRaises(SdlcError) as cm:
            server.github_create_pull_request(
                "o", "r", "T", "B", "feat", "main", True, False)
        self.assertEqual(str(cm.exception),
                         "GitHub writes require explicit human approval (human_approved=true).")
        self.assertEqual(seen, [])

    def test_create_pull_request_verifies_by_read_back(self):
        def handler(request):
            if request.method == "POST":
                return json_response(201, {"number": 7, "state": "open",
                                           "html_url": "https://github.example.test/o/r/pull/7"})
            return json_response(200, {"number": 7})

        seen = self.use_handler(handler)
        result = server.github_create_pull_request(
            "o", "r", "T", "B", "feat", "main", True, True)
        self.assertEqual([r.method for r in seen], ["POST", "GET"])
        self.assertEqual(seen[1].url.path, "/repos/o/r/pulls/7")
        self.assertEqual(json.loads(seen[0].content)["draft"], True)
        self.assertTrue(result["verified"])
        self.assertEqual(result["number"], 7)

    def test_create_pull_request_not_verified_when_read_back_fails(self):
        def handler(request):
            if request.method == "POST":
                return json_response(201, {"number": 8, "state": "open"})
            return httpx.Response(500)

        self.use_handler(handler)
        result = server.github_create_pull_request(
            "o", "r", "T", "B", "feat", "main", False, True)
        self.assertFalse(result["verified"])
        self.assertIn("read-back failed", result["verify_error"])


class HttpErrorMappingTests(ConfiguredTestCase):
    def _error_for(self, status):
        self.use_handler(lambda request: httpx.Response(status))
        with self.assertRaises(SdlcError) as cm:
            server.jira_get_issue("ABC-1")
        return str(cm.exception)

    def test_404_maps_to_not_found(self):
        self.assertIn("not found", self._error_for(404))

    def test_401_and_403_map_to_auth_failure(self):
        self.assertEqual(self._error_for(401),
                         "authentication or permission failure for Jira.")
        self.assertEqual(self._error_for(403),
                         "authentication or permission failure for Jira.")

    def test_429_maps_to_rate_limited(self):
        self.assertIn("rate limited", self._error_for(429))

    def test_other_status_includes_code(self):
        self.assertEqual(self._error_for(500), "Jira request failed with status 500.")

    def test_redirects_are_not_followed(self):
        self.use_handler(lambda request: httpx.Response(302, headers={"Location": "https://x.example.test/"}))
        with self.assertRaises(SdlcError) as cm:
            server.jira_get_issue("ABC-1")
        self.assertIn("status 302", str(cm.exception))


class TokenSafetyTests(ConfiguredTestCase):
    def test_token_absent_from_error_when_response_body_echoes_it(self):
        self.use_handler(lambda request: httpx.Response(500, text=f"leaked {JIRA_TOKEN}"))
        with self.assertRaises(SdlcError) as cm:
            server.jira_get_issue("ABC-1")
        self.assertNotIn(JIRA_TOKEN, str(cm.exception))

    def test_token_absent_from_transport_error(self):
        def handler(request):
            raise httpx.ConnectError(f"connect failed with {JIRA_TOKEN}")

        self.use_handler(handler)
        with self.assertRaises(SdlcError) as cm:
            server.jira_get_issue("ABC-1")
        self.assertNotIn(JIRA_TOKEN, str(cm.exception))

    def test_token_absent_from_unexpected_exception(self):
        def handler(request):
            raise RuntimeError(f"boom {JIRA_TOKEN}")

        self.use_handler(handler)
        with self.assertRaises(SdlcError) as cm:
            server.jira_get_issue("ABC-1")
        self.assertNotIn(JIRA_TOKEN, str(cm.exception))
        self.assertIn("unexpectedly", str(cm.exception))

    def test_github_token_absent_from_error(self):
        self.use_handler(lambda request: httpx.Response(500, text=GH_TOKEN))
        with self.assertRaises(SdlcError) as cm:
            server.github_get_pull_request("o", "r", 1)
        self.assertNotIn(GH_TOKEN, str(cm.exception))


class AuthWiringTests(ConfiguredTestCase):
    def test_jira_client_uses_basic_auth_and_no_redirects(self):
        client = _REAL_MAKE_CLIENT("jira")
        self.assertIsInstance(client.auth, httpx.BasicAuth)
        request = client.build_request("GET", JIRA_URL + "/rest/api/3/myself")
        prepared = next(client.auth.auth_flow(request))
        self.assertTrue(prepared.headers["Authorization"].startswith("Basic "))
        self.assertFalse(client.follow_redirects)
        client.close()

    def test_github_client_uses_bearer_token(self):
        client = _REAL_MAKE_CLIENT("github")
        self.assertEqual(client.headers["Authorization"], "Bearer " + GH_TOKEN)
        client.close()


class ToolSurfaceTests(unittest.TestCase):
    EXPECTED = {
        "jira_get_issue", "jira_search",
        "confluence_get_page", "confluence_search", "confluence_upsert_page",
        "github_get_pull_request", "github_create_pull_request",
    }

    def test_exact_tool_names_and_no_forbidden_tools(self):
        tools = asyncio.run(server.mcp.list_tools())
        names = {tool.name for tool in tools}
        self.assertEqual(names, self.EXPECTED)
        for forbidden in ("merge", "delete", "force", "issue_write", "create_issue"):
            self.assertFalse(any(forbidden in name for name in names), forbidden)


if __name__ == "__main__":
    unittest.main()
