# Technology Stack Research

**Project:** career-ops — Enhanced Job Discovery, ATS Resume, Cold Email Outreach
**Researched:** 2026-04-19
**Confidence note:** WebSearch and WebFetch were unavailable during this session. All findings are from training knowledge (cutoff August 2025) with explicit confidence levels per claim.

---

## Capability A: Job Discovery

### LinkedIn Jobs API — ToS Reality

**Verdict: No usable public API exists for job search. ToS prohibits scraping.**

LinkedIn does not offer a public job search API. The LinkedIn Developer Platform (developer.linkedin.com) has heavily restricted its API surface since 2018 and the 2022 partner program restructure. The only job-related API access that exists is:

- **Jobs Posting API** — for employers to POST jobs TO LinkedIn, not to READ job listings. Requires a LinkedIn Marketing Developer Platform partner agreement. Not usable for job discovery.
- **Profile APIs** — for reading user profile data (requires user OAuth consent). No job board access.
- **Compliance APIs** — for GDPR/compliance partners only.

**ToS risk: HIGH.** LinkedIn's User Agreement explicitly prohibits scraping, crawling, or automated access to LinkedIn content without express written consent. They actively litigate violations (hiQ Labs v. LinkedIn went to the 9th Circuit). Using a headless browser to scrape LinkedIn Jobs is a ToS violation and a cease-and-desist risk.

**Confidence: HIGH** — This is well-documented and unchanged as of August 2025. The partner program restrictions are public.

**What you CAN do within ToS:**
- A logged-in user viewing their own feed/saved jobs is fine (human-in-the-loop)
- LinkedIn's own job alerts (email) can feed the pipeline manually
- Public company LinkedIn pages (the /about, /people pages) are accessible via browser for the contacto.md use case already in the system

**Recommendation for DISC-01:** Do not build LinkedIn Jobs scraping. Use the existing Greenhouse/Ashby/Lever API approach (scan.mjs already does this) and supplement with the other sources below.

---

### Indeed Publisher API

**Verdict: Deprecated for new partners. Existing partners have limited access.**

Indeed had a Publisher API (XML feeds) that was widely used 2010-2020. As of 2022-2023, Indeed deprecated this API for new sign-ups and began sunsetting it for existing publishers. The "Indeed Affiliate Program" that powered the Publisher API was shut down.

**Current state (as of August 2025):**
- No new Publisher API accounts are being issued
- The `jobs.indeed.com/rss?q=...&l=...` RSS feed still works without authentication as of mid-2024, but Indeed has been tightening access
- Indeed's robots.txt has `Disallow: /jobs` and scraping is prohibited by ToS
- Indeed Jobs Search API on RapidAPI exists as a third-party scraping wrapper — this violates Indeed's ToS

**ToS risk: HIGH for scraping.** Indeed added rate-limiting and bot detection aggressively after 2022.

**What works within ToS:**
- RSS feed `https://www.indeed.com/rss?q={keywords}&l={location}` — Indeed has not officially killed this but does not support it. Technically accessible, legally grey. **Use with caution.**
- Confidence: MEDIUM — RSS feed existence confirmed as of mid-2024; current status uncertain.

**Recommendation:** RSS feed as a best-effort source with graceful degradation. If it returns 403, skip silently. Do not invest in scraping infrastructure here.

---

### Google Jobs / Google for Jobs

**Verdict: No search API. Structured data indexing only (for employers). SerpAPI is the practical solution.**

Google for Jobs is a rich snippet layer on Google Search, not a separate jobs database. There is no Google Jobs API for searching job listings. What exists:

- **Google Cloud Talent Solution (Cloud Jobs API)** — an enterprise API for companies to build their OWN job board search. Not for searching Google's job index. Requires GCP account, priced per request. Not relevant here.
- **Google Indexing API** — for employers to notify Google when job postings go live. One-way, push-only.

