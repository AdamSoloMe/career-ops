---
status: testing
phase: 02-ats-resume-scoring
source:
  - 02-01-SUMMARY.md
  - 02-02-SUMMARY.md
started: 2026-04-20T19:20:47Z
updated: 2026-04-21T00:12:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 6
name: Sunny Six-Score Platform Coverage
expected: |
  The saved markdown report should visibly include an `ATS Scoring Metrics (Sunny-style)` table with all six scoring metrics (Formatting, Keyword Match, Section Completeness, Experience Relevance, Education Match, Quantification) plus a six-platform scores table (Workday, Taleo, iCIMS, Greenhouse, Lever, SuccessFactors) with pass thresholds, strategy notes, and formulas.
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

### 5. Sunny ATS Screener Alignment Boundary
expected: The ATS output should behave like a simplified ATS Screener-style simulation: infer the target ATS platform, distinguish strict exact-match systems from semantic/fuzzy systems, show matched vs missing JD keywords, and label the result as `ATS Simulation Score` / `Screening Readiness Score` rather than claiming exact parity with Sunny Patel's ats-screener six-profile formula.
result: pass

### 6. Sunny Six-Score Platform Coverage
expected: The saved markdown report should visibly include an `ATS Scoring Metrics (Sunny-style)` table with all six scoring metrics (Formatting, Keyword Match, Section Completeness, Experience Relevance, Education Match, Quantification) plus a six-platform scores table (Workday, Taleo, iCIMS, Greenhouse, Lever, SuccessFactors) with pass thresholds, strategy notes, and formulas.
result: [pending]

## Summary

total: 6
passed: 2
issues: 0
pending: 3
skipped: 0
blocked: 0

## Gaps

### Gap 1 - Simplified ATS math did not expose Sunny-style platform scores
status: fixed_pending_user_verification
evidence: Initial Phase 2 implementation used a simplified hard/title/soft/evidence scoring model. The prompt contract has been updated to require six Sunny-style dimension scores and six platform-weighted scores while preserving the existing career-ops top-line fields.
