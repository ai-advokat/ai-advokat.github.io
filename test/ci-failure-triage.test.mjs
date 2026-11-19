import test from 'node:test';
import assert from 'node:assert/strict';
import { classifyFailure, failedStepNames, auditFailures } from '../scripts/ci-failure-triage.mjs';

test('classifies provider, rate limit, page parity and microphone errors without raw excerpts', () => {
  const r = classifyFailure('sensitive.email@example.com HTTP 429 rate_limited');
  assert.deepEqual(r.categories, ['RATE_LIMIT_OR_QUOTA']);
  assert.ok(classifyFailure('workers_ai_daily_capacity_exhausted').categories.includes('CLOUDFLARE_DAILY_CAPACITY_EXHAUSTED'));
  assert.ok(classifyFailure('project_spend_limit_exceeded').categories.includes('OPENAI_PROJECT_SPEND_LIMIT'));
  assert.ok(!JSON.stringify(r).includes('sensitive.email'));
  assert.deepEqual(classifyFailure('', 'Verify GitHub Pages serves R14 dual-bot toolkit parity bundles').categories, ['PAGES_DEPLOYMENT_OR_PARITY']);
  assert.ok(classifyFailure('transcribe_http_502:bad').categories.includes('MICROPHONE_TRANSCRIPTION'));
});

test('failed steps only include failed statuses', () => {
  assert.deepEqual(failedStepNames({steps:[{name:'First',conclusion:'success'},{name:'Second',conclusion:'failure'}]}), ['Second']);
});

test('read-only audit captures exact run/job identifiers and never keeps raw logs', async () => {
  const calls=[];
  const request = async (path, token, kind) => {
    calls.push(path);
    if (path.includes('/actions/runs?')) return { workflow_runs: [{
      name:'AI Advokat root reliability live smoke',id:4445,run_number:155,conclusion:'failure',event:'workflow_run',
      html_url:'https://github.com/org/repo/actions/runs/4445',created_at:new Date().toISOString(),head_sha:'abc123'
    }] };
    if (path.includes('/jobs?')) return {jobs:[{id:8877,name:'smoke',conclusion:'failure',steps:[{name:'Verify GitHub Pages serves R14 dual-bot toolkit parity bundles',conclusion:'failure'}]}]};
    if (path.includes('/logs')) return 'HTTP 429 rate_limited and sensitive@example.com';
    throw new Error('Unexpected ' + path);
  };
  const report=await auditFailures({repo:'org/repo',token:'fixture',request,maxPages:1});
  assert.equal(report.found_failed_workflows,1);
  assert.equal(report.workflows[0].run_id,4445);
  assert.equal(report.workflows[0].jobs[0].job_id,8877);
  assert.equal(report.workflows[0].jobs[0].categories[0],'RATE_LIMIT_OR_QUOTA');
  assert.ok(!JSON.stringify(report).includes('sensitive@example.com'));
  assert.ok(calls.every(x=>x.startsWith('/repos/org/repo/actions/')));
});
