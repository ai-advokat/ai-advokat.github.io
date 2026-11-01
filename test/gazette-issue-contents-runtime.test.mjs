import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  GAZETTE_ISSUE_CONTENTS_VERSION,
  gazetteActTypeLabel,
  findGazetteIssueContents,
  formatGazetteIssueContents
} from "../src/gazette-issue-contents.js";

const migration=fs.readFileSync("migrations/0051_gazette_issue_contents_index.sql","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const metadata=fs.readFileSync("src/gazette-issue-metadata.js","utf8");
const builder=fs.readFileSync("scripts/gazette_issue_contents_index.py","utf8");

test("GIC1 issue contents schema separates register metadata from legal text authority",()=>{
  assert.equal(GAZETTE_ISSUE_CONTENTS_VERSION,"GAZETTE_ISSUE_CONTENTS_INDEX_V1");
  assert.match(migration,/CREATE TABLE IF NOT EXISTS gazette_issue_contents_manifest/);
  assert.match(migration,/CREATE TABLE IF NOT EXISTS gazette_issue_contents \(/);
  assert.match(migration,/legal_text_authority INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration,/current_law_authority INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration,/release_authorization_id/);
});

test("GIC2 builder promotes only parsed zero-unresolved official register years",()=>{
  assert.match(builder,/status\.startswith\("parsed"\)/);
  assert.match(builder,/unresolved_count!=0/);
  assert.match(builder,/primary_official_chronological_register_metadata/);
  assert.match(builder,/"verification_status":"reconciled"/);
  assert.match(builder,/"runtime_eligible":1/);
  assert.match(builder,/"legal_text_authority":0/);
  assert.match(builder,/"current_law_authority":0/);
});

test("GIC3 act type labels cover laws, decisions and rulebooks",()=>{
  assert.equal(gazetteActTypeLabel("law"),"ЗАКОН");
  assert.equal(gazetteActTypeLabel("decision"),"ОДЛУКА");
  assert.equal(gazetteActTypeLabel("rulebook"),"ПРАВИЛНИК");
  assert.equal(gazetteActTypeLabel("resolution"),"РЕШЕНИЕ");
  assert.equal(gazetteActTypeLabel("other"),"ДРУГО");
});

test("GIC4 formatted issue contents preserve order, pages and completeness boundary",()=>{
  const answer=formatGazetteIssueContents({
    state:"matched",
    complete:true,
    items:[
      {act_type:"law",title:"Закон за пример",page_start:1},
      {act_type:"decision",title:"Одлука за пример",page_start:7},
      {act_type:"rulebook",title:"Правилник за пример",page_start:11}
    ]
  });
  assert.match(answer,/1\. ЗАКОН — Закон за пример · стр\. 1/);
  assert.match(answer,/2\. ОДЛУКА — Одлука за пример · стр\. 7/);
  assert.match(answer,/3\. ПРАВИЛНИК — Правилник за пример · стр\. 11/);
  assert.match(answer,/Комплетност на регистарот: ДА/);
  assert.match(answer,/не го заменува full-text/);
});

test("GIC5 not-loaded state fails closed instead of inventing issue contents",()=>{
  const answer=formatGazetteIssueContents({state:"not_loaded",items:[],complete:false});
  assert.match(answer,/сè уште не е промовиран/);
  assert.match(answer,/нема да измислува/);
});

test("GIC6 resolver returns the full ordered issue index from a reconciled runtime year",async()=>{
  const calls=[];
  const env={DB:{prepare(sql){
    calls.push(sql);
    return {bind(...args){
      return {
        async first(){
          if(sql.includes("gazette_issue_contents_manifest")) return {
            year:2005,register_source_url:"https://slvesnik.com.mk/register-2005.pdf",
            register_source_sha256:"a".repeat(64),register_entry_count:300,issue_count:120,
            unresolved_count:0,missing_issue_links_count:0,reconciliation_status:"reconciled",
            verification_status:"reconciled",human_review_status:"pending",runtime_eligible:1,
            release_authorization_id:"TEST",verified_at:"2026-11-01"
          };
          return {n:3};
        },
        async all(){
          return {results:[
            {year:2005,issue_number:"1",ordinal_in_issue:1,register_ordinal:1,act_type:"law",title:"Закон A",page_start:1},
            {year:2005,issue_number:"1",ordinal_in_issue:2,register_ordinal:2,act_type:"decision",title:"Одлука B",page_start:3},
            {year:2005,issue_number:"1",ordinal_in_issue:3,register_ordinal:3,act_type:"rulebook",title:"Правилник C",page_start:5}
          ]};
        }
      };
    }};
  }}};
  const bundle=await findGazetteIssueContents(env,{year:2005,issueNumber:"1"});
  assert.equal(bundle.state,"matched");
  assert.equal(bundle.complete,true);
  assert.equal(bundle.total,3);
  assert.equal(bundle.items.length,3);
  assert.equal(bundle.items[0].title,"Закон A");
  assert.ok(calls.some(x=>x.includes("ORDER BY ordinal_in_issue")));
});

test("GIC7 exact Gazette chat lane joins metadata and contents without an AI provider",()=>{
  assert.match(worker,/findGazetteIssueContents/);
  assert.match(worker,/formatGazetteIssueContents/);
  assert.match(worker,/canonical_gazette_issue_metadata_and_contents_no_model/);
  assert.match(worker,/provider:"canonical_corpus_no_model"/);
  assert.match(worker,/providerCalls:0/);
  assert.match(worker,/\/api\/gazette-issue-contents/);
});

test("GIC8 metadata wording distinguishes deterministic lookup from general corpus promotion",()=>{
  assert.match(metadata,/Детерминистички metadata lookup: ДА/);
  assert.match(metadata,/Промовиран во општ AI\/corpus runtime/);
  assert.doesNotMatch(metadata,/Дозволен за metadata runtime/);
});
