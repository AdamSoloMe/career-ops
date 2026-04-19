# Coding Conventions

**Analysis Date:** 2026-04-19

## Naming Patterns

**Files:**
- Node.js scripts: kebab-case with `.mjs` extension. Examples: `scan.mjs`, `merge-tracker.mjs`, `verify-pipeline.mjs`, `check-liveness.mjs`, `liveness-core.mjs`, `followup-cadence.mjs`, `analyze-patterns.mjs`.
- Utility/core modules: `{domain}-core.mjs` (e.g., `liveness-core.mjs`) when the logic is shared across multiple entry-point scripts.
- Go files: lowercase `snake_case`/single-word under `dashboard/internal/{pkg}/` (e.g., `dashboard/internal/data/career.go`, `dashboard/internal/model/career.go`).
- Go tests: `{name}_test.go` co-located beside implementation (e.g., `dashboard/internal/ui/screens/pipeline_test.go`).
- Markdown modes: lowercase, no dashes where possible (e.g., `modes/oferta.md`, `modes/auto-pipeline.md`). Profile/user override: `modes/_profile.md` and template `modes/_profile.template.md` (leading underscore denotes shared/partial).
- Reports: `{###}-{company-slug}-{YYYY-MM-DD}.md` (3-digit zero-padded, sequential). Example: `reports/001-acme-2026-04-19.md`.
- Config: YAML with `.yml`. Templates alongside in `templates/`.

**Functions (JavaScript/Node):**
- `camelCase` (e.g., `classifyLiveness`, `detectApi`, `parseGreenhouse`, `validateStatus`, `normalizeStatus`, `classifyOutcome`, `hasApplyControl`).
- Small helpers co-located at module top (e.g., `firstMatch`, `pass`, `fail`, `warn`, `run` in `test-all.mjs`).

**Variables (JavaScript):**
- `camelCase` for locals (e.g., `leakFound`, `expiredBody`, `ashbyMatch`).
- `UPPER_SNAKE_CASE` for module-level constants and config paths (e.g., `PORTALS_PATH`, `SCAN_HISTORY_PATH`, `CONCURRENCY`, `FETCH_TIMEOUT_MS`, `MIN_CONTENT_CHARS`, `CANONICAL_STATES`, `STATUS_RANK`, `ROOT`, `QUICK`).
- Regex pattern arrays use `UPPER_SNAKE_CASE` with a descriptive suffix: `HARD_EXPIRED_PATTERNS`, `LISTING_PAGE_PATTERNS`, `APPLY_PATTERNS`, `EXPIRED_URL_PATTERNS` (see `liveness-core.mjs`).

**Types (Go):**
- `PascalCase` for exported types/fields (e.g., `PipelineModel`, `CareerApplication`, `PipelineMetrics`, `ProgressMetrics`, `ReportPath`).
- `camelCase` for unexported fields and locals (e.g., `sortMode`, `activeTab`, `viewMode`, `reportCache`, `viewState`, `appModel`).
- Test functions: `TestXxx` describing behavior (e.g., `TestWithReloadedDataPreservesStateAndSelection`, `TestRenderAppLineIncludesDateColumn`).

## Code Style

**Formatting:**
- No ESLint/Prettier/Biome configuration detected in the repo root. Style is enforced by convention and PR review rather than tooling.
- Indentation: 2 spaces for `.mjs` files, tabs for Go (standard `gofmt`).
- Single quotes in JavaScript string literals (e.g., `'data/pipeline.md'`).
- Trailing semicolons present in `.mjs` files.
- ES module syntax throughout (`.mjs` files, `import`/`export`, `import.meta.url`).

**Linting:**
- No JS linter. Go code relies on standard `go build` (enforced in CI via `dashboard && go build`).
- Syntax validation for every `.mjs` file happens in `test-all.mjs` via `node --check {file}`.

## Import Organization

**Order (Node `.mjs`):**
1. Node built-ins, destructured: `import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';`
2. Node built-ins for paths/URLs: `import { join, dirname } from 'path';` and `import { fileURLToPath, pathToFileURL } from 'url';`
3. Child process utilities: `import { execSync, execFileSync } from 'child_process';`
4. Third-party modules last: `import yaml from 'js-yaml';`

**Order (Go):**
1. Standard library (`flag`, `fmt`, `os`, `os/exec`, `runtime`, `strings`, `testing`).
2. Blank line.
3. Third-party (`tea "github.com/charmbracelet/bubbletea"`).
4. Blank line.
5. Internal packages (`github.com/santifer/career-ops/dashboard/internal/...`).

**Path Aliases:**
- No alias/path remapping. Node uses relative imports; Go uses full module paths under `github.com/santifer/career-ops/dashboard/...`.

## Error Handling

**Patterns:**
- Scripts wrap dangerous calls and return `null` on failure instead of throwing, enabling graceful fallbacks. See `run()` in `test-all.mjs`:
  ```js
  function run(cmd, args = [], opts = {}) {
    try {
      return execFileSync(cmd, args, { cwd: ROOT, encoding: 'utf-8', timeout: 30000, ...opts }).trim();
    } catch (e) { return null; }
  }
  ```
