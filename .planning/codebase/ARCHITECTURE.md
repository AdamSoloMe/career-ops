# Codebase Architecture

**Analysis Date:** 2026-04-19

## Pattern Overview

- Overall: Agent-driven pipeline with polyglot utilities. An LLM agent (Claude Code / OpenCode / Gemini CLI) reads prompt files under `modes/` and invokes Node `.mjs` scripts, a Bash batch runner, and a Go TUI as tools.
- Key characteristics:
  - Prompt-as-code: behavior lives in markdown under `modes/`
  - Two-layer Data Contract (`DATA_CONTRACT.md`): user-owned vs system-owned files
  - Stateless flat-file scripts (Markdown, TSV, YAML); no DB or server
  - Single source of truth per concern: `cv.md`, `data/applications.md`, `portals.yml`, `templates/states.yml`
  - Batch fan-out via `claude -p` headless workers with file-based locking in `batch/batch-runner.sh`
  - Secondary Go TUI reads the same files the agent writes

## Layers

- **Agent instruction layer:** `modes/_shared.md`, `modes/_profile.template.md`, per-mode files (`oferta.md`, `apply.md`, `scan.md`, `batch.md`, `pdf.md`, `auto-pipeline.md`, `contacto.md`, `deep.md`, `ofertas.md`, `pipeline.md`, `project.md`, `tracker.md`, `training.md`, `patterns.md`, `followup.md`, `interview-prep.md`), plus translated trees `modes/{de,fr,ja,pt,ru}/`.
- **Agent command/skill layer:** `.claude/skills/career-ops/SKILL.md` routes to mode files; `.opencode/commands/career-ops*.md` and `.gemini/commands/*.toml` mirror the same dispatch.
- **Utility script layer (Node ESM):** root-level `*.mjs` — `scan.mjs`, `generate-pdf.mjs`, `generate-latex.mjs`, `merge-tracker.mjs`, `verify-pipeline.mjs`, `normalize-statuses.mjs`, `dedup-tracker.mjs`, `followup-cadence.mjs`, `analyze-patterns.mjs`, `check-liveness.mjs`, `liveness-core.mjs`, `update-system.mjs`, `cv-sync-check.mjs`, `doctor.mjs`, `test-all.mjs`.
- **Batch orchestration layer:** `batch/batch-runner.sh`, `batch/batch-prompt.md`; state in `batch/batch-state.tsv`; logs in `batch/logs/`; TSV drop-box in `batch/tracker-additions/`.
- **Dashboard layer (Go TUI):** `dashboard/main.go`, `dashboard/internal/data/career.go`, `dashboard/internal/model/career.go`, `dashboard/internal/ui/screens/{pipeline,progress,viewer}.go`, `dashboard/internal/theme/*.go`; built on Bubble Tea + Lipgloss (`dashboard/go.mod`).
- **Data / content layer:** `cv.md`, `article-digest.md`, `config/profile.yml`, `portals.yml`, `data/applications.md`, `data/pipeline.md`, `data/scan-history.tsv`, `data/follow-ups.md`, `reports/`, `output/`, `jds/`, `interview-prep/`.
- **Template layer:** `templates/cv-template.html`, `templates/cv-template.tex`, `templates/portals.example.yml`, `templates/states.yml`, `config/profile.example.yml`, `modes/_profile.template.md`, `fonts/*.woff2`.

## Data Flow

- **Single-offer evaluation (auto-pipeline):** user pastes JD → router in `.claude/skills/career-ops/SKILL.md` picks `modes/auto-pipeline.md` → extract JD via Playwright MCP (fallback WebFetch) → read `cv.md` + `article-digest.md` + `config/profile.yml` + `modes/_profile.md` + `modes/_shared.md` + `modes/oferta.md` → write `reports/{###}-{slug}-{YYYY-MM-DD}.md` → generate HTML from `templates/cv-template.html` → `node generate-pdf.mjs` → PDF in `output/` → TSV in `batch/tracker-additions/` → `node merge-tracker.mjs` rewrites `data/applications.md` → optional `node verify-pipeline.mjs`.
- **Portal scan:** `node scan.mjs` reads `portals.yml`, `detectApi()` classifies as Greenhouse / Ashby / Lever / Greenhouse-EU, fetches JSON with concurrency 10 and 10 s timeout, filters by `title_filter.positive`/`negative`, dedupes against `data/scan-history.tsv`, appends to `data/pipeline.md`.
- **Batch:** `batch/batch-runner.sh` reads `batch/batch-input.tsv`, acquires `batch/batch-runner.pid` lock, initializes `batch/batch-state.tsv`, renders `batch/batch-prompt.md` with placeholders (`{{URL}}`, `{{JD_FILE}}`, `{{REPORT_NUM}}`, `{{DATE}}`, `{{ID}}`), spawns `claude -p --dangerously-skip-permissions --append-system-prompt-file ...` workers, records state under `batch/.batch-state.lock/` directory-mutex, then runs `merge-tracker.mjs` and `verify-pipeline.mjs`.
- **State management:** all on disk. Tracker → `data/applications.md`. Batch → `batch/batch-state.tsv` with directory-mutex. Scanner → `data/scan-history.tsv`. Updates → markers handled by `update-system.mjs`. Canonical statuses in `templates/states.yml`.

