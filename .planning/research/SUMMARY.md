# Research Summary: career-ops High-Velocity Job Search Engine

**Project:** career-ops — Discovery + ATS Resume + Cold Email Outreach
**Researched:** 2026-04-19
**Confidence:** MEDIUM-HIGH

## Recommended Stack

**Job Discovery:**
- `Adzuna REST API` — primary new source, 250 req/day free, official API (HIGH)
- `SerpAPI Google Jobs` — secondary, 100/month free (MEDIUM — verify pricing)
- `Remotive public API` — remote-only, no auth, free (MEDIUM)
- `GitHub Actions cron` — scheduling for `scan.mjs`, cloud-reliable (HIGH)
- LinkedIn Jobs public search (`/jobs/search/`) via Playwright — no auth, ≤3 pages, random delays (HIGH — ToS-safe)

**ATS Resume:**
- Jake's template — already in repo (`cv-template.tex`) with `\pdfgentounicode=1` ATS flag (HIGH)
- LLM scoring in `modes/pdf.md` — semantic judgment, no new packages (HIGH)

**Cold Outreach:**
- `googleapis` v140.x — only correct tool for Gmail draft creation (HIGH)
- Hunter.io — 25 domain searches/month free (HIGH)
- Snov.io — 50 credits/month free (MEDIUM — verify current limits)

**Do NOT use:** `node-cron` (no persistent process), Apollo free tier as primary (export restrictions), LinkedIn Jobs API (doesn't exist), Clearbit (HubSpot acquisition).

**New npm dependencies: 1 (`googleapis`). Everything else uses native `fetch`.**

## Table Stakes

- Multi-source discovery beyond Greenhouse/Ashby/Lever
- Daily scheduled scan without manual trigger
- Dedup with URL normalization for LinkedIn/Indeed tracking params
- ATS keyword match score shown before resume generation
- Verbatim keyword injection — natural context only, no keyword dumps
- Jake's template as default ATS submission format
- Cold email drafts under 125 words in candidate's voice
- Gmail draft creation, never auto-send
- Per-company contact limits + queue caps enforced in code

## Differentiators

- Direct ATS API scanning (`scan.mjs`) is genuinely unique — no consumer tool (Teal, Huntr, LoopCV) does this. Zero-stale, real-time. Protect the zero-token guarantee.
- Score-gated outreach (4.0+) prevents the volume-reputation tradeoff that LoopCV falls into
- ATS platform detection (Greenhouse vs Workday vs Taleo) calibrates optimization depth per role
- Voice consistency via `cv.md` + `profile.yml` — emails sound like the candidate, not a SaaS template
- Human-in-loop at every send decision — drafts only

## Architecture Decisions

**Extend vs. new:**
- `scan.mjs` → extract `scan-core.mjs` (shared dedup utilities), `scan.mjs` pure refactor
- `modes/pdf.md` → extend with ATS scoring step + Jake template branch
- `modes/auto-pipeline.md` → extend with outreach queue trigger (score >= 4.0)
- `modes/outreach.md` → NEW mode, sibling to `contacto.md` (contacto stays LinkedIn DMs)
- `push-gmail-draft.mjs` → NEW script (Gmail OAuth + 5/day enforcement)

**New USER layer files:** `data/outreach-queue.md`, `data/outreach-sent.md`, `config/gmail-credentials.json`, `config/gmail-token.json`

**New SYSTEM layer files:** `modes/outreach.md`, `push-gmail-draft.mjs`, `scan-core.mjs`, `discover.mjs`, `templates/cv-jake.tex`, `templates/cv-jake.html`, `.github/workflows/daily-scan.yml`

**Critical boundary:** `scan.mjs` must NEVER call the LLM. Zero-token guarantee is a feature. LinkedIn/Google discovery stays in `modes/scan.md` (agent-driven) or `discover.mjs` (`claude -p` wrapper).

## Watch Out For

1. **LinkedIn authenticated scraping (CRITICAL)** — Any authenticated Playwright session = account ban + ToS violation. LinkedIn public job search only (`/jobs/search/`), no cookies, no login, ≤3 pages, random delays (1.5-4s), once/day, local machine only (not CI — shared IPs are blocked).

2. **Gmail spam pattern triggers at low volume (CRITICAL)** — Volume isn't the risk at 5/day; signal density is. Bounces + spam marks damage reputation fast. Require Hunter.io confidence >= 70%; every draft must be unique body; avoid "Hope this finds you well", "Quick question" subjects, resume PDF attachments.

3. **ATS keyword stuffing detection (CRITICAL)** — White text and unnatural repetition now cause auto-rejection in Workday/Greenhouse. Inject keywords into existing achievement bullets only. Never append standalone keyword lists. 70-85% match is the sweet spot — above 85% degrades human readability.

4. **Hunter.io / Snov.io free tier exhaustion (MODERATE)** — 25 + 50 = 75 lookups/month exhausts in days at scale. Gate lookup behind score threshold; try company `/team` + `/about` pages first (zero cost); cache results in `data/contacts-cache.md`.

5. **Dedup breaks for LinkedIn/Indeed URLs (MODERATE)** — Same job appears under multiple URLs due to tracking params. Normalize: LinkedIn = extract numeric job ID; Indeed = extract `jk=` param. Without this, same job gets evaluated multiple times and same company gets emailed twice.

## Build Order

**Phase 1 — Enhanced Job Discovery**
Extends proven scan infrastructure; zero-token boundary preserved; Discovery feeds everything else.
1. Extract `scan-core.mjs` (pure refactor, safe first commit)
2. Add Adzuna + SerpAPI + Remotive sources
3. Create `discover.mjs` as `claude -p` wrapper
4. `.github/workflows/daily-scan.yml` for automated scheduling
5. URL normalization for LinkedIn/Indeed dedup

**Phase 2 — ATS Resume Optimization**
Strong resume needed before outreach is credible; extends proven PDF/LaTeX pipeline.
1. ATS keyword scoring in `modes/pdf.md`
2. `templates/cv-jake.html` + `cv-jake.tex`
3. Template selection branch in `modes/pdf.md`
4. `**ATS:**` field in report headers
5. `--template jake` flag in `generate-latex.mjs`

**Phase 3 — Cold Email Outreach Pipeline**
Highest integration complexity; benefits from discovery + resume quality being established.
1. `modes/outreach.md` (discovery + drafting, no Gmail yet)
2. Outreach queue trigger in `modes/auto-pipeline.md`
3. `data/outreach-queue.md` schema
4. `push-gmail-draft.mjs` with OAuth + 5/day enforcement
5. Hunter.io + Snov.io wired in with company page fallback
6. `/career-ops outreach` wired into SKILL.md + platform command files

---
*Synthesized from STACK.md, FEATURES.md, ARCHITECTURE.md, PITFALLS.md — 2026-04-19*
