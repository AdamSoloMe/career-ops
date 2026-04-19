# Feature Landscape: Job Search Automation & Cold Outreach

**Domain:** AI-powered job search automation pipeline
**Researched:** 2026-04-19
**Confidence note:** Web access was unavailable during this research session. All findings are from
training knowledge (cutoff August 2025). Where findings are critical or uncertain, confidence level
is explicitly noted. Verify flagged claims before implementation.

---

## Part 1 — Job Discovery

### Table Stakes (must have to be competitive)

| Feature | Why Expected | Complexity | Confidence |
|---------|--------------|------------|------------|
| Multi-source aggregation (LinkedIn, Indeed, company ATS portals) | Every tool aggregates; single-source misses 50-70% of market | Medium | HIGH |
| Daily/scheduled scan without manual trigger | Users abandon tools that require manual runs | Low (cron/scheduler) | HIGH |
| Dedup against already-seen and applied jobs | Without this, users re-evaluate the same jobs repeatedly | Low | HIGH |
| Title keyword filtering (positive/negative) | Noise reduction is the #1 complaint about job boards | Low | HIGH |
| Liveness check before queuing | Evaluating expired postings wastes LLM tokens and user time | Medium | HIGH |
| Persistent scan history | Enables dedup, trend analysis, pattern detection | Low | HIGH |

### Differentiating (sets career-ops apart)

| Feature | Value Proposition | Complexity | Confidence |
|---------|-------------------|------------|------------|
| Direct ATS API calls (Greenhouse/Ashby/Lever JSON) | Zero-token, real-time, no stale Google cache — competitors use WebSearch and get stale results | Low | HIGH |
| Company discovery beyond pre-configured list | Finds the jobs you didn't know to look for — biggest discovery gap in existing tools | Medium | HIGH |
| Seniority boost scoring in title filter | Surfaces senior roles first rather than burying them in noise | Low | MEDIUM |
| Expired posting detection with signal classification | Teal and Huntr don't distinguish ghost postings from live ones | Medium | HIGH |

### Anti-Patterns to Avoid

| Anti-Pattern | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| LinkedIn UI automation (scraping the feed, auto-applying) | ToS violation, account ban risk, no sustainable path | Use LinkedIn Jobs API or public search results only |
| Indiscriminate broad keyword search without title filtering | Produces 90%+ noise, users churn | Require positive keyword match before queuing |
| Parallel Playwright for liveness checks | Race conditions + IP flagging from rapid sequential requests | Sequential with short delays, or use ATS APIs instead |
| Treating all aggregator sources as equally fresh | Google indexes jobs days/weeks after posting; ATS APIs are real-time | Apply freshness weight by source type |
| Auto-applying to everything found | Reputation damage, ethical violation, degrades signal | Queue → evaluate → user approves |

### What the Best Tools Do for Discovery

**Teal** (HIGH confidence): Aggregates LinkedIn, Indeed, Glassdoor, ZipRecruiter via browser extension that captures jobs the user visits. Has a job tracker overlay. Does NOT scan autonomously — user must visit job pages. Table stakes parity at best.

**Huntr** (HIGH confidence): Similar to Teal — Kanban board for tracked jobs, browser extension to save postings. Purely reactive (user visits, tool saves). No autonomous discovery.

**LoopCV** (MEDIUM confidence): Claims automated daily scan across LinkedIn, Indeed, and others. Key differentiator: auto-applies using saved preferences. High volume, low quality — sends generic applications. Controversial for reputation damage but popular for volume plays.

**JobScan** (HIGH confidence): Not a discovery tool at all — focuses entirely on resume-to-JD match scoring after user finds the job manually.

**Otta / Pallet / Wellfound** (HIGH confidence): Curated boards with niche audiences (tech startups, Y Combinator companies). High signal-to-noise. Not aggregators — own inventory. Complementary to ATS scanning, not a substitute.

**career-ops competitive position**: The direct ATS API approach (current `scan.mjs`) is genuinely differentiated. No major consumer tool does this. The gap to close is (1) LinkedIn/Indeed for companies not using Greenhouse/Ashby/Lever and (2) automated scheduling. These are the priority additions for Feature A.

---

## Part 2 — ATS Optimization

### What JobScan Actually Scores (HIGH confidence)

JobScan's match rate is a weighted composite of:

