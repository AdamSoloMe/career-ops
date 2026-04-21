# Mode: oferta - Full A-G Evaluation

When the candidate pastes a job posting, either as text or URL, ALWAYS deliver the 7 core blocks: A-F evaluation plus G legitimacy.

## Step 0 - Archetype Detection

Classify the role into one of the 6 archetypes from `_shared.md`. If it is hybrid, name the 2 closest archetypes. This determines:
- Which proof points to prioritize in Block B
- How to rewrite the summary in Block E
- Which STAR stories to prepare in Block F

## Block A - Role Summary

Return a table with:
- Detected archetype
- Domain (platform / agentic / LLMOps / ML / enterprise)
- Function (build / consult / manage / deploy)
- Seniority
- Remote setup (full / hybrid / on-site)
- Team size, if mentioned
- One-sentence TL;DR

## Block B - CV Match

Read `cv.md`. Build a table mapping each JD requirement to exact evidence from the CV.

**Adapted to the archetype:**
- If FDE -> prioritize rapid-delivery and client-facing proof points
- If SA -> prioritize system design and integrations
- If PM -> prioritize product discovery and metrics
- If LLMOps -> prioritize evals, observability, and pipelines
- If Agentic -> prioritize multi-agent, HITL, and orchestration
- If Transformation -> prioritize change management, adoption, and scaling

Include a **gaps** section with a mitigation strategy for each gap. For every gap answer:
1. Is it a hard blocker or a nice-to-have?
2. Can the candidate show adjacent experience?
3. Is there a portfolio project that helps cover it?
4. What is the concrete mitigation plan? For example: cover-letter line, quick project, interview framing

## Block C - Level And Strategy

1. **Detected level** in the JD versus the candidate's **natural level for that archetype**
2. **"Sell senior without lying" plan:** specific phrases, concrete achievements to emphasize, and how to position founder experience as an advantage
3. **"If they downlevel me" plan:** whether to accept if comp is fair, how to negotiate a 6-month review, and how to ask for clear promotion criteria

## Block D - Comp And Demand

Use WebSearch for:
- Current salary ranges for the role
- Company compensation reputation
- Demand trend for the role

Return a table with sourced data. If you cannot find data, say so instead of inventing it.

## Block E - Personalization Plan

| # | Section | Current State | Proposed Change | Why |
|---|---------|---------------|-----------------|-----|
| 1 | Summary | ... | ... | ... |
| ... | ... | ... | ... | ... |

List the top 5 CV changes and top 5 LinkedIn changes to improve match quality.

## Block F - Interview Plan

Generate 6-10 STAR+R stories mapped to JD requirements:

| # | JD Requirement | STAR+R Story | S | T | A | R | Reflection |
|---|----------------|--------------|---|---|---|---|------------|

The **Reflection** column captures what was learned or what would be done differently. This signals seniority: junior candidates describe what happened, stronger candidates extract lessons.

**Story Bank:** If `interview-prep/story-bank.md` exists, check whether any of these stories are already there. If not, append them. Over time this should build a reusable bank of 5-10 master stories.

**Selected and framed by archetype:**
- FDE -> emphasize delivery speed and client-facing work
- SA -> emphasize architecture decisions
- PM -> emphasize discovery and trade-offs
- LLMOps -> emphasize metrics, evals, and production hardening
- Agentic -> emphasize orchestration, error handling, and HITL
- Transformation -> emphasize adoption and organizational change

Also include:
- 1 recommended case study: which project to present and how to frame it
- Red-flag questions and how to answer them

## Block G - Posting Legitimacy

Analyze whether the posting appears to be a real, active opening. Help the user prioritize effort toward roles most likely to result in a real hiring process.

**Ethical framing:** Present observations, not accusations. Every signal can have a legitimate explanation. The user decides how much weight to give them.

### Signals to analyze, in order

**1. Posting freshness** from the page snapshot:
- Date posted or "X days ago"
- Apply button state: active, closed, missing, or redirecting to a generic page
- Whether the URL redirects to a generic careers page

