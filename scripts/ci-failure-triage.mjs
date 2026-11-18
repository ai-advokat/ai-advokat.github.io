import fs from 'node:fs';
import { pathToFileURL } from 'node:url';

// Read-only GitHub Actions triage. Never persist raw logs, request/response
// payloads, credentials, IP addresses, or personal/legal case data.
export const TARGET_NAMES = new Set([
  'AI Advokat microphone live transcription acceptance',
  'AI Advokat Translator layered production acceptance',
  'AI Advokat R3 exact 11-29 live acceptance',
  'AI Advokat Worker runtime live smoke',
  'Professional L2-L3 resilience live smoke',
  'AI Advokat root reliability live smoke',
  'FREE runtime live UAT',
  'AI Advokat translator and Contract PRO live smoke'
]);

const RULES = [
  ['CLOUDFLARE_DAILY_CAPACITY_EXHAUSTED', /workers_ai_daily_capacity_exhausted|daily_free_allocation_exhausted|ui_translation_workers_ai_capacity_exhausted|voice_transcription_capacity_exhausted|4006:.*daily free allocation/i],
  ['OPENAI_PROJECT_SPEND_LIMIT', /project_spend_limit_exceeded/i],
  ['RATE_LIMIT_OR_QUOTA', /\bHTTP\s*429\b|\brate_limited\b|\btoo_many_requests\b|\bfree_quota_exhausted\b|\bui_translation_rate_limited\b|\bquota_consumed\b/i],
  ['PROVIDER_UNAVAILABLE', /\bHTTP\s*50[0234]\b|voice_transcription_unavailable|ui_translation_unavailable|provider_not_ready|upstream_unavailable/i],
  ['RELEASE_SHA_OR_BYTE_MISMATCH', /source_main_sha=|expected runtime contract was not deployed|byte.parity|Worker deployment not yet at expected commit|PAGES RELEASE SHA/i],
  ['CORS_OR_PREFLIGHT', /allow_origin_mismatch|access-control-allow-origin|preflight_http_|x_voice_language_not_allowed/i],
  ['NETWORK_TIMEOUT', /AbortError|TimeoutError|ETIMEDOUT|ECONNRESET|curl: \(28\)|operation timed out|timed out|timeout exceeded/i],
  ['MICROPHONE_TRANSCRIPTION', /transcribe_http_|transcript_empty_or_too_short|retention_contract_missing|human_gate_contract_missing|unexpected_model:/i],
  ['TRANSLATION_OR_DOM_STATE', /layer_3_live_mk_to_sq|translationState|translation_state|failedTranslationResponses|waitForFunction|partial.translation/i],
  ['DEPENDENCY_OR_SYNTAX', /Cannot find module|MODULE_NOT_FOUND|SyntaxError:|ERR_MODULE_NOT_FOUND|npm ERR!|command not found/i],
  ['AUTH_OR_PERMISSION', /\bHTTP\s*40[13]\b|unauthorized|permission denied|Bad credentials/i]
];

export function classifyFailure(logText = '', failedStepName = '') {
  const log = String(logText).slice(-2_000_000);
  const matches = RULES.filter(([, rx]) => rx.test(log)).map(([code]) => code);
  if (matches.length) return { categories: matches, evidence: 'LOG_SIGNATURE_CANDIDATE' };
  const step = String(failedStepName);
  if (/GitHub Pages serves/i.test(step)) return { categories: ['PAGES_DEPLOYMENT_OR_PARITY'], evidence: 'FAILED_STEP_ONLY' };
  if (/Worker serves exact/i.test(step)) return { categories: ['WORKER_DEPLOYMENT_OR_PARITY'], evidence: 'FAILED_STEP_ONLY' };
  if (/microphone/i.test(step)) return { categories: ['MICROPHONE_LIVE_CHECK'], evidence: 'FAILED_STEP_ONLY' };
  if (/Translator|M2M100|translation/i.test(step)) return { categories: ['TRANSLATOR_LIVE_CHECK'], evidence: 'FAILED_STEP_ONLY' };
  return { categories: ['UNCLASSIFIED'], evidence: log ? 'NO_KNOWN_LOG_SIGNATURE' : 'LOG_UNAVAILABLE' };
}

