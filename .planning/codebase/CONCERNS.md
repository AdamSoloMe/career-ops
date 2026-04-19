# Codebase Concerns

**Analysis Date:** 2026-04-19

## Tech Debt

**Duplicated status alias maps across scripts:**
- Issue: The Spanish→English status alias table is duplicated verbatim in three scripts. Adding a new alias requires editing three places.
- Files: `verify-pipeline.mjs:41-50`, `merge-tracker.mjs:48-59`, `analyze-patterns.mjs:33-45`, canonical source `templates/states.yml`
- Impact: Silent divergence — a status accepted by one script may be rejected by another, producing inconsistent tracker state.
- Fix approach: Extract a shared `lib/status.mjs` that loads `templates/states.yml` and exposes `normalizeStatus()` / `validateStatus()` / `CANONICAL_STATES`.

**Dual-location pattern for `applications.md` (and `states.yml`):**
- Issue: Every parser checks both `data/applications.md` and top-level `applications.md` as a compatibility shim. Same for `templates/states.yml` vs `states.yml`.
- Files: `merge-tracker.mjs:23-26`, `verify-pipeline.mjs:22-30`, `analyze-patterns.mjs:18-22`, `dashboard/internal/data/career.go:31-41`
- Impact: Every new script must re-implement this fallback; easy to forget.
- Fix approach: Add a shared `paths.mjs` helper, or run a one-time migration during `update-system.mjs apply`.

**Heuristic column-order detection in `merge-tracker.mjs`:**
- Issue: `parseTsvContent()` uses regex heuristics to guess whether column 4 is status or score because different writers emit different orders.
- Files: `merge-tracker.mjs:107-184` (esp. lines 141-163)
- Impact: Fragile — any status string not matched by the hand-coded regex is misclassified, corrupting the tracker.
- Fix approach: Version the TSV format with a header, or enforce a single canonical order in `batch/batch-prompt.md` and reject anything else.

**Large untested shell script:**
- Issue: `batch/batch-runner.sh` is 597 lines of bash performing concurrency control, file locking, TSV rewriting, and `sed`-based template rendering.
- Files: `batch/batch-runner.sh`
- Impact: Hard to test; cross-platform portability (macOS vs Linux `sed`, `bc`, `date -u`) is fragile; `sed` delimiter escaping (lines 337-350) is a known foot-gun for URLs with `&` or `|`.
- Fix approach: Port to `batch-runner.mjs` to reuse Node IO/locking primitives already in `merge-tracker.mjs`.

**Regex-based markdown parsing hard-codes language-specific labels:**
- Issue: `analyze-patterns.mjs:99-150` and `dashboard/internal/data/career.go:16-27` parse report fields with regexes that must match EN/ES (and implicitly DE/FR/JA/PT).
- Files: `analyze-patterns.mjs`, `dashboard/internal/data/career.go`
- Impact: New language modes (`modes/de/`, `modes/fr/`, `modes/ja/`) silently break pattern analysis and dashboard parsing.
- Fix approach: Emit a neutral machine-readable block in every report (YAML front-matter or `<!-- data: {...} -->`) and parse that, not the human-facing tables.

## Known Bugs

**`update-system.mjs` VERSION variable naming confusion:**
- Symptoms: `update-system.mjs:250` re-reads VERSION into a variable named `remote`, using `localVersion()` — the commit message can be wrong on interrupted retries.
- Files: `update-system.mjs:249-262`
- Trigger: Interrupted update (e.g., pre-commit hook failure) followed by re-run.
- Workaround: Run `node update-system.mjs rollback` and retry cleanly.

**Intra-scan race on shared dedup sets:**
- Symptoms: `scan.mjs:292-321` tasks run in parallel and mutate shared `seenUrls` / `seenCompanyRoles` sets without locking; two tasks could both pass `has()` and push the same offer.
- Files: `scan.mjs:292-321`
- Trigger: Two `tracked_companies` entries whose APIs return the same job URL.
- Workaround: None. `CONCURRENCY = 10` makes this rare but possible.

**`verify-pipeline.mjs` row-count check off by one:**
- Symptoms: Line 157 requires `parts.length >= 9` on raw `split('|')`, but the leading `|` produces an empty first element, so the threshold may under-detect malformed rows missing a trailing pipe.
- Files: `verify-pipeline.mjs:152-162`
- Trigger: Manually edited rows.
- Workaround: Manual visual inspection.

## Security Considerations

