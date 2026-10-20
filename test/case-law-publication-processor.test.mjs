import test from "node:test";
import assert from "node:assert/strict";
import {
  assessDiscoveryCaseIdentifier,
  extractCaseLawDiscoveryRegister,
  extractSupremeCourtBulletinReferences
} from "../src/case-law-publication-processor.js";

test("case-law discovery identifiers preserve source text and fail closed on malformed shapes",()=>{
  const valid=assessDiscoveryCaseIdentifier("ГЖ-1391/18");
  assert.equal(valid.quality,"valid_shape");
  assert.equal(valid.raw,"ГЖ-1391/18");

  for(const raw of ["ГЖ-197718","ГЖ-1530/1","ГЖ-760"]){
    const r=assessDiscoveryCaseIdentifier(raw);
    assert.equal(r.quality,"review_required",raw);
    assert.equal(r.raw,raw);
    assert.equal(r.sourceValuePreserved,true);
  }

  const style=assessDiscoveryCaseIdentifier("гж-2433/18");
  assert.equal(style.quality,"style_review");
  assert.equal(style.raw,"гж-2433/18");
  assert.equal(style.normalizedLookupKey,"ГЖ-2433/18");
});

test("discovery register becomes target metadata, never originating decisions",()=>{
  const source=`
Долг
по договор
ГЖ-1391/18, ГЖ-197718
Извршување
одлагање
ТСЖ-88/19
`;
  const r=extractCaseLawDiscoveryRegister(source);
  assert.equal(r.record_count,3);
  assert.ok(r.records.every(x=>x.discovery_only===true));
  assert.ok(r.records.every(x=>x.originating_decision_verified===false));
  assert.equal(r.review_required_count,1);
});

test("Supreme Court bulletin references become excerpt/discovery child records, never full judgments",()=>{
  const source=`
ВРХОВЕН СУД НА РЕПУБЛИКА МАКЕДОНИЈА
БИЛТЕН НА СУДСКАТА ПРАКТИКА 2016-2017

СЕНТЕНЦИ
Дозволеност на ревизија.
Пресуда Рев2.бр.523/2014 од 22.04.2015 година.

КАЗНЕНО ОДДЕЛЕНИЕ
Правно мислење
Кзз.бр.32/2014 од 12.11.2014 година.

Судење во разумен рок
Квп1.бр.261/2014 од 10.12.2014 година.
`;
  const r=extractSupremeCourtBulletinReferences(source);
  assert.equal(r.record_count,3);
  assert.ok(r.records.some(x=>x.source_case_identifier.includes("Рев2.бр.523/2014")));
  assert.ok(r.records.some(x=>x.source_case_identifier.includes("Кзз.бр.32/2014")));
  assert.ok(r.records.every(x=>x.full_judgment_available===false));
  assert.ok(r.records.every(x=>x.originating_decision_binding_verified===false));
  assert.ok(r.records.every(x=>x.production_eligible===false));
});
