# Architecture Patterns: career-ops Extension

**Domain:** AI-powered job search pipeline — extending existing Node.js/modes architecture
**Researched:** 2026-04-19
**Confidence:** HIGH (based on direct codebase analysis)

---

## Existing Architecture Summary

The system has three load-bearing patterns that all new features must respect:

1. **Prompt-as-code:** Agent behavior lives in `modes/*.md`. Scripts do deterministic work; the LLM agent reads mode files for reasoning and orchestration.
2. **Two-layer data contract:** User data (`data/`, `reports/`, `output/`, `cv.md`, `portals.yml`) is never auto-updated. System data (`modes/`, `*.mjs`, `templates/`) is freely replaceable.
3. **Flat-file state:** No database, no server. Markdown tables, TSV, YAML. Scripts read and write files; the agent reads the same files.

All three features must fit this pattern. No new runtime, no new server, no new database.

---

## Feature A: Enhanced Job Discovery

### Component Boundary

`scan.mjs` is a zero-token, zero-LLM script. It must stay that way. LinkedIn/Indeed/Google Jobs require browser rendering or scraping workarounds — they cannot be added directly to `scan.mjs` without breaking its zero-token guarantee.

The right boundary is a **second script**: `discover.mjs`. This keeps the separation clean:

| Script | Sources | Method | Token cost |
|--------|---------|--------|-----------|
| `scan.mjs` | Greenhouse/Ashby/Lever APIs | Pure HTTP + JSON | Zero |
| `discover.mjs` | LinkedIn/Indeed/Google Jobs + new-company discovery | Playwright + WebSearch via agent | LLM-assisted |

`discover.mjs` follows the same output contract as `scan.mjs`: new offers appended to `data/pipeline.md`, all seen URLs recorded in `data/scan-history.tsv`. The dedup logic in `scan.mjs` (functions `loadSeenUrls()` and `loadSeenCompanyRoles()`) should be extracted into a shared module `scan-core.mjs` and imported by both scripts.

### LinkedIn/Indeed/Google Jobs Integration

LinkedIn and Indeed do not have public job-listing APIs. Google Jobs is a search feature, not an API. The existing `modes/scan.md` already documents the correct approach: **Playwright Nivel 1 + WebSearch Nivel 3**. The agent-driven scan mode (not `scan.mjs`) handles these sources today for companies already in `portals.yml`.

For new-company discovery (DISC-02), the approach is purely agent-driven:

- Agent executes WebSearch queries like `site:jobs.ashbyhq.com "head of applied AI"` or `site:greenhouse.io "applied AI" 2026` — these are already supported in `portals.yml` under `search_queries`.
- When a new company is discovered, the agent adds it to `portals.yml` `tracked_companies` and `scan.mjs` picks it up on the next zero-token scan.
- `discover.mjs` wraps this flow for scheduling: it invokes the agent with the scan mode prompt as a headless subagent (`claude -p`), captures output, and writes results.

This means `discover.mjs` is a **thin orchestration wrapper** that calls `claude -p` with `modes/scan.md` as the system prompt, the same way `batch/batch-runner.sh` calls workers with `batch/batch-prompt.md`. The actual intelligence stays in the mode file.

### Where Scheduling Lives

The existing system has no persistent scheduler. Three options in order of fit:

1. **GitHub Actions cron** — best fit. A new workflow `.github/workflows/daily-scan.yml` runs `node scan.mjs` on a schedule (e.g., `cron: '0 7 * * *'`). No new runtime, no daemon, works even when the user's machine is off. The workflow commits new `data/pipeline.md` and `data/scan-history.tsv` changes. This is the pattern for `discover.mjs` too — a second step in the same workflow that runs `claude -p` with the scan mode.

2. **Local cron / launchd** — user configures `crontab -e` with `node /path/to/scan.mjs`. The `doctor.mjs` script can check for this and suggest the cron line. Lower friction for users who don't use GitHub Actions.

3. **`/loop` or `/schedule` skill** — mentioned in `CLAUDE.md` onboarding, but conditional on the agent runtime supporting it. Not a reliable primitive.

Recommendation: **GitHub Actions cron for `scan.mjs` (zero-token, safe to automate); manual trigger for `discover.mjs` (LLM cost, user decides when to run).**

### Data Flow for Discovery

