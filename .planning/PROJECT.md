# career-ops: High-Velocity Job Search Engine

## What This Is

An extension of the existing career-ops pipeline into a comprehensive, high-velocity job search engine. Four capability layers are added on top of the existing evaluation, CV generation, and portal scanning infrastructure: (1) enhanced job discovery across LinkedIn, Indeed, Google Jobs, and new company sources running daily on autopilot; (2) ATS-optimized resume generation with keyword scoring per job; (3) apply-ready automation that turns discovered jobs into filtered, tailored, reviewable application packets at scale; and (4) a cold email outreach pipeline that finds hiring managers and engineers, drafts personalized emails, and pushes approved drafts to Gmail — all with quality guardrails to prevent spam.

The goal: maximum application breadth with controlled quality — find every relevant job, generate the strongest possible application packet quickly, and then reach out to humans in parallel to generate callbacks from both tracks.

## Core Value

Every relevant job gets found, turned into an apply-ready packet with an ATS-optimized resume, and followed up with a human-reviewed cold email — without burning contacts or Gmail reputation.

## Requirements

### Validated

- ✓ Job evaluation with archetype-based scoring (oferta mode) — existing
- ✓ Tailored CV/PDF generation per job (pdf/latex modes) — existing
- ✓ Portal scanning across 45+ companies on Greenhouse/Ashby/Lever (scan.mjs) — existing
- ✓ LinkedIn contact finding + 300-char message drafting (contacto mode) — existing
- ✓ Batch processing pipeline (batch-runner.sh) — existing
- ✓ Follow-up tracking and pattern analysis — existing

### Active

**Feature A — Enhanced Job Discovery**
- [ ] DISC-01: Scan LinkedIn Jobs, Indeed, and Google Jobs for new postings (beyond current ATS portals)
- [ ] DISC-02: Discover new companies hiring for user's profile (not pre-configured in portals.yml)
- [ ] DISC-03: Run daily on autopilot without manual trigger (`/schedule` or cron integration)
- [ ] DISC-04: Dedup against existing scan-history.tsv and applications.md (extend current dedup logic)

**Feature B — ATS-Optimized Resume**
- [ ] ATS-01: Generate resume in Jake's resume template format (LaTeX/HTML) for every application
- [ ] ATS-02: Score resume against job description keywords (show ATS match % before generating)
- [ ] ATS-03: Auto-inject relevant keywords from JD into resume without fabricating experience
- [ ] ATS-04: Integrate into auto-pipeline flow — ATS score shown alongside oferta score

**Feature C — Apply-Ready Automation**
- [ ] PIPE-01: Process jobs from `data/pipeline.md` in batch without manual URL-by-URL prompting
- [ ] PIPE-02: Auto-generate a tailored ATS-optimized resume for jobs above a configurable fit threshold
- [ ] PIPE-03: Build an application queue with report path, resume path, score, ATS score, and next action per job
- [ ] PIPE-04: Auto-skip low-fit, duplicate, stale, or suspicious jobs using configurable rules
- [ ] PIPE-05: Produce reviewable apply-ready packets only — never submit applications automatically

**Feature D — Cold Email Outreach Pipeline**
- [ ] OUT-01: Find contacts at target companies (hiring managers, engineers, internal recruiters) using Hunter.io/Apollo free tiers + company /about and /team pages + LinkedIn public data
- [ ] OUT-02: Auto-queue outreach for jobs scoring 4.0+ (extend oferta evaluation trigger)
- [ ] OUT-03: Draft personalized cold emails (under 150 words, intro/networking tone, user's voice from cv.md + profile.yml)
- [ ] OUT-04: Batch review queue — `/career-ops outreach` shows pending drafts with approve/edit/reject
- [ ] OUT-05: Push approved emails to Gmail as drafts via Gmail API (OAuth, no auto-send)
- [ ] OUT-06: Guardrails: score threshold 4.0+, queue cap 20 drafts, 7-day stale discard, 2-contact max per company, 5 Gmail drafts/day

### Out of Scope

- LinkedIn scraping or automation that violates LinkedIn ToS — use public APIs and pages only
- Never submit an application on the user's behalf — produce apply-ready output for human submission only
- Auto-sending emails without human review — Gmail drafts only, user clicks send
- Building a new separate codebase — all work extends existing modes/, scripts, and data contracts
- Deep per-company research per email (doesn't scale) — quality comes from voice + brevity
- Per-job manual outreach trigger (v2) — batch queue is the v1 mechanism

## Context

**Existing infrastructure to extend (not replace):**
- `scan.mjs` + `modes/scan.md` — extend with LinkedIn/Indeed/Google sources and scheduling hooks
- `modes/auto-pipeline.md` + batch flow — extend into apply-ready automation for newly discovered jobs
- `modes/contacto.md` — extend later from LinkedIn DMs (300 chars) to email outreach pipeline
- `generate-pdf.mjs` + `generate-latex.mjs` + `templates/cv-template.*` — extend with ATS scoring and Jake's template
- tracker and queue artifacts in `data/` — extend with apply-ready queue state before outreach queue
- `data/` flat-file pattern — new data files follow same Markdown/TSV conventions

**Architecture pattern:** Prompt-as-code in `modes/`, utility logic in `.mjs` scripts, flat-file state in `data/`. New features follow the same pattern — no new server, no new database.

**User:** Adam Solomon — targeting Head of Applied AI / senior AI engineering roles. Voice, proof points, and archetypes in `cv.md`, `config/profile.yml`, `modes/_profile.md`.

**Quality constraint:** Emails must be short (under 150 words), sound like the user (not a template), and use an intro/networking tone — not a direct pitch blast. Quality is enforced by the review step, not by deep per-company research.

## Constraints

- **LinkedIn ToS**: No scraping, no automation of LinkedIn UI — use public profile data, search results, and company pages only
- **Gmail quota**: Personal Gmail = 500 emails/day; daily cap of 5 drafts/day keeps well within limits and prevents reputation damage
- **Free tiers**: Hunter.io (25 searches/month free), Apollo (60 credits/month free) — design contact lookup to work within free tier; paid upgrade is user's choice
- **Existing data contract**: New data files must follow USER layer conventions (`data/`, `reports/`, `output/`) — never auto-updated by system updates
- **Tech stack**: Node.js ESM (.mjs), YAML config, Markdown data, Playwright for browser operations — no new runtimes

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Never auto-submit applications | Project rule and reputation control | Locked |
| Build order: Discovery → ATS Resume → Apply-Ready Automation → Outreach | Discovery and resume quality feed the high-volume queue; outreach multiplies conversions later | Locked |
| Gmail drafts (not direct send) | Human final checkpoint prevents spam and reputation damage | — Pending |
| Extend contacto.md for email outreach | Existing contact-finding logic already handles target classification | — Pending |
| Intro/networking tone (not direct pitch) | Higher reply rate at scale; direct pitch works better with deep research which doesn't scale | — Pending |
| Guardrails baked in (not user discipline) | User explicitly wants structural enforcement for sustainable volume | — Pending |
| Wider contact net, prune in review | MVP goal is testing whether outreach works — find all, user decides who gets emailed | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition:**
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone:**
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-20 after Phase 3 reorder*
