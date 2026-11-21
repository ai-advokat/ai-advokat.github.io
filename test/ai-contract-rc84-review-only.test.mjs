import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {validateRC84Intake,RC84_ARCHIVE_SHA256} from "../assets/ai-contract-rc84-review.mjs";

const ids={
  nda:["N01","N02"],
  cooperation:["C01","C02","C03","C04","C05","C06","C07"],
  services:["S01","S02","S03","S04","S05","S06"],
  lease:["L01","L02","L03","L04","L05","L06"],
  loan:["L01","L02","L03"],
  debt:["D01","D02","D03","D04"]
};
function fixture(){
  const items=Object.entries(ids).flatMap(([model,codes])=>codes.map(code=>({
    id:model+":"+code,model,topic:"Работна архивска рецензија",
    severity:"HIGH",human_gate:"HOLD",legal_approved:false,may_integrate:false,
    readiness:"BLOCKED_FACTS_AND_LAW",
    legal_source_status:"NOT_INDEPENDENTLY_VERIFIED_FOR_INTEGRATION",
    draft_sha256:"c".repeat(64),missing_factual_fields:["ДОГОВОРЕН РОК"],
    verification_required:"Проверка на важечка редакција и човечка одлука."
  })));
  for(let i=0;i<8;i++)items[i].severity="CRITICAL";
  return {
    schema:"ai-advokat.rc84.review-intake.v1",status:"REVIEW_ONLY_HOLD",
    source:{archive_sha256:RC84_ARCHIVE_SHA256,ownership_and_republication_permission:"REQUIRES_OWNER_CONFIRMATION"},
    safety:{human_gate:"HOLD",production:"NO_GO",all_legal_approvals:0,
      raw_clauses_included:false,auto_import_clauses:false,auto_sign:false,
      auto_law_claim:false,live_provider_calls:false},
    integration_gate:{legal_clause_activation:"BLOCKED",per_clause_review:"REQUIRED",separate_publication_human_gate:"REQUIRED"},
    review:{count:28,severity:{CRITICAL:8,HIGH:20},model_counts:{nda:2,cooperation:7,services:6,lease:6,loan:3,debt:4},
      independent_lawyer_signoff:false,source_text_independently_verified:false,draft_sha256_crosscheck:"28/28 PASS"},
    items
  };
}
test("RC84 review-only accepts matching local metadata but grants no authority",()=>{
  const x=validateRC84Intake(fixture());
  assert.equal(x.count,28);assert.equal(x.critical,8);assert.equal(x.high,20);
  assert.equal(x.records.length,28);assert.ok(x.records.every(r=>r.status.includes("NOT APPROVED")));
  assert.equal("draftClause" in x.records[0],false);
});
test("RC84 fails closed on any changed source, legal approval or release gate",()=>{
  const scenarios=[
    x=>{x.source.archive_sha256="0".repeat(64);},
    x=>{x.safety.production="GO";},
    x=>{x.safety.all_legal_approvals=1;},
    x=>{x.safety.live_provider_calls=true;},
    x=>{x.safety.raw_clauses_included=true;},
    x=>{x.integration_gate.legal_clause_activation="ALLOWED";},
    x=>{x.source.ownership_and_republication_permission="GRANTED";},
    x=>{x.items[0].legal_approved=true;},
    x=>{x.items[0].may_integrate=true;},
    x=>{x.items[0].human_gate="APPROVED";},
    x=>{x.items[0].draft_clause="Some proposed legal text";},
    x=>{x.items[0].id=x.items[1].id;},
    x=>{x.items.pop();},
    x=>{x.items[0].severity="HIGH";},
    x=>{x.items[0].draft_sha256="not-a-hash";}
  ];
  for(const edit of scenarios){const x=fixture();edit(x);assert.throws(()=>validateRC84Intake(x));}
});
test("local browser review is static; no telemetry, provider or storage path",()=>{
  const ui=fs.readFileSync("ai-contract-rc84-review.html","utf8");
  const js=fs.readFileSync("assets/ai-contract-rc84-review.mjs","utf8");
  assert.match(ui,/Content-Security-Policy/);
  assert.match(ui,/connect-src 'none'/);
  assert.match(ui,/0\/28/);
  assert.match(ui,/casepilot-workspace\.html/);
  assert.match(ui,/ai-contract\.html/);
  assert.match(ui,/type="file"/);
  assert.doesNotMatch(js,/\b(?:fetch|XMLHttpRequest|WebSocket|sendBeacon|localStorage|sessionStorage)\s*(?:\(|\.)/);
  assert.doesNotMatch(js,/innerHTML\s*=/);
  assert.match(js,/\.textContent=/);
  assert.doesNotMatch(ui,/\/api\/(?:chat|translate|analyze)/i);
});
test("review data never becomes an automatic contract decision",()=>{
  const x=fixture();x.items[0].topic="<img src=x onerror=alert(1)>";
  const verified=validateRC84Intake(x);
  assert.equal(verified.records[0].topic,x.items[0].topic);
  assert.match(fs.readFileSync("assets/ai-contract-rc84-review.mjs","utf8"),/child\.textContent=text/);
});