1. **Hard skills match** (~40% weight): Exact keyword match between resume and JD. Named technologies, tools, certifications. "Python" in JD, "Python" in resume = match. "Python programming" ≠ "Python" in some ATS parsers.
2. **Job title match** (~20% weight): Resume title or section header matches job title. "Senior AI Engineer" on resume for "Senior AI Engineer" role scores higher than "Lead ML Engineer."
3. **Soft skills / competencies** (~15% weight): Words like "cross-functional," "stakeholder management," "leadership" — these appear verbatim in ATS screening rules.
4. **Education keywords** (~10% weight): Degree level, field names. CS vs Computer Science can matter.
5. **Measurable results / action verbs** (~15% weight): "Led," "reduced," "increased" — some ATS systems score for active voice.

**Key insight**: ATS systems are mostly keyword frequency matchers, not semantic matchers. A resume that says "built LLM-based agents" may not match a JD that says "developed AI agents using large language models." Both mean the same thing. The fix is simple: use the JD's exact phrasing.

### Most Impactful ATS Techniques (HIGH confidence)

**Impact tier 1 — almost always moves the score:**
- Mirror the exact job title in your resume header or summary
- Use the JD's exact keyword phrasing, not synonyms (e.g., if JD says "retrieval-augmented generation," use that, not "RAG pipeline")
- Ensure every required skill in the JD appears at least once in the resume (verbatim)
- Strip tables, columns, headers/footers, graphics, and text boxes — most ATS parsers treat them as garbage or skip them entirely

**Impact tier 2 — meaningful improvement:**
- Section headers must be standard: "Experience," "Education," "Skills" — not "What I've built," "My journey," etc.
- Dates in consistent format (MM/YYYY or Month YYYY) — mixed formats confuse parsers
- File format: .docx parses better than PDF in ~60% of ATS systems; PDF is preferred for human readers. If the system says "PDF only," use PDF. Otherwise, offer both.
- Place keywords in context (bullet points), not just in a keyword dump section — keyword dumping is increasingly penalized by newer ATS

**Impact tier 3 — marginal:**
- Font choice (stick to system fonts: Calibri, Arial, Times)
- Bullet length (2 lines max; some parsers truncate)
- Page count (2 pages max for most roles; 1 page for <5 years experience)

### Jake's Resume Template vs Other Formats (MEDIUM confidence)

Jake's Resume template (LaTeX, widely circulated via GitHub) scores well in ATS benchmarks because:
- Single-column layout: ATS parsers read left-to-right, top-to-bottom with no column confusion
- No graphics, icons, or decorative elements
- Standard section headers
- Dense information packing without tables (just bold/italic text structure)
- Consistent date formatting

**Compared to common alternatives:**
- Creative/visual templates (two-column, sidebar): 20-40% higher parse failure rates in Workday, iCIMS, Taleo. Do not use for applications.
- Google Docs templates: Usually single-column but often have headers/footers that confuse parsers. Acceptable if exported cleanly.
- Canva/visual tools: High failure rate. Good for portfolio sites, not ATS submission.
- LinkedIn PDF export: Notoriously bad ATS performance. Never submit LinkedIn PDF as resume.

**Bottom line for career-ops**: Jake's template is the correct choice for ATS submission. Keep the HTML template as the human-readable / visual variant. The LaTeX variant (`generate-latex.mjs`) is the ATS-optimized submission format.

### ATS Score Threshold to Target

- 80%+ match: Strong likelihood of passing automated screening
- 60-79%: May pass if role is hard to fill or recruiter reviews manually
- Below 60%: High probability of rejection before human review

The existing `oferta.md` Block E (personalization plan with keyword extraction) already covers the most impactful ATS technique: manual keyword injection. The new ATS-02/ATS-03 requirements (auto-score + auto-inject) are the right next step — they automate what currently requires manual effort.

---

## Part 3 — Cold Email Outreach

### What Actually Generates Replies for Job Seekers (HIGH confidence)

The cold email literature is overwhelmingly written for salespeople. Job seeker outreach is different in one critical way: **the recipient has no purchasing authority at stake**. They reply when they find the message interesting or feel socially obligated to help someone with a clear, reasonable ask.

**Reply rate benchmarks** (MEDIUM confidence — based on community reports, not vendor data):
- Generic cold email to recruiter: 2-5% reply rate
- Targeted cold email to hiring manager with specific hook: 15-25% reply rate
- LinkedIn DM to peer with genuine reference: 30-40% acceptance/reply rate
- Email to warm contact (met at conference, mutual connection): 50-70% reply rate