export function failedStepNames(job) {
  return (Array.isArray(job?.steps) ? job.steps : [])
    .filter(x => x?.conclusion === 'failure')
    .map(x => String(x.name || '').slice(0, 140));
}

async function githubRequest(path, token, kind = 'json') {
  const response = await fetch('https://api.github.com' + path, {
    headers: {
      Authorization: 'Bearer ' + token,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ai-advokat-read-only-ci-triage'
    },
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error('GitHub API ' + response.status + ' for ' + path.split('?')[0]);
  return kind === 'text' ? response.text() : response.json();
}

export async function auditFailures({ repo, token, maxPages = 4, maxAgeHours = 96, maxJobs = 18, request = githubRequest } = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo || '')) throw new Error('Invalid GitHub repository');
  if (!token) throw new Error('GITHUB_TOKEN missing');
  const cutoffMs = Date.now() - maxAgeHours * 3600_000;
  const chosen = new Map();
  let pagesScanned = 0;
  for (let page = 1; page <= maxPages; page++) {
    const json = await request('/repos/' + repo + '/actions/runs?status=failure&per_page=100&page=' + page, token);
    const runs = Array.isArray(json?.workflow_runs) ? json.workflow_runs : [];
    pagesScanned++;
    for (const run of runs) {
      if (!TARGET_NAMES.has(run.name) || chosen.has(run.name)) continue;
      if ((Date.parse(run.created_at || '') || 0) < cutoffMs) continue;
      if (!['workflow_run', 'workflow_dispatch', 'push'].includes(run.event)) continue;
      chosen.set(run.name, run);
    }
    if (runs.length < 100 || chosen.size === TARGET_NAMES.size) break;
  }
  const report = {
    schema: 'ai_advokat_ci_failure_triage_v1',
    generated_at: new Date().toISOString(),
    repository: repo,
    evidence_scope: 'GitHub Actions run/job metadata and signature-only log analysis',
    raw_logs_stored: false,
    interpretation_notice: 'Categories are non-authoritative hints; read failed job details before assigning root cause',
    token_stored: false,
    pages_scanned: pagesScanned,
    found_failed_workflows: chosen.size,
    workflows: []
  };
  let processedJobs = 0;
  for (const [name, run] of chosen) {
    const result = {
      name,
      run_id: Number(run.id),
      run_number: Number(run.run_number),
      url: String(run.html_url || ''),
      event: String(run.event || ''),
      head_sha: String(run.head_sha || ''),
      created_at: String(run.created_at || ''),
      jobs: []
    };
    const jobsData = await request('/repos/' + repo + '/actions/runs/' + run.id + '/jobs?per_page=100', token);
    for (const job of (jobsData?.jobs || []).filter(j => j?.conclusion === 'failure')) {
      if (processedJobs >= maxJobs) break;
      processedJobs++;
      const steps = failedStepNames(job);
      let logText = '';
      let logRead = false;
      try {
        logText = await request('/repos/' + repo + '/actions/jobs/' + job.id + '/logs', token, 'text');
        logRead = true;
      } catch {
        // Job metadata and failed step names still provide bounded evidence.
      }
      const classed = classifyFailure(logText, steps.join(' / '));
      result.jobs.push({
        job_id: Number(job.id),
        name: String(job.name || '').slice(0, 140),
        url: String(job.html_url || ''),
        failed_steps: steps,
        log_read: logRead,
        categories: classed.categories,
        evidence: classed.evidence
      });
    }
    report.workflows.push(result);
  }
  report.workflows.sort((a, b) => a.name.localeCompare(b.name));
  return report;
}

async function main() {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  const output = process.env.REPORT_PATH || '/tmp/ai-advokat-ci-failure-triage.json';
  const report = await auditFailures({ repo, token });
  fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
  console.log('CI TRIAGE: ' + report.found_failed_workflows + ' failing workflows found; summary saved (no raw logs)');
  for (const entry of report.workflows) {
    for (const job of entry.jobs) {
      console.log(entry.name + ' #' + entry.run_number + ' job=' + job.job_id + ' categories=' + job.categories.join(',') + ' log_read=' + job.log_read);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(e => { console.error('CI_TRIAGE_FAILED: ' + String(e?.message || e)); process.exitCode = 1; });
}
