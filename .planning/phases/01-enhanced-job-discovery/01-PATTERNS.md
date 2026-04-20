# Phase 1: Enhanced Job Discovery - Pattern Map

**Mapped:** 2026-04-19
**Files analyzed:** 4 (2 new, 2 modified)
**Analogs found:** 4 / 4

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `scan-core.mjs` | utility/module | batch + file-I/O | `liveness-core.mjs` | exact (named-export module split from consumer script) |
| `scan.mjs` | utility/script | batch + request-response | `scan.mjs` itself | self (refactor + extension) |
| `config/profile.yml` | config | — | `config/profile.yml` itself | self (additive YAML section) |
| `.github/workflows/daily-scan.yml` | config/workflow | event-driven (cron) | `.github/workflows/release.yml` | role-match (both use `permissions: contents: write` + push to main) |

---

## Pattern Assignments

---

### `scan-core.mjs` (utility module, batch + file-I/O)

**Analog:** `liveness-core.mjs` (lines 1–75)

This file is the direct precedent for the "extract shared logic from a script into a pure named-export module" pattern used in this codebase.

**Module structure pattern** (`liveness-core.mjs` lines 1–75 — entire file):

The module has zero imports from its consumer (`check-liveness.mjs`). All state is computed from arguments or file reads. Every public symbol is a named `export`. No default export. No shebang line (`#!/usr/bin/env node` belongs on the entry-point script, not the utility module).

```javascript
// liveness-core.mjs — pure named exports, no shebang, no imports from consumer
export function classifyLiveness({ status = 0, finalUrl = '', bodyText = '', applyControls = [] } = {}) {
  // ...
}
```

**Functions to move from `scan.mjs` into `scan-core.mjs`** (source lines in `scan.mjs`):

| Function | scan.mjs lines | Notes |
|---|---|---|
| `loadSeenUrls()` | 139–168 | Move verbatim; reads `SCAN_HISTORY_PATH`, `PIPELINE_PATH`, `APPLICATIONS_PATH` |
| `loadSeenCompanyRoles()` | 170–184 | Move verbatim |
| `appendToPipeline(offers)` | 188–217 | Move verbatim |
| `appendToScanHistory(offers, date)` | 219–230 | Move verbatim |
| `parallelFetch(tasks, limit)` | 234–248 | Move verbatim |
| `buildTitleFilter(titleFilter)` | 125–135 | Move verbatim |
| `fetchJson(url)` | 111–121 | Move verbatim; needed by new API fetchers |
| Path constants | 24–27 | Move `SCAN_HISTORY_PATH`, `PIPELINE_PATH`, `APPLICATIONS_PATH` as named exports |

**Imports pattern for scan-core.mjs** (modeled on scan.mjs lines 18–20):

```javascript
import { readFileSync, writeFileSync, appendFileSync, existsSync } from 'fs';
```

No `js-yaml` needed in scan-core.mjs unless `buildTitleFilter` needs it (it does not — the titleFilter object is passed in already parsed by the caller).

**New function to add in scan-core.mjs — `normalizeJobUrl(url)`** (no existing analog; new logic):

```javascript
export function normalizeJobUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    const linkedinMatch = url.match(/linkedin\.com\/jobs\/view\/(\d+)/);
    if (linkedinMatch) return `https://www.linkedin.com/jobs/view/${linkedinMatch[1]}/`;
    if (u.hostname.includes('indeed.com')) {
      const jk = u.searchParams.get('jk');
      if (jk) return `https://www.indeed.com/viewjob?jk=${jk}`;
    }
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
     'refId', 'trackingId', 'src'].forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
}
```

**Anti-pattern to avoid:** scan-core.mjs must have zero imports from scan.mjs. All shared constants (`SCAN_HISTORY_PATH` etc.) live in scan-core.mjs and are imported by scan.mjs — never the reverse.

---

### `scan.mjs` (utility/script, batch + request-response) — MODIFIED

**Analog:** `scan.mjs` itself — this is a refactor + extension of the existing file.

**Import block to replace** (current lines 18–20):

```javascript
// BEFORE (current scan.mjs lines 18–20):
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'fs';
import yaml from 'js-yaml';
const parseYaml = yaml.load;

// AFTER (post-refactor):
import { mkdirSync, existsSync, readFileSync } from 'fs';
import yaml from 'js-yaml';
import {
  SCAN_HISTORY_PATH, PIPELINE_PATH, APPLICATIONS_PATH,
  loadSeenUrls, loadSeenCompanyRoles,
  appendToPipeline, appendToScanHistory,
  normalizeJobUrl, buildTitleFilter, parallelFetch, fetchJson,
} from './scan-core.mjs';
const parseYaml = yaml.load;
```

**Config loading pattern for `discovery` section** (modeled on existing portals.yml loading, scan.mjs lines 263–266):

```javascript
// Existing pattern: read portals.yml
const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));

// New pattern: also read profile.yml for discovery config (same shape)
const PROFILE_PATH = 'config/profile.yml';

