# Phase 1: Enhanced Job Discovery - Context

**Gathered:** 2026-04-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend `scan.mjs` with Adzuna REST API and SerpAPI (Google Jobs) sources. Extract shared dedup/write utilities into `scan-core.mjs`. Add GitHub Actions daily cron that runs `node scan.mjs` and commits updated `data/pipeline.md` and `data/scan-history.tsv` to the repo. New jobs from these sources are deduplicated (including LinkedIn/Indeed URL normalization) before being appended to the pipeline.

New capabilities NOT in scope: LinkedIn scraping, company discovery (DISC-V2-01), LLM-assisted matching, job quality scoring at scan time.

</domain>

<decisions>
## Implementation Decisions

### Search Query Configuration

- **D-01:** Adzuna and SerpAPI search keywords are configured in `config/profile.yml` under a new `search_queries` field — NOT in `portals.yml`. `portals.yml` remains the config for which ATS-portal companies to scan directly; `profile.yml` is where users configure what external sources search for.
- **D-02:** `search_queries` is a flat list of simple strings (job title keywords). Each string maps directly to one API query call per source. Example: `search_queries: ['AI Engineer', 'ML Engineer', 'Applied AI']`.
- **D-03:** Boolean operator syntax (OR/AND) is NOT supported in v1 — simple strings only. Each entry = one API call.
- **D-04:** Location filtering is title keywords only. No per-query location field. If location is needed, Adzuna/SerpAPI can use `candidate.location` from `profile.yml` as a global default — or leave location unfiltered to capture remote roles.
- **D-05:** A configurable `max_results_per_source` field in `profile.yml` caps results per API source per run. Default: 50. This protects SerpAPI metered credits and prevents pipeline.md from flooding on first run.

### Claude's Discretion

- The exact YAML structure for `search_queries` (indentation, placement in profile.yml) — follow existing profile.yml conventions.
- Whether `max_results_per_source` lives under a new `discovery:` section or directly under the root — planner decides based on profile.yml structure.
- Whether fallback behavior (no `search_queries` defined) uses `title_filter.positive` from portals.yml or skips external scanning — planner decides.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing scan infrastructure
- `scan.mjs` — Current scanner: reads portals.yml, detects Greenhouse/Ashby/Lever APIs, deduplicates, appends to pipeline.md and scan-history.tsv. Plans call for extracting shared utilities from here into scan-core.mjs.
- `config/profile.yml` — User-layer config. New `search_queries` field goes here. Also contains `target_roles.primary` and `candidate.location` which may be useful defaults.
- `data/scan-history.tsv` — Dedup source: URL-keyed TSV, header: `url\tfirst_seen\tportal\ttitle\tcompany\tstatus`.
- `data/pipeline.md` — Append target: new jobs added under `## Pendientes` section.
- `data/applications.md` — Secondary dedup source: company+role pairs extracted to avoid re-queuing already-tracked jobs.

### GitHub Actions
- `.github/workflows/test.yml` — Reference for existing CI structure and how secrets are consumed.

### External APIs (no local files — review docs before planning)
- Adzuna REST API: `https://developer.adzuna.com/` — requires `ADZUNA_APP_ID` + `ADZUNA_APP_KEY`.
- SerpAPI Google Jobs: `https://serpapi.com/google-jobs-api` — requires `SERPAPI_KEY`, metered pricing.

### Requirements
- `REQUIREMENTS.md` — DISC-01 through DISC-06 define acceptance criteria for this phase.
- `ROADMAP.md` — Phase 1 plans 1.1 and 1.2 contain detailed implementation notes (URL normalization approach, cron commit strategy).

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildTitleFilter(titleFilter)` in `scan.mjs:~30` — Positive/negative keyword filter. Can be reused in scan-core.mjs.
- `loadSeenUrls()` in `scan.mjs` — Reads scan-history.tsv into a Set. Goes into scan-core.mjs.
- `loadSeenCompanyRoles()` in `scan.mjs` — Reads applications.md into a Set. Goes into scan-core.mjs.
- `appendToPipeline(offers)` in `scan.mjs` — Handles `## Pendientes` section write logic. Goes into scan-core.mjs.
- `appendToScanHistory(offers, date)` in `scan.mjs` — TSV append with header creation. Goes into scan-core.mjs.
- `parallelFetch(tasks, limit)` in `scan.mjs` — Concurrency-limited fetch pool. May be reusable for new sources.

### Established Patterns
- All scripts are ES modules (`*.mjs`), no TypeScript.
- YAML config read with `js-yaml` (`import yaml from 'js-yaml'`).
- No external HTTP library — uses native `fetch` with a timeout wrapper.
- Dry-run support via `--dry-run` flag is a convention in this codebase.
- Output to stdout only (no logging library), summary printed at end of run.

### Integration Points
- New Adzuna/SerpAPI sources plug into the same `newOffers` array and write path as existing portal sources.
- GitHub Actions cron extends the existing `.github/workflows/` directory — several workflows already present (`test.yml`, `release.yml`, etc.).
- Repo secrets `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `SERPAPI_KEY` need to be documented for setup.

</code_context>

<specifics>
## Specific Ideas

No specific design references mentioned. Standard patterns apply.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-enhanced-job-discovery*
*Context gathered: 2026-04-19*
