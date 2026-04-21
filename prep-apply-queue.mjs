#!/usr/bin/env node

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';

const PROJECT_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(PROJECT_DIR, 'data');
const BATCH_DIR = join(PROJECT_DIR, 'batch');

const PIPELINE_PATH = join(DATA_DIR, 'pipeline.md');
const APPLICATIONS_PATH = join(DATA_DIR, 'applications.md');
const APPLY_QUEUE_PATH = join(DATA_DIR, 'apply-queue.md');
const BATCH_INPUT_PATH = join(BATCH_DIR, 'batch-input.tsv');
const STATE_PATH = join(BATCH_DIR, 'batch-state.tsv');
const PROFILE_PATH = join(PROJECT_DIR, 'config', 'profile.yml');
const PROFILE_EXAMPLE_PATH = join(PROJECT_DIR, 'config', 'profile.example.yml');

const DEFAULTS = {
  min_score: 4.0,
  min_ats: 70,
  legitimacy_floor: 'proceed-with-caution',
  batch_cap: 20,
  daily_review_cap: 10,
  resume_variants: 3,
};
// Locked Phase 3 queue gate defaults: score >= 4.0 and ATS >= 70.
const DEFAULT_MIN_SCORE = 4.0;
const DEFAULT_MIN_ATS = 70;

const QUEUE_HEADER = `# Apply Queue

| # | Date | Company | Role | Score | ATS | Legitimacy | Variant Count | Packet | Status | Notes |
|---|------|---------|------|-------|-----|------------|---------------|--------|--------|-------|
`;

const PIPELINE_TEMPLATE = `# Job Pipeline

## Pendientes

## Procesadas
`;

const TERMINAL_QUEUE_STATUSES = new Set(['skipped', 'expired', 'applied']);

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function ensureApplyQueue() {
  ensureDir(DATA_DIR);
  if (!existsSync(APPLY_QUEUE_PATH)) {
    writeFileSync(APPLY_QUEUE_PATH, QUEUE_HEADER, 'utf8');
  }
}

function ensurePipelineInbox() {
  ensureDir(DATA_DIR);
  if (!existsSync(PIPELINE_PATH)) {
    writeFileSync(PIPELINE_PATH, PIPELINE_TEMPLATE, 'utf8');
  }
}

function ensureBatchInput() {
  ensureDir(BATCH_DIR);
  if (!existsSync(BATCH_INPUT_PATH)) {
    writeFileSync(BATCH_INPUT_PATH, 'id\turl\tsource\tnotes\n', 'utf8');
  }
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalizeText(value) {
  return String(value || '').trim();
}

function sanitizeTableCell(value) {
  return normalizeText(value).replace(/\|/g, '/');
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function normalizeUrl(value) {
  const raw = normalizeText(value);
  if (!raw) return '';
  try {
    const parsed = new URL(raw);
    [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_content',
      'utm_term',
      'refId',
      'trackingId',
      'src',
    ].forEach((key) => parsed.searchParams.delete(key));
    return parsed.toString();
  } catch {
    return raw;
  }
}

function queueGateLegitimacyAllowed(value) {
  const lowered = normalizeText(value).toLowerCase();
  return lowered && lowered !== 'suspicious';
}

function legitimacyRank(value) {
  const lowered = normalizeText(value).toLowerCase();
  if (lowered === 'high confidence' || lowered === 'high-confidence') return 2;
  if (lowered === 'proceed with caution' || lowered === 'proceed-with-caution') return 1;
  return 0;
}

function loadYamlConfig() {
  const source = existsSync(PROFILE_PATH)
    ? PROFILE_PATH
    : existsSync(PROFILE_EXAMPLE_PATH)
      ? PROFILE_EXAMPLE_PATH
      : null;
  if (!source) return {};

  try {
    return yaml.load(readFileSync(source, 'utf8')) || {};
  } catch {
    return {};
  }
}

function getQueueConfig() {
  const config = loadYamlConfig();
  const applyQueue = config?.automation?.apply_queue || {};
  return {
    min_score: Number(applyQueue.min_score ?? DEFAULT_MIN_SCORE),
    min_ats: Number(applyQueue.min_ats ?? DEFAULT_MIN_ATS),
    legitimacy_floor: normalizeText(applyQueue.legitimacy_floor || DEFAULTS.legitimacy_floor),
    batch_cap: Number(applyQueue.batch_cap ?? DEFAULTS.batch_cap),
    daily_review_cap: Number(applyQueue.daily_review_cap ?? DEFAULTS.daily_review_cap),
    resume_variants: Number(applyQueue.resume_variants ?? DEFAULTS.resume_variants),
  };
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  for (let index = 0; index < rest.length; index += 1) {
    const token = rest[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = rest[index + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { command, flags };
}

function parsePipelineCandidates() {
  ensurePipelineInbox();
  const text = readFileSync(PIPELINE_PATH, 'utf8');
  const lines = text.split('\n');
  const candidates = [];
  let inPendingSection = false;

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      inPendingSection = /^##\s+(Pendientes|Pending|Offen|Oczekujace|En attente|Pendentes|Ожидающие|未処理)/i.test(line.trim());
      continue;
    }
    if (!inPendingSection) continue;

    const match = line.match(/^- \[ \]\s+([^|]+?)(?:\s+\|\s+([^|]+?))?(?:\s+\|\s+(.+?))?\s*$/);
    if (!match) continue;

    const url = normalizeUrl(match[1]);
    const company = normalizeText(match[2] || '');
    const role = normalizeText(match[3] || '');
    if (!url) continue;

    candidates.push({
      url,
      company,
      role,
      source: 'pipeline',
      notes: [company, role].filter(Boolean).join(' | '),
    });
  }

  return candidates;
}

function loadApplications() {
  const urls = new Set();
  const companyRoles = new Set();
  if (!existsSync(APPLICATIONS_PATH)) {
    return { urls, companyRoles };
  }

  const text = readFileSync(APPLICATIONS_PATH, 'utf8');
  for (const match of text.matchAll(/https?:\/\/[^\s|)]+/g)) {
    urls.add(normalizeUrl(match[0]));
  }

  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (line.includes('| # |') || line.includes('|---')) continue;
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 6) continue;
    const company = normalizeKey(parts[3] || '');
    const role = normalizeKey(parts[4] || '');
    if (company && role) {
      companyRoles.add(`${company}::${role}`);
    }
  }

  return { urls, companyRoles };
}

