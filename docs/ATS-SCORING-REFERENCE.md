# ATS Scoring Reference

Canonical external references for Phase 2 ATS scoring work. This file exists so future agents do not invent ATS scoring behavior from memory.

## Canonical Sources

- GitHub repo: https://github.com/sunnypatell/ats-screener
- README: https://raw.githubusercontent.com/sunnypatell/ats-screener/main/README.md
- Scoring methodology: https://ats-screener.vercel.app/docs/scoring/methodology/
- Scoring dimensions: https://ats-screener.vercel.app/docs/scoring/dimensions/
- Pass/fail thresholds: https://ats-screener.vercel.app/docs/scoring/thresholds/

## What The External Docs Actually Define

The methodology page says ATS Screener evaluates a resume against **6 platform profiles** independently:

- Workday
- Taleo
- iCIMS
- Greenhouse
- Lever
- SuccessFactors

For platform `p`, the platform score is:

`S_p = clamp(0, 100, sum_i(w_i(p) * d_i) + Q_p)`

Where:

- `d_i` are the six dimension scores, each `0..100`
- `w_i(p)` is the platform-specific weight vector
- `Q_p` is the quirk adjustment for that platform, always non-positive

The six documented dimensions are:

1. Formatting
2. Keyword Match
3. Section Completeness
4. Experience Relevance
5. Education Match
6. Quantification

## Platform Weight Vectors

From the methodology page:

| Platform | fmt | kw | sec | exp | edu | quant | strictness | strategy |
|----------|-----|----|-----|-----|-----|-------|------------|----------|
| Workday | 0.25 | 0.30 | 0.15 | 0.15 | 0.10 | 0.05 | 0.90 | exact |
| Taleo | 0.20 | 0.35 | 0.15 | 0.15 | 0.10 | 0.05 | 0.85 | exact |
| iCIMS | 0.15 | 0.30 | 0.15 | 0.20 | 0.10 | 0.10 | 0.60 | fuzzy |
| Greenhouse | 0.10 | 0.25 | 0.10 | 0.25 | 0.10 | 0.20 | 0.40 | semantic |
| Lever | 0.08 | 0.22 | 0.10 | 0.30 | 0.10 | 0.20 | 0.35 | semantic |
| SuccessFactors | 0.25 | 0.25 | 0.20 | 0.15 | 0.10 | 0.05 | 0.85 | exact |

## Exact Keyword Formula

The methodology page defines keyword matching as:

`K = min(100, ((|M| + 0.8 * |S|) / |J|) * 100 )`

Where:

- `M` = exact keyword matches
- `S` = synonym / partial matches
- `J` = distinct extracted job-description keywords

The docs then specialize by strategy:

- `exact`: only `M` counts
- `fuzzy`: `M` plus synonym matches
- `semantic`: `M` plus synonym matches and partial-string containment rules

Important detail: the docs explicitly weight synonym / partial matches at `0.8`, not `0.5`.

## Formatting Deduction Model

The dimensions and methodology pages define formatting as a deduction model:

`F = max(0, min(100, 100 - sum_k(p_k * sigma)))`

Where `p_k` is the base penalty for a triggered formatting issue and `sigma` is the platform strictness.

Documented formatting penalties:

| Issue | Base Penalty |
|-------|--------------|
| Multi-column layout | 15 |
| Tables detected | 12 |
| Images/graphics | 8 |
| Pages > 2 | 5 |
| Word count < 150 | 10 |
| Word count > 1500 | 3 |
| Special char ratio > 5% | 8 |
| All-caps lines > 3 | 3 |
| Inconsistent bullets (> 2 styles) | 2 |

## Quantification Formula

The docs define quantification as:

`d_6 = floor((b_q / b_t) * 100)` when `b_t > 0`, otherwise `0`.

Where:

- `b_q` = experience bullets with numbers, percentages, or dollar amounts
- `b_t` = total experience bullets

This is not a general "evidence quality" score. It should be counted separately from human screening readiness.

## Quirk Adjustments

Quirk adjustments are always non-positive:

`Q_p = -sum_j(q_j(p) * indicator(condition_j))`

Documented quirks:

| Platform | Quirk | Condition | Penalty |
|----------|-------|-----------|---------|
| Workday | Non-standard headers | > 2 unrecognized section headers | 5 |
| Workday | Page limit | > 2 pages | 8 |
| Taleo | Low keyword density | < 5 skills detected with JD | 10 |
| Taleo | Missing standard sections | > 1 required section missing | 8 |

## Pass Thresholds

Use the dedicated pass/fail thresholds page when threshold values conflict with summaries elsewhere:

| Platform | Passing Score |
|----------|---------------|
| Workday | 70 |
| Taleo | 75 |
| iCIMS | 60 |
| Greenhouse | 50 |
| Lever | 50 |
| SuccessFactors | 65 |

The thresholds page also distinguishes auto-reject behavior:

- Taleo: Yes
- Workday: Conditional
- SuccessFactors: Conditional
- iCIMS: No
- Greenhouse: No
- Lever: No

## Source-Code Pointers Mentioned By The Docs

The methodology page says the formulas map directly to code under these repo paths:

- `src/lib/engine/scorer/`
- `profiles/`
- `format-scorer.ts`
- `keyword-matcher.ts`

If Phase 2 implementation claims to match ATS Screener exactly, the implementation should be checked against those source paths, not inferred from summaries.

## Project Guardrails

Agents working on this project must follow these rules:

- Do not say career-ops uses the exact ATS Screener methodology unless the implemented math actually matches the documented formulas and platform weights.
- If career-ops uses a derived or simplified score, label it explicitly, for example `ATS Simulation Score` or `Screening Readiness Score`.
- If scoring is based on `cv.md` rather than the generated PDF/DOCX resume, say that clearly. ATS Screener’s documented methodology includes formatting/parser-sensitive dimensions that may not be measurable from markdown alone.
- If any part of the implementation intentionally diverges from ATS Screener, document the divergence in the phase artifacts instead of silently approximating it.
- When in doubt, link back to the canonical docs above instead of paraphrasing from memory.
- Keep ATS platform pass/fail separate from human screening readiness and overall job-fit score.

## Intended Use In This Repo

This file is a source-of-truth reference for:

- `.planning/phases/02-ats-resume-scoring/02-CONTEXT.md`
- `.planning/phases/02-ats-resume-scoring/02-RESEARCH.md`
- `.planning/phases/02-ats-resume-scoring/02-01-PLAN.md`
- `.planning/phases/02-ats-resume-scoring/02-02-PLAN.md`

Future ATS-scoring implementation work should read this file first.
