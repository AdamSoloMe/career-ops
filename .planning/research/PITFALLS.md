# Domain Pitfalls: career-ops High-Velocity Job Search Engine

**Domain:** Job search automation — discovery, ATS resume, cold email outreach
**Researched:** 2026-04-19
**Confidence note:** WebSearch and WebFetch were restricted in this environment. All findings are drawn from training data (cutoff August 2025) plus analysis of the existing codebase. LinkedIn ToS and email deliverability findings are HIGH confidence from well-documented, stable policies. ATS gaming findings are MEDIUM-HIGH confidence. API rate limits are MEDIUM confidence (subject to plan changes). Flag items marked LOW for validation before building.

---

## Critical Pitfalls

Mistakes that cause account bans, legal exposure, or permanent reputation damage.

---

### CRITICAL-01: LinkedIn Automated Login and Session Impersonation

**What goes wrong:** Any tool that logs into LinkedIn using stored credentials, drives a browser session, or reads data behind the login wall violates LinkedIn ToS Section 8.2 ("Do Not Undermine Our Services"). This includes Puppeteer/Playwright scripts that sign in and then scrape profile pages, connection lists, or recruiter search results.

**Why it happens:** Developers conflate "browsing LinkedIn" with "scraping LinkedIn." The distinction LinkedIn draws is: did software authenticate as a user? If yes, any subsequent data access — even manual-looking page reads — is ToS-violating automated access.

**Consequences:**
- Account banned (permanent or temporary with appeal process)
- LinkedIn has sued scraping companies under CFAA (hiQ Labs v. LinkedIn, Bright Data cases): injunctions, settlements in the millions
- Data obtained is legally unusable and may expose the project to cease-and-desist
- The user's personal LinkedIn account is the asset at risk — not a throwaway

**Prevention:**
- NEVER authenticate LinkedIn in any script or Playwright session
- All LinkedIn access must be read-only of genuinely public pages (company pages, public job postings, public profiles where user is not logged in)
- The existing `contacto.md` mode correctly delegates contact-finding to WebSearch (finding public profile URLs) and manual browsing — keep it that way
- For Feature A job discovery: LinkedIn Jobs search results are publicly accessible without login; Playwright can navigate `https://www.linkedin.com/jobs/search/?keywords=...` without authentication. This is borderline but generally tolerated. Do NOT paginate aggressively or simulate rapid clicks.

**Warning signs:**
- Any code path that calls `browser_navigate` to `linkedin.com/feed`, `linkedin.com/mynetwork`, or any URL that 401s without a session
- Any storage of LinkedIn cookies or session tokens
- Any Playwright script that fills in LinkedIn username/password fields

**Phase:** Phase 1 (Discovery). Must be addressed in DISC-01 design before any LinkedIn scanning code is written.

---

### CRITICAL-02: LinkedIn Profile Scraping at Scale (Even Public Profiles)

**What goes wrong:** Bulk automated collection of LinkedIn profile data — even from publicly visible profiles — violates ToS Section 8.2 and has been the subject of multiple enforcement actions. The hiQ Labs case established that LinkedIn can enforce ToS restrictions on even publicly accessible data when the collection is automated and at scale.

**Why it happens:** "Public = safe to scrape" is the intuitive but wrong assumption. LinkedIn's ToS explicitly prohibits: "scrape or otherwise collect data from LinkedIn whether by automated means or otherwise" without explicit permission.

**Consequences:**
- IP blocking (affects all LinkedIn access from that network)
- Account restriction/ban
- CFAA exposure for systematic collection

**Prevention:**
- For Feature C contact finding: use Hunter.io and Apollo APIs (which aggregate data legally), company `/team` and `/about` pages, and manually discovered email patterns — not LinkedIn profile scraping
- The existing `contacto.md` correctly identifies 2-3 contacts via WebSearch (which surfaces LinkedIn public URLs as search results, not via scraping LinkedIn directly) and generates a 300-char connection message for manual sending
- For the email outreach pipeline (OUT-01): Hunter.io + Apollo free tier + company websites is the right stack. Do not extend contacto.md to scrape LinkedIn profiles for emails.