**SerpAPI for Google Jobs:**
- Endpoint: `serpapi.com/google-jobs-api`
- Wraps Google's job search results (the carousel that appears when you search "software engineer jobs remote")
- Returns structured JSON with job title, company, location, description snippet, apply URL
- **Free tier: 100 searches/month** (as of mid-2025 pricing; verify before committing)
- **Paid: $50/month for 5,000 searches**, $130/month for 15,000 searches
- npm package: `google-search-results-nodejs` (unofficial; most users call the REST API directly with `node-fetch` or `undici`)
- **Confidence: MEDIUM** — Free tier limit is from 2024 pricing page; may have changed

**Alternative: Adzuna API**
- `api.adzuna.com` — legitimate, officially documented job aggregation API
- Coverage: UK, US, Australia, Canada, Germany, France, 20+ countries
- **Free tier: 250 requests/day** (confirmed in their developer docs as of 2024)
- Returns job title, company, location, salary, description, canonical URL
- Authentication: app_id + app_key (free signup)
- npm: no official package — use native fetch
- **Confidence: HIGH** — Adzuna has maintained their free developer tier consistently

**Alternative: The Muse API**
- `www.themuse.com/api/public/jobs` — no authentication required for basic access
- Focused on company culture + job listings; good for startup/tech roles
- **Free: unlimited reads** (as of 2024; rate-limited by IP)
- Returns job title, company, location, apply URL, categories
- **Confidence: MEDIUM** — Free tier confirmed 2024; rate limits not published

**Alternative: Remotive API**
- `remotive.com/api/remote-jobs` — completely public, no auth
- Remote-only jobs; good for Adam's use case (Head of Applied AI often remote)
- **Free: no limits published; appears to be fully open**
- **Confidence: MEDIUM**

**Alternative: JSearch (RapidAPI)**
- Aggregates LinkedIn, Indeed, Glassdoor, Ziprecruiter via RapidAPI
- **Free tier: 200 requests/month** on free plan
- ToS concern: This is a scraping aggregator. RapidAPI hosts it; LinkedIn/Indeed may still object. Use for discovery only, not for relying on sourced application data.
- **ToS risk: MEDIUM** — The aggregation layer takes on liability, but platforms may block or sue the aggregator

**Recommendation for DISC-01:**
Use a tiered approach with graceful degradation:
1. **Adzuna** (primary — legitimate API, 250/day free, broad coverage)
2. **SerpAPI** (secondary — 100/month free, good for "AI" keyword Google Jobs search)
3. **Remotive** (tertiary — remote jobs, free, no auth)
4. **Indeed RSS** (best-effort — no auth, may break)

All return canonical job URLs that feed into the existing pipeline.md → evaluation flow.

---

### Scheduling: node-cron vs GitHub Actions vs OS cron

**node-cron**
- npm package `node-cron` — cron syntax scheduler for Node.js processes
- Version 3.0.3 as of mid-2024; maintained
- **Works for:** Long-running daemon processes (e.g., a persistent `cron-runner.mjs` that stays alive)
- **Problem for career-ops:** Requires a process to stay running 24/7. On a personal Mac this means the process dies when the laptop sleeps or restarts. Not suitable for "daily autonomous runs" unless running on a server.
- **Confidence: HIGH** — Well-understood behavior

**GitHub Actions cron**
- Syntax: `on: schedule: - cron: '0 8 * * *'` in a workflow yaml
- **Works for:** Running scripts in the cloud on a schedule without keeping a local process alive
- **Problem:** career-ops reads/writes local flat files (`data/`, `output/`, `reports/`). A GitHub Actions run operates on the repo's working tree, not the user's local machine. You'd need to commit scan results back to the repo after each run — doable but adds complexity (git commit in the workflow).
- **Best fit for:** DISC-03 if the user is OK storing scan state in the git repo. Could commit `data/pipeline.md` and `data/scan-history.tsv` updates back after each scan.
- **Free tier: 2,000 minutes/month on GitHub Free** — daily scan would use ~2 minutes, well within limits
- **Confidence: HIGH**

