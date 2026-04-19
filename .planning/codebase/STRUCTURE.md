# Codebase Structure

**Analysis Date:** 2026-04-19

## Directory Layout

```
career-ops/
├── .claude/skills/career-ops/   # Claude Code skill + router (SKILL.md)
├── .opencode/commands/          # OpenCode slash-command wrappers
├── .gemini/commands/            # Gemini CLI command definitions (*.toml)
├── .github/                     # workflows, ISSUE_TEMPLATE
├── .planning/codebase/          # GSD codebase maps (this tree)
├── batch/                       # Batch orchestrator
│   ├── batch-runner.sh          # Bash orchestrator
│   ├── batch-prompt.md          # Worker prompt template with {{placeholders}}
│   ├── README.md
│   ├── logs/                    # Per-offer worker logs (gitignored)
│   └── tracker-additions/       # TSV drop-box merged by merge-tracker.mjs
├── config/
│   ├── profile.example.yml      # Template for user identity/targets
│   └── profile.yml              # User identity/targets (User Layer)
├── dashboard/                   # Go Bubble Tea TUI
│   ├── main.go
│   ├── go.mod / go.sum
│   └── internal/
│       ├── data/career.go       # applications.md parser, metrics
│       ├── model/career.go      # domain types
│       ├── theme/               # catppuccin_latte.go, catppuccin.go, theme.go
│       └── ui/screens/          # pipeline.go, progress.go, viewer.go, pipeline_test.go
├── data/                        # User data (gitignored content)
│   ├── applications.md          # Canonical tracker
│   ├── pipeline.md              # URL inbox
│   ├── scan-history.tsv         # Scanner dedup
│   └── follow-ups.md
├── docs/                        # ARCHITECTURE.md, SETUP.md, SCRIPTS.md, CUSTOMIZATION.md, CODEX.md
├── examples/                    # cv-example.md, sample-report.md, article-digest-example.md, dual-track-engineer-instructor/
├── fonts/                       # DM Sans + Space Grotesk .woff2
├── interview-prep/              # story-bank.md + {company}-{role}.md
├── jds/                         # Saved JD text files
├── modes/                       # Agent prompts (English defaults)
│   ├── _shared.md               # System rules + scoring
│   ├── _profile.template.md     # Template copied to _profile.md at onboarding
│   ├── {oferta,ofertas,apply,auto-pipeline,batch,contacto,deep,followup,interview-prep,patterns,pdf,pipeline,project,scan,tracker,training}.md
│   └── {de,fr,ja,pt,ru}/        # Translated mirrors
├── output/                      # Generated PDFs (gitignored)
├── reports/                     # {###}-{slug}-{YYYY-MM-DD}.md evaluations
├── templates/
│   ├── cv-template.html         # HTML used by generate-pdf.mjs
│   ├── cv-template.tex          # LaTeX/Overleaf template
│   ├── portals.example.yml      # Template for portals.yml
│   ├── states.yml               # Canonical status vocabulary
│   └── README.md
├── node_modules/                # Node deps (js-yaml, playwright)
├── *.mjs                        # Utility scripts
├── cv.md                        # Canonical CV (User Layer)
├── article-digest.md            # Proof points (User Layer, optional)
├── portals.yml                  # Scanner config (User Layer)
├── package.json / package-lock.json
├── flake.nix / flake.lock / .envrc  # Nix dev shell
├── AGENTS.md / CLAUDE.md / GEMINI.md   # Agent instructions
├── DATA_CONTRACT.md             # User vs System layer definition
├── VERSION                      # Semver string
├── .release-please-manifest.json
├── README.md + README.{es,ja,ko-KR,pt-BR,ru,zh-TW}.md
└── CHANGELOG.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md, GOVERNANCE.md, SECURITY.md, SUPPORT.md, LEGAL_DISCLAIMER.md, CITATION.cff, LICENSE
```

## Directory Purposes