**Warning signs:** Any code that iterates over LinkedIn `/in/` profile URLs programmatically and extracts email, phone, or connection data.

**Phase:** Phase 3 (Outreach). Address in OUT-01 design.

---

### CRITICAL-03: Gmail Account Suspension from Cold Email Patterns

**What goes wrong:** Gmail's abuse detection is pattern-based, not volume-based at low scale. Sending 5-20 cold emails/day from a personal Gmail is safe on volume, but the following patterns trigger spam classification or account flags even at low volume:
1. Many recipients mark the email as spam (even 2-3 in a short window matters)
2. Sending to email addresses that don't exist (bounce rate above ~5%)
3. Subject line or body triggers spam classifier (certain phrases, excessive links, tracking pixels)
4. Sending the same email body to multiple recipients in rapid succession (template detection)

**Why it happens:** Gmail's sending reputation is per-account and evaluated on signal density, not just count. A personal account sending 5 cold emails/day is fine; but if 3 of those 5 bounce and 1 gets marked spam, that's a 60% bad-signal rate which damages reputation fast.

**Consequences:**
- Emails land in spam for all recipients (silent — sender doesn't know)
- "Account flagged" warning from Google
- In severe cases, account suspended (very rare at 5/day, but possible if patterns are egregious)

**Prevention:**
- The 5 Gmail drafts/day cap in OUT-06 is the right guardrail — keep it
- Verify email addresses before sending: Hunter.io provides confidence scores; only send to addresses with confidence >= 70%
- Never send identical body text to multiple people — the system already requires personalization per draft
- Avoid these spam trigger patterns: "Hope this finds you well", excessive capitalization, generic subject lines like "Quick question" (overused, now flagged), attachments in cold outreach, tracking pixels
- Use plain text or minimal HTML — heavy HTML formatting is a spam signal in cold outreach
- The "networking/intro tone" requirement in the project spec already helps — it produces shorter, more natural emails that score better in spam classifiers

**Warning signs:**
- Bounce rate on Hunter.io-sourced addresses above 10%
- Any template where the body is identical across multiple drafts (only the name is swapped)
- Drafts containing links to resume PDFs or attachments — these are spam signals in cold outreach

**Phase:** Phase 3 (Outreach). Address in OUT-03 (draft generation) and OUT-05 (Gmail push) design.

---

### CRITICAL-04: ATS Keyword Stuffing Detection and White Text

**What goes wrong:** Two techniques that worked in 2018-2020 and now actively backfire:
1. **White text keywords**: Adding invisible keywords (white text on white background) — modern ATS platforms (Workday, Greenhouse, Lever, Ashby) parse the raw document and flag color-mismatch text as manipulation. Some ATS systems auto-reject on detection.
2. **Keyword overloading**: Repeating high-value keywords 5-10 times in unnatural contexts. Modern ATS platforms (especially post-2022) use semantic matching, not raw keyword count. A resume with "machine learning" appearing 8 times in unnatural contexts scores lower than one with 2 natural uses plus related terms (ML, model training, inference).

**Why it happens:** Older "ATS optimization" guides (pre-2022) recommended both techniques. The information is still widely circulated.

**Consequences:**
- Auto-rejection by ATS before human review
- Blacklisting by some ATS platforms at the company level
- Worse: resume reaches human reviewer looking keyword-stuffed, signaling low judgment

**Prevention:**
- The ATS-03 requirement ("auto-inject relevant keywords without fabricating experience") is the right framing. Implementation must:
  - Insert keywords only where they fit naturally in existing bullet points
  - Never add keywords as a standalone list at the bottom with tiny/white text
  - Use semantic variants (e.g., if JD says "LLM fine-tuning", accept that "model training" in resume already covers it rather than force-inserting the exact phrase)
- ATS-02 (keyword score % before generating) should flag when match is achieved via natural integration vs. forced insertion

**Warning signs in implementation:**
- Any code that appends a "hidden keywords" section to the LaTeX/HTML template
- ATS match % that increases by adding identical phrases repeatedly
- Match algorithm that only does exact string matching (misses semantic equivalence)

**Phase:** Phase 2 (ATS Resume). Address in ATS-03 implementation design.

---

## Moderate Pitfalls

---

### MOD-01: Over-Optimizing Resume for ATS at Cost of Human Readability

**What goes wrong:** ATS pass rate and human engagement are partially in tension. A resume that maximizes keyword density can read as robotic to the hiring manager who receives it after ATS filtering. The resume is not a document optimized for a machine — it's a document that must pass a machine to reach a human.

**Prevention:**
- Jake's resume template format (the project's chosen format) is already strong for this: clean, scannable, achievement-focused bullets. The ATS layer must inject keywords INTO existing achievement bullets, not replace them with keyword-heavy non-sentences.
- The ATS score display (ATS-02) should be shown alongside the oferta evaluation score — both matter, and a high ATS score with a low "human readability" assessment is a warning sign
- A reasonable ATS match target is 70-85% keyword coverage. Pushing above 85% typically degrades human readability.

