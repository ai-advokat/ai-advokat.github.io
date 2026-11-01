import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {bureauEchrBroadIndexRequest,bureauEchrJudgmentsOnlyRequest,bureauEchrOutcomeClaimRequested,formatBureauEchrIndexAnswer} from "../src/index.js";

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


test("Bureau intake emits an auditable coverage manifest",()=>{
  const script=fs.readFileSync("scripts/bureau-echr-fulltext-intake.mjs","utf8");
  assert.match(script,/matched_index_records/);
  assert.match(script,/unmatched_index_records/);
  assert.match(script,/unique_processed_pdf_hashes/);
  assert.match(script,/failures/);
  assert.match(script,/professional_reliance_without_human_gate:false/);
  const workflow=fs.readFileSync(".github/workflows/echr-bureau-fulltext-intake.yml","utf8");
  assert.match(workflow,/bureau-mk-fulltext\.manifest\.json/);
  assert.match(workflow,/m\.index_records!==301/);
  assert.match(workflow,/m\.processed_pdf_links<300/);
});


test("Bureau matcher uses conservative unique second-pass matching",()=>{
  const script=fs.readFileSync("scripts/bureau-echr-fulltext-intake.mjs","utf8");
  assert.match(script,/function candidateScore/);
  assert.match(script,/function listingYear/);
  assert.match(script,/margin<0\.05/);
  assert.match(script,/first\.score<0\.55/);
  assert.match(script,/matchedIndexIds/);
  assert.match(script,/bestIndexRecord\(link,records,matchedIndexIds,text\)/);
  assert.match(script,/Rank against ALL records/);
  assert.doesNotMatch(script,/\.filter\(record=>!record\?\.chunk_id \|\| !usedIds\.has/);
  assert.match(script,/duplicateArtifact:Boolean/);
  assert.match(script,/duplicateArtifacts\.push/);
});


test("already-used best candidate is classified as duplicate artifact, never replaced by an unrelated unused record",()=>{
  const script=fs.readFileSync("scripts/bureau-echr-fulltext-intake.mjs","utf8");
  const fn=script.slice(script.indexOf("function bestIndexRecord"),script.indexOf("function chunks"));
  assert.match(fn,/\.map\(record=>\(\{record,score:candidateScore/);
  assert.doesNotMatch(fn,/filter\(record/);
  assert.match(fn,/usedIds\.has\(first\.record\.chunk_id\)/);
});


test("Bureau matcher uses extracted first-page PDF text as a binding signal",()=>{
  const script=fs.readFileSync("scripts/bureau-echr-fulltext-intake.mjs","utf8");
  assert.match(script,/function bestIndexRecord\(link,records,usedIds=new Set\(\),pdfText=""\)/);
  assert.match(script,/slice\(0,8000\)/);
  assert.match(script,/bestIndexRecord\(link,records,matchedIndexIds,text\)/);
  assert.match(script,/independent_link_filename_and_pdf_title_containment/);
  assert.match(script,/match_diagnostics/);
});


test("Bureau intake extracts ECHR application numbers for later HUDOC binding",()=>{
  const script=fs.readFileSync("scripts/bureau-echr-fulltext-intake.mjs","utf8");
  assert.match(script,/function extractApplicationNumbers/);
  assert.match(script,/\\d\{1,6\}.*\\d\{2,4\}/);
  assert.match(script,/applicationNumbers=extractApplicationNumbers\(text\)/);
  assert.match(script,/application_numbers:applicationNumbers/);
});


test("Bureau content-aware matcher keeps PDF text separate from the link seed",()=>{
  const script=fs.readFileSync("scripts/bureau-echr-fulltext-intake.mjs","utf8");
  assert.match(script,/function titleContainedInTextScore/);
  assert.match(script,/candidateScore\(linkSeed,pdfText,record\)/);
  assert.match(script,/contentScore>=0\.80/);
  assert.match(script,/first\.score<0\.55 \|\| margin<0\.05/);
  assert.match(script,/independent_link_filename_and_pdf_title_containment/);
  assert.doesNotMatch(script,/const seed=\[link\.anchorText,[\s\S]{0,160}firstPageText/);
});


test("broad Strasbourg request activates deterministic Bureau index lane",()=>{
  const q="Сакам да ми ги дадеш сите судски пресуди на македонски граѓани кои ги добиле против Република Македонија во Стразбур.";
  assert.equal(bureauEchrBroadIndexRequest(q),true);
  assert.equal(bureauEchrJudgmentsOnlyRequest(q),true);
  assert.equal(bureauEchrOutcomeClaimRequested(q),true);
  assert.equal(bureauEchrBroadIndexRequest("Објасни што е ЕСЧП."),false);
});

test("deterministic ECHR index answer never equates a Bureau listing with a proven win",()=>{
  const rows=[
    {record_kind:"judgment_listing",title:"ТЕСТ против Северна Македонија",listing_period:"2026",captured_on:"2026-10-11"},
    {record_kind:"decision_listing",title:"ТЕСТ 2 против Северна Македонија",listing_period:"2025",captured_on:"2026-10-11"}
  ];
  const answer=formatBureauEchrIndexAnswer(rows,{judgmentsOnly:true,outcomeClaimRequested:true});
  assert.match(answer,/1 записи означени како пресуди/);
  assert.match(answer,/не докажува државјанство/);
  assert.match(answer,/не ги означува сите наведени пресуди како победи/);
  assert.match(answer,/HUDOC operative part/);
  assert.match(answer,/ТЕСТ против Северна Македонија/);
  assert.doesNotMatch(answer,/ТЕСТ 2 против Северна Македонија/);
});

test("chat handler exposes a no-model ECHR broad-index response contract",()=>{
  const worker=fs.readFileSync("src/index.js","utf8");
  assert.match(worker,/canonical_echr_bureau_judgment_index/);
  assert.match(worker,/official_domestic_echr_index_no_model/);
  assert.match(worker,/provider:"canonical_corpus_no_model"/);
  assert.match(worker,/quotaConsumed:false/);
  assert.match(worker,/HUDOC_BINDING_REQUIRED/);
});
