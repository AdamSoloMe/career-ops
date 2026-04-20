# Mode: apply - Live Application Assistant

Interactive mode for when the candidate is filling out an application form in Chrome. Read what is on screen, load the prior context for the role, and generate tailored answers for every visible application question.

## Requirements

- **Best with Playwright visible:** In visible mode, the candidate sees the browser and Claude can interact with the page.
- **Without Playwright:** The candidate shares a screenshot or pastes the questions manually.

## Workflow

```
1. DETECT      -> Read the active Chrome tab (screenshot / URL / title)
2. IDENTIFY    -> Extract company + role from the page
3. SEARCH      -> Match against existing reports in reports/
4. LOAD        -> Read the full report + Section G if present
5. COMPARE     -> Does the role on screen match the evaluated one? If it changed, warn
6. ANALYZE     -> Identify ALL visible form questions
7. GENERATE    -> Produce tailored answers for each question
8. PRESENT     -> Show formatted answers ready to copy-paste
```

## Step 1 - Detect the role

**With Playwright:** Take a snapshot of the active page. Read the title, URL, and visible content.

**Without Playwright:** Ask the candidate to:
- Share a screenshot of the form
- Or paste the form questions as text
- Or provide the company + role so it can be located

## Step 2 - Identify and load context

1. Extract company name and role title from the page
2. Search `reports/` by company name, case-insensitive
3. If there is a match, load the full report
4. If Section G exists, load previous draft answers as the base
5. If there is no match, tell the candidate and offer to run a quick auto-pipeline first

## Step 3 - Detect role changes

If the role on screen differs from the evaluated role:
- **Warn the candidate:** "The role changed from [X] to [Y]. Do you want me to re-evaluate it or adapt the answers to the new title?"
- **If adapting:** Adjust the answers to the new role without re-running the full evaluation
- **If re-evaluating:** Run the full A-F evaluation, update the report, and regenerate Section G
- **Update the tracker:** Change the role title in the tracker if appropriate

## Step 4 - Analyze form questions

Identify ALL visible questions:
- Free-text fields such as cover letter, why this role, etc.
- Dropdowns such as how did you hear about us, work authorization, etc.
- Yes/No fields such as relocation or visa
- Salary fields such as range or expectation
- Upload fields such as resume or cover letter PDF

Classify each question:
- **Already answered in Section G** -> adapt the existing answer
- **New question** -> generate an answer from the report + `cv.md`

## Step 5 - Generate answers

For each question, generate the answer using:

1. **Report context:** Use proof points from Block B and STAR stories from Block F
2. **Previous Section G:** If a draft answer exists, refine it instead of starting from scratch
3. **"I'm choosing you" tone:** Reuse the same framework as auto-pipeline
4. **Specificity:** Reference something concrete from the JD visible on screen
5. **career-ops proof point:** Include one in "Additional info" if the form has room for it

**Output format:**

```text
## Answers for [Company] - [Role]

Based on: Report #NNN | Score: X.X/5 | Archetype: [type]

---

### 1. [Exact question from the form]
> [Ready-to-paste answer]

### 2. [Next question]
> [Answer]

...

---

Notes:
- [Any observations about role changes, context, etc.]
- [Suggested edits the candidate should review before submitting]
```

## Step 6 - Post-apply (optional)

If the candidate confirms they submitted the application:
1. Update status from "Evaluated" to "Applied"
2. Update Section G of the report with the final answers
3. Suggest the next step: `/career-ops contacto` for LinkedIn outreach

## Scroll handling

If the form has more questions than are currently visible:
- Ask the candidate to scroll and share another screenshot
- Or paste the remaining questions
- Continue in passes until all questions are covered
