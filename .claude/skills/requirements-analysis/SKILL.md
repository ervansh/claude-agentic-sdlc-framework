---
name: requirements-analysis
description: Procedure for turning a Jira, Confluence, or Word source into requirements.md, looping on clarification until it is approval-ready. Use when writing or updating requirements.md.
---

# Requirements Analysis

Target: `<SDLC Artifact Directory>/requirements.md`

## Inputs

Application, Application Root, SDLC Artifact Directory, Source Type (`JIRA` | `CONFLUENCE` | `WORD`), Source Reference.

## Procedure

Before approval, requirement authority is the source artifact plus explicit human decisions. After approval, `requirements.md` is the downstream contract. 

1. Retrieve the complete source:
   - Jira: `jira_get_issue` for an exact key. Use `jira_search` only to find a key.
   - Confluence: `confluence_get_page`, or `confluence_search` to find a page.
   - Word: `python .claude/skills/requirements-analysis/scripts/extract-docx.py <file>`.
   Search metadata alone is not enough for gap analysis.
2. Record provenance: source type, reference, retrieval time, and content hash when available.
3. Extract explicit source facts. Classify each item `SOURCE`, `CONFIRMED`, `INFERRED`, `ASSUMED`, `UNRESOLVED`, or `CONFLICTING`.
4. Ask a clarification question for every material ambiguity. Use stable IDs `Q-001`, `Q-002`, and so on. Never renumber, and never repeat an answered question.
5. Record each human answer in a Clarification Decision Log. If an answer conflicts with the source, ask whether the source is overridden.
6. Repeat steps 4–5 until no blocking question remains.
7. Write FR, NFR, and AC items, each traced to a source line or a confirmed decision.
8. Check approval readiness:
   - Open Questions contain no material product decision.
   - Assumptions contain no material behavior, security, or integration decision.
   - Every FR, NFR, and AC is traceable.
   Then set `Requirements Status: PENDING HUMAN APPROVAL`. Otherwise set `CLARIFICATION REQUIRED`.
9. On explicit human approval, set `Requirements Status: APPROVED` and record the exact approval wording. Then re-read the whole file and remove every stale "pending" or "awaiting approval" statement.

## Materiality

A question is blocking if different answers would change user-visible behavior, acceptance criteria, identity or authentication, privacy or security, required inputs or outputs, integration or data authority, persistence, validation or error behavior, or scope. Such decisions cannot move to Architecture or Implementation.

## Output header

```text
Current Stage: Requirements
Application: <application>
Application Root: <application-root>
Requirements Status: <CLARIFICATION REQUIRED | PENDING HUMAN APPROVAL | APPROVED>
Target Artifact: <SDLC Artifact Directory>/requirements.md
```
