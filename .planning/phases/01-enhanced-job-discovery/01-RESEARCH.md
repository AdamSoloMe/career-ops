# Phase 1: Enhanced Job Discovery - Research

**Researched:** 2026-04-19
**Domain:** External job API integration, ES module refactoring, GitHub Actions cron + commit-back
**Confidence:** MEDIUM-HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Adzuna and SerpAPI search keywords are configured in `config/profile.yml` under a new `search_queries` field — NOT in `portals.yml`. `portals.yml` remains the config for which ATS-portal companies to scan directly; `profile.yml` is where users configure what external sources search for.
- **D-02:** `search_queries` is a flat list of simple strings (job title keywords). Each string maps directly to one API query call per source. Example: `search_queries: ['AI Engineer', 'ML Engineer', 'Applied AI']`.
- **D-03:** Boolean operator syntax (OR/AND) is NOT supported in v1 — simple strings only. Each entry = one API call.
- **D-04:** Location filtering is title keywords only. No per-query location field. If location is needed, Adzuna/SerpAPI can use `candidate.location` from `profile.yml` as a global default — or leave location unfiltered to capture remote roles.
- **D-05:** A configurable `max_results_per_source` field in `profile.yml` caps results per API source per run. Default: 50. This protects SerpAPI metered credits and prevents pipeline.md from flooding on first run.

### Claude's Discretion

- The exact YAML structure for `search_queries` (indentation, placement in profile.yml) — follow existing profile.yml conventions.
- Whether `max_results_per_source` lives under a new `discovery:` section or directly under the root — planner decides based on profile.yml structure.
- Whether fallback behavior (no `search_queries` defined) uses `title_filter.positive` from portals.yml or skips external scanning — planner decides.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DISC-01 | System queries Adzuna API daily with configurable job title keywords and appends new matching jobs to `data/pipeline.md` | Adzuna REST API structure documented below; fetch pattern matches existing codebase |
| DISC-02 | System queries SerpAPI (Google Jobs) daily with configurable job title keywords and appends new matching jobs to `data/pipeline.md` | SerpAPI Google Jobs endpoint documented; pagination via next_page_token; 10 results/page |
| DISC-03 | Discovery runs automatically every day via GitHub Actions cron without manual trigger | `stefanzweifel/git-auto-commit-action@v7` pattern documented; cron syntax verified |
| DISC-04 | Title keywords configurable in `config/profile.yml` — not hardcoded to tech roles | New `discovery.search_queries` section in profile.yml; D-01/D-02 locked decisions |
| DISC-05 | New jobs deduplicated against scan-history.tsv and applications.md with URL normalization | LinkedIn and Indeed URL normalization regex patterns documented below |
| DISC-06 | Existing scan.mjs direct ATS scanning continues unchanged and is included in the daily cron run | scan.mjs portal logic stays intact; cron calls `node scan.mjs` which runs all sources |
</phase_requirements>

---

## Summary

Phase 1 extends the zero-token portal scanner with two external APIs (Adzuna and SerpAPI Google Jobs) and adds a GitHub Actions daily cron that commits updated pipeline files back to the repo. The primary technical work is: (1) refactoring shared utilities from `scan.mjs` into `scan-core.mjs` as named exports, (2) implementing two new fetcher functions that produce the same `{title, url, company, location, source}` shape as existing portal parsers, and (3) creating a workflow that authenticates as the GitHub Actions bot and pushes `data/pipeline.md` + `data/scan-history.tsv` after each run.

The codebase already uses native `fetch` with a timeout wrapper, `js-yaml` for config, and ES module syntax throughout. Both new sources fit naturally into the existing `newOffers` array and write path. The main complexity is: SerpAPI returns only 10 results per page and uses token-based pagination (not offsets), so fetching up to `max_results_per_source` requires multiple requests; and Adzuna's free tier has an undocumented but soft rate limit with a `results_per_page` max of 50.

The GitHub Actions commit-back pattern is well-established using `stefanzweifel/git-auto-commit-action@v7`, which handles the no-changes case gracefully (skips commit) and needs only `permissions: contents: write` alongside `actions/checkout@v6` (already used in this repo).

