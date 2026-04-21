# Phase 01 Handoff — Automatic Company Discovery

**Date:** 2026-04-20
**Status:** In progress — plan 01-03 partially complete
**For:** Codex (or any AI that picks this up)

---

## What Was Built

The career-ops scanner (`scan.mjs`) was extended to discover jobs automatically from any
company — without requiring the user to maintain a manual company list in `portals.yml`.

Two zero-key aggregators were added and are working:

| Source | Type | Jobs/scan | Config key |
|--------|------|-----------|------------|
| RemoteOK | Public JSON API | ~10 | `remoteok.enabled` |
| newgrad-jobs.com | HTML scraper | ~50 | `newgrad_jobs.categories` |

Both are wired into `scan.mjs` and run on the daily GitHub Actions cron.

### Architecture pattern (important — follow this for new sources)

Every aggregator has this shape in `scan.mjs`:
```js
async function fetchSourceName(titleFilter, seenUrls, seenCompanyRoles)
  → { results: [{title, company, url, location, source}], errors: [{company, error}] }
```

In `main()`, each source gets:
- A config block read from `portals.yml` (e.g. `config.remoteok`)
- An enabled check: `if (!filterCompany && config?.enabled !== false)`
- Results merged into `newOffers`, count tracked in `sourceCount`
- Count printed in the summary block at the bottom

See `fetchRemoteOK()` (~line 120) and `fetchNewGradJobs()` (~line 165) in `scan.mjs`
as reference implementations.

---

## What Still Needs Doing (plan 01-03)

### Task 1: Add more newgrad-jobs.com categories (easy, ~10 min)

First verify which category URLs exist (curl each, check for 200 vs 404):
```bash
curl -o /dev/null -s -w "%{http_code}" https://www.newgrad-jobs.com/list-backend-developer
curl -o /dev/null -s -w "%{http_code}" https://www.newgrad-jobs.com/list-devops-jobs
curl -o /dev/null -s -w "%{http_code}" https://www.newgrad-jobs.com/list-it-support
curl -o /dev/null -s -w "%{http_code}" https://www.newgrad-jobs.com/list-cloud-engineer
curl -o /dev/null -s -w "%{http_code}" https://www.newgrad-jobs.com/list-full-stack-developer
```

For each that returns 200, add to `portals.yml` under `newgrad_jobs.categories`.

### Task 2: Add HN "Who's Hiring" scraper (medium, ~30 min)

HN posts a monthly hiring thread. The Firebase API is public and fast.

Steps:
1. Fetch the latest thread ID:
   `GET https://hacker-news.firebaseio.com/v0/user/whoishiring/submitted.json`
   → returns array of item IDs, first one is most recent

2. Get comment IDs from that thread:
   `GET https://hacker-news.firebaseio.com/v0/item/{threadId}.json`
   → `item.kids` is an array of top-level comment IDs

3. For each comment (limit 200, fetch in batches):
   `GET https://hacker-news.firebaseio.com/v0/item/{commentId}.json`
   → `item.text` is HTML-encoded comment body, `item.dead` = skip if true

4. Parse the comment text:
   - First line format: `Company | Role | Location | Remote/Onsite | Salary`
   - Extract first external URL: regex `href="(https?://(?!news\.ycombinator)[^"]+)"`
   - Skip if no external URL found

5. Add to portals.yml:
```yaml
hn_hiring:
  enabled: true
  max_comments: 200
```

6. Wire into main() following the same pattern as RemoteOK.

Config to add to portals.yml:
```yaml
hn_hiring:
  enabled: true
  max_comments: 200
```

### Task 3: Update ROADMAP.md success criteria

In `.planning/ROADMAP.md`, Phase 1 success criteria section, add:
- "Running `node scan.mjs --dry-run` shows jobs from RemoteOK and newgrad-jobs.com with zero API keys"
- "tracked_companies list is optional — scanner works without it"

---

## How to Test

```bash
# Verify all sources work
node scan.mjs --dry-run 2>&1 | grep -E "RemoteOK|newgrad|HN|Companies|New offers"

# Expected output includes:
# RemoteOK:              10+
# newgrad-jobs.com:      50+
# HN Hiring:             N+  (after task 2)
```

---

## Key Files

| File | Role |
|------|------|
| `scan.mjs` | Main scanner — add new `fetch*()` functions here |
| `portals.yml` | Config for all sources — add new config blocks here |
| `scan-core.mjs` | Shared utils (FETCH_TIMEOUT_MS, buildTitleFilter, etc.) — import from here |
| `.planning/phases/01-enhanced-job-discovery/01-03-PLAN.md` | Full plan with implementation details |

---

## What NOT to Change

- `modes/` files — these are AI evaluation prompts, not scanner code
- `scan-core.mjs` exports — other code depends on them
- The dedup logic in main() — seenUrls/seenCompanyRoles are shared across all sources
- The `tracked_companies` list — leave it as-is, just add aggregators alongside it
