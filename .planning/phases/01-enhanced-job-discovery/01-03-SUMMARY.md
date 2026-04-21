# Plan 01-03 Summary

## Outcome

Completed the zero-key discovery tranche for Phase 1 by extending the scanner beyond tracked companies and keyed APIs.

- Added Hacker News `Who is hiring?` ingestion via the public Firebase API, with parsing for company header metadata plus per-role application links in hiring comments.
- Added shared HTML decoding and dedup-aware job insertion helpers so HN roles reuse the same URL normalization and company-role suppression rules as the rest of the scanner.
- Wired HN counts into the scan summary and documented the new `hn_hiring` config block in `portals.yml`.
- Closed the roadmap plan item for `01-03`.

## Verification

- `node --check scan.mjs` passed.
- `curl -sL -o /dev/null -w "%{http_code}" https://remoteok.com/api` returned `200`.
- `curl -sL -o /dev/null -w "%{http_code}" https://www.newgrad-jobs.com/list-software-engineer-jobs` returned `200`.
- `curl -sL -o /dev/null -w "%{http_code}" https://hacker-news.firebaseio.com/v0/user/whoishiring/submitted.json` returned `200`.
- A sample April 2026 HN hiring comment matched the new role-link parser for `Software Engineer` and `Senior Software Engineer`.

## Deviations from Plan

- I did not add extra `newgrad-jobs.com` categories, because the handoff's candidate `list-*` URLs currently return `404`, and the site's newer `/entry-level-jobs/*` pages do not expose the same job-detail link structure the existing scraper depends on.
- `node scan.mjs --dry-run` could not complete a full live fetch in this sandbox because Node network requests fail uniformly here, including pre-existing sources. Live endpoint reachability was verified with `curl` instead.