**Primary recommendation:** Extract shared utilities first (`scan-core.mjs`), then add API fetchers as `fetchAdzuna()` and `fetchSerpAPI()` in `scan.mjs`, then wire the daily cron in a separate wave.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Job discovery (API fetching) | Node.js script (`scan.mjs`) | — | Stateless script, no server needed |
| Shared dedup/write utilities | Node.js module (`scan-core.mjs`) | — | Extracted to avoid duplication across fetcher sources |
| Config (search keywords) | `config/profile.yml` (user layer) | — | D-01 locked decision; user data stays in user layer |
| URL normalization | `scan-core.mjs` | — | Single place to normalize before dedup set insertion |
| Dedup state | `data/scan-history.tsv` + `data/applications.md` | — | Existing files; already read by `loadSeenUrls()` |
| Pipeline write | `data/pipeline.md` | `data/scan-history.tsv` | Both files updated together per run |
| Scheduled execution | GitHub Actions cron | — | REQUIREMENTS.md explicitly excludes node-cron |
| Commit-back | GitHub Actions (`stefanzweifel/git-auto-commit-action`) | bare git commands | Action handles empty-diff skip automatically |
| Secrets | GitHub repo secrets | — | ADZUNA_APP_ID, ADZUNA_APP_KEY, SERPAPI_KEY |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `js-yaml` | 4.1.1 | Parse `config/profile.yml` for `search_queries` | Already a project dependency [VERIFIED: npm registry] |
| Native `fetch` + AbortController | Node 18+ built-in | HTTP calls to Adzuna and SerpAPI APIs | Existing codebase pattern — no external HTTP lib [VERIFIED: scan.mjs source] |
| `stefanzweifel/git-auto-commit-action` | v7 (v7.1.0, Dec 2025) | Auto-commit changed files in GitHub Actions | Handles no-change skip, well-maintained, widely used [VERIFIED: GitHub README] |
| `actions/checkout` | v6 | Checkout repo in Actions workflows | Already used in this repo's test.yml + codeql.yml [VERIFIED: .github/workflows/] |
| `actions/setup-node` | v6 | Node runtime in Actions | Already used in test.yml [VERIFIED: .github/workflows/test.yml] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `dotenv` | ^16.4.5 | Load `.env` locally for dev testing of API keys | Local development only; Actions uses secrets [VERIFIED: package.json] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `stefanzweifel/git-auto-commit-action@v7` | Bare `git config` + `git add` + `git push` | Both work; bare git is more transparent but requires manual empty-diff guard; action is 2 lines and handles it |
| `stefanzweifel/git-auto-commit-action@v7` | `peter-evans/create-pull-request` | PR approach adds human review step; for automated data files (pipeline.md, scan-history.tsv) direct commit to main is appropriate |

**Installation:** No new npm packages required. Everything runs on existing dependencies.

**Version verification:**
```bash
npm view js-yaml version   # 4.1.1 — confirmed
```
Both new API integrations use native fetch — no new packages needed. [VERIFIED: npm registry]

---

## Architecture Patterns

### System Architecture Diagram

