import test from 'node:test';
import assert from 'node:assert/strict';
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
