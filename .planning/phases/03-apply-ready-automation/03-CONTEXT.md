# Phase 3: Apply-Ready Automation - Context

**Gathered:** 2026-04-20
**Status:** Ready for planning

<domain>
## Phase Boundary

Turn discovered jobs into an autonomous, apply-ready queue. After discovery runs, the system should automatically evaluate jobs, apply strict eligibility gates, generate tailored resume variants for qualified roles, and prepare per-job application packets so the user only has to review and approve a customizable number of resumes per day.

This phase does NOT submit applications on the user's behalf. It stops at reviewable application packets and queue artifacts.

</domain>

<decisions>
## Implementation Decisions

### Trigger model
- **D-01:** The system should run autonomously after discovery and continuously keep the apply-ready queue prepared for the user.
- **D-02:** The desired user experience is: jobs are found and prepped without manual orchestration, and the user only needs to review and approve a customizable number of resumes per day.

### Queue eligibility
- **D-03:** A job enters the apply-ready queue only if it passes all three gates:
  - offer score `>= 4.0`
  - ATS score `>= 70`
  - legitimacy is not suspicious
- **D-04:** Low-fit, duplicate, stale, or suspicious jobs should be skipped automatically rather than generating resume artifacts.

### Resume generation strategy
- **D-05:** For each queued job, generate **3 resume variants** rather than a single default resume.
- **D-06:** The point of multiple variants is to optimize for higher-throughput review while still letting the user approve the strongest version quickly.

### Output and artifact structure
- **D-07:** The system should produce **per-job application packets** rather than a single aggregate-only queue view.
- **D-08:** Those per-job packets should live under `reports/` rather than `output/` or a new queue-only tree.
- **D-09:** Each packet should make manual submission fast by including the role context, evaluation outcome, ATS result, resume artifacts, and clear next action.

### Throughput and review cap
- **D-10:** Volume mode is **balanced quality and volume**, not strongest-only and not max-throughput at any cost.
- **D-11:** Balanced mode should use a hard cap of **20 queued jobs per batch/day**.
- **D-12:** The number of resumes/jobs the user reviews per day should be customizable, but the automation should still prepare the queue autonomously in advance.

### Locked constraints from project context
- **D-13:** The system must never submit applications on the user's behalf.
- **D-14:** The system should extend the existing `scan.mjs`, `modes/auto-pipeline.md`, ATS scoring, PDF/LaTeX generation, and flat-file workflow rather than introducing a parallel architecture.

### the agent's Discretion
- Exact scheduling mechanism for the autonomous processing layer, as long as it behaves like an always-prepared daily queue after discovery.
- Exact config location and schema for the customizable daily approval cap and batch cap.
- Exact naming convention for per-job packet directories/files under `reports/`.
- Exact representation of the queue index artifact, provided it stays human-reviewable and consistent with existing markdown/flat-file patterns.
- Exact logic for ranking the 3 resume variants before user review.

</decisions>

<specifics>
## Specific Ideas

- "I want the system to run autonomously and find/prep the job queue for me so I just have to approve a customizable amount of resumes per day."
- The intended operating mode is effectively high-throughput "spray and pray" with guardrails: broad discovery, strict enough filtering to avoid obvious waste, then fast manual approval of the best prepared packets.
- The project should optimize for speed of manual submission after review, not for hands-off application submission.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Roadmap and scope
- `.planning/ROADMAP.md` — Phase 3 definition, success criteria, and plan shells for apply-ready automation.
- `.planning/REQUIREMENTS.md` — `PIPE-01` through `PIPE-05` define the committed scope and the explicit no-auto-submit constraint.
- `.planning/PROJECT.md` — project-level goal, architecture pattern, and locked rule that applications are never submitted automatically.
- `.planning/STATE.md` — current milestone state and reordered phase sequence.

### Existing pipeline and evaluation flow
- `modes/auto-pipeline.md` — current end-to-end auto-pipeline behavior that should be extended, not replaced.
- `modes/oferta.md` — evaluation report structure and ATS analysis block already used to score jobs.
- `batch/batch-prompt.md` — current batch-processing shape and output expectations.

### Resume generation
- `generate-pdf.mjs` — current PDF generation pipeline.
- `generate-latex.mjs` — current LaTeX generation pipeline.
- `templates/cv-template.html` — existing HTML resume template.
- `templates/cv-template.tex` — existing LaTeX resume template.

### Discovery and input artifacts
- `scan.mjs` — discovery entrypoint that feeds the pipeline.
- `data/pipeline.md` — discovered job inbox to be consumed by the apply-ready automation flow.
- `data/scan-history.tsv` — dedup context for already-seen jobs.
- `data/applications.md` — tracker and prior-application context used to avoid wasteful regeneration.

### Prior phase decisions
- `.planning/phases/01-enhanced-job-discovery/01-CONTEXT.md` — discovery-side decisions and existing scan architecture constraints.
- `.planning/phases/02-ats-resume-scoring/02-CONTEXT.md` — ATS scoring behavior, header format, and fidelity constraints already locked in.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scan.mjs` — already discovers jobs into `data/pipeline.md`; this phase should consume that output instead of inventing a new inbox.
- `modes/auto-pipeline.md` — already chains JD extraction, evaluation, report writing, PDF generation, and tracker update for one job.
- `modes/oferta.md` — already produces the offer score and ATS score needed for queue gating.
- `batch/batch-prompt.md` — already supports batch-style processing and can likely be adapted to pipeline ingestion at scale.
- `generate-pdf.mjs` / `generate-latex.mjs` — existing artifact generation paths that can be reused for the three resume variants.

### Established Patterns
- The codebase uses prompt-as-code in `modes/`, utility scripts in `.mjs`, and markdown/TSV files for durable state.
- Existing automation writes user-facing artifacts into `reports/`, `output/`, and `data/` rather than using a database or server.
- The project already prefers extending the current flow over creating parallel systems.

### Integration Points
- Discovery output from `data/pipeline.md` should feed the apply-ready automation stage.
- Evaluation and ATS outputs should determine queue eligibility.
- Resume artifacts should be grouped into per-job packets under `reports/`.
- Tracker and queue state should remain flat-file and human-reviewable.

</code_context>

<deferred>
## Deferred Ideas

- Contact lookup and cached recruiter/manager discovery are deferred to Phase 4.
- Outreach drafting, Gmail drafts, and send-side guardrails remain later-phase work.
- Full automatic application submission is explicitly out of scope and should not be added later without a fundamental project-policy change.

</deferred>

---

*Phase: 03-apply-ready-automation*
*Context gathered: 2026-04-20*
