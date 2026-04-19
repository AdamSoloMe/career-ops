# Testing

**Analysis Date:** 2026-04-19

## Test Framework

- **Primary harness:** custom Node ESM script `test-all.mjs` at the project root. No external test framework (no `vitest`, `mocha`, or `node:test`); uses plain `console.log` + `pass()/fail()/warn()` counters.
- **Go tests:** standard `testing` package in the dashboard module — `dashboard/internal/ui/screens/pipeline_test.go`.
- **CI driver:** `.github/workflows/test.yml` runs `node test-all.mjs` on every PR.
- **Entry commands:**
  - `node test-all.mjs` — full run (includes dashboard build).
  - `node test-all.mjs --quick` — skip the Go dashboard build.
  - `go test ./...` inside `dashboard/` for Go tests.

## Test Structure

`test-all.mjs` runs seven categorical sections (~63+ checks total):

1. **Syntax checks** — `node --check` on every root `.mjs` file (auto-discovered via `readdirSync`).
2. **Script execution (graceful on empty data)** — each core script (`verify-pipeline.mjs`, `normalize-statuses.mjs`, `dedup-tracker.mjs`, `merge-tracker.mjs`, `update-system.mjs check`) must exit cleanly with an unpopulated repo. `cv-sync-check.mjs` is allowed to fail.
3. **Dashboard** — `go build ./dashboard` (skipped with `--quick`).
4. **Data contract** — presence + layout of `DATA_CONTRACT.md`, `templates/states.yml`, `config/profile.example.yml`, `templates/portals.example.yml`.
5. **Personal data leak guard** — greps tracked files for user-identifying strings that must never be committed.
6. **Path / reference integrity** — verifies slash-command files reference existing mode files; reports reference existing templates.
7. **Version / changelog consistency** — `VERSION`, `.release-please-manifest.json`, `package.json`.

The harness increments three counters and exits non-zero if `failed > 0`. Warnings do not fail the run.

### Go tests

- `dashboard/internal/ui/screens/pipeline_test.go` (~96 lines) — covers the Bubble Tea pipeline screen view logic only.
- No tests for `dashboard/internal/data/career.go` (the 736-line markdown parser) or `dashboard/internal/model/career.go`.

## Mocking Patterns

- **No mocks.** Tests are integration-style: they execute scripts end-to-end against a clean repo state.
- Scripts are designed to be idempotent and safe on empty inputs (most read `data/applications.md` and no-op when absent).
- Network calls (Playwright, Greenhouse/Ashby/Lever APIs, `update-system.mjs` remote fetch) are **not** mocked and **not** exercised in CI. `scan.mjs`, `check-liveness.mjs`, `generate-pdf.mjs` are syntax-checked only.
- Go tests use Bubble Tea's built-in test helpers; no external mock libraries.

## Coverage

- **No coverage instrumentation.** No `c8`, `nyc`, or `-cover` flag usage in `package.json` scripts or CI.
- **Effective coverage (qualitative):**
  - High: syntax, script boot, data-contract file presence, version consistency.
  - Low: business logic inside each script (parsing, dedup, status normalization, ATS text normalization, HTML→PDF rendering, portal API shape drift).
  - Zero: `generate-pdf.mjs:normalizeTextForATS`, `merge-tracker.mjs` column-swap heuristic, `liveness-core.mjs` classification branches, `dashboard/internal/data/career.go` regex parsers, `batch/batch-runner.sh` (no shellcheck/bats).

See `.planning/codebase/CONCERNS.md` → "Test Coverage Gaps" for the prioritized list.

## Running Tests

```bash
# Full suite (runs in CI)
node test-all.mjs

# Skip Go dashboard build
node test-all.mjs --quick

# Go tests only
cd dashboard && go test ./...

# Individual integrity checks
node verify-pipeline.mjs
node doctor.mjs
```

## CI Integration

- **Trigger:** `.github/workflows/test.yml` on pull_request and push.
- **Matrix:** single Node version (see workflow), Ubuntu runner.
- **Other workflows** in `.github/workflows/`: `codeql.yml`, `dependency-review.yml`, `labeler.yml`, `release.yml` (release-please), `sbom.yml`, `stale.yml`, `welcome.yml`.
- **Branch protection:** `main` requires `test-all.mjs` to pass before merge (per `CLAUDE.md`).
- **Dependabot:** monitors npm, Go modules, GitHub Actions.

## Gaps

- No unit test framework in `devDependencies`. Adding `node:test` (built-in, zero-dep) is the lowest-friction path.
- No fixture corpus for portal API responses (`scan.mjs`) — Greenhouse/Ashby/Lever schema drift would silently break production scans before CI catches it.
- No property / adversarial tests for `generate-pdf.mjs:normalizeTextForATS` (NUL byte masking edge cases).
- No tests for `update-system.mjs` safety-violation detection — the one script explicitly entrusted with not touching user-layer files.
- No shellcheck / bats for `batch/batch-runner.sh` (597 lines).