```
config/profile.yml
  └─ discovery.search_queries: ['AI Engineer', ...]
  └─ discovery.max_results_per_source: 50

node scan.mjs
  │
  ├─ (existing) portals.yml → detectApi() → Greenhouse/Ashby/Lever APIs
  │                                                    ↓
  ├─ scan-core.mjs ◄────────────────────── newOffers[] (all sources)
  │   ├─ loadSeenUrls()                               ↓
  │   ├─ loadSeenCompanyRoles()        dedup check → skip OR add
  │   ├─ normalizeJobUrl()                            ↓
  │   ├─ appendToPipeline()         data/pipeline.md (## Pendientes)
  │   └─ appendToScanHistory()      data/scan-history.tsv
  │
  ├─ fetchAdzuna(query, appId, appKey, maxResults)
  │     GET api.adzuna.com/v1/api/jobs/{country}/search/{page}
  │     ?what={query}&app_id=&app_key=&results_per_page=50
  │     Response: { results: [{title, redirect_url, company.display_name, location.area}] }
  │
  └─ fetchSerpAPI(query, apiKey, maxResults)
        GET serpapi.com/search?engine=google_jobs&q={query}&api_key=
        Response: { jobs_results: [{title, company_name, location, apply_options[0].link, job_id}] }
        Pagination: serpapi_pagination.next_page_token → loop until maxResults reached

GitHub Actions: .github/workflows/daily-scan.yml
  cron: '0 7 * * *'   (7 AM UTC daily)
  steps:
    1. actions/checkout@v6 (with persist-credentials: true)
    2. actions/setup-node@v6 (node 20)
    3. npm install
    4. ADZUNA_APP_ID=${{ secrets.ADZUNA_APP_ID }} node scan.mjs
    5. stefanzweifel/git-auto-commit-action@v7
         file_pattern: 'data/pipeline.md data/scan-history.tsv'
         commit_message: 'chore(scan): daily discovery run'
```

### Recommended Project Structure

```
career-ops/
├── scan.mjs              # Entry point — orchestrates all sources (ATS + Adzuna + SerpAPI)
├── scan-core.mjs         # NEW: shared utilities (loadSeenUrls, appendToPipeline, normalizeJobUrl, etc.)
├── config/
│   └── profile.yml       # Add discovery.search_queries + discovery.max_results_per_source
└── .github/workflows/
    └── daily-scan.yml    # NEW: cron workflow
```

### Pattern 1: ES Module Named Exports (scan-core.mjs)

**What:** Extract utility functions from `scan.mjs` as named exports so both `scan.mjs` and any future scanner scripts can import them.

**When to use:** When multiple scripts need shared state-loading or file-write logic.

**Example:**
```javascript
// scan-core.mjs — named exports pattern (matches liveness-core.mjs precedent)
// Source: liveness-core.mjs in this repo [VERIFIED: codebase]

export function loadSeenUrls() { /* ... */ }
export function loadSeenCompanyRoles() { /* ... */ }
export function appendToPipeline(offers) { /* ... */ }
export function appendToScanHistory(offers, date) { /* ... */ }
export function normalizeJobUrl(url) { /* ... */ }
export function buildTitleFilter(titleFilter) { /* ... */ }
export async function parallelFetch(tasks, limit) { /* ... */ }

// In scan.mjs:
import {
  loadSeenUrls, loadSeenCompanyRoles,
  appendToPipeline, appendToScanHistory,
  normalizeJobUrl, buildTitleFilter, parallelFetch
} from './scan-core.mjs';
```

### Pattern 2: Adzuna API Fetch

**What:** Single-page fetch against the Adzuna jobs search endpoint. Pagination loops over page numbers (1-based) until `max_results_per_source` is reached or fewer results returned than requested.

**When to use:** Each entry in `search_queries` = one call sequence per run.

**Example:**
```javascript
// Source: developer.adzuna.com/docs + MCP server implementation [CITED: github.com/folathecoder/adzuna-job-search-mcp]

async function fetchAdzuna(query, { appId, appKey, country = 'us', maxResults = 50 }) {
  const PER_PAGE = 50; // confirmed max [CITED: adzuna-job-search-mcp docs]
  const results = [];
  let page = 1;

  while (results.length < maxResults) {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`);
    url.searchParams.set('app_id', appId);
    url.searchParams.set('app_key', appKey);
    url.searchParams.set('what', query);
    url.searchParams.set('results_per_page', String(Math.min(PER_PAGE, maxResults - results.length)));
    url.searchParams.set('content-type', 'application/json');

    const json = await fetchJson(url.toString());
    const batch = (json.results || []).map(j => ({
      title: j.title || '',
      url: j.redirect_url || '',
      company: j.company?.display_name || '',
      location: j.location?.area?.join(', ') || '',
      source: 'adzuna',
    }));

    results.push(...batch);
    if (batch.length < PER_PAGE) break; // last page
    page++;
  }

  return results.slice(0, maxResults);
}
```

### Pattern 3: SerpAPI Google Jobs Fetch

**What:** Token-based pagination. SerpAPI returns up to 10 results per page; loop using `serpapi_pagination.next_page_token` to accumulate up to `maxResults`.

**When to use:** Each `search_queries` entry calls this once and pages as needed.

**Important:** 1 API credit per request (not per result). With 3 queries and 50 max results, that is up to 15 credits per run (3 queries × 5 pages). At 250 free credits/month this is ~16 runs before exhausting free tier.

**Example:**
```javascript
// Source: serpapi.com/google-jobs-api [CITED]

