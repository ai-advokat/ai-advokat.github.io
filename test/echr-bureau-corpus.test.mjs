import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const files=[
  "corpus/echr/north-macedonia-bureau-index-2026-2018.ndjson",
  "corpus/echr/north-macedonia-bureau-index-2017-2010.ndjson",
  "corpus/echr/north-macedonia-bureau-index-2009-2001.ndjson"
];

test("official Bureau ECHR/MK index contains the expected 301 discovery records",()=>{
  const rows=files.flatMap(file=>fs.readFileSync(file,"utf8").trim().split(/\r?\n/).filter(Boolean).map(JSON.parse));
  assert.equal(rows.length,301);
  assert.ok(rows.every(x=>x.source_id==="mk-echr-representation-bureau"));
  assert.ok(rows.every(x=>x.hudoc_binding_required===true));
});

test("Bureau full-text intake is provenance-first and remains pending Human Gate",()=>{
  const script=fs.readFileSync("scripts/bureau-echr-fulltext-intake.mjs","utf8");
  assert.match(script,/biroescp\.gov\.mk/);
  assert.match(script,/source_sha256/);
  assert.match(script,/full_case_text_ingested:true/);
  assert.match(script,/hudoc_binding_required:true/);
  assert.match(script,/human_review_status:"pending"/);
  assert.match(script,/pdftotext/);
});

test("case-law importer accepts the official Bureau host",()=>{
  const importer=fs.readFileSync("scripts/case-law-ndjson-to-sql.mjs","utf8");
  assert.match(importer,/"biroescp\.gov\.mk"/);
});

test("AI chat has an official Bureau 301-record discovery lane",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/BUREAU_ECHR_INDEX_URLS/);
  assert.match(worker,/bureauEchrDiscoveryContext/);
  assert.match(worker,/official_domestic_echr_translation_discovery/);
  assert.match(worker,/indexedRecords:bureauEchrBundle\.recordCount/);
  assert.match(worker,/hudocBindingRequired:true/);
});