- **`modes/`:** Agent prompt instructions. One file per user-invocable capability. `_shared.md` is loaded first; `_profile.md` holds user customizations; language subdirectories mirror the English defaults.
- **`.claude/skills/career-ops/`:** Claude Code skill definition; `SKILL.md` is the dispatcher consulted by the agent runtime.
- **`.opencode/commands/`:** OpenCode slash-command shims — same dispatching as `SKILL.md`.
- **`.gemini/commands/`:** Gemini CLI commands defined in TOML; project context auto-loaded from `GEMINI.md`.
- **`batch/`:** Parallel processing. `batch-runner.sh` is the orchestrator, `batch-prompt.md` is the worker system prompt, `tracker-additions/` is the drop-box for output TSVs, `logs/` captures per-worker output.
- **`config/`:** YAML configuration for the user profile. Only `profile.example.yml` is committed by default.
- **`dashboard/`:** Go TUI. Standard Go layout with `internal/{data,model,theme,ui/screens}/`.
- **`data/`:** Persistent user data written by scripts and the agent (tracker, pipeline inbox, scan history, follow-ups). User Layer.
- **`docs/`:** Human-facing documentation and images.
- **`examples/`:** Shipped example CVs, reports, digests — used during onboarding.
- **`fonts/`:** Self-hosted woff2 fonts for the CV HTML template.
- **`interview-prep/`:** User-owned story bank and per-company interview intel files.
- **`jds/`:** Raw JD text files saved from pipeline processing.
- **`output/`:** Generated PDFs; gitignored.
- **`reports/`:** Evaluation markdown files; User Layer.
- **`templates/`:** Fixed assets used by scripts and onboarding.

## Key File Locations

- **Entry points:**
  - `.claude/skills/career-ops/SKILL.md` (Claude Code skill router)
  - `.opencode/commands/career-ops.md` (OpenCode router)
  - `.gemini/commands/*.toml` (Gemini CLI commands)
  - `batch/batch-runner.sh` (batch CLI)
  - `dashboard/main.go` (TUI)
  - Root `.mjs` files (individual CLIs, see `package.json` scripts)
- **Configuration:**
  - `config/profile.yml` (identity/targets)
  - `portals.yml` (scanner config)
  - `package.json` (npm scripts; `doctor`, `verify`, `normalize`, `dedup`, `merge`, `pdf`, `sync-check`, `update:check`, `update`, `rollback`, `liveness`, `scan`)
  - `templates/states.yml` (canonical state vocabulary)
  - `templates/cv-template.html`, `templates/cv-template.tex` (CV render targets)
  - `flake.nix`, `.envrc`, `.coderabbit.yaml`, `renovate.json`
- **Core logic:**
  - `scan.mjs`, `generate-pdf.mjs`, `generate-latex.mjs`, `merge-tracker.mjs`, `verify-pipeline.mjs`, `normalize-statuses.mjs`, `dedup-tracker.mjs`, `analyze-patterns.mjs`, `followup-cadence.mjs`, `check-liveness.mjs`, `liveness-core.mjs`, `update-system.mjs`, `cv-sync-check.mjs`, `doctor.mjs`
  - `modes/_shared.md` (scoring), `modes/oferta.md` (evaluation rubric), `modes/auto-pipeline.md` (end-to-end orchestration prompt)
  - `batch/batch-runner.sh`, `batch/batch-prompt.md`
  - `dashboard/internal/data/career.go` (tracker parser), `dashboard/internal/ui/screens/pipeline.go`
- **Testing:**
  - `test-all.mjs` (63+ integrity checks driven by `.github/workflows/test.yml`)
  - `dashboard/internal/ui/screens/pipeline_test.go` (Go tests)

## Naming Conventions

