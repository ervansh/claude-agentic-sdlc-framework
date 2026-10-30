---
name: user-story-documentation
description: Publishes finalized story documentation to Confluence as a human-readable record after the SDLC is complete.
---

# User Story Documentation Publishing

## Purpose

Publish finalized story documentation to Confluence as a human-readable record after the SDLC is complete.

This skill is deliberately outside the SDLC lifecycle. It does not approve or advance lifecycle state.

## Inputs

Required:
- Application
- Application Root
- Story ID / Source Reference
- Confluence Space Key or unambiguous Space Name

Optional:
- Story summary
- parent page title/id
- subset of document types to publish

## Canonical Source

For a session-managed story, repository artifacts under the supplied
`SDLC Artifact Directory` are authoritative. Otherwise use:

`<application-root>/docs/sdlc/`

are authoritative.

Confluence must never become the source of truth for SDLC status.

## Preconditions

The publishing request should normally occur after:
- implementation tasks are completed/accepted
- code review is complete
- final verification is complete

If the story is not complete, do not infer completion. Publish only when the user explicitly requests publication of the available state, and label it accurately.

## Page Tree

Use a single story root:

`<STORY-ID> - <Story Summary>`

Children:

- `01 - Story & Requirements`
- `02 - HLD`
- `03 - LLD`
- `04 - Design Review`
- `05 - Implementation Summary`
- `06 - Code Review`
- `07 - Verification Report`
- `08 - Release / PR Summary`

Only create child pages backed by actual source artifacts.

## HLD/LLD Compatibility Mode

If the framework still has only `architecture.md`, derive two documentation views from it:

HLD:
- context
- drivers
- major boundaries
- technology stack
- external integrations
- high-level data flow
- deployment
- security/privacy boundaries
- major tradeoffs/ADRs

LLD:
- detailed components/modules
- contracts/interfaces
- detailed data model
- normalization/validation
- request/response or sequence flow
- state transitions
- error handling
- persistence
- testability details

Do not invent design content during this transformation.

## Idempotent Upsert Algorithm

For each intended page:

1. search in the target space using the exact Story ID and title
   (mcp__sdlc-integrations__confluence_search)
2. prefer a page already beneath the intended story root
3. retrieve it (mcp__sdlc-integrations__confluence_get_page) and verify identity
4. update if it exists (mcp__sdlc-integrations__confluence_upsert_page)
5. create if it does not exist (mcp__sdlc-integrations__confluence_upsert_page)
6. retrieve again to verify (mcp__sdlc-integrations__confluence_get_page)

Never rely on title search alone when multiple spaces may contain the same title.

## External Write Authorization

One explicit authorization may cover the full bounded story documentation package.

If authorization is not explicit in the current request, stop before the first create/update operation and ask for it.

Do not request approval separately for every page.

## Failure Handling

Return `BLOCKED` when:
- sdlc-integrations MCP server confluence_* tools are unavailable
- credentials do not permit page access/write
- target space cannot be identified safely
- more than one plausible story root exists and identity cannot be resolved
- required source artifacts cannot be read

Never bypass MCP by reading credentials and calling REST directly.

## Publication Report

Return:

- Publication Status
- Story Root
- pages created
- pages updated
- pages skipped because no source exists
- verification result
- any permission/access blockers

This report is documentation evidence only, not SDLC state.