**Warning signs:** Bullet points that read as lists of technologies with no action verb or achievement ("Machine learning, TensorFlow, PyTorch, NLP, LLM, RAG, fine-tuning...").

**Phase:** Phase 2 (ATS Resume). Address in ATS-01/02/03 design.

---

### MOD-02: Hunter.io and Apollo Free Tier Exhaustion

**What goes wrong:** Hunter.io free tier is 25 searches/month. Apollo free tier is 60 email credits/month. If Feature C runs for every job scoring 4.0+, and the user evaluates 30+ jobs per month, both tiers will exhaust in the first week of each month, blocking all outreach until month reset.

**Real-world rate limits (MEDIUM confidence — verify at build time):**
- **Hunter.io free**: 25 domain searches/month, 25 email finder calls/month; no rate limit on requests per minute but monthly hard cap
- **Apollo free**: 60 export credits/month (each contact export = 1 credit); 10,000 API calls/month but credits gate the useful data
- **Both**: No IP-based throttling at low volume, but monthly credit exhaustion is the binding constraint

**Prevention:**
- Cache contact lookups: if a company was searched last month, reuse the result (store in `data/contacts-cache.md` or similar)
- Tier the search strategy: try company website `/team`, `/about`, `/leadership` pages FIRST (zero cost) before hitting Hunter.io/Apollo
- Only trigger contact lookup for jobs that pass the 4.0+ score threshold AND have been queued for email outreach — not for every evaluated job
- Display remaining credits in the `/career-ops outreach` review queue so the user is aware
- The project spec correctly notes "paid upgrade is user's choice" — design the contact-finding flow to degrade gracefully (find emails from free sources, show "no email found — manual lookup needed" rather than failing)

**Warning signs:** Contact lookup triggered during evaluation (before score threshold check) rather than after.

**Phase:** Phase 3 (Outreach). Address in OUT-01 and OUT-06 design.

---

### MOD-03: Cold Outreach "Personalization Theater" That Hiring Managers See Through

**What goes wrong:** There are personalization patterns that were effective in 2018-2022 and are now completely transparent to experienced hiring managers because they've seen them thousands of times:
1. "I came across your [company] on [LinkedIn/Hacker News] and was impressed by [generic thing]" — reads as a template fill-in
2. Referencing a recent company blog post when you clearly haven't read it deeply: "I saw your recent post about [title]" with no specific insight from the post
3. Opening with "I hope this email finds you well" (universally recognized as cold outreach)
4. Ending with "I'd love to grab 15 minutes of your time" — overused, sounds presumptuous
5. Subject lines: "Quick question", "Reaching out", "Collaboration opportunity" — all high-spam-signal

**Why it matters:** The project spec explicitly requires "sounds like the user (not a template)" and "intro/networking tone." The implementation must produce emails that pass a "have I seen this before?" test from a hiring manager who receives 20 cold emails/week.

