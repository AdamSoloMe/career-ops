# Roadmap: career-ops High-Velocity Job Search Engine

**Project:** career-ops extension — Discovery + ATS Scoring + Contact Finder
**Created:** 2026-04-19
**Milestone:** v1
**Requirements coverage:** DISC-01–06, ATS-01–04, OUT-01–05 (15/15 v1 requirements)

---

## Phase 1: Enhanced Job Discovery

**Goal:** Jobs from any company, any title, flow into the pipeline automatically every day without manual intervention — including companies not in portals.yml.

**Requirements:** DISC-01, DISC-02, DISC-03, DISC-04, DISC-05, DISC-06

**Success Criteria:**
1. Running `node scan.mjs` discovers jobs from Adzuna and SerpAPI in addition to existing ATS portals — new jobs appear in `data/pipeline.md`
2. Title keywords can be changed in `config/profile.yml` and the next scan picks them up without code changes
3. GitHub Actions cron runs daily at a configured time and commits updated `data/pipeline.md` and `data/scan-history.tsv` to the repo
4. The same job posted on LinkedIn and Indeed under different tracking URLs appears only once in the pipeline

**Plans:**

### 1.1 — Extend scan.mjs with Adzuna + SerpAPI sources
Extract shared dedup/write utilities into `scan-core.mjs`. Add Adzuna REST API integration and SerpAPI Google Jobs integration to `scan.mjs`. Read job title keywords from `config/profile.yml` (`search_queries` or `title_filter.positive`). Normalize LinkedIn/Indeed URLs before dedup check (extract numeric job ID / `jk=` param).

### 1.2 — GitHub Actions daily cron
Create `.github/workflows/daily-scan.yml` that runs `node scan.mjs` on a daily schedule. Configure repo secrets for `ADZUNA_APP_ID`, `ADZUNA_APP_KEY`, `SERPAPI_KEY`. Commit updated `data/pipeline.md` and `data/scan-history.tsv` back to repo after each scan run.

---

## Phase 2: ATS Resume Scoring

**Goal:** Every job evaluation shows an ATS keyword match score alongside the offer score — so the candidate knows before applying whether the resume will pass automated screening, and which keywords to note.

**Requirements:** ATS-01, ATS-02, ATS-03, ATS-04

**Success Criteria:**
1. Evaluating a job via `/career-ops oferta` or auto-pipeline produces an `**ATS:**` line in the report showing overall match % and top missing keywords
2. Score breaks down into at least three categories: hard skills, job title match, soft skills/action verbs
3. Report notes inferred ATS platform (Greenhouse/Workday/Taleo/etc.) and what that means for strictness
4. Score methodology matches the ats-screener approach — keyword frequency + semantic relevance, not raw string count

**Plans:**

### 2.1 — ATS scoring logic in modes/oferta.md
Add a new Block H (ATS Analysis) to `modes/oferta.md` that runs after Block A–G. Extract hard skills, job title keywords, and soft skills from the JD. Score against `cv.md` using keyword frequency + semantic matching (modeled on github.com/sunnypatell/ats-screener). Infer ATS platform from job URL. Output structured score with matched/missing keyword lists.

### 2.2 — Wire ATS score into auto-pipeline and reports
Update `modes/auto-pipeline.md` to include ATS score in the report header alongside Score and Legitimacy. Update report format: `**ATS:** {score}% ({platform})`. Update `modes/batch.md` and `batch/batch-prompt.md` to include ATS block. Verify `test-all.mjs` passes with new report header field.

---

## Phase 3: Contact Finder

**Goal:** For any evaluated or applied job, the candidate can look up hiring managers, engineers, and internal recruiters at that company in seconds — with results cached so free API credits aren't wasted.

**Requirements:** OUT-01, OUT-02, OUT-03, OUT-04, OUT-05

**Success Criteria:**
1. Running `/career-ops contacto` (or `/career-ops contacts`) for a job URL finds and displays at least one contact with name, role, and email (when available)
2. Re-running the same lookup reads from `data/contacts-cache.md` instead of hitting the API again
3. Remaining Hunter.io credits are displayed after each lookup
4. Company `/about` and `/team` pages are tried before the Hunter.io API call (zero-cost first)

**Plans:**

### 3.1 — Contact lookup engine
Extend `modes/contacto.md` with email-based contact discovery flow: (1) check `data/contacts-cache.md` for existing results, (2) scrape company `/about` and `/team` page via Playwright for names/roles, (3) call Hunter.io domain search API if no cached result. Write found contacts to cache keyed by company domain. Display remaining Hunter.io credits from API response header.

### 3.2 — contacts-cache.md schema + SKILL.md wiring
Define `data/contacts-cache.md` format (USER layer, markdown table: domain, name, role, email, confidence, date). Add `contacts` as a new command alias in `.claude/skills/career-ops/SKILL.md`, `.opencode/commands/`, and `.gemini/commands/`. Update `DATA_CONTRACT.md` and `CLAUDE.md` to document new data file.

---

## Requirement Traceability

| Requirement | Phase | Plan |
|-------------|-------|------|
| DISC-01 | Phase 1 | 1.1 |
| DISC-02 | Phase 1 | 1.1 |
| DISC-03 | Phase 1 | 1.2 |
| DISC-04 | Phase 1 | 1.1 |
| DISC-05 | Phase 1 | 1.1 |
| DISC-06 | Phase 1 | 1.2 |
| ATS-01 | Phase 2 | 2.1 |
| ATS-02 | Phase 2 | 2.1 + 2.2 |
| ATS-03 | Phase 2 | 2.1 |
| ATS-04 | Phase 2 | 2.1 |
| OUT-01 | Phase 3 | 3.1 |
| OUT-02 | Phase 3 | 3.1 |
| OUT-03 | Phase 3 | 3.1 + 3.2 |
| OUT-04 | Phase 3 | 3.1 |
| OUT-05 | Phase 3 | 3.2 |

**Coverage:** 15/15 v1 requirements mapped ✓

---
*Created: 2026-04-19 | Milestone: v1*