**2. Description quality** from the JD text:
- Does it name specific technologies, frameworks, or tools?
- Does it mention team size, reporting structure, or org context?
- Are requirements realistic?
- Is there a clear 6-12 month scope?
- Is comp mentioned?
- How much is role-specific versus generic boilerplate?
- Are there internal contradictions?

**3. Company hiring signals** using 2-3 WebSearch queries, combined with Block D research:
- `"{company}" layoffs {year}`
- `"{company}" hiring freeze {year}`
- If layoffs are found, note whether they affected the same function

**4. Reposting detection** from `scan-history.tsv`:
- Check whether the same company and similar role appeared before with a different URL
- Note how many times and over what period

**5. Role market context** without additional searching:
- Is this a common role that typically fills in 4-6 weeks?
- Does the role make sense for the business?
- Is the seniority level one that usually takes longer to fill?

### Output format

**Assessment:** Choose one:
- **High Confidence** - Multiple signals suggest a real, active opening
- **Proceed with Caution** - Mixed signals worth noting
- **Suspicious** - Multiple ghost-job indicators; investigate before investing time

**Signals table:** Each observed signal with its finding and weight: Positive, Neutral, or Concerning.

**Context notes:** Any caveats that explain concerning-looking signals.

### Edge cases

- **Government or academic roles:** Longer timelines are normal. Use 60-90 day thresholds.
- **Evergreen or continuous-hire roles:** If the JD explicitly says ongoing or rolling, note that it is a pipeline role rather than a ghost job.
- **Niche or executive roles:** Staff+, VP, Director, and highly specialized roles can stay open for months.
- **Startup or pre-revenue companies:** Vague JDs may reflect a genuinely undefined role.
- **No posting date available:** If age cannot be determined and there are no other strong concerns, default to **Proceed with Caution**, not **Suspicious**.
- **Recruiter-sourced roles:** Freshness signals may be unavailable. Active recruiter outreach is itself a positive sign.

---

## Block I - ATS Analysis

Read `cv.md`, which is already loaded for Block B. If `cv.md` does not exist, write `**ATS:** N/A (cv.md not found)` and skip the entire block.

### Extract JD keywords

Extract keywords in three categories. Prioritize required and preferred sections. Ignore generic boilerplate such as benefits, equal-opportunity language, location, or visa notes.

**Hard skills (weight: 45%)**  
Explicit tools, frameworks, languages, platforms, and methodologies, for example Python, LangChain, Kubernetes, RAG, CI/CD. Limit to the most specific 15-20 terms.

**Job title keywords (weight: 25%)**  
Words from the role title and seniority modifiers, for example Senior, Staff, Lead, Head of, Engineer, Manager, Architect.

**Soft skills / action verbs (weight: 15%)**  
Action verbs and softer signals from the JD, such as led, built, shipped, mentored, owned, collaborated, cross-functional, communication, stakeholder, strategic.

**Quantification / evidence (weight: 15%)**  
If the JD emphasizes impact, ownership, scale, metrics, or business outcomes, evaluate whether `cv.md` shows measurable results, scope, or strong evidence in relevant bullets.

### Sunny-style scoring dimensions

For each extracted keyword, evaluate against `cv.md`:
- **Full match (1.0):** exact keyword or direct synonym appears in `cv.md`
- **Partial match (recommended 0.8):** related concept is present but wording differs
- **Missing (0.0):** concept is not found

Compute these six base dimension scores before computing any platform score:

| Dimension | How to score from `cv.md` and the JD |
|-----------|--------------------------------------|
| Formatting | ATS-safe structure proxy from `cv.md` or generated PDF: single-column, standard headings, parseable text, no critical text in images/headers/footers. If only markdown is available, label this as a proxy. |
| Keyword Match | Sunny-style keyword formula: `K = min(100, ((|M| + 0.8 * |S|) / |J|) * 100)`, where `|M|` is exact matches, `|S|` is synonym/partial matches, and `|J|` is distinct JD keywords. |
| Section Completeness | Presence and clarity of standard resume sections: Summary, Work Experience, Skills, Projects, Education, Certifications if relevant. |
| Experience Relevance | Strength of direct evidence against the role archetype, seniority, domain, and core responsibilities. |
| Education Match | Degree/certification match where the JD asks for education or credentials; otherwise score neutral-to-high and explain why it is not a differentiator. |
| Quantification | Evidence of metrics, scale, ownership, business outcomes, and concrete delivery results. |

