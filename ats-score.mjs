#!/usr/bin/env node

/**
 * ats-score.mjs - Sunny-style ATS simulation helper for career-ops.
 *
 * This is not Sunny Patel's implementation. It is a deterministic local
 * approximation that follows the documented public scoring formulas:
 * six dimensions, platform weights, formatting deductions, keyword strategies,
 * quirk penalties, and platform-specific pass thresholds.
 */

import { readFileSync, existsSync } from 'fs';
import { basename } from 'path';

const PLATFORMS = {
  workday: {
    label: 'Workday',
    weights: { formatting: 0.25, keyword: 0.30, sections: 0.15, experience: 0.15, education: 0.10, quantification: 0.05 },
    strictness: 0.90,
    strategy: 'exact',
    threshold: 70,
    autoReject: 'Conditional',
  },
  taleo: {
    label: 'Taleo',
    weights: { formatting: 0.20, keyword: 0.35, sections: 0.15, experience: 0.15, education: 0.10, quantification: 0.05 },
    strictness: 0.85,
    strategy: 'exact',
    threshold: 75,
    autoReject: 'Yes',
  },
  icims: {
    label: 'iCIMS',
    weights: { formatting: 0.15, keyword: 0.30, sections: 0.15, experience: 0.20, education: 0.10, quantification: 0.10 },
    strictness: 0.60,
    strategy: 'fuzzy',
    threshold: 60,
    autoReject: 'No',
  },
  greenhouse: {
    label: 'Greenhouse',
    weights: { formatting: 0.10, keyword: 0.25, sections: 0.10, experience: 0.25, education: 0.10, quantification: 0.20 },
    strictness: 0.40,
    strategy: 'semantic',
    threshold: 50,
    autoReject: 'No',
  },
  lever: {
    label: 'Lever',
    weights: { formatting: 0.08, keyword: 0.22, sections: 0.10, experience: 0.30, education: 0.10, quantification: 0.20 },
    strictness: 0.35,
    strategy: 'semantic',
    threshold: 50,
    autoReject: 'No',
  },
  successfactors: {
    label: 'SuccessFactors',
    weights: { formatting: 0.25, keyword: 0.25, sections: 0.20, experience: 0.15, education: 0.10, quantification: 0.05 },
    strictness: 0.85,
    strategy: 'exact',
    threshold: 65,
    autoReject: 'Conditional',
  },
};

const FORMAT_PENALTIES = [
  { key: 'multi_column', label: 'Multi-column layout', penalty: 15 },
  { key: 'tables', label: 'Tables detected', penalty: 12 },
  { key: 'images', label: 'Images/graphics', penalty: 8 },
  { key: 'pages_over_2', label: 'Pages > 2', penalty: 5 },
  { key: 'word_count_under_150', label: 'Word count < 150', penalty: 10 },
  { key: 'word_count_over_1500', label: 'Word count > 1500', penalty: 3 },
  { key: 'special_char_ratio_over_5', label: 'Special char ratio > 5%', penalty: 8 },
  { key: 'all_caps_lines_over_3', label: 'All-caps lines > 3', penalty: 3 },
  { key: 'inconsistent_bullets', label: 'Inconsistent bullets (> 2 styles)', penalty: 2 },
];