function loadDiscoveryConfig() {
  if (!existsSync(PROFILE_PATH)) return { searchQueries: [], maxResultsPerSource: 50 };
  const profile = parseYaml(readFileSync(PROFILE_PATH, 'utf-8'));
  return {
    searchQueries: profile?.discovery?.search_queries || [],
    maxResultsPerSource: profile?.discovery?.max_results_per_source ?? 50,
    country: profile?.discovery?.country || 'us',
  };
}
```

**Graceful API key skip pattern** (modeled on existing `--dry-run` guard, scan.mjs lines 254–256):

```javascript
// Existing dry-run guard pattern (scan.mjs line 254):
const dryRun = args.includes('--dry-run');
if (dryRun) console.log('(dry run — no files will be written)\n');

// New API key skip pattern (same style — check, log, skip):
const adzunaAppId = process.env.ADZUNA_APP_ID;
const adzunaAppKey = process.env.ADZUNA_APP_KEY;
const serpApiKey = process.env.SERPAPI_KEY;

if (!adzunaAppId || !adzunaAppKey) {
  console.log('Adzuna: skipped (ADZUNA_APP_ID / ADZUNA_APP_KEY not set)');
}
if (!serpApiKey) {
  console.log('SerpAPI: skipped (SERPAPI_KEY not set)');
}
```

**Job object shape — new sources must match existing parsers** (scan.mjs lines 78–105):

```javascript
// All existing parsers return this shape:
{
  title: j.title || '',
  url: j.absolute_url || '',   // <-- string URL, may be empty
  company: companyName,
  location: j.location?.name || '',
}
// scan.mjs then adds source: `${type}-api` at line 316.
// New fetchers must return the same shape + source field:
{
  title: string,
  url: string,
  company: string,
  location: string,
  source: 'adzuna' | 'serpapi-google-jobs',
}
```

**Dedup loop pattern — where to call `normalizeJobUrl`** (scan.mjs lines 299–316, the inner loop):

```javascript
// Existing dedup loop (scan.mjs lines 299–316):
for (const job of jobs) {
  if (!titleFilter(job.title)) { totalFiltered++; continue; }
  if (seenUrls.has(job.url)) { totalDupes++; continue; }
  const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
  if (seenCompanyRoles.has(key)) { totalDupes++; continue; }
  seenUrls.add(job.url);
  seenCompanyRoles.add(key);
  newOffers.push({ ...job, source: `${type}-api` });
}

// Extended dedup loop for new sources (add normalizeJobUrl call):
for (const job of externalJobs) {
  if (!titleFilter(job.title)) { totalFiltered++; continue; }
  const normalizedUrl = normalizeJobUrl(job.url);
  if (seenUrls.has(normalizedUrl)) { totalDupes++; continue; }
  const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
  if (seenCompanyRoles.has(key)) { totalDupes++; continue; }
  seenUrls.add(normalizedUrl);
  seenCompanyRoles.add(key);
  newOffers.push({ ...job, url: normalizedUrl });
}
```

**Summary print pattern** (scan.mjs lines 332–362 — copy and extend):

```javascript
// Existing summary block format (scan.mjs lines 332–340):
console.log(`\n${'━'.repeat(45)}`);
console.log(`Portal Scan — ${date}`);
console.log(`${'━'.repeat(45)}`);
console.log(`Companies scanned:     ${targets.length}`);
console.log(`Total jobs found:      ${totalFound}`);
// New sources should extend the same block with per-source counts:
console.log(`Adzuna results:        ${adzunaCount}`);
console.log(`SerpAPI results:       ${serpApiCount}`);
```

**Error handling pattern** (scan.mjs lines 318–320 — same try/catch + errors array):

```javascript
// Existing error collection (scan.mjs lines 318–320):
} catch (err) {
  errors.push({ company: company.name, error: err.message });
}
// New API fetchers should push to same errors array with source name:
} catch (err) {
  errors.push({ company: `adzuna[${query}]`, error: err.message });
}
```

---

### `config/profile.yml` — MODIFIED (additive section)

**Analog:** `config/profile.yml` itself — additive YAML block following existing section conventions.

**Existing structure conventions** (profile.yml lines 1–71):

- Top-level keys use `snake_case` nouns: `candidate`, `target_roles`, `narrative`, `compensation`, `location`.
- Inline comments explain each field on the same line or on the line above.
- Optional fields are shown commented-out with `# field: value` examples.
- Lists use YAML block sequence style (`- "value"`), not flow style (`["value"]`).

**New section to append** (after the `location:` block at line 64):

```yaml
discovery:
  # Job title keywords for external API search (Adzuna, SerpAPI Google Jobs).
  # Each entry = one API call per source per run. Keep this list short (3-5 entries).
  # SerpAPI free tier: 250 searches/month. 3 queries x 5 pages = ~15 credits/run = ~16 runs/month.
  search_queries:
    - "AI Engineer"
    - "ML Engineer"
    - "Applied AI"

  # Maximum results to fetch per source per run (default: 50).
  # Protects SerpAPI metered credits. 50 results = ~5 SerpAPI calls per query.
  max_results_per_source: 50

  # Adzuna country code (default: us). Supported: gb, us, de, fr, au, nz, ca, in, pl, br, at, za
  country: "us"
```

