import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  CONTRACT_INTELLIGENCE_VERSION,
  DPRO_BASELINE_VERSION,
  DPRO_MODEL_PROFILES,
  analyzeContractText,
  compareToPlaybook,
  buildContractReviewPackage
} from "../src/contract-intelligence.js";

const html=fs.readFileSync("contract-intelligence.html","utf8");
const manifest=JSON.parse(fs.readFileSync("data/ai-contract-dpro14r-manifest.json","utf8"));

test("AI CONTRACT imports the exact DPRO-14R provenance boundary",()=>{
  assert.equal(DPRO_BASELINE_VERSION,"DPRO-14R");
  assert.equal(manifest.importedBaseline.sourceDate,"2026-11-09");
  assert.equal(manifest.importedBaseline.canonicalOfflineSha256,"f2a5e6eff26a922e2bffef9c2ab1a58b54f2466f5421326b67a3d6210d9604d8");
  assert.equal(manifest.importedBaseline.offlineOnlineGeneratorByteEquivalent,true);
  assert.equal(manifest.governance.legalValidation,"HOLD");
  assert.equal(manifest.governance.production,"NO_GO");
  assert.equal(manifest.governance.professionalSignoff,false);
  assert.equal(manifest.governance.highRiskApprovals,"0/28");
});

test("AI CONTRACT keeps the six archived contract profiles and risk counts",()=>{
  assert.equal(DPRO_MODEL_PROFILES.length,6);
  assert.deepEqual(DPRO_MODEL_PROFILES.map(x=>x.id),["nda","cooperation","services","lease","loan","debt"]);
  assert.equal(DPRO_MODEL_PROFILES.reduce((n,x)=>n+x.findings,0),50);
  assert.equal(DPRO_MODEL_PROFILES.reduce((n,x)=>n+x.severity.HIGH,0),28);
  assert.equal(DPRO_MODEL_PROFILES.reduce((n,x)=>n+x.severity.MEDIUM,0),20);
  assert.equal(DPRO_MODEL_PROFILES.reduce((n,x)=>n+x.severity.LOW,0),2);
});

test("deterministic review never upgrades archive findings into legal approval",()=>{
  const analysis=analyzeContractText({
    model:"nda",
    documentName:"demo",
    text:"Страните се согласуваат за доверливост, плаќање, меродавно право и надлежен суд."
  });
  assert.equal(analysis.version,CONTRACT_INTELLIGENCE_VERSION);
  assert.equal(analysis.archivedDproRiskBaseline.legalValidation,"HOLD");
  assert.equal(analysis.archivedDproRiskBaseline.professionalSignoff,false);
  assert.equal(analysis.legalEffectDetermined,false);
  assert.equal(analysis.automaticSigning,false);
  assert.equal(analysis.automaticSubmission,false);
  assert.equal(analysis.humanGateRequired,true);
});

test("playbook missing detection remains a lawyer-review signal, not automatic rejection",()=>{
  const analysis=analyzeContractText({model:"services",text:"Овој договор уредува плаќање на надоместок."});
  const result=compareToPlaybook(analysis,{requiredClauses:["payment","termination","confidentiality"]});
  assert.equal(result.readyForLawyerReview,true);
  assert.equal(result.automaticAcceptance,false);
  assert.equal(result.humanGateRequired,true);
  assert.ok(result.missingOrNotDetected.includes("termination"));
});

test("review package is local-export oriented and preserves Human Gate",()=>{
  const analysis=analyzeContractText({model:"lease",text:"Закупнина и отказ се уредуваат со договорот. Надлежен суд."});
  const pkg=buildContractReviewPackage(analysis,{requiredClauses:["payment","termination","jurisdiction"]});
  assert.equal(pkg.schema,"ai-advokat.ai-contract.review.v1");
  assert.equal(pkg.governance.sourceFirst,true);
  assert.equal(pkg.governance.humanGate,true);
  assert.equal(pkg.governance.legalValidation,"HOLD");
  assert.equal(pkg.governance.publicChatDocumentsForbidden,true);
});

test("public AI CONTRACT surface is local-first and routes confidential work to Secure Case Workspace",()=>{
  assert.match(html,/AI CONTRACT/);
  assert.match(html,/локалн|Local deterministic review/iu);
  assert.match(html,/28 HIGH · LEGAL HOLD/);
  assert.match(html,/0\/28 адвокатски одобрени/);
  assert.match(html,/casepilot-workspace\.html/);
  assert.match(html,/Преземи review JSON/);
  assert.doesNotMatch(html,/\/api\/chat/);
  assert.doesNotMatch(html,/automatic signing|автоматско потпишување[^<]*дозволено/iu);
});

test("manifest preserves source register and records incomplete full regression honestly",()=>{
  assert.equal(manifest.sourceRegister.length,10);
  assert.equal(manifest.qaEvidence.sixModelsSmoke,true);
  assert.equal(manifest.qaEvidence.ndaWordExport,true);
  assert.equal(manifest.qaEvidence.ndaJsonExport,true);
  assert.equal(manifest.qaEvidence.completeSixModelExportRegression,false);
  assert.equal(manifest.qaEvidence.externalDeployment,false);
});
