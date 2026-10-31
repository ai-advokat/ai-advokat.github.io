import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

test('standalone bot uses local redaction before sending protected identifiers',()=>{
  const source=fs.readFileSync('assets/standalone-bot.js','utf8');
  assert.match(source,/redactConfidentialCasePrompt/);
  assert.match(source,/let outboundQ=q, privacyRedacted=false/);
  assert.match(source,/redacted\.changed && redacted\.safeToSend/);
  assert.match(source,/q:outboundQ/);
  assert.match(source,/message\('user',outboundQ\)/);
  assert.match(source,/маскирани локално/);
});

test('standalone privacy fallback keeps the draft local when automatic redaction is not sufficient',()=>{
  const source=fs.readFileSync('assets/standalone-bot.js','utf8');
  const start=source.indexOf("if (privacy.confidential)");
  const block=source.slice(start,start+1700);
  assert.match(block,/Ништо не е испратено/);
  assert.match(block,/return;/);
  assert.doesNotMatch(block,/\$\('plus'\)\.open = true/);
});

test('privacy copy makes the secure workspace necessity-based',()=>{
  const html=fs.readFileSync('bot/index.html','utf8');
  assert.match(html,/маскираат локално/);
  assert.match(html,/точниот идентитет/);
  assert.match(html,/само кога се неопходни/);
});