- Missing-file resilience: always check `existsSync()` before `readFileSync()` (documented in `CONTRIBUTING.md`). Example (`merge-tracker.mjs`):
  ```js
  const APPS_FILE = existsSync(join(CAREER_OPS, 'data/applications.md'))
    ? join(CAREER_OPS, 'data/applications.md')
    : join(CAREER_OPS, 'applications.md');
  ```
- Fresh-setup safety: scripts `mkdirSync(..., { recursive: true })` for required dirs before use (`scan.mjs`, `merge-tracker.mjs`, `verify-pipeline.mjs`, `dedup-tracker.mjs`).
- Exit codes used intentionally: `process.exit(1)` on hard failure (see end of `test-all.mjs`), `process.exit(0)` on warnings.
- Classification functions return `{ result, reason }` objects instead of throwing, letting callers branch safely (`classifyLiveness` in `liveness-core.mjs`).

## Logging

**Framework:** Plain `console.log` (no logger dependency).

**Patterns:**
- Emoji-prefixed status lines in scripts:
  - Pass: `✅`, Fail: `❌`, Warn: `⚠️` (see `test-all.mjs` helpers `pass`/`fail`/`warn`).
  - Headers use `🧪`, `🔴`, `🟡`, `🟢`, `📊`.
- Section separators as commented banners: `// ── 1. SYNTAX CHECKS ────────────────────────`.
- CLI-facing scripts start with a blank `console.log('\n🧪 ...\n')` header and end with `=`-line separator + summary.
- Scripts that produce machine-readable output (`update-system.mjs check`, `analyze-patterns.mjs --summary`, `followup-cadence.mjs`) emit JSON to stdout; status/diagnostic messages stay in stderr or are omitted.

## Comments

**When to Comment:**
- File headers are MANDATORY. Every `.mjs` starts with a JSDoc-style block explaining purpose, behavior, and usage:
  ```js
  /**
   * scan.mjs — Zero-token portal scanner
   *
   * Fetches Greenhouse, Ashby, and Lever APIs directly, applies title
   * filters from portals.yml, deduplicates against existing history,
   * and appends new offers to pipeline.md + scan-history.tsv.
   *
   * Usage:
   *   node scan.mjs
   *   node scan.mjs --dry-run
   *   node scan.mjs --company Cohere
   */
  ```
- Section banners inside files: `// ── Config ────────────────────────`, `// ── API detection ────────────────`, `// ── API parsers ────────────────`.
- Inline explanations focus on WHY, not WHAT (e.g., the long explanation in `test-all.mjs` about why `git grep` is used instead of `grep -rn`).

**JSDoc/TSDoc:**
- No formal JSDoc type annotations. Block comments are prose documentation only.

## Function Design

**Size:** Small, single-purpose (typically < 40 lines). `classifyLiveness` in `liveness-core.mjs` is ~30 lines and returns a discriminated object.

**Parameters:**
- Destructured options objects with defaults are the norm for anything with more than 2 inputs:
  ```js
  export function classifyLiveness({ status = 0, finalUrl = '', bodyText = '', applyControls = [] } = {}) { ... }
  ```
- Positional args only for simple 1–2-parameter helpers (`firstMatch(patterns, text)`, `fileExists(path)`).

**Return Values:**
- Classification/validation functions return `{ result, reason }` or the normalized value on success / `null` on miss (see `validateStatus` in `merge-tracker.mjs`).
- CLI entry points do not return; they print and `process.exit(code)`.

## Module Design

**Exports:**
- Named exports only (`export function classifyLiveness(...)`). No default exports in internal modules.
- Entry-point scripts export nothing — they run top-level code on import and are invoked via `node {file}`.

**Barrel Files:**
- Not used. Each script is self-contained.

**Shared Logic:**
- Cross-script logic lives in `{domain}-core.mjs` modules (only `liveness-core.mjs` today). Entry-point scripts (`check-liveness.mjs`, `scan.mjs`) import from these cores.

## Project-Specific Conventions

**CLI flag parsing:**
- Uses raw `process.argv.includes('--flag')` checks — no `yargs`/`commander`. Examples: `--dry-run`, `--verify`, `--quick`, `--summary`, `--company`, `--min-threshold`.

**Paths:**
- Scripts resolve their own location via `dirname(fileURLToPath(import.meta.url))` and build everything from `CAREER_OPS` / `ROOT` — never `process.cwd()`, never hardcoded absolute paths. Enforced by `test-all.mjs` "Absolute path check".

**Data-contract awareness:**
- Any file touching the tracker honors the split in `DATA_CONTRACT.md`: user-layer files (`cv.md`, `config/profile.yml`, `modes/_profile.md`, `portals.yml`, `data/*`, `reports/*`) are never overwritten by system scripts.

**Canonical statuses:**
- Status strings MUST match `templates/states.yml` (`Evaluated`, `Applied`, `Responded`, `Interview`, `Offer`, `Rejected`, `Discarded`, `SKIP`). Non-canonical statuses are aliased via a dictionary (see `CANONICAL_STATES` + `aliases` in `merge-tracker.mjs` lines 37–60 and the parallel `ALIASES` in `verify-pipeline.mjs`).

**TSV for tracker additions:**
- Never edit `data/applications.md` to add rows. Write a 9-column tab-separated file to `batch/tracker-additions/{num}-{slug}.tsv` and run `node merge-tracker.mjs`. Column order: num, date, company, role, status, score, pdf, report, notes.

---

*Convention analysis: 2026-04-19*
