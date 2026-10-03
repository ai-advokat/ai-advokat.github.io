import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  CASEPILOT_STATUSES,
  createCasePilotWorkspace,
  validateCasePilotClaim,
  contradiction,
  aiConclusion,
  approveAIConclusion,
  casePilotReadiness
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

  test("AI conclusions are locked until explicit lawyer decision", () => {
    const c=aiConclusion({id:"AI-01",text:"Potential time contradiction",sources:["D-06","D-10"]});
    assert.equal(c.lockedForProfessionalUse,true);
    const approved=approveAIConclusion(c,{decision:"accepted",lawyer:"lawyer-1",at:"2026-10-03T12:00:00Z"});
    assert.equal(approved.lockedForProfessionalUse,false);
    assert.equal(approved.decision,"accepted");
  });

  test("readiness never auto-unlocks professional use", () => {
    const ws=createCasePilotWorkspace();
    ws.sections.ai_conclusion_register.push(aiConclusion({id:"AI-01",text:"Check attribution",sources:["D-08"]}));
    const readiness=casePilotReadiness(ws);
    assert.equal(readiness.readyForProfessionalUse,false);
    assert.equal(readiness.unreviewedAIConclusions,1);
  });
});