function parseQueueRows() {
  ensureApplyQueue();
  const text = readFileSync(APPLY_QUEUE_PATH, 'utf8');
  const rows = [];

  for (const line of text.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (line.includes('| # |') || line.includes('|---')) continue;
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length < 12) continue;

    rows.push({
      index: Number(parts[1]),
      date: parts[2],
      company: parts[3],
      role: parts[4],
      score: parts[5],
      ats: parts[6],
      legitimacy: parts[7],
      variantCount: parts[8],
      packet: parts[9],
      status: parts[10],
      notes: parts[11],
    });
  }

  return rows;
}

function loadQueueState() {
  const rows = parseQueueRows();
  const activeCompanyRoles = new Set();

  for (const row of rows) {
    const status = normalizeText(row.status).toLowerCase();
    if (TERMINAL_QUEUE_STATUSES.has(status)) continue;
    const company = normalizeKey(row.company);
    const role = normalizeKey(row.role);
    if (company && role) {
      activeCompanyRoles.add(`${company}::${role}`);
    }
  }

  return { rows, activeCompanyRoles };
}

function loadBatchInputRows() {
  ensureBatchInput();
  const rows = [];
  const urls = new Set();
  let maxId = 0;

  const text = readFileSync(BATCH_INPUT_PATH, 'utf8');
  for (const line of text.split('\n')) {
    if (!line.trim() || line.startsWith('id\t')) continue;
    const [id, url, source, notes] = line.split('\t');
    const numericId = Number(id);
    if (Number.isFinite(numericId)) {
      maxId = Math.max(maxId, numericId);
    }
    const normalizedUrl = normalizeUrl(url);
    if (normalizedUrl) {
      urls.add(normalizedUrl);
    }
    rows.push({
      id: numericId,
      url: normalizedUrl,
      source: normalizeText(source),
      notes: normalizeText(notes),
    });
  }

  if (existsSync(STATE_PATH)) {
    const textState = readFileSync(STATE_PATH, 'utf8');
    for (const line of textState.split('\n')) {
      if (!line.trim() || line.startsWith('id\t')) continue;
      const [id] = line.split('\t');
      const numericId = Number(id);
      if (Number.isFinite(numericId)) {
        maxId = Math.max(maxId, numericId);
      }
    }
  }

  return { rows, urls, maxId };
}

function formatBatchInput(rows) {
  const body = rows
    .sort((left, right) => left.id - right.id)
    .map((row) => `${row.id}\t${row.url}\t${row.source}\t${row.notes}`);
  return `id\turl\tsource\tnotes\n${body.join('\n')}${body.length ? '\n' : ''}`;
}

function buildQueueNote(flags, config, admitted) {
  const notes = [];
  if (flags.notes) notes.push(sanitizeTableCell(flags.notes));
  notes.push(
    admitted
      ? `Gate passed: score >= ${config.min_score}, ATS >= ${config.min_ats}, legitimacy != Suspicious`
      : `Gate failed: requires score >= ${config.min_score}, ATS >= ${config.min_ats}, legitimacy != Suspicious`,
  );
  if (flags.packet) notes.push(`Packet: ${sanitizeTableCell(flags.packet)}`);
  return notes.join(' | ');
}

function writeQueueRows(rows) {
  const body = rows
    .sort((left, right) => left.index - right.index)
    .map((row) => {
      const fields = [
        row.index,
        row.date,
        sanitizeTableCell(row.company),
        sanitizeTableCell(row.role),
        row.score,
        row.ats,
        sanitizeTableCell(row.legitimacy),
        row.variantCount,
        sanitizeTableCell(row.packet),
        sanitizeTableCell(row.status),
        sanitizeTableCell(row.notes),
      ];
      return `| ${fields.join(' | ')} |`;
    });
  const text = `${QUEUE_HEADER}${body.join('\n')}${body.length ? '\n' : ''}`;
  writeFileSync(APPLY_QUEUE_PATH, text, 'utf8');
}

