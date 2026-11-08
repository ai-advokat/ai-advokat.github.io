import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {analyzeContractText,compareToPlaybook} from "../src/contract-intelligence.js";
import {buildFactEvidenceGraph} from "../src/legal-fact-graph.js";
import {connectorSummary,GOVERNED_CONNECTORS} from "../src/connector-registry.js";
import {WORKFLOW_TEMPLATES,buildProactiveRun} from "../src/proactive-legal-agents.js";

const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Legal AI Suite is visible in desktop and mobile header with Zoki guide",()=>{
  const index=read("index.html");
  assert.ok((index.match(/href="\/legal-ai-suite\.html"/g)||[]).length>=2);
  assert.ok((index.match(/href="\/zoki-legal-ai-guide\.html"/g)||[]).length>=2);
});

test("suite exposes full governed platform map without claiming native mobile",()=>{
  const html=read("legal-ai-suite.html");
  for(const phrase of ["Agents","Vault & Review Tables","Matter Spaces","Knowledge & Research","Contract Intelligence","Horizon Scanning","Matter Memory","Fact & Evidence Graph","Governed Connectors","Command Center","Mobile-ready access","Governance & Audit"]){
    assert.ok(html.includes(phrase),phrase);
  }
  assert.ok(html.includes("Не се претставува како native iOS/Android app"));
  assert.ok(html.includes("Human Gate"));
});

test("contract intelligence detects bounded clauses and never authorizes acceptance",()=>{
  const a=analyzeContractText({text:"Овој договор содржи клаузула за доверливост, плаќање во рок и меродавно право на Република Северна Македонија."});
  assert.equal(a.humanGateRequired,true);
  assert.equal(a.negotiationAction,"forbidden");
  assert.equal(a.legalEffectDetermined,false);
  assert.ok(a.clauses.some(x=>x.clauseId==="confidentiality" && x.found));
  assert.ok(a.clauses.some(x=>x.clauseId==="payment" && x.found));
  const p=compareToPlaybook(a,{requiredClauses:["confidentiality","termination"]});
  assert.equal(p.automaticAcceptance,false);
  assert.equal(p.humanGateRequired,true);
  assert.ok(p.missingOrNotDetected.includes("termination"));
});

test("fact graph links claims and evidence but does not decide credibility or outcome",()=>{
  const g=buildFactEvidenceGraph({
    claims:[{id:"c1",text:"Claim"}],
    evidence:[{id:"e1",title:"Evidence"}],
    claim_evidence:[{claimId:"c1",evidenceId:"e1",relationship:"supports"}],
    contradictions:[{id:"x1",claimId:"c1",description:"Conflict"}],
    evidence_gaps:[{id:"g1",claimId:"c1",description:"Missing"}]
  });
  assert.equal(g.counts.claims,1);
  assert.equal(g.counts.evidence,1);
  assert.equal(g.counts.contradictions,1);
  assert.equal(g.counts.gaps,1);
  assert.equal(g.credibilityDetermined,false);
  assert.equal(g.outcomePredicted,false);
  assert.equal(g.humanGateRequired,true);
});

test("connector library is internal/governed and has no autonomous external actions",()=>{
  const s=connectorSummary();
  assert.equal(s.authenticatedThirdPartyIntegrations,0);
  assert.equal(s.autonomousExternalActions,false);
  assert.ok(GOVERNED_CONNECTORS.length>=8);
  assert.ok(GOVERNED_CONNECTORS.every(x=>x.externalActions===false));
});

test("expanded agent workflow catalog covers core legal work and stays Human-Gated",()=>{
  for(const id of ["regulatory_change_review","litigation_case_review","contract_review","due_diligence_review","evidence_review","legal_research_memo","compliance_review","employment_review","obligation_monitoring","authority_update","fact_graph_review"]){
    assert.ok(WORKFLOW_TEMPLATES[id],id);
  }
  const run=buildProactiveRun({runId:"suite-test",templateId:"due_diligence_review",objective:"Review supplied documents",sourceUniverse:["supplied matter documents"]});
  assert.equal(run.humanGate.consequentialActions,"locked");
  assert.equal(run.humanGate.externalTransmission,"forbidden");
});

test("GitHub Pages curated publish list includes every Legal AI Suite surface and module",()=>{
  const wf=read(".github/workflows/sync-pages-runtime.yml");
  for(const p of ["legal-ai-suite.html","contract-intelligence.html","fact-evidence-graph.html","connector-library.html","zoki-legal-ai-guide.html","src/contract-intelligence.js","src/legal-fact-graph.js","src/connector-registry.js"]){
    assert.ok(wf.includes(p),p);
  }
});