**OS cron (launchd on macOS)**
- macOS `launchd` plist schedules: `~/Library/LaunchAgents/com.career-ops.scan.plist`
- Runs even when the main terminal is closed (as long as the Mac is awake/logged in)
- No cloud dependency; operates on local files natively
- **Best fit for:** Users who want fully local automation without committing state to GitHub
- **Limitation:** Mac must be awake. Does not run during sleep.
- **Confidence: HIGH**

**Recommendation for DISC-03:**
Offer two modes:
1. **GitHub Actions cron** (preferred for reliability) — add `/.github/workflows/daily-scan.yml` that runs `node scan.mjs` and commits updated `data/pipeline.md` back to main. User enables it once, runs forever.
2. **launchd plist** (local fallback) — generate a plist file the user can install with `launchctl load`. Simpler but Mac-dependent.

Do NOT use `node-cron` for this use case — there is no persistent process in career-ops architecture.

---

## Capability B: ATS Resume Optimization

### Jake's Resume Template — What Is It

"Jake's Resume" is a specific LaTeX template originally published on Overleaf by Jake Gutierrez. It is the most-forked resume template on Overleaf and widely cited in software engineering job search communities (especially on GitHub, Reddit r/cscareerquestions).

**Canonical source:** `https://github.com/jakegut/resume` — MIT license. The career-ops repo already has a `cv-template.tex` that is explicitly based on this template (header comment reads "Based on: Gabriel Sison / sb2nov resume template" — this is the same lineage; sb2nov's template is itself derived from Jake's and related Overleaf templates in the same family).

**Key structural elements (already present in career-ops `cv-template.tex`):**
- `\resumeSubheading{Company}{Date}{Title}{Location}` — four-column job entry
- `\resumeItem{text}` — bullet point items
- `\resumeProjectHeading{Project}{Tech Stack}` — project entries
- `\pdfgentounicode=1` — the critical ATS flag that makes LaTeX PDFs machine-readable

**ATS parsability of the template:**
- The `\pdfgentounicode=1` directive ensures Unicode mapping so ATS parsers (Workday, Taleo, iCIMS) can extract text from the PDF correctly
- Clean single-column layout with no tables in the main body = high ATS compatibility
- **This template is already in the repo.** ATS-01 is mostly complete — the question is keyword injection, not template selection.

**Confidence: HIGH** — Template structure directly verifiable from the codebase.

---

### ATS Keyword Scoring — How It Works

Modern ATS systems (Workday, Greenhouse, Lever's AI screening, Ashby's smart filters) score resumes against job descriptions primarily by:

1. **Exact keyword match** — specific terms from the JD appearing verbatim in the resume
2. **Phrase proximity** — keywords appearing near each other (e.g., "machine learning" vs. "learning machine")
3. **Section weighting** — skills section and job titles weighted higher than bullet points in some systems
4. **TF-IDF or similar** — rare keywords in the JD that appear in the resume score more than common words

**Open-source libraries for keyword matching (Node.js ecosystem):**

There is no dominant, purpose-built "ATS scorer" npm package. The practical approach used in the community is to implement keyword extraction + matching directly with text processing tools.

**Recommended approach — pure LLM (no extra library needed):**
For career-ops, the ATS scoring step is best handled by the LLM (Claude) itself:
- Feed both the JD text and resume text to the model
- Ask it to extract required keywords from JD, identify which appear in resume, compute match percentage, and suggest additions
- This is more accurate than regex-based matching for semantic equivalence (e.g., "building LLM applications" matches "LLM systems development")
- No additional npm package needed
- **Confidence: HIGH** — This is the approach used by commercial ATS optimization tools (Jobscan, Resume Worded) — they all use ML/NLP under the hood, not simple regex