function syncInput() {
  ensurePipelineInbox();
  ensureApplyQueue();
  ensureBatchInput();

  const config = getQueueConfig();
  const candidates = parsePipelineCandidates();
  const applications = loadApplications();
  const queue = loadQueueState();
  const batchInput = loadBatchInputRows();

  const selected = [];
  for (const candidate of candidates) {
    if (selected.length >= config.batch_cap) break;

    const companyRoleKey = candidate.company && candidate.role
      ? `${normalizeKey(candidate.company)}::${normalizeKey(candidate.role)}`
      : '';

    if (applications.urls.has(candidate.url)) continue;
    if (batchInput.urls.has(candidate.url)) continue;
    if (companyRoleKey && applications.companyRoles.has(companyRoleKey)) continue;
    if (companyRoleKey && queue.activeCompanyRoles.has(companyRoleKey)) continue;

    selected.push(candidate);
    batchInput.urls.add(candidate.url);
  }

  let nextId = batchInput.maxId;
  const appendedRows = selected.map((candidate) => {
    nextId += 1;
    return {
      id: nextId,
      url: candidate.url,
      source: candidate.source,
      notes: candidate.notes,
    };
  });

  const nextRows = [...batchInput.rows, ...appendedRows];
  writeFileSync(BATCH_INPUT_PATH, formatBatchInput(nextRows), 'utf8');

  console.log(JSON.stringify({
    status: 'synced',
    pipeline_path: 'data/pipeline.md',
    apply_queue_path: 'data/apply-queue.md',
    batch_input_path: 'batch/batch-input.tsv',
    appended: appendedRows.length,
    capped_at: config.batch_cap,
  }));
}

function ingestResult(flags) {
  ensureApplyQueue();
  const rows = parseQueueRows();
  const config = getQueueConfig();

  const company = normalizeText(flags.company);
  const role = normalizeText(flags.role);
  const report = normalizeText(flags.report);
  const legitimacy = normalizeText(flags.legitimacy);
  const packet = normalizeText(flags.packet || '-');
  const score = Number(flags.score);
  const screeningReadinessScore = Number(flags['screening-readiness-score']);
  const atsSimulationScore = Number(flags['ats-simulation-score']);
  const explicitAts = Number(flags.ats);
  const ats = Number.isFinite(explicitAts)
    ? explicitAts
    : Number.isFinite(screeningReadinessScore)
      ? screeningReadinessScore
      : atsSimulationScore;
  const variantCount = Number(flags['variant-count'] || 0);

  if (!company || !role || !report || !Number.isFinite(score) || !Number.isFinite(ats)) {
    console.error('ingest-result requires --company, --role, --report, --score, and either --ats or an ATS score field');
    process.exit(1);
  }

  const admitted = (
    score >= config.min_score &&
    ats >= config.min_ats &&
    queueGateLegitimacyAllowed(legitimacy) &&
    legitimacyRank(legitimacy) >= legitimacyRank(config.legitimacy_floor)
  );

  const notes = buildQueueNote(flags, config, admitted);

  if (!admitted) {
    console.log(JSON.stringify({
      status: 'skipped',
      action: 'skipped',
      queued: false,
      company,
      role,
      score,
      ats,
      legitimacy,
      reason: `Gate requires score >= ${config.min_score}, ATS >= ${config.min_ats}, legitimacy != Suspicious`,
      notes,
    }));
    return;
  }

  const key = `${normalizeKey(company)}::${normalizeKey(role)}`;
  const existingRow = rows.find((row) => `${normalizeKey(row.company)}::${normalizeKey(row.role)}` === key);
  const nextIndex = existingRow
    ? existingRow.index
    : rows.reduce((max, row) => Math.max(max, row.index || 0), 0) + 1;

  const nextRow = {
    index: nextIndex,
    date: today(),
    company: sanitizeTableCell(company),
    role: sanitizeTableCell(role),
    score: score.toFixed(1),
    ats: String(Math.round(ats)),
    legitimacy: sanitizeTableCell(legitimacy),
    variantCount: String(Number.isFinite(variantCount) ? variantCount : 0),
    packet: sanitizeTableCell(packet),
    status: 'Queued',
    notes,
  };

  const nextRows = existingRow
    ? rows.map((row) => (row.index === existingRow.index ? nextRow : row))
    : [...rows, nextRow];
  writeQueueRows(nextRows);

  console.log(JSON.stringify({
    status: 'queued',
    action: 'queued',
    queued: true,
    company,
    role,
    score,
    ats,
    legitimacy,
    packet,
    variant_count: variantCount,
    queue_path: 'data/apply-queue.md',
  }));
}

function main() {
  const { command, flags } = parseArgs(process.argv.slice(2));
  if (command === 'sync-input') {
    syncInput();
    return;
  }
  if (command === 'ingest-result') {
    ingestResult(flags);
    return;
  }

  console.error('Usage: node prep-apply-queue.mjs <sync-input|ingest-result> [--flag value]');
  process.exit(1);
}

main();
