# Phase 2: ATS Resume Scoring — Research

**Researched:** 2026-04-20
**Domain:** Prompt-engineering for ATS keyword analysis; modes markdown extension pattern; report format integration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** ATS Analysis is **Block I** (`## I) ATS Analysis`) — added after the existing Block H (Draft Application Answers). Draft Application Answers remain `## H)` with no changes to `modes/oferta.md:191` or `modes/auto-pipeline.md:35`. Zero disruption to existing block references in batch workers or tests.

- **D-02:** The `**ATS:**` header line appears **after `**Score:**` and before `**Legitimacy:**`**. Full report header format:
  ```
  **Score:** {X/5}
  **ATS:** Sim {sim_score}% | Ready {ready_score}% ({platform}) — Missing: {kw1}, {kw2}, {kw3}
  **Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
  **PDF:** {path or pending}
  ```
  The header line is intentionally brief — just the two %, platform, and top missing keywords. Full detail lives in Block I body.

- **D-03:** Block I body does NOT just list missing keywords. For each missing keyword, it identifies which specific CV experience or project bullet could/should be updated, and how to naturally incorporate that keyword. Soft skills/action verbs that don't map to a specific bullet are listed without placement guidance.
  ```
  **Missing: LangChain** — Add to "Experience > Acme Corp > [bullet about AI pipeline work]".
  Suggested phrasing: "...orchestrated multi-step workflows using LangChain agents..."
  ```

- **D-04:** Batch mode (`claude -p` workers) runs the **full ATS analysis** — same dual-score logic and guidance depth as interactive mode. Context budget in workers is ample; no abbreviated version needed.