async function fetchSerpAPI(query, { apiKey, maxResults = 50 }) {
  const results = [];
  let nextPageToken = null;

  while (results.length < maxResults) {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', apiKey);
    if (nextPageToken) url.searchParams.set('next_page_token', nextPageToken);

    const json = await fetchJson(url.toString());
    const batch = (json.jobs_results || []).map(j => ({
      title: j.title || '',
      // Prefer direct apply URL; fall back to Google Jobs share link
      url: j.apply_options?.[0]?.link || j.share_link || '',
      company: j.company_name || '',
      location: j.location || '',
      source: 'serpapi-google-jobs',
    }));

    results.push(...batch);
    nextPageToken = json.serpapi_pagination?.next_page_token;
    if (!nextPageToken || batch.length === 0) break;
  }

  return results.slice(0, maxResults);
}
```

### Pattern 4: URL Normalization for Dedup

**What:** Extract canonical job identifiers from LinkedIn and Indeed tracking URLs so the same job doesn't appear twice under different referral/tracking variants.

**When to use:** Applied to ALL URLs before insertion into `seenUrls` Set and before writing to scan-history.tsv.

**Example:**
```javascript
// Source: observed URL patterns from job boards [ASSUMED - regex patterns are inference from known URL formats]

export function normalizeJobUrl(url) {
  if (!url) return url;

  try {
    const u = new URL(url);

    // LinkedIn: extract numeric job ID
    // Patterns: /jobs/view/1234567890/, /jobs/view/1234567890?..., tracking params vary
    const linkedinMatch = url.match(/linkedin\.com\/jobs\/view\/(\d+)/);
    if (linkedinMatch) return `https://www.linkedin.com/jobs/view/${linkedinMatch[1]}/`;

    // Indeed: extract jk= parameter (canonical job key)
    // Pattern: viewjob?jk=abc123... or jk= anywhere in query string
    if (u.hostname.includes('indeed.com')) {
      const jk = u.searchParams.get('jk');
      if (jk) return `https://www.indeed.com/viewjob?jk=${jk}`;
    }

    // Default: strip common tracking params that vary per referral
    // (utm_source, utm_campaign, etc.)
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
     'refId', 'trackingId', 'src'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url; // not a valid URL — return as-is
  }
}
```

### Pattern 5: GitHub Actions Daily Cron with Commit-Back

**What:** Scheduled workflow that runs `node scan.mjs`, then commits any changes to `data/` back to `main`.

**When to use:** Exactly once — `daily-scan.yml`.

**Example:**
```yaml
# Source: stefanzweifel/git-auto-commit-action README [CITED: github.com/stefanzweifel/git-auto-commit-action]
name: Daily Job Discovery

on:
  schedule:
    - cron: '0 7 * * *'   # 7 AM UTC daily
  workflow_dispatch:       # Allow manual trigger

permissions:
  contents: write

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: true

      - uses: actions/setup-node@v6
        with:
          node-version: '20'

      - run: npm install

      - name: Run scanner
        env:
          ADZUNA_APP_ID: ${{ secrets.ADZUNA_APP_ID }}
          ADZUNA_APP_KEY: ${{ secrets.ADZUNA_APP_KEY }}
          SERPAPI_KEY: ${{ secrets.SERPAPI_KEY }}
        run: node scan.mjs

      - uses: stefanzweifel/git-auto-commit-action@v7
        with:
          commit_message: 'chore(scan): daily discovery run'
          file_pattern: 'data/pipeline.md data/scan-history.tsv'
