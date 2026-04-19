# External Integrations

**Analysis Date:** 2026-04-19

## APIs & External Services

**Job Board APIs (zero-token scanner in `scan.mjs`):**
- Greenhouse Job Boards API - Direct HTTP JSON fetch
  - Endpoint: `https://boards-api.greenhouse.io/v1/boards/{board}/jobs`
  - EU variant: `https://job-boards.eu.greenhouse.io/{board}`
  - SDK/Client: Native `fetch()` in `scan.mjs` (line 115)
  - Auth: None (public board API)
- Ashby Job Board API - Direct HTTP JSON fetch
  - Endpoint: `https://api.ashbyhq.com/posting-api/job-board/{org}?includeCompensation=true`
  - Detected via URL pattern `jobs.ashbyhq.com/{org}` in `scan.mjs`
  - Auth: None (public posting API)
- Lever Postings API - Direct HTTP JSON fetch
  - Endpoint: `https://api.lever.co/v0/postings/{company}`
  - Detected via URL pattern `jobs.lever.co/{company}` in `scan.mjs`
  - Auth: None (public API)

**GitHub API (in `update-system.mjs`):**
- `https://api.github.com/repos/santifer/career-ops/releases/latest` - Release metadata (line 28)
- `https://raw.githubusercontent.com/santifer/career-ops/main/VERSION` - Current canonical version (line 27)
- `https://github.com/santifer/career-ops.git` - Git clone source for self-update (line 26)
- Auth: None (public repo)

**Browser-Based Scraping (Playwright in `check-liveness.mjs`, `generate-pdf.mjs`):**
- Targets any job posting URL (Greenhouse, Ashby, Lever, Workday, company career pages)
- Used for liveness detection and JD verification per `CLAUDE.md` "Offer Verification — MANDATORY"
- No auth; respects target site ToS (see `LEGAL_DISCLAIMER.md`)

**LLM Provider (indirect, via Claude Code / OpenCode host):**
- Anthropic Claude - All LLM work happens through the Claude Code CLI subscription; career-ops never calls the Anthropic API directly
- Batch workers invoke `claude -p` subprocesses (see `batch/batch-runner.sh` and `CLAUDE.md` line 261)

**Optional Canva MCP (for visual CV generation):**
- Canva design referenced via `canva_resume_design_id` in `config/profile.yml` (commented example)
- Invoked via MCP (Model Context Protocol) from Claude Code host, not from Node scripts

## Data Storage

**Databases:**
- None. All state is file-based.

**File Storage:**
- Local filesystem only
  - Tracker: `data/applications.md`
  - Pipeline inbox: `data/pipeline.md`
  - Scan history (dedup): `data/scan-history.tsv`
  - Reports: `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`
  - Generated PDFs: `output/` (gitignored)
  - JDs: `jds/{file}` (gitignored)
  - Batch queue/state: `batch/batch-input.tsv`, `batch/batch-state.tsv`, `batch/tracker-additions/*.tsv`, `batch/logs/*`
  - Interview prep: `interview-prep/story-bank.md`, `interview-prep/{company}-{role}.md`
  - Follow-up tracking: `data/follow-ups.md`

**Caching:**
- `data/scan-history.tsv` - Dedup cache for scanner (prevents re-surfacing same postings)
- `.update-dismissed`, `.update-lock` - Update check dedup (gitignored)
- `.resolved-prompt-*` - Resolved prompt cache (gitignored)

## Authentication & Identity

**Auth Provider:**
- None. career-ops is a single-user local tool; no user accounts or login system.
- The user authenticates with Claude Code / OpenCode separately (those handle Anthropic auth).

**Secrets Handling:**
- `.gitignore` excludes `config/profile.yml` and `portals.yml` to prevent leaking personal data
- No API keys or tokens required by the project itself
- External service auth (Canva, Anthropic) is delegated to the host CLI (Claude Code / OpenCode / MCP servers)

## Monitoring & Observability

**Error Tracking:**
- None (local CLI tool)

**Logs:**
- Batch worker logs written to `batch/logs/` (gitignored)
- Scripts log to stdout/stderr with emoji-prefixed status lines (e.g., `✅`, `❌`, `📄`, `📊`)
- `doctor.mjs` script for self-diagnosis
- `verify-pipeline.mjs` for integrity checks
- `test-all.mjs` for 63+ consistency checks

## CI/CD & Deployment

**Hosting:**
- Not hosted. Distributed as a git repo that users clone and run locally.

**CI Pipeline (`.github/workflows/`):**
- `test.yml` - Tests on PR (Node 20, Go 1.22, runs `node test-all.mjs --quick`)
- `codeql.yml` - GitHub CodeQL security scanning
- `dependency-review.yml` - Dependabot/dependency review on PRs
- `labeler.yml` - Risk-based auto-labeling of PRs
- `release.yml` - Release-please automated releases
- `sbom.yml` - SBOM generation per release
- `stale.yml` - Stale issue/PR reaper
- `welcome.yml` - First-contributor welcome bot

**Release Automation:**
- release-please (`.release-please-manifest.json`, `VERSION` = `1.3.0`)
- Self-update delivered via `update-system.mjs` using git clone + selective file copy (only system-layer paths in `SYSTEM_PATHS` array)

## Environment Configuration

**Required env vars:**
- None required at runtime
- Playwright env vars set automatically by `flake.nix`:
  - `PLAYWRIGHT_BROWSERS_PATH`
  - `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=true`
  - `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1`

**Secrets location:**
- No secrets storage; project deliberately avoids API key requirements
- User personal data lives in `config/profile.yml` (gitignored)

## Webhooks & Callbacks

**Incoming:**
- None (local CLI, no server)

**Outgoing:**
- None (no webhook dispatch)

## Integration Flow Summary

1. **Scan** (`scan.mjs`) → HTTP GET to Greenhouse/Ashby/Lever JSON APIs → filter titles → append to `data/pipeline.md`
2. **Verify** (Playwright via `check-liveness.mjs`) → headless Chromium navigates URL → `liveness-core.mjs` classifies status
3. **Evaluate** (Claude Code/OpenCode) → reads `cv.md`, `modes/*.md`, profile → writes `reports/*.md`
4. **Generate PDF** (`generate-pdf.mjs`) → Playwright renders `templates/cv-template.html` → PDF in `output/`
5. **Update** (`update-system.mjs`) → GitHub API + raw content + git clone → selective file copy

---

*Integration audit: 2026-04-19*
