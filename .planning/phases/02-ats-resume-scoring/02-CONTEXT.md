# Phase 2: ATS Resume Scoring - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add ATS keyword match scoring to every job evaluation. Every report produced by `/career-ops oferta`, auto-pipeline, and batch mode shows a dual-score ATS block: an **ATS Simulation Score** for machine-screening risk and a **Screening Readiness Score** for overall likelihood of passing initial screening. The report also shows the inferred ATS platform and a breakdown of matched vs. missing keywords across three categories: hard skills, job title match, and soft skills/action verbs. Missing keywords are mapped back to specific CV experiences or project bullets with guidance on how to incorporate them. The phase goal is to improve the resume enough to pass both ATS filtering and initial human review.

New capabilities NOT in scope: auto-injecting keywords into cv.md, Jake's resume template (v2), email outreach pipeline (Phase 3).

</domain>

<decisions>
## Implementation Decisions

### Block Placement

- **D-01:** ATS Analysis is **Block I** (`## I) ATS Analysis`) — added after the existing Block H (Draft Application Answers). Draft Application Answers remain `## H)` with no changes to `modes/oferta.md:191` or `modes/auto-pipeline.md:35`. Zero disruption to existing block references in batch workers or tests.

### Report Header

- **D-02:** The `**ATS:**` header line appears **after `**Score:**` and before `**Legitimacy:**`**. Full report header format:
  ```
  **Score:** {X/5}
  **ATS:** Sim {sim_score}% | Ready {ready_score}% ({platform}) — Missing: {kw1}, {kw2}, {kw3}
  **Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
  **PDF:** {path or pending}
  ```
  The header line is intentionally brief — just the two %, platform, and top missing keywords. Full detail lives in Block I body.

### Block I Body — Keyword Guidance

- **D-03:** Block I body does NOT just list missing keywords. For each missing keyword, it identifies which specific CV experience or project bullet could/should be updated, and how to naturally incorporate that keyword. Example output structure:
  ```
  **Missing: LangChain** — Add to "Experience > Acme Corp > [bullet about AI pipeline work]". 
  Suggested phrasing: "...orchestrated multi-step workflows using LangChain agents..."
  ```
  This applies to hard skills and job title keywords that have a natural home in the candidate's existing experience. Soft skills/action verbs that don't map to a specific bullet are listed without placement guidance.

### Batch Mode

- **D-04:** Batch mode (`claude -p` workers) runs the **full ATS analysis** — same dual-score logic and guidance depth as interactive mode. Context budget in workers is ample; no abbreviated version needed.

### Scoring Methodology

- **D-05:** Use a **dual-score approach**:
  - **ATS Simulation Score:** closer to `ats-screener` logic, focused on machine-screening risk from keyword alignment and platform-specific strictness
  - **Screening Readiness Score:** broader score for passing initial screening, combining ATS alignment with quantified, convincing evidence for human review
  The user-facing category breakdown remains hard skills, job title, and soft skills/action verbs, with a lightweight evidence/quantification layer used for readiness. Do not attempt to replicate PDF parsing, formatting simulation, or full 6-dimension scoring because this system reads canonical `cv.md`, not uploaded resumes.

### Resume Improvement Goal

- **D-06:** The primary success metric for Block I is usefulness in getting past initial screening. The ATS Simulation Score should tell the user how risky the resume is for machine filtering; the Screening Readiness Score should tell the user how ready the resume is for both machine and recruiter first-pass review. The output should prioritize concrete improvement guidance: which keywords matter most, where they naturally belong in the resume, when exact wording matters because the inferred ATS is stricter, and where bullets need stronger quantification for human review.

### Fidelity Contract

- **D-07: ATS Simulation Score must track ATS Screener where feasible from `cv.md`.**
  It should mirror ATS Screener on:
  - platform family and strategy intent for Workday, Taleo, iCIMS, Greenhouse, Lever, and SuccessFactors
  - the idea that synonym / partial matches receive less than full credit, with `0.8` as the default reference value
  - stricter exact-match treatment for exact-oriented platforms
  - use of ATS-oriented thresholds and risk framing for the six documented ATS platforms:
    - Workday `70`
    - Taleo `65`
    - iCIMS `60`
    - Greenhouse `55`
    - Lever `50`
    - SuccessFactors `65`

- **D-08: ATS Simulation Score may intentionally diverge from ATS Screener where the source inputs differ.**
  It may diverge on:
  - formatting, parser, and section-detection dimensions that require PDF/DOCX or rendered resume input; when scoring from `cv.md`, these dimensions are omitted rather than approximated
  - any dimension that cannot be measured credibly from canonical `cv.md`
  - education as a generic document-quality dimension; education is excluded from Simulation by default and only included when the JD explicitly requires a degree, certification, or educational credential that is clearly present or absent in `cv.md`
  - multi-platform side-by-side scoring; career-ops uses one inferred platform, not six displayed platform scores
  - Ashby support, which is excluded from ATS Screener parity and treated as a project-specific extension rather than part of the documented ATS Screener platform set

