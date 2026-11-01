import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('Zoran bot reliability guard is isolated and fail-visible',()=>{
  const html=fs.readFileSync('bot/index.html','utf8');
  const guard=fs.readFileSync('assets/standalone-bot-reliability.js','utf8');

  assert.match(html,/standalone-bot-reliability\.js\?v=20261101-reliability-r4/);
  assert.match(guard,/\/api\\\/bot/);
  assert.match(guard,/empty_success_response/);
  assert.match(guard,/governanceRunId/);
  assert.match(guard,/aiadvokat:bot-runtime-failure/);
  assert.match(guard,/runtime-failure/);
  assert.match(guard,/Одговорот не е објавен/);
  assert.doesNotMatch(guard,/setTimeout/);
  assert.doesNotMatch(guard,/Workers AI/);
});


test('vNext menus bind to defined handlers before navigation actions',()=>{
  const source=fs.readFileSync('assets/standalone-bot-vnext.js','utf8');
  assert.match(source,/vnextSidebarClose'\)\.onclick=closeMobileSidebar/);
  assert.doesNotMatch(source,/onclick=closeSidebar/);
  assert.match(source,/function readTheme\(\)/);
  assert.match(source,/qsa\('\.vnext-nav button'\)\.forEach/);
  assert.match(source,/qsa\('\.vnext-evidence-tabs button'\)\.forEach/);
});
