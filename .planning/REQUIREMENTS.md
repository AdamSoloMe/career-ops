# Requirements: career-ops High-Velocity Job Search Engine

**Defined:** 2026-04-19
**Core Value:** Find every relevant job, apply fast with an ATS-optimized resume, and reach out to humans in parallel to generate callbacks from both tracks.

## v1 Requirements

### Job Discovery

- [ ] **DISC-01**: System queries Adzuna API daily with configurable job title keywords and appends new matching jobs to `data/pipeline.md`
- [ ] **DISC-02**: System queries SerpAPI (Google Jobs) daily with configurable job title keywords and appends new matching jobs to `data/pipeline.md`
- [ ] **DISC-03**: Discovery runs automatically every day via GitHub Actions cron without manual trigger
- [ ] **DISC-04**: Title keywords are configurable in `portals.yml` or `config/profile.yml` — not hardcoded to tech roles
- [ ] **DISC-05**: New jobs are deduplicated against `data/scan-history.tsv` and `data/applications.md` with URL normalization (LinkedIn job ID extraction, Indeed `jk=` param extraction) to prevent re-queuing the same job under different tracking URLs
- [ ] **DISC-06**: Existing `scan.mjs` direct ATS scanning (Greenhouse/Ashby/Lever) continues unchanged and is included in the daily cron run

### ATS Resume Scoring

- [ ] **ATS-01**: When evaluating a job, system scores the candidate's resume against the job description using keyword and semantic matching modeled on the ats-screener approach (github.com/sunnypatell/ats-screener)
- [ ] **ATS-02**: ATS match score (0-100%) is displayed in the evaluation report alongside the offer score (A-G blocks), with a breakdown of matched vs. missing keywords
- [ ] **ATS-03**: ATS score distinguishes between hard skills keywords, job title match, and soft skills/action verbs — not a single raw count
- [ ] **ATS-04**: ATS platform is inferred from the job URL (Greenhouse, Lever, Ashby, Workday, Taleo) and the score report notes expected strictness level per platform

### Contact Finder

- [ ] **OUT-01**: For any job in `data/applications.md` with status `Evaluated` or `Applied`, system can find contacts at that company (hiring managers, engineers, internal recruiters)
- [ ] **OUT-02**: Contact lookup uses Hunter.io domain search API as primary source, company `/about` and `/team` pages as zero-cost fallback
- [ ] **OUT-03**: Found contacts are stored in `data/contacts-cache.md` keyed by company domain to avoid re-querying the same company
- [ ] **OUT-04**: Contact lookup respects Hunter.io free tier (25 searches/month) — checks cache before making API call, displays remaining credits
- [ ] **OUT-05**: `/career-ops contacto` (or new `contacts` subcommand) triggers contact lookup for a given job and displays found contacts with role, name, and email (if available)

## v2 Requirements

### ATS Resume Generation

- **ATS-V2-01**: Jake's resume template (`cv-jake.tex` / `cv-jake.html`) available as `--template jake` flag in PDF/LaTeX generation
- **ATS-V2-02**: Auto keyword injection — JD keywords inserted naturally into existing resume bullets before PDF generation (70-85% ATS match target)

### Cold Email Outreach Pipeline

- **OUT-V2-01**: Email drafter generates <125 word intro/networking emails in candidate's voice from `cv.md` + `config/profile.yml` for found contacts
- **OUT-V2-02**: Batch review queue — `/career-ops outreach` shows pending drafts with approve/edit/reject per email
- **OUT-V2-03**: Gmail drafts push via `push-gmail-draft.mjs` (OAuth, 5 drafts/day cap enforced in code)
- **OUT-V2-04**: Outreach queue auto-populated for jobs scoring 4.0+ (triggered by `modes/auto-pipeline.md`)
- **OUT-V2-05**: Guardrails enforced in code: queue cap 20, stale discard 7 days, 2-contact max per company, 5 Gmail drafts/day

### Enhanced Discovery

- **DISC-V2-01**: `discover.mjs` LLM-assisted company discovery — finds new companies hiring for user's profile not yet in `portals.yml`
- **DISC-V2-02**: LinkedIn public job search via Playwright (`/jobs/search/`, no auth, ≤3 pages, random delays) as supplementary source

## Out of Scope

| Feature | Reason |
|---------|--------|
| LinkedIn scraping with authentication | ToS violation — account ban + legal exposure |
| Auto-sending emails without human review | Reputational risk — Gmail drafts only, user clicks send |
| New separate codebase | All work extends existing modes/, scripts, data contracts |
| ATS keyword stuffing (white text, keyword dumps) | Actively penalized by modern ATS — causes auto-rejection |
| Apollo free tier as primary contact source | Export restrictions make programmatic use unreliable |
| node-cron scheduling | Requires persistent process — GitHub Actions is the right tool |
| LoopCV-style auto-apply to everything | Trades reputation for volume — opposite of this project's values |

## Traceability

| Requirement | Phase |
|-------------|-------|
| DISC-01 – DISC-06 | Phase 1: Enhanced Discovery |
| ATS-01 – ATS-04 | Phase 2: ATS Resume Scoring |
| OUT-01 – OUT-05 | Phase 3: Contact Finder |

---
*Last updated: 2026-04-19 — initial v1 scope definition*