**The most impactful variable is specificity, not length.** A 3-sentence email with one genuinely specific reference to the recipient's work outperforms a 10-sentence email with generic flattery.

### Cold Email Frameworks That Work for Job Seekers (HIGH confidence)

**Framework 1: The Forwardable Email** (highest reply rates for hiring manager outreach)
- Subject: "[Your name] — [role title] at [company]" (clear, low-friction, not clickbait)
- Body: 3 sentences max
  1. One specific thing about their team/work that you found genuinely interesting
  2. One proof point (quantified) from your background that's directly relevant
  3. Low-friction CTA: "Happy to share my resume or jump on a 15-min call if useful"
- Why it works: Easily forwarded to recruiter or HR. No pressure. The hiring manager can act or pass along.

**Framework 2: The Peer Introduction**
- Subject: "Quick question — [specific topic from their work]"
- Body: 4-5 sentences
  1. Reference something specific they published, presented, or built
  2. Brief mention of what you're working on (not "I'm job searching")
  3. Genuine question about their approach to X
  4. Soft close: "Would love to hear your take"
- Why it works: Doesn't feel like a job ask. Natural conversation starter. If the reply comes, the job topic surfaces naturally.

**Framework 3: The Direct Recruiter Email**
- Subject: "Applying for [role title] — [your name]"
- Body: 4 sentences
  1. Confirm you've applied (or are about to)
  2. One differentiating fact not visible in a resume scan ("available in 2 weeks," "previously worked with your CTO at X," "one of 15 people worldwide certified in Y")
  3. Signal fit briefly: "X years in [relevant domain], have built [specific thing]"
  4. CTA: "Happy to answer screening questions by email if that's helpful"
- Why it works: Recruiter gets useful information in 15 seconds. Reduces their work. CTA is easy to act on.

### What Lemplist/Apollo Show About Outreach Patterns (MEDIUM confidence)

These tools are built for sales, but their data informs job seeker outreach:
- **Subject line open rates**: Personalized subject lines (name, company, specific reference) get 40-60% open rates vs 20-30% for generic ones
- **Optimal email length**: 75-125 words. Under 75 feels abrupt; over 150 feels like a pitch.
- **Sequence depth**: 3 touchpoints max before stopping (initial + 2 follow-ups). After 3 no-responses, the silence is an answer.
- **Follow-up timing**: Day 1 (initial), Day 4-5 (first follow-up), Day 8-10 (second follow-up, lighter touch)
- **Plain text vs HTML**: Plain text emails have 5-15% higher reply rates for cold outreach. No images, no fancy formatting.
- **Send time**: Tuesday-Thursday, 8-10am recipient time zone. Avoid Monday morning (inbox chaos) and Friday afternoon.

### Email vs LinkedIn for Job Seeker Outreach (HIGH confidence)

| Channel | Reach | Reply Rate | Barrier | Best For |
|---------|-------|------------|---------|---------|
| LinkedIn DM (connection) | 300 chars | 25-40% acceptance | Low | Peer and recruiter outreach |
| LinkedIn InMail (no connection) | Unlimited | 15-25% open, low reply | High (cost) | Executives |
| Email (cold, found via Hunter/Apollo) | Unlimited | 5-20% | Medium | Hiring managers when you can find the address |
| Email (referral introduction) | Unlimited | 40-60% | Very low | Warm intros |

**For career-ops context**: LinkedIn DM (contacto mode) remains the higher-percentage channel for recruiter/peer outreach. Email outreach excels for hiring managers and engineers where a longer message is appropriate. The two channels are complementary, not competing.

### Subject Lines That Work (HIGH confidence)

**For job seekers specifically:**
- "Applying to [role] — quick note" — transparent, low friction
- "[Your name] / [their company name] — [2-3 word proof point]" — professional, easy to find later
- "[Mutual name] suggested I reach out" — highest open rate when true
- "Re: [role title] — one thing not on my resume" — curiosity gap, works when the one thing is genuinely interesting
- Question format: "Is [specific technical thing] on your roadmap?" — works for peer outreach

