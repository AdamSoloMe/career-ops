# Phase 3 Research: Apply-Ready Automation

**Phase:** 03-apply-ready-automation  
**Researched:** 2026-04-20  
**Confidence:** HIGH

## Objective

Research how to implement an autonomous apply-ready pipeline that consumes discovered jobs from `data/pipeline.md`, evaluates them using the existing career-ops flow, gates them by score/ATS/legitimacy, generates three resume variants for qualified jobs, and prepares per-job application packets so the user only needs to review a configurable number each day.

The phase must **never** submit applications on the user's behalf.

## What the Codebase Already Gives Us

### Existing reusable engine

- `scan.mjs` writes discovered roles into `data/pipeline.md`.
- `modes/auto-pipeline.md` already defines the one-job sequence: extract JD → evaluate → save report → generate PDF → update tracker.
- `batch/batch-runner.sh` already orchestrates parallel AI workers with resumable state and tracker merging.
- `batch/batch-prompt.md` already produces report/PDF/tracker artifacts per job.
- `merge-tracker.mjs` and `verify-pipeline.mjs` already protect tracker consistency.
- `generate-pdf.mjs` and `generate-latex.mjs` already generate ATS-friendly resume artifacts.

### Existing constraints that matter

- New tracker rows must go through TSV additions plus `merge-tracker.mjs`, not direct edits to `data/applications.md`.
- The architecture is flat-file and prompt-as-code. Do not add a server or database.
- `scan.mjs` is intentionally zero-token. AI-heavy preparation should not be moved into the scanner itself.
- GitHub Actions is already used for daily discovery, but the AI prep path depends on agent runtime (`claude -p` / equivalent), Playwright, and local artifact generation. That makes discovery scheduling and prep scheduling different concerns.

## Recommended Architecture

## 1. Separate discovery from preparation

**Recommendation:** keep Phase 1 daily discovery as-is, and implement Phase 3 as a second autonomous preparation stage that consumes `data/pipeline.md`.

Why:
- `scan.mjs` is zero-token and CI-friendly.
- Apply-ready prep is AI-heavy and artifact-heavy.
- Forcing AI prep into `scan.mjs` or the existing GitHub Actions discovery workflow would break the current boundary and likely fail in environments without the required local runtime.

**Implication:** the system should behave as one autonomous pipeline from the user's perspective, but internally it is:
1. discovery creates/refreshes pipeline inbox
2. prep stage consumes inbox and fills apply-ready queue

## 2. Use batch-runner as the prep execution engine

**Recommendation:** extend `batch/batch-runner.sh` rather than inventing a second orchestration engine.

Why:
- It already has resumability, retry tracking, parallelism, report number reservation, and worker log management.
- It already writes tracker TSVs and merges them safely.
- It is the closest existing pattern to "process many jobs autonomously."

**Implementation shape:**
- Add a pipeline ingestion mode that sources jobs from `data/pipeline.md` instead of only `batch-input.tsv`.
- Reserve report numbers and worker state the same way the current batch runner does.
- Add queue-specific post-processing after worker completion.

## 3. Introduce a dedicated apply queue artifact

**Recommendation:** create a new USER-layer queue file, e.g. `data/apply-queue.md`.

Why:
- `data/applications.md` is the canonical tracker for evaluated/applied jobs, not a work queue for review volume management.
- The apply queue needs queue-specific status, ranking, review caps, and packet references.
- Overloading the main tracker would recreate the same anti-pattern the outreach research already called out for queue state.

**Recommended schema direction:**

```markdown
# Apply Queue

| # | Date | Company | Role | Score | ATS | Legitimacy | Variant Count | Packet | Status | Notes |
|---|------|---------|------|-------|-----|------------|---------------|--------|--------|-------|
```

Recommended statuses:
- `Queued`
- `Approved`
- `Skipped`
- `Expired`
- `Applied`

## 4. Keep report numbering flat, add packet directories under reports

The user chose per-job packets under `reports/`. The safest way to do that without breaking the existing flat report conventions is:

- keep the main evaluation report at the current flat path:
  - `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`
- add a packet directory under `reports/packets/`:
  - `reports/packets/{###}-{company-slug}-{YYYY-MM-DD}/`

Packet contents should include:
- `packet.md` — human review manifest
- links to the main report
- links to the three resume variants
- original job URL
- score/ATS/legitimacy summary
- next-action instructions for manual submission

This preserves compatibility with existing scripts that assume flat report files while still satisfying the "per-job packet under reports" decision.

## 5. Generate resume variants only after queue gate passes

**Recommendation:** do not generate three variants for every discovered job. First produce the report and gate decision, then only generate variants for jobs that pass:
- score `>= 4.0`
- ATS `>= 70`
- legitimacy not suspicious

Why:
- Resume generation is relatively expensive.
- This avoids artifact spam for low-quality or stale roles.
- It aligns with the user's "balanced" throughput choice rather than raw max-volume.

## 6. Variant strategy