**What actually works at scale (MEDIUM confidence from community reports):**
- Leading with a specific observation about the person's work (not company work) — their GitHub, a talk they gave, a specific technical decision visible in the company's engineering blog
- A genuine question that acknowledges the reader as a domain expert, not as a gatekeeper
- Brevity: under 100 words is better than under 150 words. Every sentence must earn its place.
- Subject lines that are direct and specific: "[Role] at [Company] — background in [specific skill]" outperforms vague hooks

**Prevention:**
- OUT-03 draft generation must pull specific signals from the job evaluation report (oferta mode already extracts team challenges and company context) — not generic company-level observations
- The human review step (OUT-04) is the quality gate here — the system generates, the user approves. This is already correct in the design.
- Build in a "personalization signal required" check: if the draft doesn't contain at least one specific reference to either the contact's work or a specific technical detail from the JD, flag it for stronger personalization before queuing

**Phase:** Phase 3 (Outreach). Address in OUT-03 draft generation prompt design.

---

### MOD-04: LinkedIn Job Discovery Rate and Bot Detection

**What goes wrong:** LinkedIn Jobs public search (`/jobs/search/`) is accessible without login, but LinkedIn aggressively bot-detects and IP-blocks automated access. Patterns that trigger blocking:
- Paginating through more than 5-10 pages of results in a single session
- Making requests at regular intervals (e.g., exactly every 2 seconds)
- Not respecting the User-Agent and browser fingerprint (pure HTTP fetches without a real browser context)
- Accessing from the same IP repeatedly over days

**Current scan.mjs approach is correct:** It uses Playwright (real browser context), not raw HTTP. This significantly reduces bot detection risk. But adding LinkedIn as a scan source requires careful rate management.

**Prevention for DISC-01:**
- Playwright for LinkedIn Jobs search is the right approach — do not use raw HTTP/WebFetch
- Limit to 2-3 pages of results per scan session (typically 25 results/page = 50-75 jobs, more than sufficient for a daily scan)
- Add random delays between page navigations (1.5-4 seconds, not fixed intervals)
- Run LinkedIn scan at most once per day (cron constraint already implied by DISC-03)
- Do not scan LinkedIn from a CI/CD environment (shared IPs are already blocked) — this must run on the user's local machine

**Warning signs:** 429 responses from LinkedIn even in Playwright — means IP flagging is occurring. Back off for 24 hours.

**Phase:** Phase 1 (Discovery). Address in DISC-01 design.

---

### MOD-05: ATS System Variation — What Each System Actually Checks

**What goes wrong:** Not all ATS systems are equal in their parsing capability. Optimizing for the wrong things for each system wastes effort.

**System behavior by platform (MEDIUM confidence):**

| ATS | Keyword Matching | Format Sensitivity | Notes |
|-----|-----------------|-------------------|-------|
| Workday | Semantic + exact; uses NLP since ~2022 | High — complex tables/columns parsed poorly | Most commonly used by enterprise; semantic matching means exact keyword stuffing is less useful |
| Greenhouse | Primarily full-text search by recruiter; limited auto-scoring | Low | Recruiter sees the resume directly; ATS "optimization" is less about scoring, more about clean parse |
| Lever | No built-in ATS scoring; candidate search is recruiter-driven | Low | Focus on human readability — the "ATS" here is just storage + search |
| Ashby | Similar to Lever; recruiter-driven search | Low | Focus on format clarity |
| Taleo (Oracle) | Old regex-based keyword matching; very literal | Very high — known to strip formatting | Over-optimizing for exact keywords still works here; clean text output critical |
| iCIMS | Moderate keyword matching | Moderate | Mid-market companies |
| SuccessFactors (SAP) | Enterprise-scale NLP; context-aware | Moderate | Large enterprise; semantic matching |

**Implication for ATS-02/03:** The keyword scoring system should account for which ATS the target company uses. A Lever-hosted role needs less keyword optimization and more human readability focus. A Taleo role needs exact keyword matching. This information is available from the job URL (already parsed by scan.mjs).

**Phase:** Phase 2 (ATS Resume). Add ATS platform detection to ATS-02 scoring logic.

---

### MOD-06: Volume Per Company Causing Damage