Adjust keyword matching by platform strategy:
- Workday, Taleo, and SuccessFactors -> exact-match-oriented; treat important partial matches as priority gaps
- iCIMS -> fuzzy keyword and skills-taxonomy matching
- Greenhouse and Lever -> semantic/human-review-friendly; accept clear equivalents more easily
- Ashby -> report separately as a career-ops criterion-based note, not one of the six Sunny-style platform scores

Category score = sum of match scores / total extracted keywords x 100%

### Six platform scores

Compute six ATS platform scores using the Sunny-style formula:

`S_p = clamp(0, 100, sum_i(w_i(p) * d_i) + Q_p)`

Where `d_i` is the 0-100 score for each dimension and `Q_p` is the quirk adjustment. Use `Q_p = 0` unless there is a documented platform-specific issue visible in the resume/JD context; never invent quirk penalties.

| Platform | Formatting | Keyword | Sections | Experience | Education | Quantification | Pass threshold | Strategy |
|----------|------------|---------|----------|------------|-----------|----------------|----------------|----------|
| Workday | 0.25 | 0.30 | 0.15 | 0.15 | 0.10 | 0.05 | 70 | Exact-oriented with NLP synonym support |
| Taleo | 0.20 | 0.35 | 0.15 | 0.15 | 0.10 | 0.05 | 65 | Strict exact matching |
| iCIMS | 0.15 | 0.30 | 0.15 | 0.20 | 0.10 | 0.10 | 60 | Fuzzy keyword plus skills taxonomy |
| Greenhouse | 0.10 | 0.25 | 0.10 | 0.25 | 0.10 | 0.20 | 55 | Semantic and recruiter-review friendly |
| Lever | 0.08 | 0.22 | 0.10 | 0.30 | 0.10 | 0.20 | 50 | Most forgiving semantic/stemming profile |
| SuccessFactors | 0.25 | 0.25 | 0.20 | 0.15 | 0.10 | 0.05 | 65 | Structured-fields and exact-match oriented |

**ATS Simulation Score** should be the inferred platform score from the six-platform table. If the platform is unknown, use the lowest score among Workday, Taleo, iCIMS, Greenhouse, Lever, and SuccessFactors as the conservative simulation score and label it `Unknown - conservative lowest-platform score`.

**Screening Readiness Score** should estimate the full initial-screen outcome:
- Recommended baseline: `(Experience Relevance x 0.40) + (Keyword Match x 0.25) + (Quantification x 0.20) + (Section Completeness x 0.10) + (Education Match x 0.05)`
- This score is a career-ops human-screen estimate, not a Sunny platform score

### Infer ATS platform

Detect the platform from the JD URL:

| URL contains | Platform | Strictness |
|-------------|----------|------------|
| greenhouse.io | Greenhouse | Moderate - fuzzy plus semantic matching |
| lever.co | Lever | Flexible - stemming-based, among the most forgiving |
| ashbyhq.com | Ashby | Criterion-based - binary recruiter criteria matter more than keyword density |
| myworkdayjobs.com / workday.com | Workday | Moderate - NLP often understands synonyms |
| taleo.net | Taleo | Strictest - exact keyword matching |
| icims.com | iCIMS | Moderate - keyword plus skills taxonomy |
| successfactors.com / sapsf.com | SAP SuccessFactors | Moderate-strict - structured fields matter, NLP is limited |
| no match | Unknown | Assume moderate strictness |

### Output for Block I

**ATS Simulation Score:** `{sim_score}% ({platform} - {strictness one-liner})`  
**Screening Readiness Score:** `{ready_score}%`

#### Category breakdown