## Key Abstractions

- **Mode:** markdown prompt file in `modes/` (examples: `modes/oferta.md`, `modes/scan.md`, `modes/auto-pipeline.md`). Agent reads `_shared.md` → `_profile.md` → specific mode file.
- **Report:** `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`, 3-digit zero-padded sequential, header includes `**URL:**`, `**Score:**`, `**Legitimacy:**`; Blocks A–F plus Block G legitimacy from `modes/oferta.md`.
- **Tracker entry:** one markdown-table row in `data/applications.md`; written as 9-column TSV in `batch/tracker-additions/{num}-{slug}.tsv` (num, date, company, role, status, score, pdf, report, notes). `merge-tracker.mjs` swaps status↔score into the markdown-table column order.
- **Canonical status:** from `templates/states.yml` — `Evaluated | Applied | Responded | Interview | Offer | Rejected | Discarded | SKIP`. Enforced by `merge-tracker.mjs` and `verify-pipeline.mjs`.
- **Archetype:** role classifier used for North Star scoring. Scoring mechanism in `modes/_shared.md`; user archetypes in `modes/_profile.md` / `config/profile.yml`.
- **Portal:** entry in `portals.yml` with `name`, `careers_url`, optional `api`, `title_filter.{positive,negative}`.

## Entry Points

- `.claude/skills/career-ops/SKILL.md` — `/career-ops` router in Claude Code.
- `.opencode/commands/career-ops.md` (and siblings) — OpenCode slash commands; dispatch to the same `modes/` files.
- `.gemini/commands/*.toml` — Gemini CLI command definitions.
- `batch/batch-runner.sh` — parallel batch orchestrator.
- `scan.mjs` — portal scanner (`npm run scan`).
- `generate-pdf.mjs` — Playwright Chromium HTML→PDF (`npm run pdf`).
- `merge-tracker.mjs` — TSV→markdown-table merger (`npm run merge`).
- `verify-pipeline.mjs` — integrity audit (`npm run verify`).
- `dashboard/main.go` — Bubble Tea TUI (`go run ./dashboard --path .`).
- `update-system.mjs` — update checker/applier (`npm run update:check`, `npm run update`, `npm run rollback`).
- `doctor.mjs`, `test-all.mjs` — setup validation and CI test harness (`.github/workflows/test.yml`).

## Error Handling

- Fail-loud scripts: non-zero exit, stderr messages.
- Agent fallbacks: Playwright → WebFetch → WebSearch → ask user (see `modes/auto-pipeline.md`).
- Bash runner: `set -euo pipefail`, `trap release_lock EXIT`, `mkdir` atomic directory-lock at `batch/.batch-state.lock/`, bounded `MAX_RETRIES`, per-offer log in `batch/logs/`.
- Integrity: `verify-pipeline.mjs` enforces status vocabulary, report-link existence, no duplicate company+role, drained `tracker-additions/`.
- Batch mode reports lacking Playwright verification are tagged `**Verification:** unconfirmed (batch mode)` per `CLAUDE.md`.

## Cross-Cutting Concerns

- **Logging:** plain stdout/stderr with emoji prefixes; batch per-offer logs in `batch/logs/{report_num}-{id}.log`.
- **Validation:** `verify-pipeline.mjs` is canonical; `merge-tracker.mjs` validates statuses against `templates/states.yml`.
- **Authentication:** none at app level; ATS APIs are public; `claude -p` inherits user's Claude credentials.
- **I18n:** parallel `modes/{de,fr,ja,pt,ru}/` trees; selected via `language.modes_dir` in `config/profile.yml`.
- **Update safety:** `update-system.mjs` respects `DATA_CONTRACT.md` (user vs system layer).
- **CI/CD:** `.github/workflows/{test,codeql,dependency-review,labeler,release,sbom,stale,welcome}.yml`.
