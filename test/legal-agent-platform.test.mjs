import test from "node:test";
import assert from "node:assert/strict";
import { sanitizeMatterMemory,matterMemoryAudit,mergeMatterMemory } from "../src/matter-memory.js";
import { buildCustomAgent,validateCustomAgent } from "../src/agent-builder.js";
import { sourceObservation,compareObservations,horizonSummary } from "../src/horizon-scanning-engine.js";
import { buildProactiveRun } from "../src/proactive-legal-agents.js";
import { commandCenterSnapshot } from "../src/legal-command-center.js";

test("matter memory keeps preferences but rejects sensitive raw matter fields",()=>{
  const m=sanitizeMatterMemory({outputLanguage:"mk",citationStyle:"source-first",clientName:"ignored"});
  assert.equal(m.outputLanguage,"mk");
  assert.equal("clientName" in m,false);
  assert.equal(matterMemoryAudit({clientName:"X"}).safe,false);
  assert.throws(()=>mergeMatterMemory(m,{documentText:"secret"}),/forbidden_field/);
});

test("agent builder creates only bounded review-required agents",()=>{
  const a=buildCustomAgent({
    id:"tax_research",label:"Tax Research Agent",purpose:"Research tax sources.",
    capabilities:["verify_source","verify_version"],sourceBoundary:["Official Gazette","Ministry source"]
  });
  assert.equal(validateCustomAgent(a).valid,true);
  assert.equal(a.externalActions,"forbidden");
  assert.throws(()=>buildCustomAgent({
    id:"bad",label:"Bad",purpose:"Bad",capabilities:["submit_filing"],sourceBoundary:["Court"]
  }),/unapproved_capability/);
});

test("horizon scanner detects real fingerprint deltas without declaring current law",()=>{
  const p=sourceObservation({sourceId:"gazette",title:"Gazette",url:"https://example.test/a",jurisdiction:"MK",observedAt:"2026-11-07T10:00:00Z",fingerprint:"aaaaaaaaaaaaaaaa",versionLabel:"v1"});
  const c=sourceObservation({sourceId:"gazette",title:"Gazette",url:"https://example.test/a",jurisdiction:"MK",observedAt:"2026-11-08T10:00:00Z",fingerprint:"bbbbbbbbbbbbbbbb",versionLabel:"v2"});
  const d=compareObservations(p,c);
  assert.equal(d.status,"candidate_change");
  assert.equal(d.authorityState,"unverified_candidate_not_current_law");
  assert.equal(horizonSummary([d]).currentLawDeclared,false);
});

test("command center reports only provided verified states",()=>{
  const run=buildProactiveRun({runId:"R1",templateId:"regulatory_change_review",objective:"Check changes"});
  const snap=commandCenterSnapshot({
    runs:[run],
    horizonEvents:[],
    memories:[{outputLanguage:"mk"}],
    verificationByRun:{R1:{citationsComplete:true,sourceVersionsChecked:true}}
  });
  assert.equal(snap.metrics.totalRuns,1);
  assert.equal(snap.metrics.readyForHumanReview,1);
  assert.equal(snap.runtime.scheduledFetch,"not_activated");
  assert.equal(snap.humanGate.consequentialActionsLocked,true);
});