| Category | Matched | Missing | Score |
|----------|---------|---------|-------|
| Hard skills (45%) | {list} | {list} | {x}/{n} = {%}% |
| Job title (25%) | {list} | {list} | {x}/{n} = {%}% |
| Soft skills / action verbs (15%) | {list} | {list} | {x}/{n} = {%}% |
| Quantification / evidence (15%) | {strengths} | {gaps} | {x}/{n} = {%}% |

#### Sunny-style dimension scores

| Dimension | Score | Evidence |
|-----------|-------|----------|
| Formatting | {%}% | {resume-structure evidence; say "markdown proxy" if no PDF/DOCX parse test exists} |
| Keyword Match | {%}% | `K = min(100, ((|M| + 0.8 * |S|) / |J|) * 100)` = {calculation} |
| Section Completeness | {%}% | {sections present/missing} |
| Experience Relevance | {%}% | {role evidence summary} |
| Education Match | {%}% | {education/certification match or neutral note} |
| Quantification | {%}% | {metrics/outcomes evidence} |

#### Sunny-style platform scores

| Platform | Score | Pass threshold | Verdict | Strategy | Formula notes |
|----------|-------|----------------|---------|----------|---------------|
| Workday | {%}% | 70 | {Pass/Risk} | Exact-oriented with NLP synonym support | `S_p = clamp(0, 100, weighted dimensions + Q_p)` |
| Taleo | {%}% | 65 | {Pass/Risk} | Strict exact matching | `S_p = clamp(0, 100, weighted dimensions + Q_p)` |
| iCIMS | {%}% | 60 | {Pass/Risk} | Fuzzy keyword plus skills taxonomy | `S_p = clamp(0, 100, weighted dimensions + Q_p)` |
| Greenhouse | {%}% | 55 | {Pass/Risk} | Semantic and recruiter-review friendly | `S_p = clamp(0, 100, weighted dimensions + Q_p)` |
| Lever | {%}% | 50 | {Pass/Risk} | Most forgiving semantic/stemming profile | `S_p = clamp(0, 100, weighted dimensions + Q_p)` |
| SuccessFactors | {%}% | 65 | {Pass/Risk} | Structured-fields and exact-match oriented | `S_p = clamp(0, 100, weighted dimensions + Q_p)` |

**Keyword formula:** `K = min(100, ((|M| + 0.8 * |S|) / |J|) * 100)`  
**Platform formula:** `S_p = clamp(0, 100, sum_i(w_i(p) * d_i) + Q_p)`  
**Readiness formula:** `(Experience Relevance x 0.40) + (Keyword Match x 0.25) + (Quantification x 0.20) + (Section Completeness x 0.10) + (Education Match x 0.05) = {ready_score}%`

#### Missing keyword guidance

For each missing **hard skill** and **job title** keyword, identify where it could be added naturally in `cv.md`:

**Missing: {keyword}** - Add it to `Experience > {Company} > {specific existing bullet}`  
Suggested wording: `...{natural phrase integrating the keyword into real existing experience}...`

For missing soft skills or action verbs:
- Missing soft skills: `{list}`

If the relevant bullet exists but the evidence is weak for a human screen:
- **Weak evidence: {theme}** - Strengthen `Experience > {Company} > {specific bullet}` with real scale, ownership, or measurable impact already supported by the candidate's experience
- Suggested wording: `...{natural phrase adding real context without inventing experience}...`

**Critical rule:** Only guide toward reframing real experience. Never suggest adding skills or experience the candidate does not actually have.

## Post-Evaluation

ALWAYS, after generating Blocks A-G:

### 1. Save the report

Save the full evaluation to `reports/{###}-{company-slug}-{YYYY-MM-DD}.md`

- `{###}` = next sequential number, zero-padded to 3 digits
- `{company-slug}` = lowercase company name with spaces replaced by hyphens
- `{YYYY-MM-DD}` = current date

**Report format:**

```markdown
# Evaluation: {Company} - {Role}

**Date:** {YYYY-MM-DD}
**Archetype:** {detected}
**Score:** {X/5}
**ATS:** Sim {sim_score}% | Ready {ready_score}% ({platform}) - Missing: {kw1}, {kw2}, {kw3}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**PDF:** {path or pending}

---

## A) Role Summary
(full contents of Block A)
```
