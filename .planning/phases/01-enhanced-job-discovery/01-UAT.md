---
status: diagnosed
phase: 01-enhanced-job-discovery
source:
  - 01-01-SUMMARY.md
  - 01-02-SUMMARY.md
  - 01-03-SUMMARY.md
started: 2026-04-20T22:10:00Z
updated: 2026-04-20T22:10:00Z
updated: 2026-04-20T22:16:00Z
---

## Current Test

[testing complete]

## Tests

### 1. scan-core exports normalizeJobUrl
expected: Running `node -e "import('./scan-core.mjs').then(m => console.log(typeof m.normalizeJobUrl))"` from the repo root prints `function` and exits successfully.
result: pass

### 2. URL normalization removes common tracking noise
expected: Running `node -e "import('./scan-core.mjs').then(m => console.log(m.normalizeJobUrl('https://www.linkedin.com/jobs/view/123?trk=abc')))"` prints a canonical LinkedIn job URL without tracking params, and running the same check for an Indeed URL with `jk=` preserves the canonical job key.
result: issue
reported: "[eval]:1\nimport('./scan-core.mjs').then(m => console.log(m.normalizeJobUrl('https://\n                                                                  ^^^^^^^^^\nExpected ',', got 'ident'\n\nSyntaxError: Invalid or unexpected token\n    at makeContextifyScript (node:internal/vm:194:14)\n    at compileScript (node:internal/process/execution:388:10)\n    at evalTypeScript (node:internal/process/execution:260:22)\n    at node:internal/main/eval_string:71:3\n\nNode.js v25.8.0"
severity: blocker

### 3. Scanner dry-run completes without crashing
expected: Running `node scan.mjs --dry-run` exits 0. Output should show the scanner starting, keyed sources handled gracefully when env vars are missing, and no fatal runtime error.
result: pass

### 4. Discovery configuration is user-editable
expected: `config/profile.yml` contains a `discovery:` section with configurable search queries, and `scan.mjs` reads those settings without requiring code edits.
result: pass

### 5. Daily scan workflow is configured for unattended runs
expected: `.github/workflows/daily-scan.yml` exists with a daily cron, `workflow_dispatch`, `contents: write`, env var injection from GitHub secrets, `node scan.mjs`, and scoped auto-commit limited to `data/pipeline.md data/scan-history.tsv`.
result: pass

### 6. Zero-key discovery sources are wired into the scanner
expected: `portals.yml` includes the zero-key source config added in Phase 1, and `scan.mjs` contains RemoteOK, newgrad-jobs.com, and HN Hiring integration so discovery is not limited to `tracked_companies`.
result: pass

## Summary

total: 6
passed: 5
issues: 1
pending: 0
skipped: 0
blocked: 0

## Gaps

- truth: "Running `node -e \"import('./scan-core.mjs').then(m => console.log(m.normalizeJobUrl('https://www.linkedin.com/jobs/view/123?trk=abc')))\"` prints a canonical LinkedIn job URL without tracking params, and running the same check for an Indeed URL with `jk=` preserves the canonical job key."
  status: failed
  reason: "User reported: [eval]:1 import('./scan-core.mjs').then(m => console.log(m.normalizeJobUrl('https:// ... SyntaxError: Invalid or unexpected token"
  severity: blocker
  test: 2
  root_cause: "The pasted `node -e` example was split across lines in the terminal input, so Node evaluated an unterminated string literal before `normalizeJobUrl()` ran. This is a command-entry issue, not a defect in `scan-core.mjs`."
  artifacts: []
  missing:
    - "Re-run the normalization check as a single-line command."
    - "If needed, replace the example with a shorter verification command during future UAT runs."