```

**Critical:** The `workflow_dispatch` trigger enables manual test runs before the cron fires. Without it you must wait for the scheduled time to validate the workflow. [ASSUMED - best practice, not a limitation]

### Anti-Patterns to Avoid

- **Importing scan.mjs from scan-core.mjs:** Circular dependency. scan-core.mjs must be pure utilities with no reference back to scan.mjs. scan.mjs imports from scan-core.mjs, never the reverse.
- **Mutating the seenUrls Set before normalizing URLs:** Always call `normalizeJobUrl(url)` before `seenUrls.has(url)` and `seenUrls.add(url)`. Normalizing after the check defeats the purpose.
- **Calling SerpAPI without a page cap:** Without `maxResults` enforcement, a query with many results will exhaust monthly credits in a single run. Default 50 results = max 5 SerpAPI calls per query.
- **Hardcoding country as 'us' for Adzuna:** Should read from `candidate.location` in profile.yml or default to 'us'. Users outside the US hitting the `us` endpoint get wrong results.
- **Committing all changed files:** The `file_pattern` in git-auto-commit-action should be scoped to `data/pipeline.md data/scan-history.tsv`. A glob of `.` would commit any stray file changes from the run.
- **Skipping the `persist-credentials: true` flag on actions/checkout:** Without it, the git push in the commit action fails on protected repos.
- **Using `git push --force` from Actions:** The workflow only appends data; no force push needed or safe.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Commit files back to repo from Actions | Custom git auth with PAT or deploy key setup | `stefanzweifel/git-auto-commit-action@v7` | Handles empty-diff skip, bot commit identity, token config — 2 lines vs. 15+ with edge cases |
| SerpAPI pagination | Custom state machine | Loop on `next_page_token` from response | Token-based pagination — no offset math, just follow the token |
| URL dedup across different tracking variants | Database or fuzzy matching | `normalizeJobUrl()` + URL string Set | Exact match after normalization is sufficient; regex extracts canonical IDs |
| Scheduling | `node-cron` or system cron | GitHub Actions `schedule:` trigger | REQUIREMENTS.md explicitly out-of-scopes node-cron; Actions requires no persistent process |
| API key management in CI | Storing keys in code or env files | GitHub repo secrets (`secrets.ADZUNA_APP_ID`, etc.) | Encrypted at rest, never logged, standard Actions pattern |

**Key insight:** The two new API sources are just different data sources producing the same `{title, url, company, location, source}` shape. No architectural change is needed — just two new fetcher functions that feed into the existing write path.

---

## Common Pitfalls

### Pitfall 1: SerpAPI Credit Exhaustion on First Run

**What goes wrong:** First run with 3 search_queries and no `maxResults` cap hits 15+ API calls (3 queries × up to 50 pages at 10 results each), consuming all 250 free monthly credits instantly.

**Why it happens:** `max_results_per_source` default of 50 means 5 pages per query at 10 results/page = 15 credits for 3 queries. If the default is not enforced or is set too high, credits drain fast.

**How to avoid:** Enforce `max_results_per_source` before the pagination loop. Default 50. Document the credit math in profile.yml comments: `# 50 results = ~5 SerpAPI credits per query per day`.

**Warning signs:** SerpAPI 429 response or "search credits exhausted" in response body mid-run.

### Pitfall 2: pipeline.md Flood on First Run

**What goes wrong:** Adzuna + SerpAPI return hundreds of new jobs on the first scan (no prior history). pipeline.md grows to 200+ unchecked items, making it unmanageable.

**Why it happens:** `data/scan-history.tsv` is empty; all jobs are "new." The `max_results_per_source: 50` cap prevents this if enforced per-source.

**How to avoid:** The `max_results_per_source` cap must apply before the dedup check — not after. Cap the raw API results at fetch time, then dedup. This bounds the first-run flood to `len(search_queries) × max_results_per_source × sources`.

