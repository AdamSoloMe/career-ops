# Technology Stack

**Analysis Date:** 2026-04-19

## Languages

**Primary:**
- JavaScript (Node.js ES Modules, `.mjs`) - All core automation scripts (`scan.mjs`, `generate-pdf.mjs`, `update-system.mjs`, `merge-tracker.mjs`, `verify-pipeline.mjs`, `normalize-statuses.mjs`, `dedup-tracker.mjs`, `check-liveness.mjs`, `followup-cadence.mjs`, `analyze-patterns.mjs`, `doctor.mjs`, `cv-sync-check.mjs`, `test-all.mjs`)
- Go 1.24.2 - TUI dashboard application (`dashboard/main.go` and `dashboard/internal/`)
- Bash - Batch orchestration (`batch/batch-runner.sh`)

**Secondary:**
- Markdown - Data storage (`data/applications.md`, `data/pipeline.md`), reports (`reports/*.md`), mode prompts (`modes/*.md`), CV (`cv.md`)
- YAML - Configuration (`portals.yml`, `config/profile.yml`, `templates/states.yml`)
- HTML/CSS - CV template (`templates/cv-template.html`)
- Nix - Reproducible dev shell (`flake.nix`, `flake.lock`)
- TSV - Tabular data (`data/scan-history.tsv`, `batch/tracker-additions/*.tsv`)

## Runtime

**Environment:**
- Node.js 20 (per `.github/workflows/test.yml`, CI uses `actions/setup-node@v6` with `node-version: '20'`)
- Go 1.22 (CI) / 1.24.2 (`dashboard/go.mod`)
- Bun (available via Nix devShell in `flake.nix`)

**Package Manager:**
- npm - Primary for Node deps
- Go modules - For dashboard (`dashboard/go.mod`, `dashboard/go.sum`)
- Lockfile: `package-lock.json` present (gitignored per `.gitignore` line 39); `bun.lock` is gitignored

**Version Management:**
- Nix flake (`flake.nix`) provides reproducible environment with `nodejs`, `bun`, `coreutils`, `playwright-driver.browsers`
- `.envrc` uses `direnv` + `nix-direnv` for automatic shell activation

## Frameworks

**Core (Node.js):**
- `playwright` ^1.58.1 - Headless Chromium for PDF generation (`generate-pdf.mjs`) and scraping/liveness checks (`check-liveness.mjs`)
- `js-yaml` ^4.1.1 - YAML parsing for config files (used in `scan.mjs`)

**Core (Go dashboard):**
- `github.com/charmbracelet/bubbletea` v1.3.10 - TUI framework (Elm-style architecture)
- `github.com/charmbracelet/lipgloss` v1.1.0 - Terminal styling
- `github.com/muesli/termenv` v0.16.0 - Terminal environment detection

**Testing:**
- Custom test harness (`test-all.mjs`) - 63+ checks, invoked via `node test-all.mjs --quick` in CI. No external test framework.

**Build/Dev:**
- Nix + flakelight - Reproducible dev environment (`flake.nix`)
- direnv - Auto-load dev shell (`.envrc`)

## Key Dependencies

**Critical (Node):**
- `playwright` ^1.58.1 - Mandatory for offer verification per `CLAUDE.md` "Offer Verification" section. Also renders CV PDFs.
- `js-yaml` ^4.1.1 - Parses `portals.yml` and `config/profile.yml`

**Critical (Go dashboard, indirect):**
- `github.com/charmbracelet/x/ansi`, `cellbuf`, `term` - Charm sub-libraries
- `github.com/mattn/go-isatty`, `go-runewidth` - Terminal detection
- `golang.org/x/sys`, `golang.org/x/text` - Go stdlib extensions

**Infrastructure:**
- Nix `playwright-driver.browsers` - System-provided browser binaries; `shellHook` in `flake.nix` auto-pins npm playwright version to match Nix-provided browser version

## Configuration

**Environment Variables:**
- `PLAYWRIGHT_BROWSERS_PATH` - Set by `flake.nix` to Nix-provided path
- `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true` - Set by `flake.nix`
- `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` - Set by `flake.nix` (browsers come from Nix)
- `DIRENV_WARN_TIMEOUT=2m` - Set in `.envrc`
- No `.env` file present by default; project does not read API keys from env (uses Claude Code subscription + public APIs)

**User Configuration (never overwritten by updates):**
- `config/profile.yml` - Candidate data, archetypes, narrative, compensation, location (template at `config/profile.example.yml`)
- `portals.yml` - Scanner config with company list and title filters (template at `templates/portals.example.yml`)
- `modes/_profile.md` - User customizations (template at `modes/_profile.template.md`)
- `cv.md` - Canonical CV (project root)
- `article-digest.md` - Proof points

**System Configuration (auto-updated):**
- `templates/states.yml` - Canonical application statuses
- `modes/*.md` - System prompts

**Build Config:**
- `package.json` - npm scripts: `doctor`, `verify`, `normalize`, `dedup`, `merge`, `pdf`, `sync-check`, `update:check`, `update`, `rollback`, `liveness`, `scan`
- `flake.nix` - Dev shell with Node, Bun, Playwright browsers
- `renovate.json` - Renovate bot config
- `.coderabbit.yaml` - CodeRabbit review config
- `.release-please-manifest.json` + `VERSION` (`1.3.0`) - Release automation

## Platform Requirements

**Development:**
- Node.js 20+ (CI baseline)
- Go 1.22+ (for dashboard build)
- Nix (optional, recommended via `flake.nix`)
- Claude Code CLI or OpenCode (consumes `.claude/skills/` and `.opencode/commands/`)
- Chromium (bundled by Playwright or provided via Nix)

**Production:**
- Not a deployed service — this is a local CLI toolkit run by individual users
- Distribution: cloned from `https://github.com/santifer/career-ops` with `update-system.mjs` for self-update
- Release automation via GitHub Actions (`release.yml`) and release-please

## CI/CD

**GitHub Actions workflows** (`.github/workflows/`):
- `test.yml` - Runs `node test-all.mjs --quick` on PRs to main
- `codeql.yml` - Security scanning
- `dependency-review.yml` - Dependency audit on PRs
- `labeler.yml` - Auto-labeling (risk-based)
- `release.yml` - release-please automation
- `sbom.yml` - SBOM generation
- `stale.yml` - Stale issue/PR management
- `welcome.yml` - First-contributor welcome bot

**Dependency Management:**
- Dependabot / Renovate (`renovate.json`) monitor npm, Go modules, GitHub Actions

---

*Stack analysis: 2026-04-19*
