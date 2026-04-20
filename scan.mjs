#!/usr/bin/env node

/**
 * scan.mjs — Zero-token portal scanner
 *
 * Fetches Greenhouse, Ashby, Lever, Adzuna, and SerpAPI Google Jobs
 * directly, applies title filters from portals.yml, deduplicates
 * against existing history, and appends new offers to pipeline.md +
 * scan-history.tsv.
 *
 * Zero Claude API tokens — pure HTTP + JSON.
 *
 * Usage:
 *   node scan.mjs                  # scan all enabled companies
 *   node scan.mjs --dry-run        # preview without writing files
 *   node scan.mjs --company Cohere # scan a single company
 */

import { mkdirSync, existsSync, readFileSync } from 'fs';
import yaml from 'js-yaml';
import {
  SCAN_HISTORY_PATH,
  PIPELINE_PATH,
  FETCH_TIMEOUT_MS,
  loadSeenUrls,
  loadSeenCompanyRoles,
  appendToPipeline,
  appendToScanHistory,
  normalizeJobUrl,
  buildTitleFilter,
  parallelFetch,
  fetchJson,
} from './scan-core.mjs';

const parseYaml = yaml.load;

// ── Config ──────────────────────────────────────────────────────────

const PORTALS_PATH = 'portals.yml';
const PROFILE_PATH = 'config/profile.yml';

// Ensure required directories exist (fresh setup)
mkdirSync('data', { recursive: true });

const CONCURRENCY = 10;

// ── API detection ───────────────────────────────────────────────────

