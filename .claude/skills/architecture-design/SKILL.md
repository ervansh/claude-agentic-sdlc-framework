---
name: architecture-design
description: Procedure for designing an application's architecture from approved requirements and writing architecture.md. Use when creating or revising architecture.md.
---

# Architecture Design

Read: `<SDLC Artifact Directory>/requirements.md`
Write: `<SDLC Artifact Directory>/architecture.md`

## Procedure

1. Confirm `Requirements Status: APPROVED`. Otherwise stop as defined in the agent.
2. Record drivers and constraints from the requirements.
3. Compare two or three options where a real choice exists. Record the trade-off and the choice.
4. Document each section:
   - stack
   - components and their responsibilities
   - data model and data flows
   - integrations and persistence
   - validation and error handling
   - security and privacy
   - performance and reliability
   - accessibility, where it applies
   - testability and deployment
   - ADRs and risks
5. Trace every FR, NFR, and AC to a component or test seam.
6. Use the simplest design that meets the requirements. Do not add capability no requirement asks for.
7. Set `Architecture Status: DRAFT — PENDING DESIGN REVIEW`. Do not use `PENDING HUMAN APPROVAL` before design review runs.
8. After Design Review permits progression and the human delegates Architecture Approval, set `Architecture Status: APPROVED`, then re-read the file and remove stale pending statements.

## Output header

```text
Current Stage: Architecture
Application: <application>
Application Root: <application-root>
Architecture Status: <DRAFT — PENDING DESIGN REVIEW | APPROVED | BLOCKED — REQUIREMENTS CLARIFICATION REQUIRED>
Target Artifact: <SDLC Artifact Directory>/architecture.md
```
