---
phase: 01
slug: enhanced-job-discovery
status: verified
threats_open: 0
asvs_level: 1
created: 2026-04-19
---

# Phase 01 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| External API response → scan.mjs | Adzuna and SerpAPI return untrusted JSON; job titles and URLs written to pipeline.md | Job titles, URLs, company names (display-only, no exec path) |
| GitHub repo secrets → Actions runner env | API keys stored as encrypted secrets, injected into runner environment | ADZUNA_APP_ID, ADZUNA_APP_KEY, SERPAPI_KEY |
| Actions runner → git push to main | Workflow has write access to repo contents via GITHUB_TOKEN | data/pipeline.md, data/scan-history.tsv only |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-01-01 | Information Disclosure | API key logging in scan.mjs | mitigate | Only "skipped" messages printed; key values never interpolated into console output (scan.mjs lines 225-226, 363-364) | closed |
| T-01-02 | Tampering | pipeline.md write path | accept | No shell execution or eval path — content is display-only markdown | closed |
| T-01-03 | Denial of Service | SerpAPI credit exhaustion | mitigate | `max_results_per_source: 50` default enforced at config load and as parameter default; loop guard + slice hard cap (scan.mjs lines 127, 164, 168, 189) | closed |
| T-01-04 | Tampering | normalizeJobUrl input | accept | try/catch wraps URL construction — malformed URLs return as-is; no code execution path | closed |
| T-01-05 | Information Disclosure | scan-core.mjs circular import | mitigate | scan-core.mjs imports only Node `fs` built-ins; zero imports from scan.mjs (line 1 verified) | closed |
| T-02-01 | Information Disclosure | API keys in GH Actions workflow logs | mitigate | All three keys injected via `${{ secrets.X }}` — GitHub automatically masks in logs; no direct echo (daily-scan.yml lines 27-29) | closed |
| T-02-02 | Tampering | git-auto-commit-action file_pattern | mitigate | `file_pattern: 'data/pipeline.md data/scan-history.tsv'` — two explicit files, no wildcard (daily-scan.yml line 35) | closed |
| T-02-03 | Elevation of Privilege | workflow permissions | mitigate | `permissions: contents: write` only — no id-token:write, packages:write, or other elevated permissions (daily-scan.yml lines 8-9) | closed |
| T-02-04 | Denial of Service | GH Actions 60-day inactivity disable | mitigate | `workflow_dispatch:` trigger present alongside schedule (daily-scan.yml line 6) | closed |
| T-02-05 | Spoofing | Commit identity | accept | git-auto-commit-action commits as `github-actions[bot]` — standard, expected, auditable in commit history | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-01 | T-01-02 | pipeline.md is plain markdown with no execution path; job titles are display-only | user | 2026-04-19 |
| AR-02 | T-01-04 | normalizeJobUrl wraps URL construction in try/catch; malformed URLs degrade gracefully | user | 2026-04-19 |
| AR-03 | T-02-05 | Actions bot commit identity is standard GitHub Actions behavior; auditable in git history | user | 2026-04-19 |

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-04-19 | 10 | 10 | 0 | gsd-security-auditor |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-04-19
