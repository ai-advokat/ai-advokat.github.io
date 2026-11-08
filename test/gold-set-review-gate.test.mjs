import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const page=fs.readFileSync("gold-set-review-gate.html","utf8");

test("Gold Set Review Gate v2.1 preserves Human Gate hard boundaries",()=>{
  assert.match(page,/Gold Set Review Gate v2\\.1/);
  assert.match(page,/publication_approved:false/);
  assert.match(page,/reviewed_authority_promoted:false/);
  assert.match(page,/external_human_gate_required:true/);
  assert.match(page,/identity_authentication_performed:false/);
  assert.doesNotMatch(page,/publication_approved:true/);
  assert.doesNotMatch(page,/reviewed_authority_promoted:true/);
});

test("Gold Gate requires two boundary reviewers plus a separate legal reviewer",()=>{
  for(const field of ["reviewer1Name","reviewer1Role","reviewer1Ref","reviewer1Date","reviewer1Evidence","reviewer1NoConflict","reviewer2Name","reviewer2Role","reviewer2Ref","reviewer2Date","reviewer2Evidence","reviewer2NoConflict","legalReviewerName","legalReviewerRole","legalReviewerRef","legalDate","legalEvidence","legalNoConflict"]) assert.match(page,new RegExp(field));
  assert.match(page,/personDistinct/);
  assert.match(page,/Separate Legal Review/);
});

test("Gold Gate retains source anomalies as review work instead of silent correction",()=>{
  assert.match(page,/POSSIBLE_SOURCE_OR_TRANSCRIPTION_TYPO_SVERNA/);
  assert.match(page,/POSSIBLE_SOURCE_OR_TRANSCRIPTION_TYPO_SEVENA/);
  assert.match(page,/HEADING_PARENT_CORRECTION_REQUIRES_SOURCE_CHECK/);
  assert.match(page,/SOURCE_TYPO_CONFIRMED/);
  assert.match(page,/TRANSCRIPTION_ERROR_CORRECTED/);
  assert.match(page,/Не коригирајте тивко изворен текст/);
});

test("Gold Gate has versioned provenance and hardened offline exports",()=>{
  assert.match(page,/records_manifest_sha256/);
  assert.match(page,/review_session_id/);
  assert.match(page,/crypto\.subtle\.digest\('SHA-256'/);
  assert.match(page,/csvSafe/);
  assert.match(page,/HUMAN_GATE_PACK/);
  assert.match(page,/LEGACY_SCHEMA='paragraf\.f0-2y\.human-review\.v1'/);
  assert.match(page,/SCHEMA='paragraf\.f0-2y\.human-review\.v2'/);
  assert.doesNotMatch(page,/fetch\(/);
  assert.doesNotMatch(page,/localStorage/);
});

test("Gold Gate inline JavaScript is syntactically valid",()=>{
  const match=page.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match,"inline script missing");
  assert.doesNotThrow(()=>new Function(match[1]));
});

test("ESCALATE_HOLD can never resolve risk or advance a record",()=>{
  assert.match(page,/warningAccept=\['CONFIRMED_SOURCE_LAYOUT','CORRECTED_BOUNDARY','COMPLETENESS_CONFIRMED'\]/);
  assert.match(page,/anomalyAccept=\['SOURCE_TYPO_CONFIRMED','TRANSCRIPTION_ERROR_CORRECTED','NO_SOURCE_ANOMALY'\]/);
  assert.doesNotMatch(page,/warningAccept[^\n]*ESCALATE_HOLD/);
  assert.doesNotMatch(page,/anomalyAccept[^\n]*ESCALATE_HOLD/);
});

test("Human Gate readiness is a separate fourth-person preflight",()=>{
  assert.match(page,/Human Gate Preflight/);
  assert.match(page,/humanGatePrepared/);
  assert.match(page,/humanGatePreparerName/);
  assert.match(page,/humanGatePreparerRef/);
  assert.match(page,/humanGateEvidence/);
  assert.match(page,/humanGateNoConflict/);
  assert.match(page,/if\(st==='LEGAL_READY'\)/);
});

test("Review dates and V2 imports fail closed",()=>{
  assert.match(page,/function validReviewDate/);
  assert.match(page,/s<=new Date\(\)\.toISOString\(\)\.slice\(0,10\)/);
  assert.match(page,/V2 import бара точен Records manifest SHA/);
  assert.match(page,/JSON\.stringify\(RECORDS\)/);
});