**What goes wrong:** Sending cold emails to multiple contacts at the same company in a short window (same day, or within 48 hours) creates a "spam the company" perception. Recruiters and hiring managers at the same company often share notes. Getting flagged by one contact poisons the well with others.

**Prevention:**
- The 2-contact max per company guardrail in OUT-06 is correct
- Add a time spacing requirement: if contact 1 was emailed, don't send to contact 2 at the same company for at least 5-7 days
- Track company-level outreach in a contacts ledger (not just individual contact tracking) so this constraint is enforceable
- The stale draft discard (7-day rule in OUT-06) correctly prevents sending to a role that has already moved forward or closed

**Phase:** Phase 3 (Outreach). Address in OUT-06 guardrails implementation.

---

## Minor Pitfalls

---

### MINOR-01: Indeed Rate Limiting and ToS for Automated Scraping

**What goes wrong:** Indeed does not have a public jobs API for general use (Indeed Publisher Program was deprecated). WebSearch with `site:indeed.com` works for discovery but is rate-limited by the search provider, not Indeed directly. Playwright scraping of Indeed job listings is technically a ToS violation (same as LinkedIn) but enforcement is less aggressive than LinkedIn.

**Practical stance:** Use WebSearch `site:indeed.com` queries (already in scan.md Level 3 approach) for discovery. Do NOT use Playwright to scrape Indeed directly. The existing WebSearch-based Level 3 approach in scan.mjs is correct for Indeed.

**Phase:** Phase 1 (Discovery). No new risk beyond what existing scan.mjs already handles.

---

### MINOR-02: Google Jobs Discovery — No Direct API

**What goes wrong:** Google Jobs (the jobs carousel/widget in search results) is powered by structured data on employer/ATS websites, not a queryable API. There is no `site:jobs.google.com` search. Discovering "Google Jobs" postings means discovering the underlying ATS pages that Google indexes — which the existing Level 2/3 scan approach already does.

**Prevention:** DISC-01 should not promise a "Google Jobs scanner" as a distinct data source. What can be delivered is: broader WebSearch queries that surface jobs Google has indexed across ATS platforms. This is effectively what Level 3 already does. Set expectations correctly in the implementation plan.

**Phase:** Phase 1 (Discovery). Scope clarification needed before implementation.

---

### MINOR-03: SPF/DKIM for Personal Gmail

**What goes wrong:** When sending from a personal `@gmail.com` address, SPF and DKIM are handled automatically by Google — you don't need to configure them. This is a non-issue for the personal Gmail use case.

Where this DOES matter: if the user later wants to send from a custom domain (`@adamsolomon.com`), they need SPF and DKIM records configured on that domain. Sending from a custom domain via Gmail SMTP without these records will result in ~50% of emails going to spam at major providers.

**Prevention:** Document the SPF/DKIM requirement as a prerequisite only if the user chooses to configure a custom domain sender. For `@gmail.com` sending, no action needed.

**Phase:** Phase 3 (Outreach). Non-blocking; document in setup instructions.

---

### MINOR-04: Jake's Resume Template — LaTeX Parsing Edge Cases

