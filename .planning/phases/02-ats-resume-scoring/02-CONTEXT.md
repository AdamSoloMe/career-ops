# Phase 2: ATS Resume Scoring - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Add ATS keyword match scoring to every job evaluation. Every report produced by `/career-ops oferta`, auto-pipeline, and batch mode shows an ATS match score (%), the inferred ATS platform, and a breakdown of matched vs. missing keywords across three categories: hard skills, job title match, and soft skills/action verbs. Missing keywords are mapped back to specific CV experiences or project bullets with guidance on how to incorporate them.

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
  **ATS:** {score}% ({platform}) — Missing: {kw1}, {kw2}, {kw3}
  **Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
  **PDF:** {path or pending}
  ```
  The header line is intentionally brief — just the %, platform, and top missing keywords. Full detail lives in Block I body.

### Block I Body — Keyword Guidance

- **D-03:** Block I body does NOT just list missing keywords. For each missing keyword, it identifies which specific CV experience or project bullet could/should be updated, and how to naturally incorporate that keyword. Example output structure:
  ```
  **Missing: LangChain** — Add to "Experience > Acme Corp > [bullet about AI pipeline work]". 
  Suggested phrasing: "...orchestrated multi-step workflows using LangChain agents..."
  ```
  This applies to hard skills and job title keywords that have a natural home in the candidate's existing experience. Soft skills/action verbs that don't map to a specific bullet are listed without placement guidance.

### Batch Mode

- **D-04:** Batch mode (`claude -p` workers) runs the **full ATS analysis** — same 3-category breakdown as interactive mode. Context budget in workers is ample; no abbreviated version needed.

### Scoring Methodology

- **D-05 (Claude's Discretion):** Scoring approach follows ATS-01: keyword frequency + semantic relevance, not raw string count. Three categories (ATS-03): hard skills keywords, job title match, soft skills/action verbs. Platform inference from URL (ATS-04): Greenhouse, Lever, Ashby, Workday, Taleo — each with a one-line note on typical strictness level. The planner implements the exact prompt logic for scoring within these constraints.

### Claude's Discretion

- Exact scoring rubric within the 3 categories (how to weight each, how to compute the % from sub-scores)
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
- `https://github.com/sunnypatell/ats-screener` — Reference implementation for scoring approach (keyword frequency + semantic relevance). Read before designing the scoring prompt.

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

</code_context>

<specifics>
## Specific Ideas

- ATS block should produce per-keyword placement guidance: not just "Missing: LangChain" but "Add to Experience > [specific bullet] — suggested phrasing: ..."
- Soft skills/action verbs that don't map to a specific bullet are listed without placement guidance (list-only is fine for those)
- Header line: brief (top 3–5 missing keywords max) — full detail in Block I body

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 02-ats-resume-scoring*
*Context gathered: 2026-04-19*