The three variants should not be random. They need clear intent. Recommended shape:

1. **Baseline tailored** — strongest faithful match to the JD
2. **Keyword-forward** — slightly denser ATS wording while staying truthful
3. **Human-readable emphasis** — cleaner recruiter-oriented version with slightly less keyword intensity

This gives a meaningful review choice instead of three near-duplicates.

## 7. Daily review cap vs batch cap

The user gave two separate intents:
- autonomous queue prep
- customizable number of resumes approved per day

These should be modeled separately:

- **batch prep cap**: max 20 queued jobs per prep run/day
- **daily approval cap**: configurable user-facing review target, likely <= 20

The prep engine should prepare up to the batch cap. The review UI/command should surface only the next `N` jobs based on the user's configured approval limit.

## 8. Config should live in profile.yml

**Recommendation:** store Phase 3 knobs in `config/profile.yml`, not system files.

Suggested section:

```yaml
automation:
  apply_queue:
    enabled: true
    min_score: 4.0
    min_ats: 70
    legitimacy_floor: "proceed-with-caution"
    batch_cap: 20
    daily_review_cap: 10
    resume_variants: 3
```

Why:
- These are user-specific behavior knobs.
- The project rules require personalization to live in user-layer files.

## 9. Preferred execution flow

Recommended end-to-end runtime:

1. discovery writes or refreshes `data/pipeline.md`
2. prep stage parses candidate jobs from `data/pipeline.md`
3. prep stage filters obvious duplicates/already-handled jobs against:
   - `data/applications.md`
   - `data/apply-queue.md`
   - `data/scan-history.tsv` where useful
4. batch workers run evaluation for remaining roles
5. only qualified roles receive three resume variants
6. packet manifests are written under `reports/packets/...`
7. `data/apply-queue.md` is updated with ranked queued items
8. review command surfaces only the next configurable number of queued items

## Key Risks and How Planning Should Address Them

### Risk 1: breaking existing report assumptions

Many scripts and modes assume:
- reports are flat `.md` files in `reports/`
- PDFs live in `output/`

**Planning response:** keep the canonical report file unchanged and add packet directories as a sibling structure, not a replacement.

### Risk 2: duplicate processing from pipeline inbox

`data/pipeline.md` is an inbox, not a robust state machine.

**Planning response:** add explicit dedup against:
- current tracker
- current apply queue
- report-numbered/processed job URLs

Queue and prep state must be durable in new artifacts, not inferred only from `pipeline.md`.

### Risk 3: too many generated artifacts

Three variants per role can create noise fast.

**Planning response:** only generate variants after the full gate passes, enforce batch cap 20, and expire stale queue entries.

### Risk 4: hidden coupling to Claude CLI only

`batch-runner.sh` currently assumes `claude -p`.

**Planning response:** Phase 3 should reuse the current runner shape now, but planning should isolate the "worker invocation" seam so future model/runtime swapping is possible without rewriting the queue system.

### Risk 5: accidental auto-apply drift

A high-throughput queue can easily drift toward submission automation.

**Planning response:** the apply queue and packet manifest should stop at:
- report
- resume variants
- job URL
- explicit "submit manually" step

No browser form submission task should be in scope.

## Recommended Plan Split

Two plans are enough and align with the updated roadmap:

### Plan 03-01 — Automated triage and queue builder

Cover:
- pipeline ingestion
- prep orchestration based on `batch-runner.sh`
- queue artifact creation
- config knobs for gating and caps
- dedup/state management for queued items

Requirements primarily covered:
- `PIPE-01`
- `PIPE-03`
- `PIPE-04`

### Plan 03-02 — Multi-variant resume packets and review surface

Cover:
- three-variant generation for qualified jobs
- packet directory layout under `reports/`
- packet manifest generation
- configurable daily review cap / review command surface
- explicit no-auto-submit boundary in docs and workflow text

Requirements primarily covered:
- `PIPE-02`
- `PIPE-03`
- `PIPE-05`

## Canonical Files Planning Must Read

- `.planning/phases/03-apply-ready-automation/03-CONTEXT.md`
- `.planning/ROADMAP.md`
- `.planning/REQUIREMENTS.md`
- `modes/auto-pipeline.md`
- `batch/batch-runner.sh`
- `batch/batch-prompt.md`
- `merge-tracker.mjs`
- `verify-pipeline.mjs`
- `generate-pdf.mjs`
- `generate-latex.mjs`
- `config/profile.yml`
- `DATA_CONTRACT.md`
- `docs/ARCHITECTURE.md`

## Planning Guidance

- Prefer adding new queue artifacts in `data/` over mutating `applications.md` semantics.
- Preserve existing flat report naming while introducing packet directories.
- Keep the scanner zero-token and separate from AI prep.
- Reuse the existing batch runner and tracker-merge mechanics rather than rebuilding orchestration.
- Treat "autonomous" as scheduled unattended preparation, not unattended submission.

---

*Ready for planning: yes*
