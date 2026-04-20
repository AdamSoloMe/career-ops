# Phase 1: Enhanced Job Discovery - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-19
**Phase:** 01-enhanced-job-discovery
**Areas discussed:** Search query configuration

---

## Search Query Configuration

### Where should keywords be configured?

| Option | Description | Selected |
|--------|-------------|----------|
| profile.yml search_queries | New field in user-layer file, never overwritten by updates | ✓ |
| portals.yml title_filter.positive | Reuse existing field, but portals.yml is system-layer | |
| Both (override + fallback) | search_queries primary, title_filter fallback | |

**User's choice:** `profile.yml search_queries`
**Notes:** User preferred clean separation: portals.yml = which companies, profile.yml = what to search for.

---

### Location filtering

| Option | Description | Selected |
|--------|-------------|----------|
| Title keywords only | search_queries is just a list of job title strings | ✓ |
| Title + location pairs | Per-query location field | |
| Title + global remote flag | Single remote_only flag | |

**User's choice:** Title keywords only

---

### Entry format for search_queries

| Option | Description | Selected |
|--------|-------------|----------|
| Simple strings | Each entry is a plain job title string | ✓ |
| Objects with label + query | Supports boolean operators (OR/AND) | |
| You decide | Defer to planner | |

**User's choice:** Simple strings
**Notes:** User requested trade-off evaluation before deciding. After reviewing: simple strings chosen because dedup handles overlapping results and per-source cap (D-05) handles quota protection. Boolean support deferred to v2.

---

### Results cap per source

| Option | Description | Selected |
|--------|-------------|----------|
| Configurable in profile.yml | max_results_per_source field, default 50 | ✓ |
| Hardcoded limit | Fixed cap in code | |
| No cap | Return all API results | |

**User's choice:** Configurable in profile.yml (default 50)

---

## Claude's Discretion

- YAML placement of `search_queries` in profile.yml
- Whether `max_results_per_source` goes under a new `discovery:` section or root level
- Fallback behavior when `search_queries` is absent

## Deferred Ideas

None.