**`claude -p --dangerously-skip-permissions` in batch runner:**
- Risk: `batch/batch-runner.sh:355-359` invokes the worker with permission bypass for every offer. A malicious JD/URL could trick the agent into destructive operations with no confirmation.
- Files: `batch/batch-runner.sh:355-359`, `batch/batch-prompt.md`
- Current mitigation: Batch runs are opt-in and documented.
- Recommendations: Whitelist tools via `--allow-tool`; sandbox workers (Docker / `flake.nix` already present).

**`sed` injection via URL placeholder:**
- Risk: `batch/batch-runner.sh:337-351` escapes `\\` and `|` but not `&` (which `sed` interprets as matched text).
- Files: `batch/batch-runner.sh:337-351`
- Current mitigation: Partial manual escaping.
- Recommendations: Replace `sed` substitution with Node-based template rendering.

**Unauthenticated external fetches followed by `npm install`:**
- Risk: `update-system.mjs:244` runs `npm install --silent` after pulling from the canonical repo over HTTPS with no signature/checksum check.
- Files: `scan.mjs:111-121`, `update-system.mjs:142-148,205-216,244`
- Current mitigation: HTTPS trust only.
- Recommendations: Verify release signatures; show `git diff` and require user confirmation before the update commit.

**Stale `.update-lock`:**
- Risk: `update-system.mjs:183-191` writes a timestamp, not a PID; a crashed update leaves a stale lock that must be removed manually.
- Files: `update-system.mjs:183-191`
- Recommendations: Write PID and probe with `process.kill(pid, 0)`.

**Safety check is allow-list by prefix, not deny-all-unknown:**
- Risk: `update-system.mjs:222-234` only flags paths matching `USER_PATHS` — a future user file not in the list could be silently overwritten.
- Files: `update-system.mjs:74-86,219-240`
- Recommendations: Invert the logic — fail-closed on any path outside `SYSTEM_PATHS`.

## Performance Bottlenecks

**Sequential liveness check:**
- Problem: `check-liveness.mjs:97` comment: "project rule: never Playwright in parallel". Large URL lists are slow.
- Files: `check-liveness.mjs:96-106`
- Cause: Playwright stability constraint.
- Improvement path: Independent browser contexts with a worker pool, or HTTP-first fallback that escalates to Playwright only on uncertain pages.

**`merge-tracker.mjs` quadratic dedup:**
- Problem: Each addition does up to three linear `find()` scans across all existing entries.
- Files: `merge-tracker.mjs:241-295`
- Cause: Linear search per addition.
- Improvement path: Build `Map`s keyed by report number, entry num, and normalized company+role.

**Unconditional `npm install` on every update:**
- Problem: `update-system.mjs:244` runs `npm install` even when `package-lock.json` didn't change.
- Files: `update-system.mjs:242-247`
- Improvement path: Only run when `package-lock.json` is among updated paths.

## Fragile Areas

**`normalizeTextForATS()` in `generate-pdf.mjs`:**
- Files: `generate-pdf.mjs:34-75`
- Why fragile: Hand-rolled masker using `\u0000MASK{n}\u0000` sentinels — user-supplied HTML containing a literal NUL byte would collide. Regex HTML masking misbehaves on commented-out script tags and nested CDATA.
- Safe modification: Add adversarial tests first (NUL bytes, `<!-- <script> -->`, malformed tags).
- Test coverage: Zero.

**Dashboard markdown parser (`dashboard/internal/data/career.go`):**
- Files: `dashboard/internal/data/career.go` (736 lines)
- Why fragile: Huge file driven by brittle regexes (`reArchetype`, `reTlDr`, `reRemote`) hard-coded for Spanish labels. English/other-language reports yield blank dashboard fields.
- Safe modification: Only change what you have tests for; the only dashboard test is `dashboard/internal/ui/screens/pipeline_test.go` (96 lines, UI only).
- Test coverage: Zero for the parser itself.

**`scan.mjs` anchors on Spanish headings:**
- Files: `scan.mjs:194-215`
- Why fragile: Looks for literal `## Pendientes` / `## Procesadas`. Translated `pipeline.md` files silently fall back to appending at the end.
- Safe modification: Support a stable HTML-comment anchor (`<!-- scan:pending -->`).

**`analyze-patterns.mjs` silent row drops:**
- Files: `analyze-patterns.mjs:62-79`
- Why fragile: Rows with `parts.length < 9` are silently skipped — any cell containing `|` drops the row without a warning.
- Safe modification: Escape or reject pipes at write time in `merge-tracker.mjs`; log skips.

## Scaling Limits

**`scan.mjs` concurrency constant:**
- Current capacity: `CONCURRENCY = 10` (`scan.mjs:32`).
- Limit: Hard-coded, not configurable.
- Scaling path: Move to `config/profile.yml → scan.concurrency`.

