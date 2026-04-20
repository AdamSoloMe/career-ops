---
phase: 02-ats-resume-scoring
verified: 2026-04-20T19:11:53Z
status: passed
score: 4/4 must-haves verified
overrides_applied: 0
---

# Phase 2: ATS Resume Scoring Verification Report

**Phase Goal:** Every job evaluation shows an ATS keyword match score alongside the offer score, so the candidate can judge screening risk before applying and see which keywords or evidence are missing.
**Verified:** 2026-04-20T19:11:53Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Evaluating a job via `oferta` or auto-pipeline produces an `**ATS:**` line in the report header showing match data alongside the offer score | ✓ VERIFIED | `modes/oferta.md` defines `**ATS:** Sim {sim_score}% | Ready {ready_score}% ({platform}) — Missing: {kw1}, {kw2}, {kw3}` between `**Score:**` and `**Legitimacy:**` at lines 249-253; `modes/auto-pipeline.md` propagates the same header contract at lines 22-24 |
| 2 | ATS scoring breaks down into hard skills, job title match, and soft skills/action verbs instead of a raw count | ✓ VERIFIED | `modes/oferta.md` lines 153-159 and 206-214 define the category extraction and scored breakdown; `batch/batch-prompt.md` lines 163-179 and 199-207 mirror the same rubric |
| 3 | Report notes inferred ATS platform and strictness implications | ✓ VERIFIED | `modes/oferta.md` lines 184-202 map URL patterns to Greenhouse, Lever, Ashby, Workday, Taleo, iCIMS, SAP SuccessFactors, and Unknown with strictness notes; batch prompt repeats this at lines 181-197 |
| 4 | Methodology is ATS-screener-aligned rather than raw string counting | ✓ VERIFIED | `docs/ATS-SCORING-REFERENCE.md` documents the external methodology and project guardrails at lines 54-105; `modes/oferta.md` uses exact/partial/absent scoring with platform-specific semantic strictness at lines 163-182; `batch/batch-prompt.md` carries the same simulation/readiness split at lines 171-179 |

**Score:** 4/4 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
| --- | --- | --- | --- |
| `modes/oferta.md` | Block I ATS contract and report header wiring | ✓ VERIFIED | Substantive prompt block exists at lines 145-230; report template includes `## I) ATS Analysis` and ATS header at lines 246-289 |
| `modes/auto-pipeline.md` | Auto-pipeline report wiring for ATS header and Block I | ✓ VERIFIED | Step 2 adds ATS header and Block I propagation at lines 22-24 |
| `batch/batch-prompt.md` | Batch ATS block, report header, and JSON fields | ✓ VERIFIED | Full ATS instructions at lines 157-217; report header at lines 241-248; JSON fields at lines 391-425 |
| `test-all.mjs` | Regression assertion covering ATS header contract | ✓ VERIFIED | Regex assertion for `modes/oferta.md` ATS header exists at lines 264-268 |

### Key Link Verification

| From | To | Via | Status | Details |
| --- | --- | --- | --- | --- |
| `modes/oferta.md` Block I | `cv.md` | Explicit read requirement | ✓ WIRED | Line 147 requires reading `cv.md`; scoring and guidance rules operate on JD + `cv.md` through the block |
| `modes/oferta.md` report template | `**ATS:**` header | Header insertion between score and legitimacy | ✓ WIRED | Lines 251-253 place the ATS line in the saved report template |
| `modes/auto-pipeline.md` | ATS report header and Block I | Save-report instruction | ✓ WIRED | Lines 22-24 require saving Block I and adding the ATS header |
| `batch/batch-prompt.md` Paso 6 | ATS score fields in worker output | JSON contract | ✓ WIRED | Lines 403-405 and 421-422 emit `ats_simulation_score` and `screening_readiness_score` |
| `test-all.mjs` | `modes/oferta.md` | `readFile` + regex assertion | ✓ WIRED | Lines 264-268 fail the suite if the ATS header contract is removed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
| --- | --- | --- | --- | --- |
| `modes/oferta.md` | `sim_score`, `ready_score`, matched/missing keywords | JD text + `cv.md` read during evaluation | Yes — prompt instructs extraction from live JD and resume content, not hardcoded values | ✓ FLOWING |
| `batch/batch-prompt.md` | ATS scores and missing keywords in report + JSON | `{{JD_FILE}}`/`{{URL}}` + `cv.md` | Yes — worker prompt reads actual inputs and emits derived ATS fields | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| --- | --- | --- | --- |
| ATS header regression assertion is active | `node test-all.mjs --quick` | Suite reached section 8 and reported `oferta.md includes ATS header format` | ✓ PASS |
| Current suite failure scope is outside Phase 02 ATS work | `node test-all.mjs --quick` | Failures were absolute-path checks in `.planning/phases/01-*`; dashboard build was skipped via `--quick` | ✓ PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
| --- | --- | --- | --- | --- |
| ATS-01 | 02-01, 02-02 | Score resume against JD using keyword and semantic matching modeled on ats-screener | ✓ SATISFIED | Prompt contract uses exact/partial/absent scoring, semantic tolerance by platform, and ATS-simulation labeling in `modes/oferta.md` lines 163-182; reference guardrails in `docs/ATS-SCORING-REFERENCE.md` lines 98-105 |
| ATS-02 | 02-02 | Show ATS match % in report with matched vs missing keyword breakdown | ✓ SATISFIED | ATS header appears in `modes/oferta.md` lines 249-253, `modes/auto-pipeline.md` lines 22-24, and `batch/batch-prompt.md` lines 244-248; category breakdown tables are in `modes/oferta.md` lines 206-214 and batch lines 199-207 |
| ATS-03 | 02-01, 02-02 | Distinguish hard skills, title match, and soft skills/action verbs | ✓ SATISFIED | Category extraction and breakdown are explicit in `modes/oferta.md` lines 153-159 and 206-210; batch prompt mirrors the same structure at lines 163-169 and 199-203 |
| ATS-04 | 02-01, 02-02 | Infer ATS platform from job URL and note strictness | ✓ SATISFIED | URL-to-platform mapping with strictness notes exists in `modes/oferta.md` lines 188-202 and `batch/batch-prompt.md` lines 183-197 |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| --- | --- | --- | --- | --- |
| `modes/auto-pipeline.md` | 20-24 | Step 1 references blocks A-F + G, while Step 2 separately requires Block I | ℹ️ Info | Mild prompt-coherence risk: Block I is wired for saved reports, but the execution-step wording could be clearer |
| `test-all.mjs` | 264-268 | Regression test covers ATS header presence only | ℹ️ Info | Format regressions are caught, but scoring math, platform inference, and batch JSON semantics are not automatically validated |

### Gaps Summary

No blocking gaps were found for ATS-01 through ATS-04. Phase 02 achieves the roadmap goal in the repo’s prompt-as-code architecture: interactive evaluation, auto-pipeline report instructions, and batch worker prompts all carry the ATS scoring contract, and a regression check protects the report header format.

Residual risk remains in two places: the ATS logic is encoded as prompt behavior rather than deterministic executable scoring code, and automated verification currently checks the header contract more than the scoring semantics. Those are quality risks, not phase blockers.

---

_Verified: 2026-04-20T19:11:53Z_
_Verifier: Claude (gsd-verifier)_