**Warning signs:** pipeline.md grows by 100+ lines on first run.

### Pitfall 3: Circular Module Dependency

**What goes wrong:** If `scan-core.mjs` imports anything from `scan.mjs` (e.g., constants like `PIPELINE_PATH`), Node.js creates a circular dependency that silently breaks the module.

**Why it happens:** Constants like `SCAN_HISTORY_PATH` are currently defined in `scan.mjs`. If they're moved to scan-core.mjs but scan.mjs still needs them, the natural solution is to export them from scan-core — but if scan-core imports scan.mjs for other reasons, it circles.

**How to avoid:** Move all shared constants (`SCAN_HISTORY_PATH`, `PIPELINE_PATH`, `APPLICATIONS_PATH`) to scan-core.mjs. scan.mjs imports them. scan-core.mjs has zero imports from scan.mjs.

**Warning signs:** `ReferenceError` for constants that "should be defined," or functions returning `undefined` even though they exist.

### Pitfall 4: SerpAPI apply_options URL Pointing to LinkedIn/Indeed Tracking URL

**What goes wrong:** `apply_options[0].link` from SerpAPI often returns a LinkedIn or Indeed tracking URL (`linkedin.com/jobs/view/12345?refId=xyz&trackingId=abc`). Without normalization, the same job from Adzuna and SerpAPI both land in the pipeline.

**Why it happens:** SerpAPI aggregates from multiple job boards, including LinkedIn. The `redirect_url` from Adzuna may point to the same LinkedIn posting.

**How to avoid:** Apply `normalizeJobUrl()` to ALL URLs from ALL sources before the `seenUrls.has()` check. This is the correct place — in the dedup loop, not in the fetcher.

**Warning signs:** The same company + title appearing twice in pipeline.md with slightly different URLs.

### Pitfall 5: Workflow Cron Never Fires Because of Repo Inactivity

**What goes wrong:** GitHub disables scheduled workflows on repos with no activity for 60 days. The daily-scan.yml stops running silently.

**Why it happens:** GitHub Actions policy for public repos to reduce compute waste.

**How to avoid:** Add `workflow_dispatch:` to the trigger so the user can manually trigger it to "wake" the workflow. Document this in the workflow file comments.

**Warning signs:** Last successful workflow run date is >60 days ago with no manual runs.

---

## Code Examples

### Reading search_queries from profile.yml

```javascript
// Source: profile.yml convention + js-yaml (existing pattern in scan.mjs) [VERIFIED: codebase]

import { readFileSync } from 'fs';
import yaml from 'js-yaml';

const PROFILE_PATH = 'config/profile.yml';

function loadDiscoveryConfig() {
  if (!existsSync(PROFILE_PATH)) return { searchQueries: [], maxResultsPerSource: 50 };
  const profile = yaml.load(readFileSync(PROFILE_PATH, 'utf-8'));
  return {
    searchQueries: profile?.discovery?.search_queries || [],
    maxResultsPerSource: profile?.discovery?.max_results_per_source ?? 50,
    country: profile?.candidate?.location ? 'us' : 'us', // derive country from location [ASSUMED]
  };
}
```

### profile.yml addition (discovery section)

```yaml
# New section to add to config/profile.yml
# [ASSUMED structure — follows existing yml conventions in this file]

discovery:
  # Job title keywords for external API search (Adzuna, SerpAPI Google Jobs).
  # Each entry = one API call per source per run. Keep this list short (3-5 entries).
  # SerpAPI free tier: 250 searches/month. 3 queries × 5 pages = ~15 credits/run = ~16 runs/month.
  search_queries:
    - "AI Engineer"
    - "ML Engineer"
    - "Applied AI"

  # Maximum results to fetch per source per run (default: 50).
  # Protects SerpAPI metered credits. 50 results = ~5 SerpAPI calls per query.
  max_results_per_source: 50
```

### Graceful handling when API keys are absent