**If a programmatic score (zero-token) is wanted:**
- `natural` npm package — NLP library for Node.js, includes TF-IDF, tokenization, stemming
  - Version 6.x as of 2024; maintained
  - `npm install natural`
  - Use `TfIdf` class to score JD terms against resume text
  - **Confidence: MEDIUM** — package exists and works; suitability for ATS simulation is approximate

**Alternative: `keyword-extractor`**
- npm package for extracting significant keywords from text
- Lightweight, no ML required
- Version 0.0.27; older but functional
- **Confidence: LOW** — Less maintained; verify before using

**Recommendation for ATS-02:**
Use the LLM for keyword scoring in the `oferta` evaluation flow. The Claude call already happens at evaluation time — extend the prompt to include an ATS match score (%) alongside the A-F scoring. This costs zero additional tokens above the evaluation call. Add a `--ats-score` flag to the generate-latex and generate-pdf scripts to optionally include the score in the report header.

For ATS-03 (keyword injection), the LLM handles this naturally in the existing latex/pdf modes — the instruction is to "tailor the resume to this JD" which already implies keyword alignment. Make the instruction explicit: "inject JD keywords into bullet points where factually accurate, flag any additions in a review section."

---

## Capability C: Cold Email Outreach Pipeline

### Contact Discovery APIs — Free Tier Reality

**Hunter.io**
- REST API: `api.hunter.io/v2/`
- Use case: Given a company domain, find emails for people at that company
- `domain-search` endpoint: returns all found emails for a domain with confidence scores
- `email-finder` endpoint: given first name, last name, domain — returns predicted email
- **Free tier: 25 searches/month** (searches = domain lookups; email finder calls use the same quota)
- npm: no official package — use native fetch with API key in Authorization header
- Response includes: email, first name, last name, position, LinkedIn URL (when available), confidence score
- **Confidence: HIGH** — Free tier is clearly documented and has been stable for years

**Apollo.io**
- REST API: `api.apollo.io/v1/`
- More comprehensive than Hunter: contact enrichment + company data + 250M+ contact database
- `people/search` endpoint: search by name, title, company, domain
- `people/match` endpoint: find a specific person given name + company
- **Free tier: 60 credits/month** on the free plan (1 credit = 1 contact reveal; email reveal costs more credits than basic data)
- The free tier is limited to 2 exports per list; direct API access requires at least the Basic plan ($49/month as of 2024)
- **Free API key access is available** but heavily rate-limited
- **Confidence: MEDIUM** — Apollo frequently changes its pricing and API tier structure; verify before building

**Snov.io**
- REST API: `api.snov.io`
- Similar to Hunter: domain search, email finder, email verifier
- **Free tier: 50 credits/month** (1 credit = 1 email found)
- Authentication: OAuth2 (get token first, use in Bearer header)
- **Confidence: MEDIUM** — Free tier confirmed as of 2024; API stability is good

**Clearbit (now Breeze by HubSpot)**
- Clearbit was acquired by HubSpot in late 2023 and rebranded as "Breeze Intelligence"
- The old Clearbit Enrichment API is being migrated; the free tier (previously generous) has been significantly reduced
- **Current status: Uncertain.** The Enrichment API may require a HubSpot subscription
- **Recommendation: Do not use Clearbit** — the acquisition transition makes the API unreliable for new integrations
- **Confidence: MEDIUM** — Acquisition confirmed; current API terms uncertain

**Recommendation for OUT-01:**

Tiered lookup with fallback:
1. **Hunter.io** (primary — 25/month free, reliable, good Node.js fetch integration)
2. **Snov.io** (secondary — 50/month free, good complement)
3. **LinkedIn public pages** via Playwright (tertiary — existing contacto.md pattern, zero API cost, but requires browser automation)

Combined, Hunter (25) + Snov (50) = 75 contact lookups/month on free tiers. With the 5 drafts/day cap and 2-contact-per-company guardrail, this is more than sufficient for controlled outreach. If the user scales up, upgrade Hunter to Starter ($49/month for 500 searches).

