---
status: testing
phase: 02-ats-resume-scoring
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
started: 2026-04-20T19:20:47Z
updated: 2026-04-20T19:29:55Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 3
name: Auto-pipeline preserves ATS header and block
expected: |
  Running the auto-pipeline path for a JD should save a report that still includes the `**ATS:**` header line and the ATS Analysis block, not just the legacy legitimacy header.
awaiting: user response

## Tests

### 1. Interactive evaluation adds ATS header
expected: Run a normal `oferta` evaluation for any JD you want to test. The saved report header should include an `**ATS:** Sim {score}% | Ready {score}% ({platform}) — Missing: ...` line between `**Score:**` and `**Legitimacy:**`. If `cv.md` is missing for the test, the ATS field should degrade cleanly to `ATS: N/A (cv.md not found)` instead of breaking the report.
result: pass

### 2. Interactive report includes ATS analysis block
expected: In the same interactive evaluation report, there should be a `## I) ATS Analysis` section after `## H) Draft Application Answers`. It should show ATS Simulation Score, Screening Readiness Score, category breakdown rows, and keyword placement guidance rather than only a single overall ATS number.
result: pass
note: User pasted ATS Analysis output showing simulation/readiness scores, category breakdown, formulas, and missing keyword guidance.

### 3. Auto-pipeline preserves ATS header and block
expected: Running the auto-pipeline path for a JD should save a report that still includes the `**ATS:**` header line and the ATS Analysis block, not just the legacy legitimacy header.
result: [pending]

### 4. Batch worker contract exposes ATS fields
expected: The batch worker path should produce the ATS Analysis section in its saved report and expose `ats_simulation_score` plus `screening_readiness_score` in the final JSON output, or `null` for both if `cv.md` is unavailable.
result: [pending]

## Summary

total: 4
passed: 2
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps

[none yet]
