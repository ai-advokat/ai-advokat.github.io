import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {normalizeCaseNumber,caseAliases,matchOne} from '../scripts/match-mk-supreme-case-number.mjs';

test('normalizes Macedonian case numbers without inventing identifiers',()=>{
  assert.equal(normalizeCaseNumber('Рев2 бр.519/11'),'РЕВ2-519/2011');
  assert.equal(normalizeCaseNumber('Кж.бр. 44/09'),'КЖ-44/2009');
  assert.ok(caseAliases('Рев2 бр.519/11').includes('РЕВ2-519/2011'));
});

test('resolver only returns real supplied official Supreme URLs',()=>{
  const target={supreme_case_number:'Рев2 бр.519/11'};
  const candidates=[
    {url:'https://www.vrhoven.sud.mk/example?id=1',label:'Рев2 бр.519/11'},
    {url:'https://evil.example/519',label:'Рев2 бр.519/11'}
  ];
  const hit=matchOne(target,candidates);
  assert.equal(hit.resolver_status,'official_candidate_match');
  assert.equal(hit.matched_source_url,'https://www.vrhoven.sud.mk/example?id=1');
  assert.equal(hit.official_binding_verified,false);
  assert.equal(hit.human_gate_required,true);
});

test('resolver stays unresolved rather than inventing a URL',()=>{
  const hit=matchOne({supreme_case_number:'Рев 9999/99'},[]);
  assert.equal(hit.resolver_status,'unresolved');
  assert.equal(hit.matched_source_url,null);
  assert.equal(hit.do_not_invent_url,true);
});


test('release metadata and source registry preserve Human Gate boundaries',()=>{
  const manifest=JSON.parse(fs.readFileSync('data/case-law/as-stip-bulletins-v2/manifest.json','utf8'));
  const qc=JSON.parse(fs.readFileSync('data/case-law/as-stip-bulletins-v2/qc-summary.json','utf8'));
  const priority=JSON.parse(fs.readFileSync('data/case-law/as-stip-bulletins-v2/priority-human-gate.json','utf8'));
  const supreme=fs.readFileSync('data/case-law/as-stip-bulletins-v2/supreme-binding-queue.ndjson','utf8').trim().split(/\r?\n/).map(JSON.parse);
  const registry=JSON.parse(fs.readFileSync('data/case-law-source-registry-2026.json','utf8'));
  const source=registry.sources.find(x=>x.id==='mk-appellate-stip-bulletins');
  assert.equal(manifest.qc.record_count,388);
  assert.equal(qc.production_eligible,false);
  assert.equal(qc.human_gate_required,true);
  assert.equal(priority.record_count,31);
  assert.equal(supreme.length,34);
  assert.ok(supreme.every(x=>x.official_binding_verified===false&&x.human_gate_required===true));
  assert.equal(source?.url,'https://www.asstip.mk/');
  assert.equal(source?.original_decision_binding_required_before_gpt_case_law_context,true);
});