---

### `.github/workflows/daily-scan.yml` (workflow config, event-driven/cron)

**Analog:** `.github/workflows/release.yml` (lines 1–19)

This is the closest match because `release.yml` is the only existing workflow that uses `permissions: contents: write` and pushes commits back to main. The `test.yml` workflow is a better reference for the job/step structure (checkout + setup-node + npm install + run).

**`permissions: contents: write` pattern** (`release.yml` lines 6–9):

```yaml
permissions:
  contents: write
  pull-requests: write   # not needed for daily-scan; use only contents: write
```

**Job + step structure pattern** (`test.yml` lines 7–19):

```yaml
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
      - uses: actions/setup-node@v6
        with:
          node-version: '20'
      - run: npm install
      - run: node test-all.mjs --quick
```

**Composite pattern for `daily-scan.yml`** (release.yml permissions + test.yml job structure + commit-back action):

```yaml
name: Daily Job Discovery

on:
  schedule:
    - cron: '0 7 * * *'   # 7 AM UTC daily
  workflow_dispatch:       # Manual trigger; also prevents GitHub 60-day inactivity disable

permissions:
  contents: write          # Required for git-auto-commit-action to push back to main

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6
        with:
          persist-credentials: true   # Required: without this, the push-back fails

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
          # Scoped file_pattern is critical — do NOT use '.' (would commit stray files)
```

**Secret injection pattern** (no existing analog — only test.yml exists and it has no secrets): The `env:` block under a single step is the standard GitHub Actions pattern. Secrets are referenced as `${{ secrets.NAME }}` — never echoed, never stored in files. This is documented in RESEARCH.md and is a standard Actions convention.

---

## Shared Patterns

### ES Module Named Exports (applies to scan-core.mjs)

**Source:** `liveness-core.mjs` (entire file, 75 lines)

- No shebang (`#!/usr/bin/env node`) on module files — only on entry-point scripts.
- No default export.
- All public functions are individually `export function`.
- Zero circular dependencies — module never imports from its consumer.

```javascript
// liveness-core.mjs pattern:
export function classifyLiveness({ ... } = {}) { ... }
// No imports from check-liveness.mjs. Pure utility.
```

### Fetch with Timeout (applies to scan-core.mjs and new API fetchers)

**Source:** `scan.mjs` lines 111–121

```javascript
async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}
```

This function moves to scan-core.mjs as a named export. Both `fetchAdzuna` and `fetchSerpAPI` call it.

### Dry-Run Guard (applies to scan.mjs additions)

**Source:** `scan.mjs` lines 253–256, 326–329

```javascript
const dryRun = args.includes('--dry-run');
// ...
if (!dryRun && newOffers.length > 0) {
  appendToPipeline(newOffers);
  appendToScanHistory(newOffers, date);
}
```

New external source results must flow through the same `newOffers` array and the same `if (!dryRun)` guard. No separate dry-run checks per source.

### YAML Config Reading (applies to scan.mjs discovery config loading)

**Source:** `scan.mjs` lines 18–20, 263–266

```javascript
import yaml from 'js-yaml';
const parseYaml = yaml.load;
// ...
const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
```

Reading `config/profile.yml` for the new `discovery` section uses the identical pattern — `parseYaml(readFileSync(PROFILE_PATH, 'utf-8'))` — already established for portals.yml.

### Error Collection (applies to scan.mjs new API fetch calls)

**Source:** `scan.mjs` lines 291, 318–320, 341–345

```javascript
const errors = [];
// ...
} catch (err) {
  errors.push({ company: company.name, error: err.message });
}
// ...
if (errors.length > 0) {
  console.log(`\nErrors (${errors.length}):`);
  for (const e of errors) {
    console.log(`  ✗ ${e.company}: ${e.error}`);
  }
}
```

New source fetch errors push to the same `errors` array with a descriptive `company` label (e.g., `adzuna[AI Engineer]`). Printed in the same summary block.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `normalizeJobUrl()` function (part of scan-core.mjs) | utility | transform | No URL normalization exists in the codebase; regex patterns are new logic |
| `fetchAdzuna()` function (part of scan.mjs) | utility | request-response | No Adzuna integration exists; closest analog is `fetchJson()` for the HTTP layer only |
| `fetchSerpAPI()` function (part of scan.mjs) | utility | request-response | No SerpAPI integration exists; closest analog is `fetchJson()` for the HTTP layer only |

For these three, use RESEARCH.md Patterns 2, 3, and 4 as the implementation reference (Adzuna fetch, SerpAPI fetch, URL normalization). The surrounding scaffolding (error handling, dry-run, summary print) copies from existing `scan.mjs` patterns above.

---

## Metadata

**Analog search scope:** `scan.mjs`, `liveness-core.mjs`, `config/profile.yml`, `.github/workflows/test.yml`, `.github/workflows/release.yml`
**Files read:** 7
**Pattern extraction date:** 2026-04-19