**What goes wrong:** Jake's resume template (widely used LaTeX format) has specific compilation requirements. Edge cases that cause LaTeX compilation failures:
- Special characters in company names or job titles (& % $ # _ { } ~ ^ \)
- Very long bullet points that exceed column width and break the two-column layout
- Unicode characters not in the LaTeX preamble (common with non-ASCII names or company names)
- Missing packages if the user's local LaTeX installation is incomplete

**Prevention:**
- The existing `generate-latex.mjs` already handles validation — extend it to check for unescaped special characters before compilation
- Add a sanitization pass for company/role names extracted from JD before injecting into the template
- Test compilation against at least 3-4 real JD keyword injections before shipping ATS-01

**Phase:** Phase 2 (ATS Resume). Address in ATS-01 template implementation.

---

### MINOR-05: Dedup Logic Gaps When Extending Discovery

**What goes wrong:** The current dedup uses three sources: `scan-history.tsv` (URL exact match), `applications.md` (company+role normalized), and `pipeline.md` (URL exact match). LinkedIn Jobs and Indeed URLs are not stable — the same job can appear under multiple URLs:
- `https://www.linkedin.com/jobs/view/1234567890` (canonical)
- `https://www.linkedin.com/jobs/view/1234567890?trk=...` (with tracking params)
- `https://indeed.com/viewjob?jk=abc123` (Indeed canonical)
- `https://indeed.com/rc/clk?jk=abc123&...` (Indeed click-through URL)

**Prevention:**
- Normalize URLs before dedup: strip query parameters for LinkedIn and Indeed URLs
- For LinkedIn: extract numeric job ID from URL and use that as the dedup key
- For Indeed: extract `jk=` parameter value as the canonical identifier
- This normalization should be added to the scan-history entry logic when DISC-01 is implemented

**Phase:** Phase 1 (Discovery). Address in DISC-04 dedup extension.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| DISC-01: LinkedIn Jobs scan | Bot detection, IP blocking | Playwright only; ≤3 pages; random delays; once/day |
| DISC-01: LinkedIn Jobs scan | Authenticated scraping if user is logged in on browser profile | Use a browser profile not logged into LinkedIn, OR navigate without cookies |
| DISC-02: Company discovery | LinkedIn company page scraping | Use public company pages only; do not paginate employee lists |
| ATS-01: Jake's template | LaTeX special characters breaking compilation | Sanitize all JD-extracted strings before injection |
| ATS-02: Keyword scoring | Rewarding exact keyword stuffing over semantic coverage | Use semantic similarity, not raw string count |
| ATS-03: Keyword injection | Injecting into resume in ways that read as keyword spam | Only inject into existing achievement bullets; flag unnatural insertions |
| OUT-01: Contact finding | Hunter.io/Apollo credit exhaustion | Cache results; try free sources first; degrade gracefully |
| OUT-01: Contact finding | LinkedIn profile scraping for emails | Use Hunter.io, Apollo, company pages only — never LinkedIn profile scraping |
| OUT-03: Draft generation | Generic "personalization" that hiring managers recognize as templates | Require specific signal from oferta report; flag low-specificity drafts |
| OUT-05: Gmail push | Spam pattern in draft body | Validate drafts against spam signal checklist before queuing |
| OUT-06: Guardrails | Same-company spam within short window | Track company-level send dates; enforce 5-day minimum between contacts at same company |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| LinkedIn ToS violations | HIGH | ToS text is stable and well-documented; case law (hiQ, Bright Data) is clear |
| Gmail deliverability | HIGH | Google's spam policies and signal patterns are well-documented and stable |
| ATS system behavior | MEDIUM | Vendor-specific details (Workday NLP, Taleo regex behavior) from training data; verify at build time |
| Outreach reputation patterns | MEDIUM | Based on community reports and hiring manager accounts through 2025; patterns may shift |
| Hunter.io/Apollo rate limits | MEDIUM | Free tier limits from training data; verify current limits at account creation |
| LinkedIn bot detection thresholds | LOW | Specific page counts and timing thresholds are inferred from community reports, not official documentation |

---

## Sources

Training data (cutoff August 2025) — no live web sources available in this environment.

Key cases/policies informing this document:
- LinkedIn User Agreement Section 8.2 (Dos and Don'ts) — stable since 2017, updated minor wording 2022-2024
- hiQ Labs, Inc. v. LinkedIn Corp. (9th Circuit, 2022) — established public data scraping legal landscape
- Meta Platforms v. Bright Data (2024) — reinforced authenticated scraping ToS enforcement
- Gmail Bulk Sender Guidelines (updated February 2024) — SPF/DKIM requirements, spam rate thresholds
- Google's February 2024 bulk sender policy update (one-click unsubscribe, 0.1% spam rate threshold)
- ATS vendor documentation and community analysis through 2025

**Gaps to validate before building:**
- Current Hunter.io and Apollo free tier credit limits (may have changed)
- Current LinkedIn bot detection behavior with Playwright on public job search pages
- Whether any ATS platforms (Workday, Greenhouse) have updated their parsing engines since 2024