function detectApi(company) {
  // Greenhouse: explicit api field
  if (company.api && company.api.includes('greenhouse')) {
    return { type: 'greenhouse', url: company.api };
  }

  const url = company.careers_url || '';

  // Ashby
  const ashbyMatch = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/);
  if (ashbyMatch) {
    return {
      type: 'ashby',
      url: `https://api.ashbyhq.com/posting-api/job-board/${ashbyMatch[1]}?includeCompensation=true`,
    };
  }

  // Lever
  const leverMatch = url.match(/jobs\.lever\.co\/([^/?#]+)/);
  if (leverMatch) {
    return {
      type: 'lever',
      url: `https://api.lever.co/v0/postings/${leverMatch[1]}`,
    };
  }

  // Greenhouse EU boards
  const ghEuMatch = url.match(/job-boards(?:\.eu)?\.greenhouse\.io\/([^/?#]+)/);
  if (ghEuMatch && !company.api) {
    return {
      type: 'greenhouse',
      url: `https://boards-api.greenhouse.io/v1/boards/${ghEuMatch[1]}/jobs`,
    };
  }

  return null;
}

// ── API parsers ─────────────────────────────────────────────────────

function parseGreenhouse(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.absolute_url || '',
    company: companyName,
    location: j.location?.name || '',
  }));
}

function parseAshby(json, companyName) {
  const jobs = json.jobs || [];
  return jobs.map(j => ({
    title: j.title || '',
    url: j.jobUrl || '',
    company: companyName,
    location: j.location || '',
  }));
}

function parseLever(json, companyName) {
  if (!Array.isArray(json)) return [];
  return json.map(j => ({
    title: j.text || '',
    url: j.hostedUrl || '',
    company: companyName,
    location: j.categories?.location || '',
  }));
}

const PARSERS = { greenhouse: parseGreenhouse, ashby: parseAshby, lever: parseLever };

// ── newgrad-jobs.com scraper ────────────────────────────────────────
// Fetches static HTML listing pages (no API available) and parses job
// slugs of the form: title_words_at_company_words_NUMERICID

function toTitleCase(str) {
  return str.replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchNewGradJobs(categories, titleFilter, seenUrls, seenCompanyRoles) {
  const BASE = 'https://www.newgrad-jobs.com';
  const results = [];
  const errors = [];

  for (const categoryPath of categories) {
    const escaped = categoryPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`href="(${escaped}/([a-z0-9_]+))"`, 'g');

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
      let html;
      try {
        const res = await fetch(`${BASE}${categoryPath}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; career-ops-scanner/1.0)' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        html = await res.text();
      } finally {
        clearTimeout(timer);
      }

      for (const match of html.matchAll(pattern)) {
        const path = match[1];
        const slug = match[2];
        const url = `${BASE}${path}`;

        const atIdx = slug.lastIndexOf('_at_');
        if (atIdx === -1) continue;

        const title = toTitleCase(slug.substring(0, atIdx).replace(/_/g, ' '));
        const company = toTitleCase(
          slug.substring(atIdx + 4).replace(/_\d+$/, '').replace(/_/g, ' ')
        );

        if (!titleFilter(title)) continue;
        if (seenUrls.has(url)) continue;
        const key = `${company.toLowerCase()}::${title.toLowerCase()}`;
        if (seenCompanyRoles.has(key)) continue;

        seenUrls.add(url);
        seenCompanyRoles.add(key);
        results.push({ title, company, url, location: '', source: 'newgrad-jobs' });
      }
    } catch (err) {
      errors.push({ company: `newgrad-jobs${categoryPath}`, error: err.message });
    }
  }

  return { results, errors };
}

function loadDiscoveryConfig() {
  if (!existsSync(PROFILE_PATH)) {
    return { searchQueries: [], maxResultsPerSource: 50, country: 'us' };
  }

  const profile = parseYaml(readFileSync(PROFILE_PATH, 'utf-8'));
  return {
    searchQueries: profile?.discovery?.search_queries || [],
    maxResultsPerSource: profile?.discovery?.max_results_per_source ?? 50,
    country: profile?.discovery?.country || 'us',
  };
}

async function fetchAdzuna(query, { appId, appKey, country = 'us', maxResults = 50 }) {
  const PER_PAGE = 50;
  const results = [];
  let page = 1;

  while (results.length < maxResults) {
    const url = new URL(`https://api.adzuna.com/v1/api/jobs/${country}/search/${page}`);
    url.searchParams.set('app_id', appId);
    url.searchParams.set('app_key', appKey);
    url.searchParams.set('what', query);
    url.searchParams.set('results_per_page', String(Math.min(PER_PAGE, maxResults - results.length)));
    url.searchParams.set('content-type', 'application/json');

    const json = await fetchJson(url.toString());
    const batch = (json.results || []).map(j => ({
      title: j.title || '',
      url: j.redirect_url || '',
      company: j.company?.display_name || '',
      location: j.location?.area?.join(', ') || '',
      source: 'adzuna',
    }));

    results.push(...batch);
    if (batch.length < PER_PAGE) break;
    page++;
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results.slice(0, maxResults);
}

async function fetchSerpAPI(query, { apiKey, maxResults = 50 }) {
  const results = [];
  let nextPageToken = null;

  while (results.length < maxResults) {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.set('engine', 'google_jobs');
    url.searchParams.set('q', query);
    url.searchParams.set('api_key', apiKey);
    if (nextPageToken) url.searchParams.set('next_page_token', nextPageToken);

    const json = await fetchJson(url.toString());
    const batch = (json.jobs_results || []).map(j => ({
      title: j.title || '',
      url: j.apply_options?.[0]?.link || j.share_link || '',
      company: j.company_name || '',
      location: j.location || '',
      source: 'serpapi-google-jobs',
    }));

    results.push(...batch);
    nextPageToken = json.serpapi_pagination?.next_page_token;
    if (!nextPageToken || batch.length === 0) break;
  }

  return results.slice(0, maxResults);
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const companyFlag = args.indexOf('--company');
  const filterCompany = companyFlag !== -1 ? args[companyFlag + 1]?.toLowerCase() : null;

  // 1. Read portals.yml
  if (!existsSync(PORTALS_PATH)) {
    console.error('Error: portals.yml not found. Run onboarding first.');
    process.exit(1);
  }

  const config = parseYaml(readFileSync(PORTALS_PATH, 'utf-8'));
  const companies = config.tracked_companies || [];
  const titleFilter = buildTitleFilter(config.title_filter);
  const { searchQueries, maxResultsPerSource, country } = loadDiscoveryConfig();
  const adzunaAppId = process.env.ADZUNA_APP_ID;
  const adzunaAppKey = process.env.ADZUNA_APP_KEY;
  const serpApiKey = process.env.SERPAPI_KEY;

  // 2. Filter to enabled companies with detectable APIs
  const targets = companies
    .filter(c => c.enabled !== false)
    .filter(c => !filterCompany || c.name.toLowerCase().includes(filterCompany))
    .map(c => ({ ...c, _api: detectApi(c) }))
    .filter(c => c._api !== null);

  const skippedCount = companies.filter(c => c.enabled !== false).length - targets.length;

  console.log(`Scanning ${targets.length} companies via API (${skippedCount} skipped — no API detected)`);
  if (dryRun) console.log('(dry run — no files will be written)\n');
  if (!adzunaAppId || !adzunaAppKey) console.log('Adzuna: skipped (ADZUNA_APP_ID / ADZUNA_APP_KEY not set)');
  if (!serpApiKey) console.log('SerpAPI: skipped (SERPAPI_KEY not set)');

  // 3. Load dedup sets
  const seenUrls = loadSeenUrls();
  const seenCompanyRoles = loadSeenCompanyRoles();

  // 4. Fetch all APIs
  const date = new Date().toISOString().slice(0, 10);
  let totalFound = 0;
  let totalFiltered = 0;
  let totalDupes = 0;
  const newOffers = [];
  const errors = [];
  let adzunaCount = 0;
  let serpApiCount = 0;
  let newgradCount = 0;

  const tasks = targets.map(company => async () => {
    const { type, url } = company._api;
    try {
      const json = await fetchJson(url);
      const jobs = PARSERS[type](json, company.name);
      totalFound += jobs.length;

      for (const job of jobs) {
        if (!titleFilter(job.title)) {
          totalFiltered++;
          continue;
        }
        if (seenUrls.has(job.url)) {
          totalDupes++;
          continue;
        }
        const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
        if (seenCompanyRoles.has(key)) {
          totalDupes++;
          continue;
        }
        // Mark as seen to avoid intra-scan dupes
        seenUrls.add(job.url);
        seenCompanyRoles.add(key);
        newOffers.push({ ...job, source: `${type}-api` });
      }
    } catch (err) {
      errors.push({ company: company.name, error: err.message });
    }
  });

  await parallelFetch(tasks, CONCURRENCY);

  // ── External API sources ────────────────────────────────────────────
  if (adzunaAppId && adzunaAppKey && searchQueries.length > 0) {
    for (const query of searchQueries) {
      try {
        const jobs = await fetchAdzuna(query, {
          appId: adzunaAppId,
          appKey: adzunaAppKey,
          country,
          maxResults: maxResultsPerSource,
        });
        totalFound += jobs.length;

        for (const job of jobs) {
          if (!titleFilter(job.title)) {
            totalFiltered++;
            continue;
          }
          const normalizedUrl = normalizeJobUrl(job.url);
          if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
            totalDupes++;
            continue;
          }
          const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
          if (seenCompanyRoles.has(key)) {
            totalDupes++;
            continue;
          }
          seenUrls.add(normalizedUrl);
          seenCompanyRoles.add(key);
          newOffers.push({ ...job, url: normalizedUrl });
          adzunaCount++;
        }
      } catch (err) {
        errors.push({ company: `adzuna[${query}]`, error: err.message });
      }
    }
  }

  if (serpApiKey && searchQueries.length > 0) {
    for (const query of searchQueries) {
      try {
        const jobs = await fetchSerpAPI(query, {
          apiKey: serpApiKey,
          maxResults: maxResultsPerSource,
        });
        totalFound += jobs.length;

        for (const job of jobs) {
          if (!titleFilter(job.title)) {
            totalFiltered++;
            continue;
          }
          const normalizedUrl = normalizeJobUrl(job.url);
          if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
            totalDupes++;
            continue;
          }
          const key = `${job.company.toLowerCase()}::${job.title.toLowerCase()}`;
          if (seenCompanyRoles.has(key)) {
            totalDupes++;
            continue;
          }
          seenUrls.add(normalizedUrl);
          seenCompanyRoles.add(key);
          newOffers.push({ ...job, url: normalizedUrl });
          serpApiCount++;
        }
      } catch (err) {
        errors.push({ company: `serpapi[${query}]`, error: err.message });
      }
    }
  }

  // ── newgrad-jobs.com ────────────────────────────────────────────────
  const newgradConfig = config.newgrad_jobs;
  if (!filterCompany && newgradConfig?.enabled !== false && newgradConfig?.categories?.length > 0) {
    const { results: ngResults, errors: ngErrors } = await fetchNewGradJobs(
      newgradConfig.categories,
      titleFilter,
      seenUrls,
      seenCompanyRoles
    );
    totalFound += ngResults.length;
    for (const job of ngResults) {
      newOffers.push(job);
      newgradCount++;
    }
    errors.push(...ngErrors);
  }

  // 5. Write results
  if (!dryRun && newOffers.length > 0) {
    appendToPipeline(newOffers);
    appendToScanHistory(newOffers, date);
  }

  // 6. Print summary
  console.log(`\n${'━'.repeat(45)}`);
  console.log(`Portal Scan — ${date}`);
  console.log(`${'━'.repeat(45)}`);
  console.log(`Companies scanned:     ${targets.length}`);
  console.log(`Total jobs found:      ${totalFound}`);
  console.log(`Filtered by title:     ${totalFiltered} removed`);
  console.log(`Duplicates:            ${totalDupes} skipped`);
  console.log(`New offers added:      ${newOffers.length}`);
  if (adzunaAppId && adzunaAppKey) console.log(`Adzuna new offers:     ${adzunaCount}`);
  if (serpApiKey) console.log(`SerpAPI new offers:    ${serpApiCount}`);
  if (newgradConfig?.enabled !== false && newgradConfig?.categories?.length > 0) console.log(`newgrad-jobs.com:      ${newgradCount}`);

  if (errors.length > 0) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) {
      console.log(`  ✗ ${e.company}: ${e.error}`);
    }
  }

  if (newOffers.length > 0) {
    console.log('\nNew offers:');
    for (const o of newOffers) {
      console.log(`  + ${o.company} | ${o.title} | ${o.location || 'N/A'}`);
    }
    if (dryRun) {
      console.log('\n(dry run — run without --dry-run to save results)');
    } else {
      console.log(`\nResults saved to ${PIPELINE_PATH} and ${SCAN_HISTORY_PATH}`);
    }
  }

  console.log(`\n→ Run /career-ops pipeline to evaluate new offers.`);
  console.log('→ Share results and get help: https://discord.gg/8pRpHETxa4');
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