- **Files:**
  - Node scripts: `kebab-case.mjs` (`merge-tracker.mjs`, `verify-pipeline.mjs`).
  - Mode prompts: lowercase single-word nouns/verbs matching the slash-command (`oferta.md`, `scan.md`, `auto-pipeline.md`).
  - Reports: `{###}-{company-slug}-{YYYY-MM-DD}.md` — 3-digit zero-padded monotonic number, lowercase-hyphen company slug, ISO date.
  - Tracker TSVs: `batch/tracker-additions/{num}-{company-slug}.tsv` — same num as the report.
  - Batch logs: `batch/logs/{report_num}-{id}.log`.
  - Generated PDFs: `output/{slug}.pdf`.
  - Docs: `UPPERCASE.md` for top-level (`README.md`, `CLAUDE.md`, `AGENTS.md`, `CHANGELOG.md`, `DATA_CONTRACT.md`, `CONTRIBUTING.md`, etc.).
  - Go: standard `snake_case.go` for source, `*_test.go` for tests.
- **Directories:**
  - Short lowercase single-word names (`modes/`, `batch/`, `reports/`, `dashboard/`).
  - Language mirrors under `modes/`: ISO 639-1 two-letter codes (`modes/de/`, `modes/fr/`, `modes/ja/`, `modes/pt/`, `modes/ru/`).
  - Go internal packages under `dashboard/internal/{data,model,theme,ui}/`.

## Where to Add New Code

- **New agent capability / mode:**
  - Prompt file: `modes/{name}.md` (mirror under each language tree if relevant).
  - Router entry: add row to the dispatch tables in `.claude/skills/career-ops/SKILL.md` and add a corresponding `.opencode/commands/career-ops-{name}.md` and `.gemini/commands/{name}.toml`.
  - Update `CLAUDE.md` / `GEMINI.md` "Skill Modes" and "Main Files" tables.
- **New deterministic script:**
  - File: `{name}.mjs` at project root (ESM, shebang `#!/usr/bin/env node`).
  - Expose via `package.json` `"scripts"` key.
  - If it reads/writes tracker data, respect the column order in `merge-tracker.mjs` and the canonical states in `templates/states.yml`.
- **New portal integration:**
  - Add detection branch in `scan.mjs` `detectApi()`.
  - Add parser beside `parseGreenhouse` (e.g., `parseAshby`, `parseLever`).
  - Document env vars or auth requirements in the relevant `modes/*.md` and `CLAUDE.md`.
- **New dashboard screen:**
  - Go file under `dashboard/internal/ui/screens/{name}.go` implementing `tea.Model`.
  - Wire in `dashboard/main.go` alongside `viewPipeline | viewReport | viewProgress`.
  - Add tests as `{name}_test.go`.
- **New template asset:**
  - Place under `templates/` (e.g., `templates/{name}.html`).
  - If user-customizable, ship a `*.example.*` copy and let onboarding in `CLAUDE.md` copy to the active path.
- **New language variant:**
  - Create `modes/{lang}/` and translate `_shared.md` plus the minimum set (`pipeline.md`, the evaluate mode renamed per language, and an apply-equivalent).
  - Add a README under that directory and document activation via `config/profile.yml` `language.modes_dir`.
- **Fixtures / test assets:** `examples/` for documentation-oriented fixtures, inline test data inside `test-all.mjs` for integrity tests.

## Special Directories

- **`node_modules/`:** npm deps. Generated. Not committed.
- **`output/`:** generated PDFs. Gitignored. Created by `generate-pdf.mjs` if missing.
- **`batch/logs/` and `batch/tracker-additions/merged/`:** generated state. Gitignored. Created at runtime.
- **`reports/`, `data/`, `jds/`, `interview-prep/`:** User Layer content. Present and committed in the user's working tree, but untouched by `update-system.mjs`.
- **`.planning/codebase/`:** GSD artifact directory (this map). Written by mapping agents.
- **`fonts/`:** self-hosted fonts — must ship with the repo because the HTML template references them via `file://` / relative paths at PDF render time.
- **`flake.nix` + `.envrc`:** Nix dev shell for reproducible tooling.