```javascript
// Source: pattern derived from existing --dry-run guard in scan.mjs [VERIFIED: codebase]

async function runExternalSources({ searchQueries, maxResults, dryRun }) {
  const adzunaAppId = process.env.ADZUNA_APP_ID;
  const adzunaAppKey = process.env.ADZUNA_APP_KEY;
  const serpApiKey = process.env.SERPAPI_KEY;

  const results = [];

  if (adzunaAppId && adzunaAppKey) {
    for (const query of searchQueries) {
      results.push(...await fetchAdzuna(query, { appId: adzunaAppId, appKey: adzunaAppKey, maxResults }));
    }
  } else {
    console.log('Adzuna: skipped (ADZUNA_APP_ID / ADZUNA_APP_KEY not set)');
  }

  if (serpApiKey) {
    for (const query of searchQueries) {
      results.push(...await fetchSerpAPI(query, { apiKey: serpApiKey, maxResults }));
    }
  } else {
    console.log('SerpAPI: skipped (SERPAPI_KEY not set)');
  }

  return results;
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| SerpAPI `start` offset for pagination | `next_page_token` in response | ~2023 | Cannot use numeric page offsets; must follow token from each response |
| `actions/checkout@v3` with manual token config | `actions/checkout@v6` (auto token) | 2024 | Newer versions auto-configure git credentials; still need `persist-credentials: true` for push-back |

**Deprecated/outdated:**
- SerpAPI `start` parameter for Google Jobs: Discontinued. Only `next_page_token` works for pagination. [CITED: serpapi.com/google-jobs-api]
- `github-push-action` (ad-m/): Still functional but `git-auto-commit-action` is simpler for this use case (detects changes automatically). [ASSUMED - maintenance comparison]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `normalizeJobUrl()` regex patterns for LinkedIn (`/jobs/view/(\d+)`) and Indeed (`jk=` param) correctly cover the URL formats returned by SerpAPI `apply_options` and Adzuna `redirect_url` | Architecture Patterns — Pattern 4 | Same job deduped twice in pipeline.md; user manual cleanup needed |
| A2 | Adzuna free tier has no hard daily request limit that would block daily cron runs | Common Pitfalls | Cron runs fail with 429 after N days; would need to add retry/backoff |
| A3 | `candidate.location` from profile.yml can be used to derive Adzuna country code (e.g., "San Francisco, CA" → `us`) | Code Examples | Wrong country code = no results for non-US users; needs explicit country config |
| A4 | `workflow_dispatch:` trigger prevents GitHub's 60-day inactivity auto-disable from silently killing the cron | Common Pitfalls — Pitfall 5 | Cron stops after 60 days if repo has no other commits; user gets no notifications |
| A5 | Adzuna's `redirect_url` field is the canonical job URL (not an Adzuna-internal redirect) | Architecture Patterns — Pattern 2 | Dedup fails if redirect_url is an Adzuna tracking redirect — would need to follow redirect first |

---

## Open Questions

1. **Adzuna country selection for non-US users**
   - What we know: Adzuna supports 12 country codes (gb, us, de, fr, au, nz, ca, in, pl, br, at, za)
   - What's unclear: How should the code map `candidate.location` to a country code? Country code is not in profile.yml. D-04 says "use `candidate.location` as global default" but no mapping defined.
   - Recommendation: Add an optional `discovery.country` field (default `us`) to profile.yml. This is Claude's Discretion (D-04 scope).

2. **SerpAPI credit model for power users with many search_queries**
   - What we know: 250 free credits/month. 1 credit per API call. 10 results per page. 5 pages per 50-result query.
   - What's unclear: Whether the free tier is perpetual or trial-only.
   - Recommendation: Document in profile.yml comments: "3 queries × 5 pages × 30 days = 450 credits/month — exceeds free tier." Users with more than ~2 search_queries may need a paid SerpAPI plan.

3. **Adzuna free tier rate limits**
   - What we know: Rate limits exist but are not publicly documented. MCP server confirms `results_per_page` max is 50.
   - What's unclear: Requests per day/minute on free tier.
   - Recommendation: Add 500ms inter-request delay between Adzuna page fetches as a precaution. This is a 1-line change with no user impact given the small result sets targeted.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | scan.mjs runtime | ✓ | v25.8.0 (local), 20 (Actions) | — |
| npm / js-yaml | YAML parsing | ✓ | js-yaml 4.1.1 | — |
| ADZUNA_APP_ID + ADZUNA_APP_KEY | Adzuna integration | ✗ (not set locally) | — | Skip Adzuna source; print warning |
| SERPAPI_KEY | SerpAPI integration | ✗ (not set locally) | — | Skip SerpAPI source; print warning |
| GitHub Actions runner | Cron execution | ✓ (repo on GitHub) | ubuntu-latest | — |
| `stefanzweifel/git-auto-commit-action` | Commit-back | ✓ (marketplace action) | v7.1.0 | Bare git commands (5 lines) |

**Missing dependencies with no fallback:** None — all missing deps have graceful skip behavior.

**Missing dependencies with fallback:**
- API keys: Not present locally. Scripts must check `process.env.ADZUNA_APP_ID` etc. and skip gracefully. This is already the codebase pattern (dry-run guard in scan.mjs).

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | N/A — no user authentication |
| V3 Session Management | no | N/A — stateless script |
| V4 Access Control | no | N/A — single-user tool |
| V5 Input Validation | yes | Validate `search_queries` is string array; sanitize before URL construction |
| V6 Cryptography | no | N/A — keys passed via env vars, not generated |

### Known Threat Patterns for this Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key leakage in logs | Information Disclosure | Never log env vars; existing `--dry-run` output does not print secrets |
| Prompt injection via job titles in pipeline.md | Tampering | Job titles are written as plain text in markdown checkbox lines — no eval or shell execution; no risk |
| SSRF via redirect_url from Adzuna | Tampering | `redirect_url` is only stored/displayed, never fetched by scan.mjs itself — no SSRF surface |
| GitHub Actions secret exposure in workflow logs | Information Disclosure | Use `${{ secrets.X }}` syntax (masked in logs); never echo secrets; standard Actions pattern |

---

## Sources

### Primary (HIGH confidence)
- `scan.mjs` in codebase — existing fetch pattern, function signatures, module structure [VERIFIED: direct read]
- `liveness-core.mjs` in codebase — ES module named export pattern [VERIFIED: direct read]
- `.github/workflows/test.yml` — existing Actions structure and action versions [VERIFIED: direct read]
- `github.com/stefanzweifel/git-auto-commit-action` — v7 config, permissions, no-change skip behavior [CITED: GitHub README]
- `serpapi.com/google-jobs-api` — endpoint, response fields, pagination via next_page_token [CITED: official docs]
- `developer.adzuna.com/docs` — endpoint URL structure, auth params, response fields [CITED: official docs]
- `serpapi.com/pricing` — 250 free credits/month, 1 credit per successful call [CITED: official pricing page]

### Secondary (MEDIUM confidence)
- `github.com/folathecoder/adzuna-job-search-mcp` — confirms `results_per_page` max = 50, 12 supported country codes [CITED: third-party MCP server]
- GitHub Actions GITHUB_TOKEN docs — write permissions, commit-back does not trigger new workflows [CITED: docs.github.com]

### Tertiary (LOW confidence)
- Adzuna free-tier rate limits: not publicly documented; soft limits assumed based on "rate limits apply" note in MCP server [ASSUMED]
- LinkedIn/Indeed URL normalization regex: derived from known URL patterns, not from official LinkedIn/Indeed API docs [ASSUMED]

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries are existing dependencies or verified Actions marketplace versions
- Architecture: HIGH — follows established codebase patterns; new fetchers match existing parser shape
- API details (Adzuna): MEDIUM — endpoint and auth confirmed from official docs; rate limits ASSUMED
- API details (SerpAPI): HIGH — endpoint, pagination, pricing all confirmed from official docs
- Pitfalls: MEDIUM — based on API behavior patterns and codebase analysis; A1-A5 are assumptions

**Research date:** 2026-04-19
**Valid until:** 2026-07-19 (stable APIs; SerpAPI pricing may change)