- **D-05 (Claude's Discretion):** Scoring approach follows ATS-01: keyword frequency + semantic relevance, not raw string count. Use a dual-score model: ATS Simulation for machine risk, Screening Readiness for overall initial-screening quality. ATS Simulation parity applies to Workday, Taleo, iCIMS, Greenhouse, Lever, and SAP SuccessFactors. Ashby is a project-specific extension and not part of ATS Screener parity.

### Hard Fidelity Rules

- **R-01:** ATS Simulation Score uses ATS Screener pass thresholds for the six documented ATS platforms:
  - Workday `70`
  - Taleo `65`
  - iCIMS `60`
  - Greenhouse `55`
  - Lever `50`
  - SuccessFactors `65`
- **R-02:** When scoring from `cv.md`, ATS Simulation omits formatting, parser, and section-detection dimensions rather than approximating them from markdown.
- **R-03:** Education is excluded from ATS Simulation by default and is only included when the JD explicitly requires a degree, certification, or educational credential that is clearly present or absent in `cv.md`.
- **R-04:** Ashby is excluded from ATS Screener parity and treated as a separate career-ops extension.

### Claude's Discretion

- Exact scoring rubric within the hybrid categories (how to weight each, how to compute the % from sub-scores)
- How many missing keywords to show in the header line (recommend top 3–5)
- Exact `test-all.mjs` regex pattern for the new `**ATS:**` header field
- Whether Block I appears in `modes/batch.md` or only in `batch/batch-prompt.md`

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| ATS-01 | Score resume against JD using keyword + semantic matching modeled on ats-screener approach | Scoring rubric research; 3-category prompt design |
| ATS-02 | ATS match score (0-100%) in report alongside offer score, with matched/missing keyword breakdown | Report header D-02 format; Block I body D-03 format |
| ATS-03 | Score distinguishes hard skills, job title match, and soft skills/action verbs — not a single raw count | Category weighting research; prompt structure for 3-category output |
| ATS-04 | ATS platform inferred from job URL; report notes expected strictness level per platform | URL pattern research; platform strictness table |
</phase_requirements>

---

## Summary

This phase is entirely a **prompt engineering and markdown editing** phase — no new Node.js code, no new npm packages, no new CLI tools. All four requirements (ATS-01 through ATS-04) are implemented by adding a Block I prompt block to `modes/oferta.md`, updating the report header template in `modes/oferta.md`, `modes/auto-pipeline.md`, `batch/batch-prompt.md`, and adding one regex check to `test-all.mjs`. The implementation surface is small and well-bounded.

The key intellectual work is designing the scoring rubric that maps naturally to a language model's strengths. The `ats-screener` reference repo uses a broader engine: custom TF-IDF/tokenization, a skills taxonomy, six platform profiles, and five scoring dimensions (formatting, keyword match, sections, experience, education). Because this system runs on Claude against `cv.md` rather than parsing uploaded PDF/DOCX files, the scoring must be prompt-engineered: the model reads the JD, extracts keyword sets, reads `cv.md`, and reasons about presence/absence. The scoring formula must be explicit enough that results are consistent and comparable across evaluations without being so rigid that it produces nonsense outputs.

The existing `modes/oferta.md` Block G (Posting Legitimacy) is the canonical pattern to follow: it defines a structured analysis, uses signal tables, produces a tiered assessment, and has a clear output format. Block I follows the exact same implementation pattern.

**Primary recommendation:** Implement Block I as a prompt block in `modes/oferta.md` following the Block G pattern. Use a dual-score approach: keep a score that is closer to `ats-screener` for machine-screening realism, and add a second score for overall screening readiness so the report remains actionable for resume improvement. Borrow from `ats-screener` the platform-specific matching mindset, the distinction between exact/fuzzy/semantic behavior, and the caution that a single ATS score is only a heuristic. Add a lightweight quantification/evidence check for Readiness. Do not try to copy the parser/formatting engine. In particular, ATS Simulation should omit formatting/parser/section dimensions when using `cv.md`, use ATS Screener thresholds for the six documented ATS platforms, exclude education unless the JD explicitly requires it, and treat Ashby as a separate extension. Insert the `**ATS:**` header line exactly as specified in D-02.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Keyword extraction from JD | LLM (Claude) | — | JDs are unstructured text; Claude reads and categorizes in-context |
| Resume keyword matching | LLM (Claude) | — | cv.md is read at eval time; matching is in-context reasoning, not code |
| Scoring calculation | LLM (Claude) | — | Explicit prompt rubric; no Node.js math needed |
| Platform URL inference | LLM (Claude) | — | Simple domain pattern matching in prompt |
| Report header insertion | modes/*.md | — | Prompt template edit; no code |
| Report body (Block I) | modes/oferta.md | batch/batch-prompt.md | Same prompt block duplicated into worker template |
| test-all.mjs validation | Node.js test | — | One regex assertion for new header field |

---

## Standard Stack

### Core

This phase has no new library dependencies. All work is markdown/prompt editing plus one test assertion.

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| `modes/oferta.md` | existing | Block I prompt lives here | System layer, established pattern |
| `modes/auto-pipeline.md` | existing | Report header format update | System layer |
| `batch/batch-prompt.md` | existing | Worker receives full ATS block | System layer |
| `test-all.mjs` | existing | Validates new `**ATS:**` header field | Established CI gating |

### No New Packages Required

[VERIFIED: codebase grep] The implementation is entirely prompt engineering. No npm install needed.

---

## Architecture Patterns

### System Architecture Diagram

```
Job URL / JD text
       │
       ▼
  [Paso 0: Extract JD]
       │
       ▼
  [Block A–H: Existing evaluation]
       │
       ▼
  ┌─────────────────────────────────────────────┐
  │  Block I: ATS Analysis (NEW)                │
  │                                             │
  │  Read cv.md (already loaded for Block B)    │
  │        │                                    │
  │        ▼                                    │
  │  Extract 3 keyword sets from JD:            │
  │  ├── Hard skills (tools, frameworks, tech)  │
  │  ├── Job title keywords                     │
  │  └── Soft skills / action verbs             │
  │        │                                    │
  │        ▼                                    │
  │  Score each set against cv.md:              │
  │  ├── matched keywords (present in cv)       │
  │  └── missing keywords (absent from cv)      │
  │        │                                    │
  │        ▼                                    │
  │  Infer ATS platform from URL domain         │
  │  (greenhouse.io / lever.co / ashby.hq /     │
  │   workday.com / taleo.net / unknown)        │
  │        │                                    │
  │        ▼                                    │
  │  Compute weighted overall %                 │
  │  Map top missing keywords to CV bullets     │
  │        │                                    │
  └─────────────────────────────────────────────┘
            │
            ▼
  [Report header: **ATS:** Sim {sim_score}% | Ready {ready_score}% ({platform}) — Missing: kw1, kw2, kw3]
  [Block I body: full breakdown + placement guidance]
```

### Recommended Project Structure

No new folders. All changes are in-place edits to existing files:

```
modes/
├── oferta.md          ← Add Block I after Block H (line ~197+); update report header template
├── auto-pipeline.md   ← Insert **ATS:** line in report header format (Step 2)
batch/
└── batch-prompt.md    ← Add Block I instructions and **ATS:** header line
test-all.mjs           ← Add regex check for **ATS:** field
```

### Pattern 1: Block G as the model for Block I

**What:** Block G (Posting Legitimacy) is an analysis block that reads external signals, produces a structured table, outputs a tiered assessment, and has explicit edge-case handling. Block I follows this exact pattern applied to ATS analysis.

**When to use:** Anytime a new structured analysis block is added to `modes/oferta.md`.

**Example — Block G output structure (existing pattern to follow):**
```markdown
## G) Posting Legitimacy

**Assessment:** High Confidence

| Signal | Finding | Weight |
|--------|---------|--------|
| Posting age | 12 days | Positive |
| Apply button | Active | Positive |
| Tech specificity | Names 7 frameworks | Positive |

**Context Notes:** Standard startup role timeline.
```

**Block I should follow the same pattern:**
```markdown
## I) ATS Analysis

**ATS Simulation Score:** 74% (Greenhouse — semantic matching, moderate strictness)
**Screening Readiness Score:** 72%

### Category Breakdown

| Category | Matched | Missing | Score |
|----------|---------|---------|-------|
| Hard skills (45%) | Python, FastAPI, PostgreSQL | LangChain, Pinecone | 6/8 = 75% |
| Job title match (25%) | "AI Engineer" | "Senior" prefix | 2/3 = 67% |
| Soft skills / action verbs (15%) | Led, Shipped, Collaborated | Mentored | 4/5 = 80% |
| Quantification / evidence (15%) | Reduced latency 40%, owned launch | No team scale called out | 2/3 = 67% |

**Overall:** (0.75 × 0.45) + (0.67 × 0.25) + (0.80 × 0.15) + (0.67 × 0.15) = **72%**

### Missing Keyword Guidance

**Missing: LangChain** — Add to "Experience > [current company] > [bullet about AI pipeline work]".
Suggested phrasing: "...orchestrated multi-step workflows using LangChain agents..."

**Missing: Pinecone** — Add to "Projects > [RAG project]".
Suggested phrasing: "...integrated Pinecone vector store for sub-100ms retrieval..."

**Weak evidence: leadership scope** — Strengthen "Experience > [current company] > [delivery bullet]".
Suggested phrasing: "...led a 4-engineer initiative that cut processing time by 40%..."

**Missing: Mentored** *(soft skill — no specific bullet needed)*
```

[VERIFIED: codebase read of modes/oferta.md] — Block G structure confirmed at lines 88–143.

### Pattern 2: Report header field insertion

**What:** The report header in `modes/oferta.md` (lines 159–166) uses `**FieldName:** value` format. The new `**ATS:**` line inserts between `**Score:**` and `**Legitimacy:**` per D-02.

**Current header (lines 160–166 of modes/oferta.md):**
```markdown
**Fecha:** {YYYY-MM-DD}
**Arquetipo:** {detectado}
**Score:** {X/5}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**PDF:** {ruta o pendiente}
```

**Updated header (after Phase 2):**
```markdown
**Fecha:** {YYYY-MM-DD}
**Arquetipo:** {detectado}
**Score:** {X/5}
**ATS:** Sim {sim_score}% | Ready {ready_score}% ({platform}) — Missing: {kw1}, {kw2}, {kw3}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**PDF:** {ruta o pendiente}
```

[VERIFIED: codebase read of modes/oferta.md lines 157–198]

### Pattern 3: batch-prompt.md worker propagation

**What:** `batch/batch-prompt.md` is self-contained — it duplicates all evaluation instructions for `claude -p` workers that have no access to the skills system. Any new block added to `modes/oferta.md` must also be added to `batch/batch-prompt.md` to appear in batch reports.

**When to use:** Any time modes/oferta.md gains a new block.

[VERIFIED: codebase read of batch/batch-prompt.md — confirmed self-contained duplication pattern]

### Pattern 4: test-all.mjs report header validation

**What:** `test-all.mjs` section 8 (mode file integrity) and section 9 (CLAUDE.md integrity) validate structural properties of mode files. The `**ATS:**` header field needs a test that scans a real report file (or validates the template string in oferta.md) for the new field.

**Current approach:** The test suite does NOT currently scan report file contents directly — it checks that mode files exist and that `_shared.md` references `_profile.md`. The ATS header test should be added as a check that `modes/oferta.md` contains the `**ATS:**` format string in the report header template.

[VERIFIED: codebase read of test-all.mjs lines 238–312]

### Anti-Patterns to Avoid

- **Inventing a Node.js ATS scoring library:** All scoring is LLM reasoning from the prompt. Do NOT add a `score-ats.mjs` script. [CITED: CONTEXT.md code_context — "All scoring blocks are implemented as prompt instructions in modes/ markdown files — no Node.js scoring logic."]
- **Modifying cv.md:** Block I reads cv.md the same way Block B does — read-only access. Never write. [CITED: modes/_shared.md NEVER rule #2]
- **Separate ATS section in batch-state.tsv:** ATS scores do not need new columns in batch-state.tsv. They live in the report .md header only. The batch JSON stdout result can include dual score fields for orchestrator visibility — this is Claude's Discretion.
- **Floating-point precision theater:** The overall % should be rounded to the nearest integer. "74%" not "73.5%". [ASSUMED]
- **Keyword stuffing guidance:** Block I must not suggest adding keywords the candidate lacks experience in. The guidance is about natural rephrasing of existing experience, not fabrication. [CITED: REQUIREMENTS.md Out of Scope — "ATS keyword stuffing... Actively penalized"]

---

## ATS Scoring Methodology Research

### Platform URL Inference Patterns

[VERIFIED: WebSearch + official ATS docs research]

| Platform | URL Signal | Matching Behavior | Strictness |
|----------|-----------|------------------|------------|
| Greenhouse | `greenhouse.io`, `boards.greenhouse.io` | Human-review oriented; scorecards and semantic search, but no resume auto-scoring by design | Moderate — optimize for clarity and role fit, not literal keyword stuffing |
| Lever | `lever.co`, `jobs.lever.co` | Stemming-based; CRM Boolean search; strong PDF parser | Flexible — most formatting-forgiving major ATS |
| Ashby | `ashbyhq.com`, `jobs.ashbyhq.com` | AI-assisted criteria matching (binary Meets/Does-not-Meet per criterion); no numeric ranking | Criterion-based — project-specific extension, not ATS Screener parity |
| Workday | `myworkday.com`, `workdayjobs.com` | NLP semantic; understands synonym equivalence | Moderate — NLP helps, but structured fields matter |
| Taleo | `taleo.net`, Oracle/Taleo branded domains | Exact keyword only; no synonym recognition; no semantic analysis | Strictest — requires exact terminology from JD |
| iCIMS | `icims.com`, `jobs.icims.com` | Semantic / taxonomy-assisted matching; forgiving on near-equivalents | Moderate — keyword coverage matters, but exact wording is not everything |
| SAP SuccessFactors | `successfactors.com`, `sapsf.com` | Taxonomy normalization and structured parsing | Moderate-strict — structured fields and normalized skills matter |
| Unknown | Everything else | Cannot infer — assume moderate strictness | — |

**Confidence:** MEDIUM — Taleo/Workday/Greenhouse/iCIMS/SuccessFactors behavior is consistent with the `ats-screener` README plus industry writeups. Ashby's binary criterion model is from official Ashby documentation and is a project-specific extension beyond the reference repo.

### What to Import from `ats-screener` vs. What to Leave Out

[VERIFIED: https://github.com/sunnypatell/ats-screener README]

| Reference repo insight | Use in Phase 2? | Why |
|------------------------|-----------------|-----|
| Different ATS platforms behave differently | Yes | Core requirement ATS-04 depends on this |
| Exact vs. fuzzy vs. semantic matching strategies | Yes | Good calibration for prompt wording and strictness notes |
| Six platform profiles (Workday, Taleo, iCIMS, Greenhouse, Lever, SuccessFactors) | Yes, adapted | We should reflect these where URL inference allows; Ashby remains an extra project-specific platform |
| Five scoring dimensions (formatting, keyword match, sections, experience, education) | Partially | Keyword logic informs ATS Simulation; formatting/parser/sections are omitted from Simulation when using `cv.md`, and education only participates when explicitly required by the JD |
| Quantification / evidence helps early human review | Yes, lightly | Strong bullets with metrics help both recruiter confidence and credibility of claimed matches |
| Client-side PDF/DOCX parsing | No | Career-ops reads canonical `cv.md`, not uploaded files |
| Multi-platform side-by-side scores | No | This phase needs one concise report block, not six separate dashboards |
| "Single ATS score is meaningless without platform context" | Yes | This supports separating ATS Simulation from Screening Readiness in the header design |

### Dual-Score Design

**ATS Simulation Score**

- Closest ATS Screener-aligned score in this project
- Must use ATS Screener thresholds for Workday/Taleo/iCIMS/Greenhouse/Lever/SuccessFactors
- Omits formatting, parser, and section-detection dimensions when the source input is `cv.md`
- Excludes education by default unless the JD explicitly requires it
- Excludes Ashby from ATS Screener parity

**Screening Readiness Score**

- Intentional career-ops extension
- Combines ATS alignment with quantified evidence, ownership, scope clarity, and rewrite guidance for recruiter first-pass review

### Recommended Readiness Rubric

[ASSUMED — weights are reasonable based on industry research and the user's stated goal, but not from a single authoritative source]

| Category | Weight | What to extract from JD | Scoring logic |
|----------|--------|--------------------------|---------------|
| Hard skills | 45% | Technical tools, frameworks, languages, platforms, methodologies (Python, LangChain, Kubernetes, etc.) | Exact match strongest; near-synonym / close equivalent gets partial credit closer to `ats-screener` than a hard 0.5 |
| Job title match | 25% | Job title words and seniority level (Senior, Staff, Lead, Engineer, Manager, etc.) | Match role noun, domain qualifier, and seniority against CV title/summary/recent bullets |
| Soft skills / action verbs | 15% | Action verbs (led, built, shipped, mentored, owned) and soft skill signals (cross-functional, communication, etc.) | Count present / total; treat vague CV phrasing as weaker than explicit evidence |
| Quantification / evidence | 15% | JD emphasis on ownership, scale, metrics, outcomes, impact | Reward bullets in `cv.md` that show measurable results, scope, or concrete outcomes aligned to the JD |

**Overall %:** `(hard_score × 0.45) + (title_score × 0.25) + (soft_score × 0.15) + (evidence_score × 0.15)` → round to nearest integer

**Confidence:** ASSUMED — reasonable weights for the hybrid goal (pass ATS + human first pass), but exact numbers are discretionary per D-05.

### Keyword Extraction Guidelines

[VERIFIED: ats-screener reference + WebSearch research]

**Hard skills** — extract explicitly named:
- Programming languages (Python, TypeScript, Go, SQL)
- Frameworks and libraries (LangChain, React, FastAPI, PyTorch)
- Platforms and services (AWS, GCP, Kubernetes, Postgres, Redis, Pinecone)
- Methodologies (RAG, fine-tuning, RLHF, CI/CD, Agile)
- Certifications and degrees (only for ATS Simulation when explicitly listed as requirements; otherwise they belong outside Simulation)

**Job title keywords** — extract:
- Core role noun (Engineer, Manager, Architect, Lead)
- Seniority modifier (Senior, Staff, Principal, Head of, VP)
- Domain qualifier (AI, ML, Platform, Solutions)

**Soft skills / action verbs** — extract:
- Action verbs from required/preferred bullets (led, built, shipped, delivered, mentored, collaborated, influenced, owned)
- Soft skill signals (cross-functional, stakeholder, communication, strategic)

**Do NOT extract:**
- Generic boilerplate ("competitive salary", "equal opportunity employer")
- Location/timezone requirements
- Visa/work authorization language
- Company mission statement

### Semantic Matching Guidelines for Claude

Since the scorer is Claude (not a regex parser), the prompt must define what counts as a semantic match:

[ASSUMED — based on industry patterns; exact thresholds are Claude's Discretion per D-05]

- **Full match (1.0):** Exact keyword or direct synonym where the wording would likely satisfy both ATS and recruiter expectations
- **Partial match (0.8 recommended):** Related term covering the same practical concept but with different terminology (e.g., JD says "LangChain", CV says "AI agent orchestration framework")
- **No match (0.0):** Concept absent from CV

Calibrate partial matches by platform:
- **Stricter ATS (Taleo, some SuccessFactors flows):** treat exact wording as much more important; partial matches should still surface as a gap worth fixing
- **Moderate ATS (Workday, iCIMS, Greenhouse):** partial matches can count more strongly
- **Flexible ATS (Lever):** semantic equivalents can count strongly if the experience is clearly relevant
- **Ashby:** emphasize meeting recruiter criteria and evidence over keyword density; this is a project-specific mode, not ATS Screener parity

For the header line and block output, present binary matched/missing lists — don't show a third "partial" bucket. Count partial matches in the score, but note "(partial)" inline when the wording should still be tightened.

### Quantification / Evidence Signal

[ASSUMED — hybrid addition for the user's stated goal]

The reference methodology includes experience-oriented dimensions that help for human screening even when they are not classic ATS parser inputs. We should capture a lightweight version:

- Reward bullets that include measurable impact, scale, ownership, or business outcome
- If the JD emphasizes words like `scale`, `optimize`, `reduce`, `increase`, `own`, `ship`, or `drive`, the absence of quantified results in related CV bullets should reduce the evidence score
- Placement guidance should suggest strengthening an existing bullet with concrete outcome framing when truthful, not just adding missing keywords

This keeps the phase focused on resume improvement, not only ATS mimicry.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keyword extraction | Custom NLP parser, regex tokenizer | Claude prompt instructions | Claude already reads the JD; in-context extraction is more accurate than regex for unstructured JD text |
| Resume parsing | HTML/PDF parser, cv.md tokenizer | Claude reads cv.md directly | cv.md is already clean markdown; Claude handles structure |
| Platform detection | `npm install ats-detect` | Simple URL string matching in prompt | Only 5 platforms to detect; a lookup table in the prompt is more maintainable |
| Scoring algorithm | Node.js `score-ats.mjs` script | Explicit rubric in prompt instructions | Scoring is reasoning, not math; LLM is the right tool |

**Key insight:** The entire ATS block is prompt engineering. The value is in the rubric design and output structure, not in code. Adding a Node.js scoring script would create a parallel execution path that breaks the batch worker architecture.

---

## Common Pitfalls

### Pitfall 1: Block H Disruption

**What goes wrong:** Renaming or moving Block H to make room for Block I, breaking existing batch worker references.
**Why it happens:** ROADMAP says "Block H for ATS" — the decision (D-01) overrides this. Block I is appended after H, not replacing it.
**How to avoid:** Block H (Draft Application Answers) stays at `## H) Draft Application Answers` at line 191. Block I is `## I) ATS Analysis` appended at the end of the report format template.
**Warning signs:** Any diff that modifies lines around `## H)` in oferta.md.

### Pitfall 2: Report Header Ordering Error

**What goes wrong:** Inserting `**ATS:**` after `**Legitimacy:**` instead of before it.
**Why it happens:** The existing header has Score → Legitimacy → PDF; the new field goes between Score and Legitimacy per D-02.
**How to avoid:** D-02 is explicit: Score → ATS → Legitimacy → PDF.
**Warning signs:** Test regex matches `**Legitimacy:**` before `**ATS:**` in report output.

### Pitfall 3: Batch Worker Miss

**What goes wrong:** Block I appears in modes/oferta.md but not in batch/batch-prompt.md — batch reports lack the ATS block.
**Why it happens:** batch/batch-prompt.md is a self-contained duplicate that must be manually kept in sync.
**How to avoid:** Plan 2.2 explicitly updates batch/batch-prompt.md. Verify by checking that the batch worker prompt template contains `## I) ATS Analysis` instructions and `**ATS:**` header format.
**Warning signs:** A batch-generated report missing the `**ATS:**` header field.

### Pitfall 4: cv.md Not Found at Evaluation Time

**What goes wrong:** Block I tries to read cv.md and fails for users who haven't set it up yet (cv.md is user-layer, gitignored).
**Why it happens:** cv.md is not committed to the repo; it's populated during onboarding.
**How to avoid:** The Block I prompt should instruct Claude to gracefully handle missing cv.md — output "cv.md not found — ATS score unavailable" rather than crashing the block. This matches how Block B (Match con CV) handles the same dependency.
**Warning signs:** No graceful degradation path defined in Block I instructions.

### Pitfall 5: Over-extraction of Hard Skill Keywords

**What goes wrong:** Block I extracts 40+ keywords from the JD and the score becomes meaninglessly low.
**Why it happens:** JDs list every tool used by the team, not just required skills.
**How to avoid:** Focus extraction on "required" and "preferred" sections of the JD, not the full text. Cap hard skill extraction at 15-20 most specific terms. Weight required skills more than preferred.
**Warning signs:** ATS score below 30% for a candidate with a clearly strong match.

### Pitfall 6: test-all.mjs false pass on header format

**What goes wrong:** The regex for `**ATS:**` is too loose and matches old reports that don't have the field.
**Why it happens:** The test validates the template string in modes/oferta.md, not actual reports.
**How to avoid:** The test should check that `modes/oferta.md` contains the literal string `` `**ATS:**` `` in the report header template block. A stricter regex: `/\*\*ATS:\*\*\s+\{score\}%/` in the template.
**Warning signs:** test-all.mjs passes but a real evaluation report has no `**ATS:**` line.

---

## Code Examples

### Block I Prompt Structure (for modes/oferta.md)

[CITED: CONTEXT.md D-03 + Block G pattern from modes/oferta.md]

```markdown
## Bloque I — Análisis ATS

Lee `cv.md`. Extrae keywords del JD en tres categorías. Puntúa el CV contra cada categoría.

**Si cv.md no existe:** Escribir `**ATS:** N/A (cv.md not found)` y omitir el bloque.

### Extracción de keywords del JD

**Hard skills (45% del score):** Herramientas, frameworks, lenguajes, plataformas, metodologías explícitamente mencionadas.
Máximo 15-20 términos más específicos. Priorizar secciones "required" y "preferred".

**Job title keywords (25%):** Palabras del título del rol y modificadores de seniority (Senior, Staff, Lead, Head of).

**Soft skills / action verbs (15%):** Verbos de acción en bullets de requisitos (led, built, shipped, mentored, owned) y señales soft (cross-functional, stakeholder).

**Quantification / evidence (15%):** Señales de impacto, ownership, escala, métricas y resultados explícitos en bullets relevantes del CV.

### Puntuación

Para cada categoría:
- **Match completo (1.0):** Keyword exacta o sinónimo directo presente en cv.md
- **Match parcial (0.8 recomendado):** Concepto relacionado presente pero no la terminología exacta
- **Ausente (0.0):** Concepto no encontrado en cv.md

Score de categoría = (suma de matches) / (total keywords extraídas) × 100%
Score de evidencia = calidad de métricas, outcomes, ownership y scale en bullets relevantes
Score global = (hard_score × 0.45) + (title_score × 0.25) + (soft_score × 0.15) + (evidence_score × 0.15) → redondear al entero más cercano

### Inferencia de plataforma ATS

| URL contiene | Plataforma | Strictness |
|-------------|------------|------------|
| greenhouse.io | Greenhouse | Moderate — fuzzy + semantic matching |
| lever.co | Lever | Flexible — stemming-based, most forgiving |
| ashbyhq.com | Ashby | Criterion-based — binary Meets/Does-not-Meet per recruiter criteria |
| workday.com / myworkdayjobs.com | Workday | Moderate — NLP understands synonyms |
| taleo.net | Taleo | Strictest — exact keyword match only, no synonyms |
| otro | Unknown | Assume moderate strictness |

### Output del bloque I

**ATS Simulation Score:** {sim_score}% ({plataforma} — {strictness one-liner})
**Screening Readiness Score:** {ready_score}%

#### Breakdown por categoría

| Categoría | Matched | Missing | Score |
|-----------|---------|---------|-------|
| Hard skills (45%) | {list} | {list} | {x}/{n} = {%}% |
| Job title (25%) | {list} | {list} | {x}/{n} = {%}% |
| Soft skills (15%) | {list} | {list} | {x}/{n} = {%}% |
| Quantification / evidence (15%) | {strengths} | {gaps} | {x}/{n} = {%}% |

#### Guía de keywords faltantes

Para cada keyword de hard skills o job title ausente, identificar dónde en cv.md añadirla:

**Missing: {keyword}** — Añadir a "{Experience > Empresa > bullet específico}".
Sugerencia: "...{frase natural con la keyword integrada en experiencia existente}..."

Para soft skills sin bullet específico (listar sin guía de placement):
- Missing soft skills: {lista}
```

### Updated Report Header Template

[CITED: CONTEXT.md D-02 + modes/oferta.md lines 159–166]

```markdown
**Fecha:** {YYYY-MM-DD}
**Arquetipo:** {detectado}
**Score:** {X/5}
**ATS:** Sim {sim_score}% | Ready {ready_score}% ({platform}) — Missing: {kw1}, {kw2}, {kw3}
**Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
**URL:** {URL de la oferta}
**PDF:** {ruta o pendiente}
```

Note: `**URL:**` is already required by `_shared.md` ALWAYS rule #10. Including it here for completeness.

### test-all.mjs ATS Header Check

[CITED: test-all.mjs section 8 pattern + CONTEXT.md]

```javascript
// In section 8 (Mode File Integrity):
const oferta = readFile('modes/oferta.md');
if (/\*\*ATS:\*\*/.test(oferta)) {
  pass('modes/oferta.md has **ATS:** header field in report template');
} else {
  fail('modes/oferta.md missing **ATS:** header field in report template');
}
```

---

## Integration Points Checklist

All four files that must be updated in this phase:

| File | Change | Required By |
|------|--------|-------------|
| `modes/oferta.md` | Add Block I after Block H; update report header template | ATS-01, ATS-02, ATS-03, ATS-04 |
| `modes/auto-pipeline.md` | Insert `**ATS:**` line in report header (Step 2) | ATS-02 |
| `batch/batch-prompt.md` | Add Block I instructions; add `**ATS:**` to report header template | ATS-02, D-04 |
| `test-all.mjs` | Add regex assertion for `**ATS:**` in modes/oferta.md | D-02 (format contract) |

**Files NOT to touch:**
- `modes/_shared.md` — system layer, no user-specific content. ATS scoring is system logic that should stay in oferta.md.
- `cv.md` — read-only user layer
- `data/applications.md` — ATS score lives in the report, not the tracker
- `batch/batch-state.tsv` format — no new column needed

---

## Live Tool Reference: ats-screener.vercel.app

**Source:** https://ats-screener.vercel.app (fetched 2026-04-20)

The live deployment of the reference implementation confirms the approach and surfaces two differences worth noting for Block I design.

### What it does (confirmed)

- Scores against **6 platforms**: Workday, Oracle Taleo, iCIMS, Greenhouse, Lever, SAP SuccessFactors
- Three matching strategies: **exact**, **fuzzy**, and **semantic** — mirrors what the README describes
- Per-platform numeric scores (e.g. Workday 86, Taleo 75, Greenhouse 92) shown side-by-side
- Client-side PDF/DOCX parsing in a Web Worker; only extracted text is sent for AI scoring
- AI suggestions powered by **Gemini** with a rule-based fallback when offline

### Five evaluation dimensions (live tool)

The live UI breaks scoring into five dimensions — slightly different from the 3-category rubric in this research:

| Live tool dimension | Maps to our Block I category |
|--------------------|------------------------------|
| Parsing simulation | (structural — not applicable; cv.md is already clean text) |
| Formatting / visual | (not applicable — cv.md is markdown) |
| Section detection | (not applicable — cv.md has standard sections) |
| Keyword alignment | Hard skills + job title + soft skills (our 3 categories) |
| Experience / education validation | Partially covered by hard skills scoring |

**Implication for Block I:** The parsing/formatting/section dimensions are irrelevant for career-ops because cv.md is already clean, structured markdown — no PDF parsing needed. ATS Simulation should omit those dimensions rather than approximate them. Screening Readiness can still use evidence/quantification because that is an intentional project-specific extension.

### New platforms from live tool

The live tool includes **iCIMS** and **SAP SuccessFactors** which are absent from the research's platform table. These are large enterprise ATS platforms worth adding to the inference table:

| Platform | URL Signal | Strictness |
|----------|-----------|------------|
| iCIMS | `icims.com`, `jobs.icims.com` | Moderate — keyword + skills taxonomy matching |
| SAP SuccessFactors | `successfactors.com`, `sapsf.com` | Moderate-strict — structured fields matter; NLP limited |

Add these to the platform inference table in Block I for completeness.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Raw keyword count (bag of words) | Weighted category scoring + semantic matching | ~2022–2023 | Higher scores no longer achievable by padding skills sections with exact-match terms |
| Single ATS assumed (Taleo dominance) | Platform-specific strictness calibration | ~2020–2024 | Lever/Greenhouse users need less exact matching; Taleo users still need exact copies |
| ATS as gate | ATS + human review hybrid (Ashby AI) | 2024–2025 | Ashby uses binary criteria matching by recruiter-defined rules, not keyword scoring at all |

**Platform landscape note:** Ashby's model (AI criteria matching) is fundamentally different from keyword-count ATS. A candidate on Ashby doesn't need to optimize for keyword density — they need to meet the recruiter's defined pass/fail criteria. In this project, Ashby should be treated as a separate extension, not ATS Screener parity.

---

## Open Questions

1. **Batch worker JSON output — include dual score fields?**
   - What we know: batch-prompt.md outputs a JSON result object (Paso 6). It currently includes `score`, `legitimacy`, `pdf`, `report`.
   - What's unclear: Should both ATS Simulation and Screening Readiness be added as JSON fields for orchestrator visibility?
   - Recommendation: Yes. Add them — cheap to include, useful for batch analysis. `"ats_simulation_score": 74` and `"screening_readiness_score": 69`, or `null` if cv.md missing.

2. **Language modes (de/, fr/, ja/) — do they need Block I?**
   - What we know: `modes/de/_shared.md`, `modes/de/angebot.md` etc. exist and mirror the English modes for DACH users.
   - What's unclear: Are the German/French/Japanese evaluation modes duplicates that also need Block I?
   - Recommendation: Out of scope for this phase. The non-English modes are user-facing translations; they will naturally lag behind the English system layer. Add a note in the plan that language modes are NOT updated in Phase 2.

3. **How many missing keywords in the header line?**
   - What we know: D-02 says "top missing keywords" without specifying count.
   - What's unclear: 3? 5? All of them if fewer than 5?
   - Recommendation: Claude's Discretion. Show top 3–5 hard skill missing keywords (most actionable). Soft skills are less useful in the header. If 0 missing, show "Missing: none".

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is prompt/markdown editing only with one test file edit).

---

## Project Constraints (from CLAUDE.md)

| Constraint | Implication for Phase 2 |
|-----------|------------------------|
| User layer files (cv.md, config/profile.yml, modes/_profile.md) NEVER auto-updated | Block I reads cv.md but NEVER writes to it |
| System layer files (modes/*.md, batch/batch-prompt.md) are editable | All Phase 2 edits are system-layer files — allowed |
| NEVER edit applications.md to ADD entries (use TSV + merge) | ATS score lives in the report header, not the tracker |
| `test-all.mjs` must pass before merge | New `**ATS:**` check must be added; existing 63+ checks must still pass |
| Report MUST include `**URL:**` in header | Not changed by this phase; already present in template |
| All modes/*.md are system layer | oferta.md, auto-pipeline.md, batch.md edits are correct layer |
| block H (Draft Application Answers) at oferta.md:191 NOT moved | Block I appended after Block H, never moving H |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Hybrid weights of 45/25/15/15 are a reasonable balance for ATS + human first-pass screening | Scoring Rubric | Different weights would change reported scores, but the main value remains relative guidance and resume improvement. |
| A2 | Top 3–5 missing keywords in the header line is the right count | Code Examples | Too few = less useful; too many = cluttered header. User/planner can adjust. |
| A3 | Batch JSON should include dual ATS score fields | Open Questions | If orchestrators parse the JSON, missing fields cause mismatch with the dual-score design. Easy to add; risk of not adding is higher. |
| A4 | Language modes (de/, fr/, ja/) are NOT updated in Phase 2 | Open Questions | DACH/FR/JA users evaluating with those modes won't see ATS block. Acceptable as phase scope boundary. |
| A5 | Floating-point % rounded to nearest integer in output | Anti-Patterns | Visual only; no functional impact. |

---

## Sources

### Primary (HIGH confidence)
- `docs/ATS-SCORING-REFERENCE.md` — local canonical summary of ATS Screener formulas, weights, thresholds, and implementation guardrails
- `modes/oferta.md` — Full block A–H structure, report header format, Block G pattern (read directly)
- `modes/auto-pipeline.md` — Pipeline steps, existing report header format (read directly)
- `batch/batch-prompt.md` — Worker template, self-contained duplication pattern (read directly)
- `test-all.mjs` — Test suite structure and section 8 mode integrity pattern (read directly)
- `CONTEXT.md` — All locked decisions D-01 through D-05 (read directly)
- `REQUIREMENTS.md` — ATS-01 through ATS-04 acceptance criteria (read directly)

### Secondary (MEDIUM confidence)
- [Ashby AI-Assisted Application Review](https://www.ashbyhq.com/product-updates/ai-assisted-application-review) — Ashby's binary criteria model confirmed
- [ATS Scoring Algorithms: How To Beat ATS](https://scale.jobs/blog/understanding-ats-scoring-algorithms) — Taleo exact match, Workday NLP, Lever flexibility
- [Free ATS Resume Score Checker](https://pro.kudoswall.com/guides/ats-resume-score-guide/) — 0-60% danger zone, 80%+ target thresholds
- [sunnypatell/ats-screener README](https://github.com/sunnypatell/ats-screener) — TF-IDF + skills taxonomy approach; platform-specific matching strategies
- [ats-screener.vercel.app](https://ats-screener.vercel.app) — Live implementation; see "Live Tool Reference" section below

### Tertiary (LOW confidence)
- General WebSearch results on ATS keyword weighting — industry consensus on hard skills > soft skills weighting but no official algorithm specs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing infrastructure
- Architecture: HIGH — Block G pattern is verified and directly applicable
- Platform strictness table: MEDIUM — consistent across 3+ sources but not official ATS vendor documentation
- Scoring rubric weights: LOW/ASSUMED — reasonable industry heuristic, not from official spec; discretionary per D-05

**Research date:** 2026-04-20
**Valid until:** 2026-10-20 (stable domain — ATS platform behaviors change slowly)