const REQUIRED_SECTIONS = [
  { key: 'contact', patterns: [/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/i, /\blinkedin\.com\b/i] },
  { key: 'experience', patterns: [/^#{1,4}\s*(work\s+)?experience\b/im, /^#{1,4}\s*employment\b/im] },
  { key: 'education', patterns: [/^#{1,4}\s*education\b/im] },
  { key: 'skills', patterns: [/^#{1,4}\s*(technical\s+)?skills\b/im, /^#{1,4}\s*core\s+competencies\b/im] },
];

const BONUS_SECTIONS = [
  { key: 'summary', patterns: [/^#{1,4}\s*(professional\s+)?summary\b/im, /^#{1,4}\s*objective\b/im] },
  { key: 'projects', patterns: [/^#{1,4}\s*projects\b/im] },
  { key: 'certifications', patterns: [/^#{1,4}\s*certifications\b/im] },
  { key: 'publications', patterns: [/^#{1,4}\s*publications\b/im] },
  { key: 'volunteer', patterns: [/^#{1,4}\s*volunteer\b/im] },
];

const SYNONYMS = new Map([
  ['javascript', ['js', 'ecmascript']],
  ['typescript', ['ts']],
  ['postgresql', ['postgres']],
  ['node.js', ['nodejs', 'node']],
  ['react', ['react.js', 'reactjs']],
  ['next.js', ['nextjs']],
  ['kubernetes', ['k8s']],
  ['artificial intelligence', ['ai']],
  ['machine learning', ['ml']],
  ['large language model', ['llm']],
  ['retrieval augmented generation', ['rag']],
  ['continuous integration', ['ci']],
  ['continuous deployment', ['cd']],
  ['amazon web services', ['aws']],
  ['google cloud platform', ['gcp']],
  ['project manager', ['pm']],
  ['product manager', ['pm']],
  ['software engineer', ['developer', 'programmer']],
  ['rest api', ['restful api', 'api']],
]);

const STOPWORDS = new Set([
  'about', 'above', 'across', 'after', 'again', 'against', 'also', 'and', 'any',
  'are', 'based', 'been', 'being', 'benefits', 'between', 'both', 'but', 'can',
  'candidate', 'company', 'description', 'each', 'equal', 'etc', 'from', 'have',
  'help', 'into', 'job', 'join', 'like', 'more', 'must', 'not', 'our', 'over',
  'per', 'plus', 'preferred', 'required', 'responsibilities', 'role', 'such',
  'team', 'than', 'that', 'the', 'their', 'this', 'through', 'using', 'with',
  'work', 'you', 'your',
]);

function parseArgs(argv) {
  const args = { resume: 'cv.md', jd: null, jdFile: null, url: '', json: false, markdown: false };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--resume') args.resume = argv[++i];
    else if (arg === '--jd') args.jd = argv[++i];
    else if (arg === '--jd-file') args.jdFile = argv[++i];
    else if (arg === '--url') args.url = argv[++i];
    else if (arg === '--json') args.json = true;
    else if (arg === '--markdown') args.markdown = true;
    else if (arg === '--help' || arg === '-h') usage(0);
    else usage(1, `Unknown argument: ${arg}`);
  }
  return args;
}

function usage(code, message = '') {
  if (message) console.error(message);
  console.error('Usage: node ats-score.mjs --resume cv.md --jd-file job.txt [--url URL] [--json|--markdown]');
  process.exit(code);
}

function readText(path, label) {
  if (!path || !existsSync(path)) usage(1, `${label} not found: ${path}`);
  return readFileSync(path, 'utf8');
}

function stripMarkup(text) {
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[`*_#[\]()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function words(text) {
  return stripMarkup(text).toLowerCase().match(/[a-z][a-z0-9.+#/-]{1,}/g) || [];
}

function unique(arr) {
  return [...new Set(arr)];
}

function clamp(n) {
  return Math.max(0, Math.min(100, n));
}

function round(n) {
  return Math.round(n * 10) / 10;
}

function phraseInText(phrase, text) {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(text);
}

function inferPlatform(url = '') {
  const lower = url.toLowerCase();
  if (lower.includes('greenhouse.io')) return 'greenhouse';
  if (lower.includes('lever.co')) return 'lever';
  if (lower.includes('myworkdayjobs.com') || lower.includes('workday.com')) return 'workday';
  if (lower.includes('taleo.net')) return 'taleo';
  if (lower.includes('icims.com')) return 'icims';
  if (lower.includes('successfactors.com') || lower.includes('sapsf.com')) return 'successfactors';
  return 'unknown';
}

function extractKeywords(jdText) {
  const lower = stripMarkup(jdText).toLowerCase();
  const techPatterns = [
    'react', 'next.js', 'typescript', 'javascript', 'python', 'fastapi', 'flask',
    'django', 'postgresql', 'mysql', 'mongodb', 'redis', 'aws', 'gcp', 'azure',
    'docker', 'kubernetes', 'terraform', 'graphql', 'rest api', 'ci/cd',
    'langchain', 'llamaindex', 'rag', 'llm', 'machine learning', 'ai',
    'pandas', 'spark', 'snowflake', 'databricks', 'kafka', 'linux',
  ];
  const foundTech = techPatterns.filter(term => phraseInText(term, lower));
  const tokens = words(jdText)
    .filter(w => w.length >= 3 && !STOPWORDS.has(w))
    .filter(w => !/^\d+$/.test(w));
  const frequency = new Map();
  for (const token of tokens) frequency.set(token, (frequency.get(token) || 0) + 1);
  const frequent = [...frequency.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .filter(word => !foundTech.some(term => term.includes(word) || word.includes(term)))
    .slice(0, 20);
  return unique([...foundTech, ...frequent]).slice(0, 30);
}

function synonymMatches(term, resumeLower) {
  const variants = SYNONYMS.get(term) || [];
  if (variants.some(v => phraseInText(v, resumeLower))) return true;
  for (const [canonical, syns] of SYNONYMS.entries()) {
    if (syns.includes(term) && phraseInText(canonical, resumeLower)) return true;
  }
  return false;
}

function semanticMatches(term, resumeLower) {
  if (synonymMatches(term, resumeLower)) return true;
  const compact = term.replace(/[^a-z0-9]/g, '');
  if (compact.length < 3) return false;
  const resumeTokens = words(resumeLower);
  return resumeTokens.some(token => token.length >= 3 && (token.includes(compact) || compact.includes(token)));
}

function keywordScore(keywords, resumeText, strategy) {
  if (keywords.length === 0) {
    return { score: 100, exact: [], partial: [], missing: [], denominator: 0 };
  }
  const resumeLower = stripMarkup(resumeText).toLowerCase();
  const exact = [];
  const partial = [];
  const missing = [];
  for (const keyword of keywords) {
    if (phraseInText(keyword, resumeLower)) exact.push(keyword);
    else if (strategy === 'fuzzy' && synonymMatches(keyword, resumeLower)) partial.push(keyword);
    else if (strategy === 'semantic' && semanticMatches(keyword, resumeLower)) partial.push(keyword);
    else missing.push(keyword);
  }
  const numerator = exact.length + 0.8 * partial.length;
  return {
    score: round(clamp((numerator / keywords.length) * 100)),
    exact,
    partial,
    missing,
    denominator: keywords.length,
  };
}

function formatSignals(resumeText) {
  const plain = stripMarkup(resumeText);
  const wordCount = words(resumeText).length;
  const lines = resumeText.split(/\r?\n/);
  const bulletMarkers = new Set(
    lines
      .map(line => line.trim().match(/^([-*•‣▪])/u)?.[1])
      .filter(Boolean)
  );
  const nonAscii = [...plain].filter(ch => ch.charCodeAt(0) > 127).length;
  const specialRatio = plain.length ? nonAscii / plain.length : 0;
  const allCapsLines = lines.filter(line => {
    const trimmed = line.trim();
    return trimmed.length > 8 && /^[A-Z0-9 .&/+-]+$/.test(trimmed) && /[A-Z]/.test(trimmed);
  }).length;
  const issueFlags = {
    multi_column: /column-count|grid-template-columns|display:\s*grid|two-column|two column/i.test(resumeText),
    tables: lines.some(line => /^\s*\|.*\|\s*$/.test(line)) || /<table\b/i.test(resumeText),
    images: /!\[[^\]]*\]\(|<img\b|\.svg\b/i.test(resumeText),
    pages_over_2: /pages?\s*:\s*([3-9]|\d{2,})/i.test(resumeText),
    word_count_under_150: wordCount < 150,
    word_count_over_1500: wordCount > 1500,
    special_char_ratio_over_5: specialRatio > 0.05,
    all_caps_lines_over_3: allCapsLines > 3,
    inconsistent_bullets: bulletMarkers.size > 2,
  };
  const issues = FORMAT_PENALTIES.filter(issue => issueFlags[issue.key]);
  const basePenalty = issues.reduce((sum, issue) => sum + issue.penalty, 0);
  const confidence = 'Low';
  return { wordCount, specialRatio: round(specialRatio * 100), allCapsLines, bulletStyles: bulletMarkers.size, issues, basePenalty, confidence };
}

function formatScoreForPlatform(format, platform) {
  return round(clamp(100 - format.basePenalty * platform.strictness));
}

function sectionScore(resumeText) {
  const required = REQUIRED_SECTIONS.map(section => ({
    key: section.key,
    present: section.patterns.some(pattern => pattern.test(resumeText)),
  }));
  const bonus = BONUS_SECTIONS.map(section => ({
    key: section.key,
    present: section.patterns.some(pattern => pattern.test(resumeText)),
  }));
  const requiredPresent = required.filter(s => s.present).length;
  const bonusPresent = bonus.filter(s => s.present).length;
  const score = clamp((requiredPresent / REQUIRED_SECTIONS.length) * 85 + Math.min(15, bonusPresent * 3));
  return { score: round(score), required, bonus, missingRequired: required.filter(s => !s.present).map(s => s.key) };
}

function experienceBullets(resumeText) {
  return resumeText
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /^[-*•]\s+/.test(line));
}

function quantificationScore(resumeText) {
  const bullets = experienceBullets(resumeText);
  const quantified = bullets.filter(line => /(\$|\d+|%|\b\d+(?:\.\d+)?\s?(k|m|mm|b|x|ms|s|sec|seconds|minutes|users|customers|servers|listings|docs|requests)\b)/i.test(line));
  const score = bullets.length > 0 ? Math.floor((quantified.length / bullets.length) * 100) : 0;
  return { score, totalBullets: bullets.length, quantifiedBullets: quantified.length };
}

function experienceScore(resumeText, keywords, jdText) {
  const bullets = experienceBullets(resumeText);
  if (bullets.length === 0) return { score: 35, actionVerbCount: 0, relevantBulletCount: 0, recentSignals: 0 };
  const actionVerbRegex = /\b(led|built|shipped|launched|created|designed|implemented|improved|reduced|increased|owned|automated|deployed|optimized|managed|collaborated|architected)\b/i;
  const actionVerbCount = bullets.filter(line => actionVerbRegex.test(line)).length;
  const resumeLower = stripMarkup(resumeText).toLowerCase();
  const relevantKeywords = keywords.filter(keyword => phraseInText(keyword, resumeLower)).length;
  const relevantBulletCount = bullets.filter(line => keywords.some(keyword => phraseInText(keyword, line.toLowerCase()))).length;
  const recentSignals = (resumeText.match(/\b20(2[3-9]|3\d)\b/g) || []).length;
  const actionScore = (actionVerbCount / bullets.length) * 35;
  const relevanceScore = keywords.length ? (relevantKeywords / keywords.length) * 45 : 35;
  const bulletScore = (relevantBulletCount / bullets.length) * 15;
  const recencyScore = Math.min(5, recentSignals);
  return {
    score: round(clamp(actionScore + relevanceScore + bulletScore + recencyScore)),
    actionVerbCount,
    relevantBulletCount,
    recentSignals,
  };
}

function educationScore(resumeText, jdText) {
  const resumeLower = stripMarkup(resumeText).toLowerCase();
  const jdLower = stripMarkup(jdText).toLowerCase();
  const jdRequiresDegree = /\b(bachelor|master|degree|bs\b|ba\b|ms\b|ma\b|phd|computer science|engineering)\b/.test(jdLower);
  const hasDegree = /\b(bachelor|master|b\.s\.|m\.s\.|b\.a\.|m\.a\.|phd|degree|computer science|engineering)\b/.test(resumeLower);
  const hasDate = /\b(19|20)\d{2}\b/.test(resumeLower);
  if (!jdRequiresDegree) return { score: hasDegree ? 90 : 80, jdRequiresDegree, hasDegree, hasDate };
  if (hasDegree && hasDate) return { score: 100, jdRequiresDegree, hasDegree, hasDate };
  if (hasDegree) return { score: 90, jdRequiresDegree, hasDegree, hasDate };
  return { score: 45, jdRequiresDegree, hasDegree, hasDate };
}

function quirkAdjustments(platformKey, format, sections, keywordByStrategy) {
  const quirks = [];
  if (platformKey === 'workday') {
    if (sections.missingRequired.length > 2) quirks.push({ quirk: 'Non-standard headers', condition: '> 2 unrecognized/missing standard sections', penalty: 5 });
    if (format.issues.some(issue => issue.key === 'pages_over_2')) quirks.push({ quirk: 'Page limit', condition: '> 2 pages', penalty: 8 });
  }
  if (platformKey === 'taleo') {
    if (keywordByStrategy.exact.exact.length < 5) quirks.push({ quirk: 'Low keyword density', condition: '< 5 exact skills detected with JD', penalty: 10 });
    if (sections.missingRequired.length > 1) quirks.push({ quirk: 'Missing standard sections', condition: '> 1 required section missing', penalty: 8 });
  }
  return quirks;
}

function confidenceLabels(format, args) {
  const resumeSource = basename(args.resume || 'cv.md');
  const lowerPath = (args.resume || '').toLowerCase();
  const formatConfidence = lowerPath.endsWith('.html') || lowerPath.endsWith('.htm')
    ? 'Medium'
    : (lowerPath.endsWith('.pdf') || lowerPath.endsWith('.docx') ? 'High' : format.confidence);
  return {
    overall: formatConfidence === 'Low' ? 'Medium' : 'High',
    formatting: formatConfidence,
    keyword: args.jd || args.jdFile ? 'Medium' : 'Low',
    reason: formatConfidence === 'Low'
      ? `Based on ${resumeSource} text/markdown, not direct ATS parsing of a submitted PDF/DOCX.`
      : `Based on ${resumeSource} with stronger formatting signals available.`,
  };
}

function score(args) {
  const resumeText = readText(args.resume, 'Resume');
  const jdText = args.jdFile ? readText(args.jdFile, 'JD file') : (args.jd || '');
  const keywords = extractKeywords(jdText);
  const format = formatSignals(resumeText);
  const sections = sectionScore(resumeText);
  const quantification = quantificationScore(resumeText);
  const education = educationScore(resumeText, jdText);
  const experience = experienceScore(resumeText, keywords, jdText);
  const keywordByStrategy = {
    exact: keywordScore(keywords, resumeText, 'exact'),
    fuzzy: keywordScore(keywords, resumeText, 'fuzzy'),
    semantic: keywordScore(keywords, resumeText, 'semantic'),
  };

  const platforms = {};
  for (const [key, platform] of Object.entries(PLATFORMS)) {
    const formatting = formatScoreForPlatform(format, platform);
    const keyword = keywordByStrategy[platform.strategy].score;
    const dimensions = {
      formatting,
      keyword,
      sections: sections.score,
      experience: experience.score,
      education: education.score,
      quantification: quantification.score,
    };
    const weighted = Object.entries(platform.weights).reduce((sum, [dimension, weight]) => sum + dimensions[dimension] * weight, 0);
    const quirks = quirkAdjustments(key, format, sections, keywordByStrategy);
    const quirkPenalty = quirks.reduce((sum, q) => sum + q.penalty, 0);
    const final = round(clamp(weighted - quirkPenalty));
    platforms[key] = {
      label: platform.label,
      score: final,
      weighted_sum: round(weighted),
      threshold: platform.threshold,
      verdict: final >= platform.threshold ? 'Pass' : 'Risk',
      auto_reject: platform.autoReject,
      strategy: platform.strategy,
      strictness: platform.strictness,
      quirk_penalty: quirkPenalty,
      quirks,
      dimensions,
    };
  }

  const inferred = inferPlatform(args.url);
  const atsSimulationScore = inferred === 'unknown'
    ? Math.min(...Object.values(platforms).map(p => p.score))
    : platforms[inferred].score;
  const readiness = round(clamp(
    experience.score * 0.40 +
    keywordByStrategy.semantic.score * 0.25 +
    quantification.score * 0.20 +
    sections.score * 0.10 +
    education.score * 0.05
  ));
  const confidence = confidenceLabels(format, args);
  const lowest = Object.values(platforms).sort((a, b) => a.score - b.score)[0];
  const missingExact = keywordByStrategy.exact.missing.slice(0, 10);
  const fastestFix = missingExact.length
    ? `Add truthful exact JD terms where supported: ${missingExact.slice(0, 5).join(', ')}`
    : (format.issues[0] ? `Fix formatting issue: ${format.issues[0].label}` : 'Maintain exact keywords and quantified bullets.');
  const drivers = {
    biggest_boost: quantification.score >= 70 ? 'Quantified bullets are strong for Greenhouse/Lever.' : 'Relevant experience and section structure carry the score.',
    biggest_drag: missingExact.length ? `Missing exact-match terms: ${missingExact.slice(0, 5).join(', ')}` : (format.issues[0]?.label || 'No major deterministic drag detected.'),
    fastest_fix: fastestFix,
    platform_most_at_risk: `${lowest.label} (${lowest.score} vs threshold ${lowest.threshold})`,
  };

  return {
    source: {
      resume_path: args.resume,
      jd_source: args.jdFile || (args.jd ? 'inline' : 'none'),
      url: args.url || null,
      confidence,
    },
    keywords,
    keyword_strategy_scores: keywordByStrategy,
    formatting_deductions: {
      word_count: format.wordCount,
      special_char_ratio_percent: format.specialRatio,
      all_caps_lines: format.allCapsLines,
      bullet_styles: format.bulletStyles,
      base_penalty: format.basePenalty,
      issues: format.issues,
    },
    section_completeness: sections,
    experience_relevance: experience,
    education_match: education,
    quantification,
    ats_simulation_score: atsSimulationScore,
    ats_target_platform: inferred,
    human_screening_readiness: readiness,
    score_drivers: drivers,
    platforms,
  };
}

function markdown(result) {
  const lines = [];
  lines.push('#### ATS Confidence');
  lines.push('');
  lines.push('| Area | Confidence | Reason |');
  lines.push('|------|------------|--------|');
  lines.push(`| Overall | ${result.source.confidence.overall} | ${result.source.confidence.reason} |`);
  lines.push(`| Formatting | ${result.source.confidence.formatting} | Formatting is inferred from available resume text/signals, not a proprietary parser. |`);
  lines.push(`| Keyword matching | ${result.source.confidence.keyword} | Based on extracted JD keywords and deterministic exact/fuzzy/semantic matching. |`);
  lines.push('');
  lines.push('#### Keyword Strategy Scores');
  lines.push('');
  lines.push('| Strategy | Platforms | Score | Exact | Partial | Missing |');
  lines.push('|----------|-----------|-------|-------|---------|---------|');
  lines.push(`| Exact | Workday, Taleo, SuccessFactors | ${result.keyword_strategy_scores.exact.score}% | ${result.keyword_strategy_scores.exact.exact.length} | 0 | ${result.keyword_strategy_scores.exact.missing.slice(0, 8).join(', ') || '-'} |`);
  lines.push(`| Fuzzy | iCIMS | ${result.keyword_strategy_scores.fuzzy.score}% | ${result.keyword_strategy_scores.fuzzy.exact.length} | ${result.keyword_strategy_scores.fuzzy.partial.length} | ${result.keyword_strategy_scores.fuzzy.missing.slice(0, 8).join(', ') || '-'} |`);
  lines.push(`| Semantic | Greenhouse, Lever | ${result.keyword_strategy_scores.semantic.score}% | ${result.keyword_strategy_scores.semantic.exact.length} | ${result.keyword_strategy_scores.semantic.partial.length} | ${result.keyword_strategy_scores.semantic.missing.slice(0, 8).join(', ') || '-'} |`);
  lines.push('');
  lines.push('#### Formatting Deductions');
  lines.push('');
  lines.push('| Issue | Base penalty | Triggered |');
  lines.push('|-------|--------------|-----------|');
  for (const issue of FORMAT_PENALTIES) {
    const triggered = result.formatting_deductions.issues.some(i => i.key === issue.key) ? 'Yes' : 'No';
    lines.push(`| ${issue.label} | ${issue.penalty} | ${triggered} |`);
  }
  lines.push('');
  lines.push('#### Quirk Adjustments');
  lines.push('');
  lines.push('| Platform | Quirk penalty | Triggered quirks |');
  lines.push('|----------|---------------|------------------|');
  for (const platform of Object.values(result.platforms)) {
    lines.push(`| ${platform.label} | -${platform.quirk_penalty} | ${platform.quirks.map(q => `${q.quirk} (${q.penalty})`).join(', ') || '-'} |`);
  }
  lines.push('');
  lines.push('#### Final Platform Math');
  lines.push('');
  lines.push('| Platform | Weighted sum | Quirk penalty | Final score | Pass threshold | Verdict |');
  lines.push('|----------|--------------|---------------|-------------|----------------|---------|');
  for (const platform of Object.values(result.platforms)) {
    lines.push(`| ${platform.label} | ${platform.weighted_sum}% | -${platform.quirk_penalty} | ${platform.score}% | ${platform.threshold} | ${platform.verdict} |`);
  }
  lines.push('');
  lines.push('#### Score Drivers');
  lines.push('');
  lines.push('| Driver | Finding |');
  lines.push('|--------|---------|');
  for (const [key, value] of Object.entries(result.score_drivers)) {
    lines.push(`| ${key.replace(/_/g, ' ')} | ${value} |`);
  }
  lines.push('');
  lines.push(`**ATS Simulation Score:** ${result.ats_simulation_score}% (${result.ats_target_platform})`);
  lines.push(`**Human Screening Readiness:** ${result.human_screening_readiness}%`);
  return lines.join('\n');
}

const args = parseArgs(process.argv);
const result = score(args);

if (args.markdown) {
  console.log(markdown(result));
} else {
  console.log(JSON.stringify(result, null, args.json ? 2 : 0));
}
