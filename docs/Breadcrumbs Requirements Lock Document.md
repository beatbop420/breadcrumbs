# Breadcrumbs — Requirements Lock Document
**Date:** 2026-05-13
**Status:** LOCKED AND APPROVED

## 1. Objective

Review and verify the existing `breadcrumbs` repository as it exists now.

This pass is not a rebuild. The implementation already exists. The work in this review cycle is to:
- inspect the current repository state
- verify behavior with real command output
- fix confirmed defects only when verification proves they are real
- close with a security review and final traceability review

## 2. Locked Baseline

Repository root:
- `/home/petra/Desktop/breadcrumbs`

Locked baseline for this review:
- the current checked-out repository state
- including the uncommitted draft changes that were present at review start

Draft changes included in scope:
- [js/ui.js](/home/petra/Desktop/breadcrumbs/js/ui.js:371)
- [js/map.js](/home/petra/Desktop/breadcrumbs/js/map.js:122)
- [assets/crow.png](/home/petra/Desktop/breadcrumbs/assets/crow.png)

Plain-English note on those draft changes:
- `js/ui.js`: cleanup/refactor of view-modal action button handling
- `js/map.js`: removal of one unused variable
- `assets/crow.png`: new image file not currently used by the app

## 3. In Scope

- existing runtime code
- existing tests and local verification scripts
- existing phase documents in `docs/`
- current uncommitted draft changes
- security-relevant frontend and Supabase-related code in the repository

## 4. Out Of Scope

- rebuilding the app from scratch
- adding unrelated new features
- production data inspection outside repository-visible evidence
- external systems not represented in the repository

## 5. Required Outputs

- Phase 1: architecture and verification plan for the current codebase
- Phase 2: implementation only if later verification proves a defect needs a fix
- Phase 3: test, syntax, lint, security-check, and dependency-audit results with actual output
- Phase 4: dedicated security checklist with each item marked `Pass` or `Waived`
- Phase 5: traceability, scope, consistency, and packaging review

## 6. Review Rules

- no code changes before a confirmed verification finding justifies them
- every finding must include concrete evidence
- repository-state changes after scope lock must be reflected in later phase documents
- user-visible conclusions must be based on code evidence or executed verification evidence

## 7. Hard Fail Conditions

- ambiguous scope
- ambiguous baseline
- undocumented repository-state changes
- findings without evidence
- phase documents that no longer match the reviewed codebase

## 8. Approval Record

Phase 0 approval decision:
- review the current app including the draft changes

That approval was explicitly given on 2026-05-13.