```
GitHub Actions cron
  → node scan.mjs
      reads portals.yml (tracked_companies with Greenhouse/Ashby/Lever)
      writes data/pipeline.md (new offers appended)
      writes data/scan-history.tsv (dedup ledger)

/career-ops scan (agent-driven, manual)
  → reads modes/scan.md
      Nivel 1: Playwright per tracked_companies
      Nivel 2: API feeds
      Nivel 3: WebSearch queries (new companies)
  → updates portals.yml (new companies discovered → added to tracked_companies)
  → writes data/pipeline.md
  → writes data/scan-history.tsv
```

The dedup set is shared between both paths because both write to the same two files.

### What Changes in Existing Code

- `scan.mjs`: extract `loadSeenUrls()` + `loadSeenCompanyRoles()` + `appendToPipeline()` + `appendToScanHistory()` into `scan-core.mjs`. `scan.mjs` imports from it. `discover.mjs` also imports from it.
- `portals.yml`: already has `search_queries` section. No schema change needed.
- `modes/scan.md`: already documents Nivel 3 WebSearch for new-company discovery. No change needed.
- New file: `scan-core.mjs` (shared dedup + write utilities).
- New workflow: `.github/workflows/daily-scan.yml`.
- New npm script in `package.json`: `"discover": "node discover.mjs"`.

---

## Feature B: ATS Resume Extension

### Where Keyword Scoring Logic Goes

The existing `modes/pdf.md` already performs keyword extraction and injection (Steps 3-11). The ATS scoring (ATS-02) is an **extension of the existing pdf mode**, not a new script.

The keyword scoring logic belongs in the **mode file** (`modes/pdf.md`), not in a new `.mjs` script, because:
- It requires LLM reasoning to assess semantic keyword coverage, not just string matching.
- It must run before PDF generation to give the user a chance to review or abort.
- The result (ATS match %) feeds the report, not a separate output file.

The mode file addition is a new section: after keyword extraction (current Step 3), compute match % and display it before generating the HTML. The user can abort or proceed.

For `modes/oferta.md` integration (ATS-04), the ATS score is appended to the report header alongside the offer score. The report header currently has `**Score:**`, `**URL:**`, `**Legitimacy:**`. Add `**ATS:**` as a fourth header field, populated when the PDF step runs.

### Jake's Template Integration

Jake's resume template is a specific LaTeX format (`\resumeSubheading`, `\resumeItem`, etc.) with a well-known structure. The existing `templates/cv-template.tex` is already a custom LaTeX template. The cleanest integration is:

