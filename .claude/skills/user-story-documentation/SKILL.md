---
name: user-story-documentation
description: Procedure for publishing a finished story's repository artifacts to a Confluence page tree, idempotently and with one bounded authorization. Use when the human asks to publish story documentation.
---

# User Story Documentation

## Inputs

Application, Application Root, Story ID, SDLC Artifact Directory (for managed stories), Confluence space key or unambiguous space name. Optional: story summary, parent page, subset of documents.

## Sources

Final artifacts in `<SDLC Artifact Directory>`, or `<application-root>/docs/sdlc/` when unmanaged. Use the artifacts that exist. Publish only the child pages that have a source.

## Page tree

- Root: `<STORY-ID> - <Story Summary>`
- `01 - Story & Requirements`: story ID, provenance, objective, clarifications, scope, FR, NFR, AC, approval evidence
- `02 - HLD`: context, drivers, components, technology, integrations, data flow, security and privacy boundaries, deployment, high-level ADRs
- `03 - LLD`: modules, interfaces, data models, validation, flows, state transitions, error handling, persistence, test seams
- `04 - Design Review`: scope, outcome, findings, required corrections, gate result. Never describe it as human Architecture Approval.
- `05 - Implementation Summary`: task list with final statuses, delivered files, key decisions, test and build evidence. No raw command logs.
- `06 - Code Review`: scope, findings, outcome, gate decision
- `07 - Verification Report`: scope, FR, NFR, AC coverage, categories run, result, observations
- `08 - Release / PR Summary`: change summary, test evidence, limitations, reviewer checklist, and PR link only when a remote PR is verified

If only `architecture.md` exists, derive `02 - HLD` and `03 - LLD` from it. State that both come from the same approved artifact. Add no decisions.

## Procedure

1. Confirm authorization. One explicit human approval covers the bounded set: the story root, its expected children, and updates needed to match the artifacts. Ask for it once, before the first write, unless the request already states it.
2. For each intended page, find the story root by exact Story ID in the target space (`confluence_search`). Check its children. Never rely on title alone.
3. Update matching pages with `confluence_upsert_page`. Create only missing pages. Never create copies such as `ORD-3 final` or `HLD v2`. Use page history for revisions.
4. Verify: retrieve the root and its children (`confluence_get_page`). Check that each expected page exists once, with the right parent and title. Spot-check status wording against the artifacts.

## Publication report

```text
Publication Status: COMPLETE | PARTIAL | BLOCKED
Application:
Story:
Confluence Space:
Story Root:
Created Pages:
Updated Pages:
Skipped Pages (no source):
Blocked Items:
Verification:
```

This report is documentation evidence only. It is not SDLC state.
