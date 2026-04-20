#!/usr/bin/env node

import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const PROJECT_DIR = dirname(fileURLToPath(import.meta.url));
const REPORTS_DIR = join(PROJECT_DIR, 'reports');
const PACKETS_DIR = join(REPORTS_DIR, 'packets');

function parseArgs(argv) {
  const flags = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith('--')) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return flags;
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function normalize(value) {
  return String(value || '').trim();
}

function derivePacketDir(flags) {
  const reportNum = normalize(flags['report-num']);
  const packetSlug = normalize(flags['packet-slug']) || slugify(flags.company);
  const date = normalize(flags.date) || today();
  return join(PACKETS_DIR, `${reportNum}-${packetSlug}-${date}`);
}

function buildPacketMarkdown(flags, packetPath) {
  const lines = [
    `# Apply Packet: ${normalize(flags.company)} — ${normalize(flags.role)}`,
    '',
    `**Date:** ${normalize(flags.date) || today()}`,
    `**Job URL:** ${normalize(flags['job-url'])}`,
    `**Offer Score:** ${normalize(flags.score)}`,
    `**ATS Score:** ${normalize(flags.ats)}`,
    `**Legitimacy:** ${normalize(flags.legitimacy)}`,
    `**Main Report:** ${normalize(flags.report)}`,
    `**Packet Directory:** ${packetPath}`,
  ];

  if (flags['daily-review-cap']) {
    lines.push(`**Daily Review Cap:** ${normalize(flags['daily-review-cap'])}`);
  }

  lines.push(
    '',
    '## Resume Variants',
    '',
    `- baseline_tailored: ${normalize(flags['variant-1'])}`,
    `- keyword_forward: ${normalize(flags['variant-2'])}`,
    `- human_readable: ${normalize(flags['variant-3'])}`,
    '',
    '## Manual Next Step',
    '',
    'Open the job URL and submit manually after choosing the strongest resume variant.',
    '',
    '## Notes',
    '',
    normalize(flags.notes) || 'Prepared for manual review.',
    '',
  );

  return lines.join('\n');
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  const required = ['report-num', 'company', 'role', 'job-url', 'score', 'ats', 'legitimacy', 'report', 'variant-1', 'variant-2', 'variant-3'];
  const missing = required.filter((key) => !normalize(flags[key]));
  if (missing.length > 0) {
    console.error(`Missing required flags: ${missing.join(', ')}`);
    process.exit(1);
  }

  mkdirSync(PACKETS_DIR, { recursive: true });
  const packetDir = derivePacketDir(flags);
  mkdirSync(packetDir, { recursive: true });

  const packetPath = join(packetDir, 'packet.md');
  writeFileSync(packetPath, buildPacketMarkdown(flags, packetDir), 'utf8');

  const response = {
    status: 'created',
    packet_path: packetPath,
    packet_dir: packetDir,
    report_path: normalize(flags.report),
    variant_count: 3,
    packet_exists: existsSync(packetPath),
  };
  console.log(JSON.stringify(response));
}

main();