- Add `templates/cv-jake.tex` as a second LaTeX template alongside the existing `cv-template.tex`.
- Add `templates/cv-jake.html` as a second HTML template for the Playwright PDF path (Jake's layout rendered in HTML/CSS).
- The `modes/pdf.md` template selection logic already has a Canva branch. Add a third branch: if `config/profile.yml` has `cv_template: jake`, use the Jake templates instead of the default.

This means **no changes to `generate-pdf.mjs`** — it takes an HTML file path as input and doesn't care which template generated it. The mode handles template selection; the script handles rendering.

For `generate-latex.mjs`, similarly: add a `--template jake` flag that substitutes `cv-jake.tex` as the source template. The existing compilation and validation logic is reused.

### ATS Score in the Evaluation Report

ATS-04 requires the ATS score to appear in the `auto-pipeline` flow alongside the oferta score. The integration point is `modes/auto-pipeline.md` Step 3 (Generar PDF). After PDF generation, the mode computes and appends `**ATS:** {N}% keyword match` to the report header.

The `modes/oferta.md` report format header block becomes:

```
**Score:** X.X/5
**URL:** https://...
**Legitimacy:** Tier N
**ATS:** N% match (N/N keywords covered)
```

No changes to `merge-tracker.mjs` needed — ATS score lives in the report markdown, not in the tracker table.

### Data Flow for ATS Resume

```
auto-pipeline or /career-ops pdf
  → reads modes/pdf.md
      Step 3: extract 15-20 JD keywords
      Step 3b (NEW): score cv.md against extracted keywords
                     → "ATS: 68% (13/19 keywords covered)"
                     → display to user, optionally abort
      Step 4-11: existing keyword injection flow
      Step 12: select template (default | jake | canva)
      Step 13-15: generate HTML → PDF
  → appends **ATS:** line to report header
  → updates tracker PDF column to ✅
```

### What Changes in Existing Code

- `modes/pdf.md`: add keyword scoring step after extraction (before injection). Add template selection branch for `cv_template: jake`.
- `modes/auto-pipeline.md`: add `**ATS:**` to the report header written at Step 2.
- `modes/oferta.md`: document the new `**ATS:**` header field.
- New files: `templates/cv-jake.tex`, `templates/cv-jake.html`.
- `config/profile.yml` (user file): add optional `cv_template: jake` field.
- `generate-latex.mjs`: add `--template` flag (backward-compatible default: existing template).
- No changes to `generate-pdf.mjs`, `merge-tracker.mjs`, or `verify-pipeline.mjs`.

---

## Feature C: Cold Email Outreach Pipeline

### New Data Files

Following the existing flat-file pattern and data contract:

| File | Layer | Purpose |
|------|-------|---------|
| `data/outreach-queue.md` | USER | Pending outreach drafts awaiting approval |
| `data/outreach-sent.md` | USER | Log of sent drafts (gmail draft ID, date, company, contact) |

`data/outreach-queue.md` format (markdown table, mirrors tracker pattern):

```markdown
# Outreach Queue

| # | Date | Company | Role | Contact | Type | Score | Status | Notes |
|---|------|---------|------|---------|------|-------|--------|-------|
| 001 | 2026-04-19 | Acme | Head of AI | jane.doe@acme.com | Hiring Manager | 4.5/5 | Draft | |
```

Status values: `Draft` | `Approved` | `Sent` | `Rejected` | `Stale`.

`data/outreach-sent.md` format:

```markdown
# Outreach Sent Log

| # | Date Sent | Company | Contact | Gmail Draft ID | Reply? | Notes |
|---|-----------|---------|---------|---------------|--------|-------|
```

### New Mode File

`modes/outreach.md` is a new first-class mode following the `modes/contacto.md` pattern. Key sections:

1. **Contact discovery** — extends `contacto.md` logic. Uses Hunter.io API (free tier: 25 searches/month via `fetch()` with `HUNTER_API_KEY` from env), Apollo free tier, company `/about` and `/team` pages via Playwright, LinkedIn public data.
2. **Email drafting** — under 150 words, intro/networking tone, user voice from `cv.md` + `config/profile.yml`. NOT a direct pitch.
3. **Queue management** — reads `data/outreach-queue.md`, shows pending drafts with approve/edit/reject interface.
4. **Gmail push** — calls `push-gmail-draft.mjs` for each approved draft. Never auto-sends.
5. **Guardrails enforcement** — score threshold 4.0+, cap 20 queue entries, 7-day stale discard, 2-contact max per company, 5 Gmail drafts/day.

The mode is routed via `/career-ops outreach` with entries added to:
- `.claude/skills/career-ops/SKILL.md` dispatch table
- `.opencode/commands/career-ops-outreach.md`
- `.gemini/commands/outreach.toml`
- `CLAUDE.md` "Skill Modes" table

### Gmail OAuth in a Node.js CLI Context

Gmail OAuth requires a browser-based consent flow on first authorization. The standard approach for CLI tools is:

1. Register an OAuth2 application in Google Cloud Console (user does this once, stores credentials in `config/gmail-credentials.json`).
2. On first run of `push-gmail-draft.mjs`, launch a local HTTP server on `localhost:3000`, open the OAuth consent URL in the default browser (`open` command on macOS, `xdg-open` on Linux), and capture the authorization code from the redirect.
3. Exchange the code for access + refresh tokens. Store tokens in `config/gmail-token.json`.
4. On subsequent runs, use the stored refresh token to get new access tokens silently (no browser interaction needed).

This is the **local server OAuth flow** — the standard pattern for CLI tools using Google APIs (`google-auth-library` npm package). It is interactive on first setup only; all subsequent calls are headless.

`push-gmail-draft.mjs` responsibilities:
- On first call: run OAuth setup flow, store tokens.
- On subsequent calls: refresh token silently, create Gmail draft via `POST /gmail/v1/users/me/drafts`.
- Enforce 5 drafts/day limit by checking `data/outreach-sent.md` for today's entries.
- Write draft ID + metadata to `data/outreach-sent.md` after each push.

New npm dependency: `googleapis` (Google's official Node.js client). This is the only new npm dependency for the outreach feature.

New config files (both USER layer, never auto-updated):
- `config/gmail-credentials.json` — OAuth app client ID/secret (user registers app once).
- `config/gmail-token.json` — stored access/refresh tokens (generated by first OAuth run).

### Review Queue UI

The review queue is a **mode command** (`/career-ops outreach`), not a new TUI. The agent reads `data/outreach-queue.md`, presents pending drafts one at a time (or as a numbered list), and accepts `approve N`, `edit N`, `reject N` commands. Approved drafts are immediately pushed to Gmail via `node push-gmail-draft.mjs`.

This keeps the review in the agent conversation rather than requiring a separate UI. The Go TUI dashboard can be extended with a new screen (`dashboard/internal/ui/screens/outreach.go`) in a later phase to provide a richer view.

### Auto-queue Trigger in auto-pipeline

DISC-02 requires offers scoring 4.0+ to auto-queue outreach. The trigger is added to `modes/auto-pipeline.md` as a new Step 6 (after tracker update):

```
## Paso 6 — Queue Outreach (solo si score >= 4.0)

Si el score final es >= 4.0:
1. Ejecutar contact discovery (leer modes/outreach.md sección "Contact discovery")
2. Draft email (leer modes/outreach.md sección "Email drafting")
3. Append to data/outreach-queue.md with status "Draft"
4. Report: "X contact(s) queued for outreach. Run /career-ops outreach to review."

Guardrails:
- Skip if outreach-queue.md already has 20 pending entries
- Skip if company already has 2+ entries in outreach-queue.md or outreach-sent.md
- Skip if no contacts found after discovery attempts
```

### Data Flow for Outreach

```
auto-pipeline (score >= 4.0)
  → runs modes/outreach.md contact discovery
  → drafts email (< 150 words, networking tone)
  → appends row to data/outreach-queue.md (status: Draft)
  → reports queue count to user

/career-ops outreach (manual trigger)
  → reads modes/outreach.md
  → reads data/outreach-queue.md (filter: status=Draft)
  → presents drafts for review
  → on approve: node push-gmail-draft.mjs --draft-id {id}
      → creates Gmail draft via API
      → updates outreach-queue.md status to Sent
      → appends row to data/outreach-sent.md
  → on reject: updates status to Rejected
  → on edit: shows draft for in-conversation editing, then approve/reject

node push-gmail-draft.mjs (utility script, called by agent)
  → reads config/gmail-credentials.json + config/gmail-token.json
  → checks 5 drafts/day limit against data/outreach-sent.md
  → calls Gmail API drafts.create
  → writes draft ID to data/outreach-sent.md
```

### What Changes in Existing Code

- `modes/auto-pipeline.md`: add Step 6 (outreach queue trigger).
- `modes/contacto.md`: no changes — stays focused on LinkedIn DMs. Outreach mode is a sibling, not a replacement.
- `data/outreach-queue.md`: new USER layer file (created at onboarding if missing).
- `data/outreach-sent.md`: new USER layer file (created at first push).
- New files: `modes/outreach.md`, `push-gmail-draft.mjs`.
- New config (USER layer): `config/gmail-credentials.json`, `config/gmail-token.json`.
- `config/profile.yml`: add optional `hunter_api_key`, `apollo_api_key` fields.
- `package.json`: add `"outreach": "node push-gmail-draft.mjs"` script; add `googleapis` dependency.
- `DATA_CONTRACT.md`: add new USER layer entries.
- `CLAUDE.md`: add outreach mode to "Skill Modes" table and "Main Files" table; add `config/gmail-credentials.json` and `config/gmail-token.json` to USER layer entries.
- `verify-pipeline.mjs`: add optional checks for `outreach-queue.md` status vocabulary.

---

## Data Contract Classification

### New USER Layer Files (never auto-updated)

| File | Purpose |
|------|---------|
| `data/outreach-queue.md` | Pending outreach drafts |
| `data/outreach-sent.md` | Sent draft log with Gmail IDs |
| `config/gmail-credentials.json` | OAuth app credentials (registered by user) |
| `config/gmail-token.json` | Stored OAuth tokens |

### New SYSTEM Layer Files (auto-updatable)

| File | Purpose |
|------|---------|
| `modes/outreach.md` | Outreach mode prompt |
| `push-gmail-draft.mjs` | Gmail draft utility script |
| `scan-core.mjs` | Shared scan dedup/write utilities |
| `discover.mjs` | Agent-driven discovery wrapper |
| `templates/cv-jake.tex` | Jake's LaTeX template |
| `templates/cv-jake.html` | Jake's HTML template for PDF path |
| `.github/workflows/daily-scan.yml` | Scheduled scan workflow |

---

## Component Boundaries Summary

```
[Scheduled / automated]
  GitHub Actions cron
    → scan.mjs (zero-token, Greenhouse/Ashby/Lever APIs)
        uses: scan-core.mjs (shared dedup + write)
        reads: portals.yml
        writes: data/pipeline.md, data/scan-history.tsv

[Agent-driven, manual]
  /career-ops scan
    → modes/scan.md
        Nivel 1: Playwright (tracked_companies)
        Nivel 3: WebSearch (new-company discovery → portals.yml)
        uses: same data/pipeline.md, data/scan-history.tsv

  /career-ops pdf
    → modes/pdf.md
        ATS score step (NEW)
        template selection: default | jake | canva
        → generate-pdf.mjs (HTML → PDF, unchanged)
        → generate-latex.mjs (LaTeX → PDF, --template flag added)
        → report: **ATS:** header field

  /career-ops outreach
    → modes/outreach.md
        reads: data/outreach-queue.md
        on approve: push-gmail-draft.mjs
            reads: config/gmail-credentials.json, config/gmail-token.json
            writes: data/outreach-sent.md
            calls: Gmail API (drafts.create)

  auto-pipeline (URL or JD paste)
    → modes/auto-pipeline.md
        Step 1-5: existing (evaluate + report + PDF + tracker)
        Step 6 NEW: outreach queue trigger (score >= 4.0)
            → modes/outreach.md contact discovery + draft
            → data/outreach-queue.md
```

---

## Suggested Build Order

### Phase 1: Enhanced Job Discovery

Build first because it feeds everything downstream. New jobs in `data/pipeline.md` are the raw material for both ATS resumes and outreach.

Order within phase:
1. Extract `scan-core.mjs` from `scan.mjs` (refactor, no user-visible change, easy to test).
2. Add `discover.mjs` (thin orchestration wrapper for agent-driven scan).
3. Add `.github/workflows/daily-scan.yml` (schedule `scan.mjs`; manual trigger for `discover.mjs`).
4. Update `modes/scan.md` with any new patterns (LinkedIn search queries, new-company discovery prompts).

Risk: LinkedIn/Indeed discovery depends on Playwright and WebSearch being available to the agent. These already work in the existing system. Low risk.

### Phase 2: ATS Resume

Build second. Depends on existing PDF pipeline, which is already proven. Incremental changes to proven infrastructure.

Order within phase:
1. Add keyword scoring step to `modes/pdf.md`.
2. Create `templates/cv-jake.html` (HTML template matching Jake's layout).
3. Create `templates/cv-jake.tex` (LaTeX template).
4. Add template selection branch to `modes/pdf.md`.
5. Add `**ATS:**` field to `modes/oferta.md` report header format.
6. Update `modes/auto-pipeline.md` to include ATS score in Step 3 output.
7. Add `--template` flag to `generate-latex.mjs`.

Risk: Jake's LaTeX template requires matching the exact macro structure. The HTML version is straightforward. The LaTeX compilation path has existing validation in `generate-latex.mjs`. Medium risk on LaTeX template fidelity; low risk on HTML/PDF path.

### Phase 3: Cold Email Outreach

Build last. Depends on Phase 1 (jobs to contact) and benefits from Phase 2 (strong resume in hand when outreaching). Also the highest external integration complexity (Gmail OAuth).

Order within phase:
1. Create `modes/outreach.md` (contact discovery + email drafting, no external API yet).
2. Add queue trigger to `modes/auto-pipeline.md` Step 6.
3. Create `data/outreach-queue.md` schema + onboarding setup.
4. Create `push-gmail-draft.mjs` with OAuth setup flow.
5. Add `config/gmail-credentials.json` and `config/gmail-token.json` to DATA_CONTRACT.md and CLAUDE.md.
6. Add Hunter.io + Apollo API key fields to `config/profile.yml`.
7. Wire `/career-ops outreach` command into router files.

Risk: Gmail OAuth requires user to register an OAuth app in Google Cloud Console. This is a one-time setup but adds onboarding friction. The local server OAuth flow is the standard pattern and is well-supported by `googleapis` npm package. The 5-draft/day guardrail must be enforced in `push-gmail-draft.mjs` (not just the mode) to be reliable.

---

## Integration Points with Existing Code

| Existing File | Change Type | What Changes |
|---------------|-------------|--------------|
| `scan.mjs` | Refactor | Extract shared utilities to `scan-core.mjs`; no behavior change |
| `modes/pdf.md` | Extension | Add ATS scoring step; add Jake template branch |
| `modes/oferta.md` | Extension | Document `**ATS:**` report header field |
| `modes/auto-pipeline.md` | Extension | Add ATS score to Step 3 output; add Step 6 outreach trigger |
| `modes/contacto.md` | None | No changes; outreach mode is a sibling |
| `generate-latex.mjs` | Extension | Add `--template` flag (backward-compatible) |
| `generate-pdf.mjs` | None | Unchanged; takes HTML input, doesn't care about template |
| `merge-tracker.mjs` | None | Unchanged; ATS score in report, not tracker table |
| `verify-pipeline.mjs` | Minor extension | Optional: add outreach-queue status validation |
| `DATA_CONTRACT.md` | Extension | Add new USER layer entries |
| `CLAUDE.md` | Extension | Add new files to tables, new mode to skill modes table |
| `config/profile.yml` | Extension (user) | Add `cv_template`, `hunter_api_key`, `apollo_api_key` optional fields |
| `package.json` | Extension | Add `discover`, `outreach` scripts; add `googleapis` dependency |

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Adding LinkedIn/Indeed scraping to scan.mjs

`scan.mjs` must remain zero-token and zero-LLM. Adding Playwright calls or WebSearch to it breaks the zero-token guarantee, increases the cost of the daily automated run, and introduces flakiness from browser rendering in a CI context.

Instead: keep LinkedIn/Indeed in the agent-driven `modes/scan.md` path, which runs manually.

### Anti-Pattern 2: Putting ATS scoring in a separate .mjs script

ATS keyword scoring requires semantic judgment ("does 'LLM workflows with retrieval' cover the keyword 'RAG pipelines'?"). String matching alone gives wrong results. A separate `ats-score.mjs` that does string matching would produce scores that contradict what the agent actually injects into the CV.

Instead: keyword scoring stays in the mode file where the LLM can make semantic judgments. The score is computed once by the agent during `modes/pdf.md` execution and written into the report.

### Anti-Pattern 3: Auto-sending emails

The guardrail is Gmail drafts only. Auto-send violates the explicit out-of-scope constraint and risks Gmail reputation damage at scale. The `push-gmail-draft.mjs` script must create drafts only (`drafts.create`), never `messages.send`.

### Anti-Pattern 4: Putting outreach queue state in applications.md

`data/applications.md` tracks application submissions. Outreach is a parallel track (finding a human before or after applying). Mixing them into the same table adds columns that are empty for most rows and breaks the existing 9-column TSV contract that `merge-tracker.mjs` relies on.

Instead: separate files (`data/outreach-queue.md`, `data/outreach-sent.md`).

### Anti-Pattern 5: Adding a scheduling daemon

The system is a local CLI tool. Running a background daemon for daily scans introduces a persistent process that breaks when the machine sleeps, requires a launchd/systemd service, and adds debugging surface. GitHub Actions cron is more reliable, requires no local daemon, and the existing repo already has the CI/CD infrastructure.

---

## Scalability Notes

The flat-file architecture has practical limits that matter at the scale this project targets:

- `data/scan-history.tsv`: at 5 new jobs/day over 6 months = ~900 rows. Linear search for dedup is fast at this scale. Not a concern.
- `data/outreach-queue.md`: capped at 20 entries by guardrail. Never grows large.
- `data/applications.md`: at 2-3 evaluations/day over 6 months = ~400 rows. The Go TUI dashboard already handles this; `merge-tracker.mjs` rewrites the file on each merge, which is fine at this scale.
- Gmail API: 5 drafts/day is far below the 500 emails/day personal Gmail quota. Not a concern.
- Hunter.io free tier: 25 searches/month. With a 4.0+ score threshold on ~60% of evaluated jobs, and ~2 evaluations/day, expect ~10-15 contact lookups/month. Within free tier.
