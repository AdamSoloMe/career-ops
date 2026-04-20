# Plan 03-02 Summary

## Outcome

Extended the apply-ready flow from simple queue admission to packet-ready review artifacts.

- Updated `batch/batch-prompt.md` so workers gate on score, ATS, and legitimacy before producing exactly three named resume variants.
- Added `assemble-apply-packet.mjs` to create `reports/packets/{report-num}-{company}-{date}/packet.md` manifests with report links, variant paths, ATS context, and a manual submission next step.
- Wired `batch/batch-runner.sh` to parse the expanded worker JSON, assemble packets when `variant_count == 3`, and carry `daily_review_cap` into queue notes and queue admission logs.
- Expanded documentation for the packet layer and the manual-review boundary.

## Verification

- `node --check assemble-apply-packet.mjs`
- `bash -n batch/batch-runner.sh`
- `grep -q "baseline_tailored" batch/batch-prompt.md`
- `grep -q "keyword_forward" batch/batch-prompt.md`
- `grep -q "human_readable" batch/batch-prompt.md`
- `grep -q '"variant_1"' batch/batch-prompt.md`
- `grep -q '"variant_2"' batch/batch-prompt.md`
- `grep -q '"variant_3"' batch/batch-prompt.md`
- `grep -q '"variant_count"' batch/batch-prompt.md`
- `grep -q '"job_url"' batch/batch-prompt.md`
- `grep -q '"packet_slug"' batch/batch-prompt.md`
- `! grep -q "submits browser forms" batch/batch-prompt.md`
- `grep -q "reports/packets/" assemble-apply-packet.mjs`
- `grep -q "packet.md" assemble-apply-packet.mjs`
- `grep -q "submit manually" assemble-apply-packet.mjs`
- `grep -q "assemble-apply-packet.mjs" batch/batch-runner.sh`
- `grep -q "variant_count" batch/batch-runner.sh`
- `grep -q "daily_review_cap" batch/batch-runner.sh`
- `grep -q "data/apply-queue.md" docs/ARCHITECTURE.md`
- `grep -q "reports/packets" docs/ARCHITECTURE.md`
- `grep -q "prep-apply-queue.mjs" docs/SCRIPTS.md`
- `grep -q "assemble-apply-packet.mjs" docs/SCRIPTS.md`
- `grep -q -- "--from-pipeline" docs/SCRIPTS.md`
- `grep -q "manual submission" docs/ARCHITECTURE.md`
- `grep -q "manual submission" docs/SCRIPTS.md`
- `node assemble-apply-packet.mjs --report-num 999 --company Acme --role "Backend Engineer" --job-url https://example.com/job --score 4.5 --ats 82 --legitimacy "High Confidence" --report reports/999-acme-2026-04-20.md --variant-1 output/acme-baseline.pdf --variant-2 output/acme-keyword.pdf --variant-3 output/acme-human.pdf --packet-slug acme --date 2026-04-20 --daily-review-cap 10`

## Deviations from Plan

None in scope. The runner reads `daily_review_cap` directly from profile config so packet creation and queue notes stay aligned with the user-owned automation settings.
