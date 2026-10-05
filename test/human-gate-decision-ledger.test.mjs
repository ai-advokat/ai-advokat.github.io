import {describe,test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {validateHumanGateDecision,isGateApproved} from "../scripts/human-gate-ledger-validator.mjs";

const ledger=JSON.parse(fs.readFileSync("data/human-gate-decision-ledger.json","utf8"));

describe("Human Gate Decision Ledger",()=>{
  test("HGL1 initial inheritance author approval is structurally valid",()=>{
    const r=validateHumanGateDecision(ledger.initial_records[0]);
    assert.equal(r.valid,true);
  });

  test("HGL2 author approval does not imply another gate",()=>{
    const rec=ledger.initial_records[0];
    assert.deepEqual(rec.implied_gates,[]);
    const approved=isGateApproved(ledger.initial_records,{
      subject_id:rec.subject_id,
      gate_type:"public_release",
      artifact_version:rec.artifact_version,
      artifact_fingerprint:rec.artifact_fingerprint
    });
    assert.equal(approved,false);
  });

  test("HGL3 approval is bound to exact fingerprint",()=>{
    const rec=ledger.initial_records[0];
    const altered={...rec.artifact_fingerprint,docx_sha256:"0".repeat(64)};
    assert.equal(isGateApproved(ledger.initial_records,{
      subject_id:rec.subject_id,
      gate_type:"author_approval",
      artifact_version:rec.artifact_version,
      artifact_fingerprint:altered
    }),false);
  });

  test("HGL4 approval is bound to exact version",()=>{
    const rec=ledger.initial_records[0];
    assert.equal(isGateApproved(ledger.initial_records,{
      subject_id:rec.subject_id,
      gate_type:"author_approval",
      artifact_version:"NEW_VERSION",
      artifact_fingerprint:rec.artifact_fingerprint
    }),false);
  });

  test("HGL5 implied gates are rejected",()=>{
    const rec={...ledger.initial_records[0],decision_id:"bad",implied_gates:["public_release"]};
    const r=validateHumanGateDecision(rec);
    assert.equal(r.valid,false);
    assert.ok(r.errors.includes("gate_implication_not_allowed"));
  });

  test("HGL6 missing decision is fail-closed",()=>{
    assert.equal(isGateApproved([],{
      subject_id:"x",
      gate_type:"rag_eligibility",
      artifact_version:"v1",
      artifact_fingerprint:{sha256:"1".repeat(64)}
    }),false);
  });
});


  test("HGL7 Legal Operating Protocol gates are explicitly registered",()=>{
    for(const gate of ["current_law_verification","corpus_promotion","provider_activation"]){
      assert.ok(ledger.gate_types.includes(gate),`missing gate type ${gate}`);
    }
  });
