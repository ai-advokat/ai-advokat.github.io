import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  extractGazetteIssueNeedles,
  scoreGazetteIssueMetadata,
  gazetteIssueMetadataToContext,
  GAZETTE_OPEN_DATA_SHA256
} from "../src/gazette-issue-metadata.js";

const migration=fs.readFileSync("migrations/0047_gazette_issue_metadata_backfill_1944_2017.sql","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const page=fs.readFileSync("sluzben-vesnik/index.html","utf8");
const script=fs.readFileSync("scripts/gazette_open_data_backfill.py","utf8");

test("GIM1 canonical metadata table keys identity by publication type + number + exact date",()=>{
  assert.match(migration,/UNIQUE\(publication_type, issue_number, issue_date\)/);
  assert.match(migration,/gazette_issue_metadata_stage/);
  assert.match(migration,/runtime_eligible INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration,/legal_text_authority INTEGER NOT NULL DEFAULT 0/);
  assert.match(migration,/current_law_authority INTEGER NOT NULL DEFAULT 0/);
});

test("GIM2 parser recognises exact Gazette number/year and date",()=>{
  assert.deepEqual(
    extractGazetteIssueNeedles("Службен весник бр. 72/2016"),
    {issueNumber:"72",year:"2016",issueDate:null,explicitSignal:true,usable:true}
  );
  const d=extractGazetteIssueNeedles("Службен весник од 12.04.2016");
  assert.equal(d.issueDate,"2016-04-12");
  assert.equal(d.year,"2016");
  assert.equal(d.usable,true);
});

test("GIM3 metadata scoring prefers exact issue/date without creating legal authority",()=>{
  const row={publication_type:"СЛУЖБЕН ВЕСНИК НА РМ",issue_number:"72",issue_date:"2016-04-12",year:2016};
  assert.ok(scoreGazetteIssueMetadata(row,"Службен весник 72/2016")>1000);
  const ctx=gazetteIssueMetadataToContext({state:"matched",issues:[{
    ...row,
    human_review_status:"reviewed",
    dataset_url:"https://data.gov.mk/dataset/n3dahnja-ha-cjiyx6eh-bechnk-do-2017",
    resource_url:"https://data.gov.mk/resource.xlsx",
    snapshot_sha256:GAZETTE_OPEN_DATA_SHA256
  }]});
  assert.equal(ctx.length,1);
  assert.equal(ctx[0].provenance.legalAuthority,false);
  assert.equal(ctx[0].provenance.currentLawClaim,false);
  assert.match(ctx[0].text,/OFFICIAL_ISSUE_METADATA_ONLY=true/);
});

test("GIM4 production worker exposes read-only issue index and bot metadata lane",()=>{
  assert.match(worker,/handleGazetteIssueIndex/);
  assert.match(worker,/\/api\/gazette-issue-index/);
  assert.match(worker,/governedGazetteIssueMetadataContext/);
  assert.match(worker,/gazetteIssueMetadataBundle\.context/);
});

test("GIM5 public Gazette page exposes the 1944-2017 official issue metadata index",()=>{
  assert.match(page,/8\.638/);
  assert.match(page,/1944–2017/);
  assert.match(page,/\/api\/gazette-issue-index/);
  assert.match(page,/METADATA ONLY|metadata only|метаподатоци/i);
});

test("GIM6 deterministic backfill verifies exact snapshot and canonical counts",()=>{
  assert.match(script,/4d111eb03ed0b8e877d151e030bf38096831cedc7a26f4a09121d9e6dfac5a18/);
  assert.match(script,/EXPECTED_SOURCE_ROWS = 8651/);
  assert.match(script,/EXPECTED_UNIQUE_ROWS = 8638/);
  assert.match(script,/EXPECTED_TYPES = 7/);
  assert.match(script,/1944-01-01/);
  assert.match(script,/2017-12-29/);
});
