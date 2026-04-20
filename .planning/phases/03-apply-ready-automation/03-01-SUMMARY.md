# Plan 03-01 Summary

## Outcome

Built the apply-ready queue ingestion layer on top of the existing batch flow.

- Added `prep-apply-queue.mjs` to own `data/apply-queue.md`, pipeline candidate filtering, batch-input sync, and queue-gate ingestion.
- Extended `batch/batch-runner.sh` with `--from-pipeline`, worker JSON parsing, and immediate queue admission or rejection after each completed evaluation.
- Added user-facing apply-queue automation defaults in `config/profile.example.yml`.
- Documented `data/apply-queue.md` and the no-auto-submit boundary in `DATA_CONTRACT.md` and `CLAUDE.md`.
- Updated architecture and scripts docs so the queue and packet-prep path are visible.

## Verification

- `node --check prep-apply-queue.mjs`
- `bash -n batch/batch-runner.sh`
- `grep -q "data/apply-queue.md" prep-apply-queue.mjs`
- `grep -q "sync-input" prep-apply-queue.mjs`
- `grep -q "ingest-result" prep-apply-queue.mjs`
- `grep -q "Score | ATS | Legitimacy | Variant Count | Packet | Status | Notes" prep-apply-queue.mjs`
- `grep -q ">= 4.0" prep-apply-queue.mjs`
- `grep -q ">= 70" prep-apply-queue.mjs`
- `grep -q -- "--from-pipeline" batch/batch-runner.sh`
- `grep -q "prep-apply-queue.mjs\" sync-input" batch/batch-runner.sh`
- `grep -q "prep-apply-queue.mjs\" ingest-result" batch/batch-runner.sh`
- `grep -q "screening_readiness_score" batch/batch-runner.sh`
- `grep -q "legitimacy" batch/batch-runner.sh`
- `grep -q "apply_queue:" config/profile.example.yml`
- `grep -q "min_score: 4.0" config/profile.example.yml`
- `grep -q "min_ats: 70" config/profile.example.yml`
- `grep -q "batch_cap: 20" config/profile.example.yml`
- `grep -q "daily_review_cap: 10" config/profile.example.yml`
- `grep -q "data/apply-queue.md" DATA_CONTRACT.md`
- `grep -q "data/apply-queue.md" CLAUDE.md`
- `grep -q "never submits applications automatically" CLAUDE.md`
- `node prep-apply-queue.mjs sync-input`

## Deviations from Plan

None in scope. The queue utility accepts both a direct `--ats` value and the worker’s ATS score fields so the existing batch runner can reuse the same ingestion path without an extra translation script.
