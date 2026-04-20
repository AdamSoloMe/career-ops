# Phase 2: ATS Resume Scoring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 02-ats-resume-scoring
**Areas discussed:** Block placement, Report header format, Missing keyword guidance, Batch mode depth

---

## Block Placement

| Option | Description | Selected |
|--------|-------------|----------|
| ATS = Block I, drafts stay as H | Zero code changes to existing files | ✓ |
| ATS = Block H, drafts become I | Better logical order but requires updating 2 existing lines | |

**User's choice:** ATS = Block I, drafts stay as H
**Notes:** User asked to see where the conflict existed in the code before deciding. After reviewing `modes/oferta.md:191` and `modes/auto-pipeline.md:35`, chose zero-churn option.

---

## Report Header Format

| Option | Description | Selected |
|--------|-------------|----------|
| After Score, before Legitimacy | ATS + Score together as apply-decision signals | ✓ |
| After Legitimacy, before PDF | Evaluation signals first, ATS as secondary | |

**User's choice:** After Score, before Legitimacy

---

## Missing Keyword Guidance

| Option | Description | Selected |
|--------|-------------|----------|
| List only | Just keyword names, fast to generate | |
| With CV placement hints | Maps keywords to specific bullets with suggested phrasing | ✓ |

**User's choice:** Full placement guidance — which experience/project to update and how
**Notes:** User clarified they want the ATS block to tell them which CV experiences or projects to improve and how to naturally incorporate missing keywords.

---

## Batch Mode Depth

| Option | Description | Selected |
|--------|-------------|----------|
| Full analysis — same as interactive | 3-category breakdown in every batch report | ✓ |
| Abbreviated — score + top-3 | Faster, less detail | |

**User's choice:** Full analysis

---

## Claude's Discretion

- Exact scoring rubric within the 3 categories
- How many missing keywords to show in the header line
- Exact test-all.mjs regex pattern for **ATS:** field
- Whether Block I appears in modes/batch.md or only batch/batch-prompt.md

## Deferred Ideas

None.