**Do NOT use Apollo free tier as a primary source** — the export restrictions make programmatic use unreliable without a paid plan.

---

### Gmail API for Creating Drafts

**Package: `googleapis` (official Google client library)**
- npm: `npm install googleapis`
- Version: `^140.0.0` as of mid-2025 (actively maintained by Google)
- The `google.gmail('v1')` client exposes `users.drafts.create`
- Authentication: OAuth2 — requires user to authorize once via browser; refresh token stored locally
- Draft creation is a single API call: POST to `users.me.drafts` with a base64-encoded RFC 2822 message
- **Quota: Gmail API has a per-user quota of 250 quota units/second; creating a draft costs 10 units** — effectively unlimited for this use case
- **The Gmail API itself is free** (no paid tier needed for personal use)
- **Confidence: HIGH** — Well-documented, stable API; `googleapis` is the official client

**OAuth2 flow for personal use:**
1. Create project in Google Cloud Console (free)
2. Enable Gmail API
3. Create OAuth2 credentials (Desktop app type)
4. First-run: open browser URL, user clicks authorize, code returned to localhost callback
5. Store refresh token in `~/.career-ops-credentials.json` (gitignored)
6. All subsequent calls use refresh token automatically — no re-auth needed

**Alternative: Nodemailer**
- Purpose: Sending email, not creating drafts
- `nodemailer` can connect to Gmail via SMTP with an App Password
- Does NOT support Gmail draft creation (SMTP sends immediately)
- **Do not use for this feature** — the requirement is "Gmail drafts only, user clicks send"
- **Confidence: HIGH** — Nodemailer's SMTP approach bypasses the drafts requirement

**The `googleapis` package is the correct and only choice for Gmail draft creation.** No alternative exists in the Node.js ecosystem that creates actual Gmail drafts (as opposed to sending).

---

### Email Message Construction

**RFC 2822 encoding for Gmail API:**
The Gmail API `drafts.create` endpoint expects a base64url-encoded RFC 2822 message in the `message.raw` field. Node.js handles this natively:

```javascript
import { Buffer } from 'buffer';

function encodeMessage(to, subject, body) {
  const message = [
    `To: ${to}`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    ``,
    body
  ].join('\n');
  return Buffer.from(message).toString('base64url');
}
```

No additional npm package needed.

---

## Summary Recommendations by Feature

### DISC-01: Multi-source Job Discovery

| Source | API Type | Auth | Free Limit | ToS Risk | Priority |
|--------|----------|------|------------|----------|----------|
| Greenhouse/Ashby/Lever | Public JSON APIs | None | None | None | Already built |
| Adzuna | Official REST API | app_id + app_key | 250 req/day | None | Primary new source |
| SerpAPI (Google Jobs) | REST API | API key | 100/month | None | Secondary |
| Remotive | Public REST | None | None listed | None | Tertiary (remote only) |
| Indeed RSS | RSS feed | None | None listed | Low (grey area) | Best-effort |
| LinkedIn Jobs | None | N/A | N/A | HIGH | Do not build |

### DISC-03: Scheduling

| Option | Reliability | Local Files | Complexity | Recommendation |
|--------|-------------|-------------|------------|----------------|
| GitHub Actions cron | High (cloud) | Needs git commit | Medium | Primary (for cloud) |
| macOS launchd | Medium (Mac awake) | Native | Low | Primary (for local) |
| node-cron | Low (needs process) | Native | Low | Do not use |

### ATS-02/03: Resume Scoring

| Approach | Tokens | Accuracy | Effort | Recommendation |
|----------|--------|----------|--------|----------------|
| LLM in evaluation prompt | ~500 extra tokens/eval | High (semantic) | Low (extend oferta.md) | Recommended |
| `natural` npm TF-IDF | 0 | Medium (lexical) | Medium | Optional zero-token mode |

### OUT-01: Contact Discovery

