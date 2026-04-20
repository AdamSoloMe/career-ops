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
  **ATS:** {score}% ({platform}) — Missing: {kw1}, {kw2}, {kw3}
  **Legitimacy:** {High Confidence | Proceed with Caution | Suspicious}
  **PDF:** {path or pending}
  ```
  The header line is intentionally brief — just the %, platform, and top missing keywords. Full detail lives in Block I body.

- **D-03:** Block I body does NOT just list missing keywords. For each missing keyword, it identifies which specific CV experience or project bullet could/should be updated, and how to naturally incorporate that keyword. Soft skills/action verbs that don't map to a specific bullet are listed without placement guidance.
  ```
  **Missing: LangChain** — Add to "Experience > Acme Corp > [bullet about AI pipeline work]".
  Suggested phrasing: "...orchestrated multi-step workflows using LangChain agents..."
  ```

- **D-04:** Batch mode (`claude -p` workers) runs the **full ATS analysis** — same 3-category breakdown as interactive mode. Context budget in workers is ample; no abbreviated version needed.

- **D-05 (Claude's Discretion):** Scoring approach follows ATS-01: keyword frequency + semantic relevance, not raw string count. Three categories (ATS-03): hard skills keywords, job title match, soft skills/action verbs. Platform inference from URL (ATS-04): Greenhouse, Lever, Ashby, Workday, Taleo — each with a one-line note on typical strictness level.

### Claude's Discretion

- Exact scoring rubric within the 3 categories (how to weight each, how to compute the % from sub-scores)
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

The key intellectual work is designing the scoring rubric that maps naturally to a language model's strengths. ATS scoring in the real world uses TF-IDF + skills taxonomies and platform-specific matching algorithms. Because this system runs on Claude (not a dedicated parser), the scoring must be prompt-engineered: the model reads the JD, extracts keyword sets, reads `cv.md`, and reasons about presence/absence. The scoring formula must be explicit enough that results are consistent and comparable across evaluations without being so rigid that it produces nonsense outputs.

The existing `modes/oferta.md` Block G (Posting Legitimacy) is the canonical pattern to follow: it defines a structured analysis, uses signal tables, produces a tiered assessment, and has a clear output format. Block I follows the exact same implementation pattern.

**Primary recommendation:** Implement Block I as a prompt block in `modes/oferta.md` following the Block G pattern. Define an explicit 3-category scoring rubric with stated weights. Use URL domain pattern matching for platform inference. Insert the `**ATS:**` header line exactly as specified in D-02.

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
  [Report header: **ATS:** {score}% ({platform}) — Missing: kw1, kw2, kw3]
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

**ATS Score:** 74% (Greenhouse — semantic matching, moderate strictness)

### Category Breakdown

| Category | Matched | Missing | Score |
|----------|---------|---------|-------|
| Hard skills (50%) | Python, FastAPI, PostgreSQL | LangChain, Pinecone | 6/8 = 75% |
| Job title match (30%) | "AI Engineer" | "Senior" prefix | 2/3 = 67% |
| Soft skills / action verbs (20%) | Led, Shipped, Collaborated | Mentored | 4/5 = 80% |

**Overall:** (0.75 × 0.50) + (0.67 × 0.30) + (0.80 × 0.20) = **74%**

### Missing Keyword Guidance

**Missing: LangChain** — Add to "Experience > [current company] > [bullet about AI pipeline work]".
Suggested phrasing: "...orchestrated multi-step workflows using LangChain agents..."

**Missing: Pinecone** — Add to "Projects > [RAG project]".
Suggested phrasing: "...integrated Pinecone vector store for sub-100ms retrieval..."

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
**ATS:** {score}% ({platform}) — Missing: {kw1}, {kw2}, {kw3}
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
- **Separate ATS section in batch-state.tsv:** ATS score does not need a new column in batch-state.tsv. It lives in the report .md header only. The batch JSON stdout result could optionally include `"ats_score"` for orchestrator visibility — this is Claude's Discretion.
- **Floating-point precision theater:** The overall % should be rounded to the nearest integer. "74%" not "73.5%". [ASSUMED]
- **Keyword stuffing guidance:** Block I must not suggest adding keywords the candidate lacks experience in. The guidance is about natural rephrasing of existing experience, not fabrication. [CITED: REQUIREMENTS.md Out of Scope — "ATS keyword stuffing... Actively penalized"]

---

## ATS Scoring Methodology Research

### Platform URL Inference Patterns

[VERIFIED: WebSearch + official ATS docs research]

| Platform | URL Signal | Matching Behavior | Strictness |
|----------|-----------|------------------|------------|
| Greenhouse | `greenhouse.io`, `boards.greenhouse.io` | Fuzzy + semantic; LLM-assisted keyword suggestions in newer versions | Moderate — exact preferred but fuzzy tolerated |
| Lever | `lever.co`, `jobs.lever.co` | Stemming-based; CRM Boolean search; strong PDF parser | Flexible — most formatting-forgiving major ATS |
| Ashby | `ashbyhq.com`, `jobs.ashbyhq.com` | AI-assisted criteria matching (binary Meets/Does-not-Meet per criterion); no numeric ranking | Criterion-based — exactness depends on recruiter-defined criteria |
| Workday | `myworkday.com`, `workdayjobs.com` | NLP semantic; understands synonym equivalence | Moderate — NLP helps, but structured fields matter |
| Taleo | `taleo.net`, Oracle/Taleo branded domains | Exact keyword only; no synonym recognition; no semantic analysis | Strictest — requires exact terminology from JD |
| Unknown | Everything else | Cannot infer — assume moderate strictness | — |

**Confidence:** MEDIUM — Taleo/Workday/Greenhouse strictness ordering is consistent across 3+ industry sources. Ashby's binary criterion model is from official Ashby documentation.

### Recommended 3-Category Scoring Rubric

[ASSUMED — weights are reasonable based on industry research but not from a single authoritative source]

| Category | Weight | What to extract from JD | Scoring logic |
|----------|--------|--------------------------|---------------|
| Hard skills | 50% | Technical tools, frameworks, languages, platforms, methodologies (Python, LangChain, Kubernetes, etc.) | Count matched / total extracted; semantic: near-synonyms count as 0.5 match |
| Job title match | 30% | Job title words and seniority level (Senior, Staff, Lead, Engineer, Manager, etc.) | Count title word matches in CV title/summary; seniority match scores separately |
| Soft skills / action verbs | 20% | Action verbs (led, built, shipped, mentored, owned) and soft skill signals (cross-functional, communication, etc.) | Count present / total; any synonym counts as full match |

**Overall %:** `(hard_score × 0.50) + (title_score × 0.30) + (soft_score × 0.20)` → round to nearest integer

**Confidence:** ASSUMED — reasonable weights derived from industry data (hard skills dominate real ATS scoring per multiple sources), but exact numbers are discretionary per D-05.

### Keyword Extraction Guidelines

[VERIFIED: ats-screener reference + WebSearch research]

**Hard skills** — extract explicitly named:
- Programming languages (Python, TypeScript, Go, SQL)
- Frameworks and libraries (LangChain, React, FastAPI, PyTorch)
- Platforms and services (AWS, GCP, Kubernetes, Postgres, Redis, Pinecone)
- Methodologies (RAG, fine-tuning, RLHF, CI/CD, Agile)
- Certifications and degrees (when listed as requirements)

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

- **Full match (1.0):** Exact keyword or direct synonym (e.g., JD says "LLM pipelines", CV says "LLM pipelines")
- **Partial match (0.5):** Related term covering similar concept (e.g., JD says "LangChain", CV says "AI agent orchestration framework" — related but not exact)
- **No match (0.0):** Concept absent from CV

For the header line and block output, present binary matched/missing lists — don't show 0.5 partial matches as a separate category (confusing for the user). Count partial matches as full for the matched list, but note "(partial)" inline if the gap is meaningful.

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

**Hard skills (50% del score):** Herramientas, frameworks, lenguajes, plataformas, metodologías explícitamente mencionadas.
Máximo 15-20 términos más específicos. Priorizar secciones "required" y "preferred".

**Job title keywords (30%):** Palabras del título del rol y modificadores de seniority (Senior, Staff, Lead, Head of).

**Soft skills / action verbs (20%):** Verbos de acción en bullets de requisitos (led, built, shipped, mentored, owned) y señales soft (cross-functional, stakeholder).

### Puntuación

Para cada categoría:
- **Match completo (1.0):** Keyword exacta o sinónimo directo presente en cv.md
- **Match parcial (0.5):** Concepto relacionado presente pero no la terminología exacta
- **Ausente (0.0):** Concepto no encontrado en cv.md

Score de categoría = (suma de matches) / (total keywords extraídas) × 100%
Score global = (hard_score × 0.50) + (title_score × 0.30) + (soft_score × 0.20) → redondear al entero más cercano

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

**ATS Score:** {score}% ({plataforma} — {strictness one-liner})

#### Breakdown por categoría

| Categoría | Matched | Missing | Score |
|-----------|---------|---------|-------|
| Hard skills (50%) | {list} | {list} | {x}/{n} = {%}% |
| Job title (30%) | {list} | {list} | {x}/{n} = {%}% |
| Soft skills (20%) | {list} | {list} | {x}/{n} = {%}% |

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
**ATS:** {score}% ({platform}) — Missing: {kw1}, {kw2}, {kw3}
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

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|-----------------|--------------|--------|
| Raw keyword count (bag of words) | Weighted category scoring + semantic matching | ~2022–2023 | Higher scores no longer achievable by padding skills sections with exact-match terms |
| Single ATS assumed (Taleo dominance) | Platform-specific strictness calibration | ~2020–2024 | Lever/Greenhouse users need less exact matching; Taleo users still need exact copies |
| ATS as gate | ATS + human review hybrid (Ashby AI) | 2024–2025 | Ashby uses binary criteria matching by recruiter-defined rules, not keyword scoring at all |

**Platform landscape note:** Ashby's model (AI criteria matching) is fundamentally different from keyword-count ATS. A candidate on Ashby doesn't need to optimize for keyword density — they need to meet the recruiter's defined pass/fail criteria. The Block I prompt should note this distinction when inferring Ashby.

---

## Open Questions

1. **Batch worker JSON output — include ats_score field?**
   - What we know: batch-prompt.md outputs a JSON result object (Paso 6). It currently includes `score`, `legitimacy`, `pdf`, `report`.
   - What's unclear: Should `ats_score` be added as a new JSON field for orchestrator visibility?
   - Recommendation: Claude's Discretion (D-05 scope). Add it — cheap to include, useful for batch analysis. `"ats_score": 74` or `null` if cv.md missing.

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
| A1 | Hard skills = 50%, Job title = 30%, Soft skills = 20% weighting | Scoring Rubric | Score values will differ from what a real ATS produces — but since this is a LLM heuristic score (not a real ATS parse), the weights are presentational. Low practical risk. |
| A2 | Top 3–5 missing keywords in the header line is the right count | Code Examples | Too few = less useful; too many = cluttered header. User/planner can adjust. |
| A3 | Batch JSON should include `"ats_score"` field | Open Questions | If orchestrators parse the JSON, missing field causes KeyError. Easy to add; risk of not adding is higher. |
| A4 | Language modes (de/, fr/, ja/) are NOT updated in Phase 2 | Open Questions | DACH/FR/JA users evaluating with those modes won't see ATS block. Acceptable as phase scope boundary. |
| A5 | Floating-point % rounded to nearest integer in output | Anti-Patterns | Visual only; no functional impact. |

---

## Sources

### Primary (HIGH confidence)
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