**`batch-runner.sh` full-rewrite state file:**
- Current capacity: `update_state_unlocked` rewrites all of `batch-state.tsv` on every update (`batch-runner.sh:254-286`).
- Limit: Linear per-update; locking serializes writes so `--parallel` ≥ ~5 becomes write-bound.
- Scaling path: Append-only log + periodic compaction, or SQLite.

**Markdown tracker as primary store:**
- Current capacity: Works for hundreds of entries.
- Limit: Every script re-parses the full `applications.md`.
- Scaling path: Cache parsed form in `data/applications.jsonl`, regenerate markdown for humans/dashboard.

## Dependencies at Risk

**Only two production deps, no dev deps:**
- Risk: `package.json:33-36` lists only `playwright` and `js-yaml`. No test framework.
- Impact: No easy path to add fast isolated tests for fragile parsers.
- Migration plan: Add `node:test` (built-in) or `vitest` as devDependency.

**Playwright browsers installed implicitly:**
- Risk: `generate-pdf.mjs` and `check-liveness.mjs` require `npx playwright install chromium`; `doctor.mjs:44-63` checks but doesn't auto-install.
- Impact: Silent failures in batch mode where `doctor.mjs` isn't run.
- Migration plan: Add `postinstall` script (with CI opt-out).

**Go toolchain pinned high:**
- Risk: `dashboard/go.mod:3` pins `go 1.24.2`.
- Impact: Distro-packaged Go installs can't build the dashboard.
- Migration plan: Lower minimum if feasible; document exact install in `CONTRIBUTING.md`.

## Missing Critical Features

**No structured error reporting from batch workers:**
- Problem: `batch/batch-runner.sh:389-393` captures only the last 5 log lines as `error_msg`. No machine-readable failure categories.
- Blocks: Automated retry triage, health dashboards.

**No dry-run/plan for `update-system.mjs apply`:**
- Problem: `check` shows the remote version but no `plan` command lists which files would change.
- Blocks: Informed consent before system-layer updates.

**No CI regression test for portal API shapes:**
- Problem: `scan.mjs` parsers (`parseGreenhouse/parseAshby/parseLever`) are not exercised with recorded fixtures.
- Blocks: Catching Greenhouse/Ashby/Lever schema drift.

## Test Coverage Gaps

**`generate-pdf.mjs`:**
- Not tested: `normalizeTextForATS()`, font-path rewriting (`generate-pdf.mjs:117-125`), page counting heuristic (line 167).
- Files: `generate-pdf.mjs`
- Risk: ATS parsing failures (the entire reason the function exists) regress silently.
- Priority: High.

**`merge-tracker.mjs`:**
- Not tested: Column-order heuristic (`merge-tracker.mjs:141-163`), fuzzy company+role dedup (lines 70-79), score-based in-place update (lines 269-284).
- Files: `merge-tracker.mjs`
- Risk: Tracker corruption.
- Priority: High.

**`liveness-core.mjs`:**
- Not tested: All classification branches (`liveness-core.mjs:46-75`).
- Files: `liveness-core.mjs`
- Risk: False "expired" classifications cause the pipeline to skip live postings.
- Priority: High.

**`scan.mjs` parsers and dedup:**
- Not tested: `parseGreenhouse/parseAshby/parseLever` (lines 77-105), `buildTitleFilter` (125-135), `loadSeenUrls`/`loadSeenCompanyRoles` (139-184).
- Files: `scan.mjs`
- Risk: Silent drift when portals change shape.
- Priority: Medium.

**`analyze-patterns.mjs`:**
- Not tested: Report parsing (82-169), remote/company-size classification (172-199), blocker extraction (202-211).
- Files: `analyze-patterns.mjs`
- Risk: Misleading pattern insights drive bad targeting.
- Priority: Medium.

**`dashboard/internal/data/career.go`:**
- Not tested: The entire 736-line parser. Only `pipeline_test.go` (96 lines, UI only) exists.
- Files: `dashboard/internal/data/career.go`
- Risk: Dashboard shows blank/wrong fields after any report-format change.
- Priority: Medium.

**`update-system.mjs`:**
- Not tested: Safety-violation detection, backup branch creation, rollback path.
- Files: `update-system.mjs`
- Risk: Auto-updater corrupts user layer without detection.
- Priority: High — this is the one script explicitly entrusted with not touching user data.

**`batch/batch-runner.sh`:**
- Not tested: Entire file. No shellcheck/bats in `test-all.mjs`.
- Files: `batch/batch-runner.sh`
- Risk: Undetected concurrency bugs (state-file races, lock leaks).
- Priority: Medium.

---

*Concerns audit: 2026-04-19*