- **D-09: Screening Readiness Score is intentionally project-specific.**
  It exists to combine ATS alignment with recruiter-first-pass quality:
  - quantified evidence
  - ownership / scope clarity
  - natural keyword placement guidance
  - truthful rewrite suggestions for weak bullets

- **D-10: Any divergence from ATS Screener must be named, not implied away.**
  If the implementation does not match ATS Screener exactly, the output and docs must say so explicitly by using labels like `ATS Simulation Score` rather than claiming exact ATS Screener fidelity.

### Claude's Discretion

- Exact score weights for Simulation vs Readiness, provided the user-facing categories stay interpretable
- Exact partial-match weighting (recommend closer to `ats-screener` than 0.5, e.g. 0.8 for near-synonyms)
- How much quantification signal to include in Readiness without overwhelming the main keyword-alignment goal
- How many missing keywords to show in the header line (recommend top 3–5)
- Exact `test-all.mjs` regex pattern for the new `**ATS:**` header field
- Whether Block I appears in `modes/batch.md` or only in `batch/batch-prompt.md`

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing evaluation infrastructure
- `modes/oferta.md` — Full block A–H structure and report format template. ATS becomes Block I appended here. Block H (Draft Application Answers) at line 191 is NOT moved.
- `modes/auto-pipeline.md` — Auto-pipeline steps, including Step 4 (Draft Application Answers at line 35). Report header format is extended here with the `**ATS:**` line.
- `modes/batch.md` — Batch mode architecture. ATS block must be included in batch worker output.
- `batch/batch-prompt.md` — Worker prompt template. Must include ATS block instruction and `**ATS:**` header line.
- `modes/_shared.md` — Scoring system and Block G (Legitimacy) definitions. Understand existing block conventions before extending.

### Resume source
- `cv.md` (project root) — Canonical CV. The ATS block reads this to map missing keywords to specific bullets.

### Requirements
- `REQUIREMENTS.md` — ATS-01 through ATS-04 define the acceptance criteria for this phase.
- `ROADMAP.md` — Phase 2 plans 2.1 and 2.2 contain implementation notes. Note: ROADMAP says "Block H" for ATS — the decision here (D-01) overrides that; ATS is Block I.

### External reference
- `docs/ATS-SCORING-REFERENCE.md` — Local canonical reference for ATS Screener formulas, platform weights, thresholds, and guardrails. Read this first to avoid inventing ATS math.
- `https://github.com/sunnypatell/ats-screener` — Reference implementation for scoring approach and platform-specific matching nuance. Read before designing the scoring prompt, but do not blindly copy dimensions that depend on PDF parsing or formatting analysis.
- `https://ats-screener.vercel.app/docs/scoring/methodology/` — Canonical methodology page with the documented formulas, weight vectors, keyword formula, quirk model, and thresholds.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `modes/oferta.md` Block G (Posting Legitimacy) — Model for a conditional, structured analysis block. ATS Block I follows the same pattern: analyze, produce structured output, append to report.
- `modes/oferta.md:164–166` — Existing report header lines (`**Score:**`, `**Legitimacy:**`, `**PDF:**`). The `**ATS:**` line inserts between Score and Legitimacy.

### Established Patterns
- All scoring blocks are implemented as prompt instructions in `modes/` markdown files — no Node.js scoring logic.
- `cv.md` is always read at evaluation time; ATS block reads it the same way Block B (Match con CV) does.
- Report header fields follow `**FieldName:** value` markdown bold format.
- `test-all.mjs` validates report header fields by scanning for markdown patterns — new `**ATS:**` field needs a test case added.

### Integration Points
- `modes/oferta.md` — append Block I after Block H in the report format template
- `modes/auto-pipeline.md` — insert `**ATS:**` line in the report header format (Step 2, report save)
- `modes/batch.md` + `batch/batch-prompt.md` — include ATS block in worker instructions
- `test-all.mjs` — add regex check for `**ATS:**` header field format
- `docs/ATS-SCORING-REFERENCE.md` — required scoring reference before changing ATS math or claiming fidelity to ATS Screener

</code_context>

<specifics>
## Specific Ideas

- ATS block should produce per-keyword placement guidance: not just "Missing: LangChain" but "Add to Experience > [specific bullet] — suggested phrasing: ..."
- Soft skills/action verbs that don't map to a specific bullet are listed without placement guidance (list-only is fine for those)
- Header line: brief (top 3–5 missing keywords max) — full detail in Block I body
- Add a small quantification / evidence signal in Block I when the JD emphasizes outcomes, ownership, or measurable impact; this primarily affects Screening Readiness rather than ATS Simulation

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-ats-resume-scoring*
*Context gathered: 2026-04-19*