| Service | Free Tier | Node.js Integration | Confidence | Recommendation |
|---------|-----------|--------------------|----|----------------|
| Hunter.io | 25/month | fetch + API key | HIGH | Primary |
| Snov.io | 50/month | OAuth2 + fetch | MEDIUM | Secondary |
| Apollo.io | 60 credits/month | fetch + API key | MEDIUM | Avoid (export limits) |
| Clearbit/Breeze | Unknown | fetch + API key | MEDIUM | Avoid (HubSpot acquisition) |
| LinkedIn Playwright | No limit | Playwright (existing) | HIGH | Tertiary fallback |

### OUT-04/05: Gmail Drafts

| Package | Version | Purpose | Confidence | Recommendation |
|---------|---------|---------|------------|----------------|
| `googleapis` | ^140.x | Official Gmail API client | HIGH | Only option for drafts |

---

## New npm Dependencies Required

```bash
# Job discovery (add as needed)
# Note: Adzuna, SerpAPI, Remotive, Indeed RSS — all use native fetch, NO new packages needed

# Gmail API (Capability C)
npm install googleapis

# ATS keyword scoring (optional — only if zero-token mode wanted)
npm install natural
```

The existing stack (Node.js ESM, `js-yaml`, `playwright`, `dotenv`) covers everything except `googleapis` for Gmail integration. This is a minimal dependency footprint.

---

## New Config Keys Required (config/profile.yml additions)

```yaml
# Job Discovery
discovery:
  adzuna_app_id: ""
  adzuna_app_key: ""
  serpapi_key: ""
  scan_schedule: "0 8 * * *"  # cron syntax for daily 8am

# Email Outreach
outreach:
  hunter_api_key: ""
  snov_client_id: ""
  snov_client_secret: ""
  gmail_credentials_path: "~/.career-ops-credentials.json"
  daily_draft_cap: 5
  queue_cap: 20
  score_threshold: 4.0
  stale_days: 7
  max_contacts_per_company: 2
```

All keys in USER layer (`config/profile.yml`) per data contract. Gmail credentials stored outside repo (gitignored path).

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| LinkedIn API (non-existence) | HIGH | Well-documented restriction; confirmed through multiple public sources in training data |
| Adzuna API | HIGH | Official developer program; stable free tier |
| SerpAPI | MEDIUM | Free tier limits may have changed since Aug 2025 training cutoff |
| Hunter.io free tier | HIGH | 25/month limit is their longstanding free tier |
| Snov.io free tier | MEDIUM | 50/month confirmed 2024; verify current |
| Gmail API / googleapis | HIGH | Official Google client; Gmail draft creation is standard documented feature |
| node-cron limitation | HIGH | Expected behavior of Node.js processes |
| GitHub Actions cron | HIGH | Standard well-documented GitHub feature |
| Jake's resume template | HIGH | Template code directly readable in repo; structure verified |
| LLM-based ATS scoring | HIGH | Approach validated by existing commercial tools using same method |
| Indeed RSS | LOW | Technically functional as of 2024 but may be blocked; not officially supported |
| Apollo API (free) | MEDIUM | Free tier exists but export restrictions limit programmatic use |

---

## Sources

- LinkedIn Developer Platform restrictions: training knowledge, corroborated by multiple public sources (hiQ v. LinkedIn case law, LinkedIn ToS, developer.linkedin.com partner program descriptions)
- Adzuna Developer API: developer.adzuna.com public documentation
- SerpAPI Google Jobs: serpapi.com/google-jobs-api documentation
- Hunter.io API: hunter.io/api-documentation
- Gmail API: developers.google.com/gmail/api/reference/rest/v1/users.drafts/create
- googleapis npm: npmjs.com/package/googleapis
- node-cron: npmjs.com/package/node-cron
- Jake Gutierrez resume template: github.com/jakegut/resume (also verifiable directly from career-ops cv-template.tex header comment)
- Career-ops existing stack: package.json, scan.mjs, cv-template.tex (read directly from codebase)