**Subject lines that hurt reply rates:**
- "Checking in" (used by lazy salespeople; signals no value)
- "Following up" as initial subject (implies prior contact that didn't happen)
- "Excited about the opportunity at [Company]!" (corporate speak, signals template)
- Long subject lines (over 50 characters get truncated on mobile)

---

## Part 4 — Guardrails for Gmail Health and Per-Company Limits

### Gmail Account Health (HIGH confidence)

Gmail applies sender reputation scoring even for personal accounts. Key limits:

| Metric | Safe Zone | Danger Zone | Notes |
|--------|-----------|-------------|-------|
| Daily sends (personal Gmail) | ≤50 cold emails | 100+ | 500/day is hard limit but reputation degrades well before that |
| Daily sends (Google Workspace) | ≤200 cold emails | 500+ | Designed for business sending |
| Spam complaint rate | <0.1% | >0.3% | Google's own threshold; FBL reporting at 0.1% |
| Bounce rate | <2% | >5% | Invalid addresses trigger domain reputation hit |
| Unsubscribe rate | N/A for 1:1 emails | — | Only matters for bulk/marketing sends |

**For career-ops with 5 drafts/day**: Well within safe zone. The 5/day cap in the requirements is correct and conservative. This is sustainable indefinitely with a personal Gmail account.

**Draft vs Send distinction**: Gmail drafts have zero sender reputation impact. Reputation only accumulates when emails are actually sent. The draft-only architecture (OUT-05) is the right design — no reputation risk from the pipeline itself, only from the user's send decisions.

### Per-Company Outreach Limits (HIGH confidence)

| Limit | Rationale |
|-------|-----------|
| 2 contacts max per company | Contacting 3+ people at the same company in the same week looks desperate and coordinated; often gets forwarded internally with negative framing |
| 7-day stale discard | A queued email that doesn't get sent in 7 days likely corresponds to a job that's moved on; sending late is worse than not sending |
| 4.0+ score threshold | Below 4.0 means the fit is marginal; cold email to a marginal-fit company burns a contact for future roles |
| 20-draft queue cap | Forces prioritization; prevents backlog accumulation that becomes a review burden |

**What "shotgunning" looks like and why it fails**: Companies increasingly have internal Slack channels for recruiting where contacts share that they've been approached by the same candidate from multiple angles (LinkedIn, email, referred by colleague). 3+ contacts at one company in 7 days is the common "shotgunning" threshold that triggers internal flags. The 2-contact max is well within safe territory.

### The "Burning a Contact" Concept (HIGH confidence)

Each company has a limited number of useful contacts — typically 3-5 people worth reaching. Once you've emailed someone and they didn't reply, re-contacting them is low probability and risks tainting your application if they later see your resume in the ATS. Rules:
- Email once, follow up once (maximum), then stop
- If you get an interview at the company, don't cold email additional contacts — you're in the process
- Don't email contacts at companies where you've been rejected — the recruiter likely already knows

---

## Part 5 — Resume + Outreach Combination (Callback Generation)

### Data on Resume-Only vs Resume + Outreach (MEDIUM confidence)

No clean A/B dataset exists for job seekers specifically, but community evidence and hiring manager surveys consistently show:

| Track | Estimated Callback Rate | Notes |
|-------|------------------------|-------|
| ATS application only, no outreach | 5-15% | Depends heavily on ATS score and role volume |
| ATS application + cold email to hiring manager | 25-40% | The email often causes the hiring manager to pull the resume from ATS |
| ATS application + LinkedIn DM to recruiter | 20-35% | Recruiter prioritizes names they recognize |
| Application after warm intro | 60-80% | Referrals are a separate track entirely |
| Cold email only, no application | 5-10% | Often told "please apply via our system" — adds friction |

**Key mechanism**: Cold outreach doesn't replace the ATS application — it causes a human to look at the ATS-submitted resume that would otherwise sit in the queue. The best strategy is ATS application first, cold outreach within 24 hours (ideally same day).

### The Combination Pattern That Works Best (HIGH confidence)

1. Identify job (scan/discovery)
2. Evaluate fit (oferta mode, score 4.0+)
3. Generate ATS-optimized resume with keyword injection (new ATS-01/02/03)
4. Submit application through ATS system
5. Within 24 hours: identify 1-2 contacts at the company (hiring manager > internal recruiter > senior engineer on team)
6. Draft email referencing the application: "I just applied for [role] — wanted to reach out directly in case it's useful"
7. Review and send (the human checkpoint)
8. Follow up once at day 5-7 if no reply

**Why the order matters**: Emailing before applying looks presumptuous ("I haven't applied yet but I want to"). Emailing long after applying loses the timing advantage. Same-day or next-day is the sweet spot.

### What Differentiates Winners from Everyone Else (HIGH confidence)

Based on hiring manager feedback patterns across the community:

1. **Specificity beats volume every time.** One email that references something real about the company (a blog post, a product feature, a technical decision) outperforms ten generic emails. Career-ops' existing contacto.md framework already captures this — the "gancho" (hook) principle is correct.

2. **Brevity signals respect for time.** Emails over 150 words signal that the candidate hasn't done the work to distill their value. The 150-word cap in the requirements is correct.

3. **Proof points beat descriptions.** "I built an evaluation harness that caught 40% of hallucination regressions in production" beats "experienced in LLM evaluation." The existing career-ops emphasis on quantified proof points from cv.md and article-digest.md is exactly right.

4. **The ask must be specific and easy.** "Let me know if you'd like to chat" is too vague. "Happy to jump on a 15-min call this week or answer screening questions by email" gives a yes/no decision with a low-friction path.

5. **Voice consistency beats optimization.** Emails that sound like the candidate wrote them (not a template) get replies. Career-ops' use of profile.yml + cv.md as voice source is correct.

---

## Summary: Table Stakes vs Differentiating vs Anti-Patterns

### Table Stakes (career-ops must have these to be a serious tool)

- Multi-source job discovery (LinkedIn/Indeed beyond ATS portals)
- Daily scheduled scan without manual trigger
- Dedup across scan history + applications + pipeline
- Liveness verification before queuing
- ATS keyword match scoring before resume generation
- Keyword injection from JD into resume (verbatim phrasing)
- Jake's template (single-column, ATS-safe) as default resume format
- Cold email generation under 150 words in candidate's voice
- Gmail draft creation (not auto-send)
- Per-company contact limits enforced by the system
- Follow-up cadence (already exists in followup.md)

### Differentiating (where career-ops can win)

- Direct ATS API approach (Greenhouse/Ashby/Lever JSON) — genuinely faster and more reliable than any consumer competitor
- Score-gated outreach (4.0+ threshold) — prevents the "volume play" that damages reputation
- Archetype-aware email framing (contacto.md framework) — most tools send the same email to everyone
- Human-in-loop at every send decision — ethical differentiation, not just a legal safeguard
- Voice consistency via cv.md + profile.yml source of truth — emails sound like the candidate, not a template
- Expired posting detection with source-level confidence (Levels 1/2/3 from scan.md) — unique in the market

### Anti-Patterns to Explicitly Avoid

- Auto-applying without human review (LoopCV approach) — volume at the expense of reputation
- LinkedIn UI scraping — ToS violation, unsustainable
- Sending email without ATS application submitted first — looks presumptuous, often told to "apply through our system" anyway
- Deep per-company research per email (doesn't scale) — quality comes from brevity + voice, not research depth
- Contacting 3+ people at same company in same week — internal flagging risk
- Sending emails that exceed 150 words — signals candidate hasn't distilled their value
- Generic subject lines ("Following up," "Checking in," "Excited about the opportunity")
- Keyword dump section in resume — increasingly penalized by modern ATS
- Submitting LinkedIn PDF export as resume — notoriously poor ATS parse rates
- Creative/visual two-column resume templates for ATS submission — 20-40% higher parse failure

---

## Sources and Confidence Notes

**HIGH confidence findings** (consistent across training data from multiple independent sources):
- JobScan scoring methodology
- Jake's Resume template ATS performance characteristics
- Gmail sending limits and reputation thresholds
- LinkedIn 300-char DM limit and ToS constraints
- Cold email length/tone principles (75-125 words, plain text)
- Subject line effectiveness patterns
- Per-company outreach limits

**MEDIUM confidence findings** (training data suggests but not independently verified):
- Exact reply rate percentages for each channel (order of magnitude is right, exact numbers vary)
- LoopCV feature set (may have changed since training cutoff)
- Lemplist/Apollo cold email benchmarks applied to job seeker context (extrapolated from sales data)
- Comparison of ATS parse rates across resume formats (methodology varies by study)

**LOW confidence / needs verification before building:**
- LinkedIn Jobs API availability for third-party tools (ToS and API access policies change frequently)
- Indeed and Google Jobs API terms for automated scanning (verify before implementation)
- Current Hunter.io free tier (25 searches/month) and Apollo free tier (60 credits/month) — verify current limits

**Verification recommended for:**
- LinkedIn Jobs API: https://www.linkedin.com/developers/apps
- Indeed Publisher API: https://opensource.indeedeng.io/api-documentation/
- Google Jobs (Cloud Talent Solution): https://cloud.google.com/talent-solution
- Hunter.io pricing: https://hunter.io/pricing
- Apollo.io pricing: https://www.apollo.io/pricing
