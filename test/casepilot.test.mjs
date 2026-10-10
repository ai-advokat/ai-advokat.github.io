import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  CASEPILOT_STATUSES,
  createCasePilotWorkspace,
  validateCasePilotClaim,
  contradiction,
  aiConclusion,
  approveAIConclusion,
  validateAIConclusion,
  validateContradiction,
  casePilotReadiness,
  CASEPILOT_MAX_DOCUMENTS,
  CASEPILOT_EXPORT_FORMATS,
  validateCaseDocumentRegistry,
  createCaseWorkPackage,
  caseOutcomeAssessment
} from "../src/casepilot.js";

describe("AI Advokat CasePilot foundation", () => {
  test("new workspaces are private/professional-use locked", () => {
    const ws=createCasePilotWorkspace({caseNumber:"KM 101/26",phase:"hearing preparation"});
    assert.equal(ws.privateWorkspace,"LOCKED");
    assert.equal(ws.professionalUse,"LOCKED");
    assert.equal(ws.humanGate.required,true);
  });

  test("confirmed/indication/disputed claims require source and page", () => {
    for(const status of [CASEPILOT_STATUSES.CONFIRMED,CASEPILOT_STATUSES.INDICATION,CASEPILOT_STATUSES.DISPUTED]){
      assert.equal(validateCasePilotClaim({id:"x",text:"claim",status}).ok,false);
      assert.equal(validateCasePilotClaim({id:"x",text:"claim",status,sourceId:"D-01",page:2}).ok,true);
    }
    assert.equal(validateCasePilotClaim({id:"x",text:"claim",status:CASEPILOT_STATUSES.CONFIRMED,sourceId:{},page:"unknown"}).ok,false);
  });

  test("a contradiction preserves both sources", () => {
    const c=contradiction(
      {text:"08:45",sourceId:"D-06",page:3},
      {text:"09:05",sourceId:"D-10",page:1},
      {meaning:"time conflict",question:"How was the time established?"}
    );
    assert.equal(c.status,CASEPILOT_STATUSES.DISPUTED);
    assert.equal(c.left.sourceId,"D-06");
    assert.equal(c.right.sourceId,"D-10");
  });

  test("AI conclusions require exact source and page provenance and snapshot it", () => {
    assert.equal(validateAIConclusion({id:"AI-X",text:"x",sources:[null]}).ok,false);
    assert.equal(validateAIConclusion({id:"AI-X",text:"x",sources:[{sourceId:"D-08"}]}).ok,false);
    const refs=[{sourceId:"D-08",page:2}];
    const c=aiConclusion({id:"AI-X",text:"x",sources:refs});
    refs[0].sourceId="MUTATED";
    refs.push({sourceId:"D-99",page:9});
    assert.deepEqual(c.sources,[{sourceId:"D-08",page:2}]);
    assert.ok(Object.isFrozen(c.sources));
    assert.ok(Object.isFrozen(c.sources[0]));
  });

  test("contradictions require statement text plus page provenance", () => {
    assert.equal(validateContradiction({left:{sourceId:"D-01"},right:{sourceId:"D-02"}}).ok,false);
    assert.throws(()=>contradiction({sourceId:"D-01",page:1},{text:"B",sourceId:"D-02",page:2}),/invalid_contradiction/);
  });

  test("AI conclusions are locked until explicit lawyer decision", () => {
    const c=aiConclusion({id:"AI-01",text:"Potential time contradiction",sources:[{sourceId:"D-06",page:4},{sourceId:"D-10",page:1}]});
    assert.equal(c.lockedForProfessionalUse,true);
    const approved=approveAIConclusion(c,{decision:"accepted",lawyer:"lawyer-1",at:"2026-10-03T12:00:00Z"});
    assert.equal(approved.lockedForProfessionalUse,false);
    assert.equal(approved.decision,"accepted");
  });

  test("readiness catches incomplete claim entries instead of skipping them", () => {
    const ws=createCasePilotWorkspace();
    ws.sections.claims_evidence_matrix.push({id:"C-01",status:CASEPILOT_STATUSES.CONFIRMED,sourceId:"D-01",page:1});
    const readiness=casePilotReadiness(ws);
    assert.equal(readiness.sourceProblems.length,1);
    assert.ok(readiness.sourceProblems[0].errors.includes("text_required"));
  });

  test("readiness never auto-unlocks professional use or accepts malformed review metadata", () => {
    const ws=createCasePilotWorkspace();
    ws.sections.ai_conclusion_register.push(aiConclusion({id:"AI-01",text:"Check attribution",sources:[{sourceId:"D-08",page:2}]}));
    ws.sections.ai_conclusion_register.push({
      id:"AI-02",
      text:"Malformed reconstructed review",
      sources:[{sourceId:"D-09",page:1}],
      lockedForProfessionalUse:false,
      decision:"banana",
      decisionBy:"",
      decisionAt:null
    });
    const readiness=casePilotReadiness(ws);
    assert.equal(readiness.readyForProfessionalUse,false);
    assert.equal(readiness.unreviewedAIConclusions,2);
    const malformed=readiness.sourceProblems.find(x=>x.id==="AI-02");
    assert.ok(malformed);
    assert.ok(malformed.errors.includes("valid_lawyer_decision_required"));
    assert.ok(malformed.errors.includes("lawyer_identity_required"));
    assert.ok(malformed.errors.includes("lawyer_timestamp_required"));
  });


  test("20-document professional work package is bounded and export-aware", () => {
    const docs=Array.from({length:20},(_,i)=>({
      id:`D-${String(i+1).padStart(2,"0")}`,
      title:`Document ${i+1}`,
      sha256:"a".repeat(64),
      pageCount:i+1
    }));
    assert.equal(CASEPILOT_MAX_DOCUMENTS,20);
    assert.deepEqual(CASEPILOT_EXPORT_FORMATS,["md","docx","pdf"]);
    assert.equal(validateCaseDocumentRegistry(docs).ok,true);
    const wp=createCaseWorkPackage({caseId:"CASE-20",documents:docs,requestedFormats:["md","docx","pdf"]});
    assert.equal(wp.documents.length,20);
    assert.equal(wp.privateWorkspace,"LOCKED");
    assert.equal(wp.humanGateRequired,true);
    assert.ok(wp.pipeline.includes("cross_document_synthesis"));
    assert.ok(wp.analysisViews.includes("opposing_theory"));
    assert.throws(
      ()=>createCaseWorkPackage({caseId:"CASE-21",documents:[...docs,{id:"D-21",title:"x",sha256:"b".repeat(64),pageCount:1}]}),
      /document_limit_exceeded/
    );
  });

  test("outcome assessment forbids intuitive percentages and permits only validated calibrated probability", () => {
    const qualitative=caseOutcomeAssessment({
      band:"moderate",
      factors:["strong documentary chain","unresolved procedural risk"]
    });
    assert.equal(qualitative.numericProbability,null);
    assert.throws(
      ()=>caseOutcomeAssessment({band:"strong",factors:["x"],numericProbability:78}),
      /validated_model_interval_and_human_gate/
    );
    const calibrated=caseOutcomeAssessment({
      band:"moderate",
      factors:["x","y"],
      numericProbability:62,
      statisticalModel:{
        name:"validated-case-outcome-model",
        population:"comparable finalized cases",
        period:"2022-2026",
        calibration:"Brier/calibration curve documented",
        applicability:"same legal issue and procedural posture"
      },
      confidenceInterval:[48,74],
      lawyerApproved:true
    });
    assert.equal(calibrated.numericProbability,62);
  });

});
