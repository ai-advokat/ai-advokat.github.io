import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  CASE_LAW_CLAIM_GUARD_VERSION,
  extractSpecificJudicialClaims,
  assessSpecificCaseLawClaims
} from "../src/case-law-claim-guard.js";

test("specific judicial claim extractor catches fabricated-looking domestic and ECHR authorities",()=>{
  const text=[
    "Пресуда на Врховниот суд бр. 123/2020: укинување на притвор.",
    "Пресуда на Врховниот суд бр. 456/2019: одржување на притвор.",
    "ЕСЧП — Kovács v. Hungary (2017)."
  ].join("\n");
  const claims=extractSpecificJudicialClaims(text);
  assert.ok(claims.some(x=>x.type==="case_number"&&x.value==="123/2020"),JSON.stringify(claims));
  assert.ok(claims.some(x=>x.type==="case_number"&&x.value==="456/2019"),JSON.stringify(claims));
  assert.ok(claims.some(x=>x.type==="named_case"&&/Kovács v Hungary/u.test(x.value)),JSON.stringify(claims));
});

test("unsupported concrete case-law claims fail closed",()=>{
  const text="Пресуда на Врховниот суд бр. 123/2020 и Kovács v. Hungary се релевантни.";
  const gate=assessSpecificCaseLawClaims(text);
  assert.equal(gate.ok,false,JSON.stringify(gate));
  assert.equal(gate.version,CASE_LAW_CLAIM_GUARD_VERSION);
  assert.ok(gate.unsupported.length>=2,JSON.stringify(gate));
});

test("reviewed official case number is allowed only with dual-review and binding provenance",()=>{
  const text="Апелационен суд Скопје · КОКЖ-50/25 е релевантен за истражувањето.";
  const reviewed=[{
    title:"Апелационен суд Скопје · КОКЖ-50/25",
    caseTitle:"Игри на среќа без лиценца и перење пари",
    caseNumber:"КОКЖ-50/25",
    court:"Апелационен суд Скопје",
    url:"https://sud.mk/",
    humanReviewStatus:"reviewed",
    authorityReviewStatus:"approved",
    officialBindingVerified:true
  }];
  assert.equal(assessSpecificCaseLawClaims(text,{reviewedCaseLawSources:reviewed}).ok,true);

  const discoveryOnly=[{...reviewed[0],officialBindingVerified:false}];
  assert.equal(assessSpecificCaseLawClaims(text,{reviewedCaseLawSources:discoveryOnly}).ok,false);
});

test("named ECHR case may pass only when exact identity appears in registered official court web source metadata",()=>{
  const text="Kovács v. Hungary е наведена како релевантен предмет.";
  const official=[{
    title:"Kovács v. Hungary - HUDOC",
    url:"https://hudoc.echr.coe.int/example",
    authorityStatus:"international_court_official",
    researchRole:"REGISTERED_OFFICIAL_RESEARCH"
  }];
  assert.equal(assessSpecificCaseLawClaims(text,{webSources:official}).ok,true);

  const unregistered=[{
    ...official[0],
    authorityStatus:"unregistered_external",
    researchRole:"UNREGISTERED_EXTERNAL_DISCOVERY"
  }];
  assert.equal(assessSpecificCaseLawClaims(text,{webSources:unregistered}).ok,false);
});

test("generic legal discussion without a specific case identity remains releasable",()=>{
  const gate=assessSpecificCaseLawClaims("Притворот мора да се оценува индивидуално и пропорционално, а конкретната судска практика треба дополнително да се провери.");
  assert.equal(gate.ok,true,JSON.stringify(gate));
  assert.equal(gate.claims.length,0);
});

test("runtime applies the deterministic case-law claim gate to both Workers fallback and governed OpenAI release paths",()=>{
  const index=fs.readFileSync("src/index.js","utf8");
  const central=fs.readFileSync("src/ai-advokat-central-prompt.js","utf8");
  const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(index,/fallbackCaseLawClaimGate=assessSpecificCaseLawClaims/);
  assert.match(index,/governedCaseLawClaimGate=assessSpecificCaseLawClaims/);
  assert.match(index,/case_law_claim_release_blocked/);
  assert.match(central,/EXACT CASE-LAW AUTHORITY GATE/);
  assert.match(orchestrator,/SPECIFIC CASE-LAW CLAIM GATE/);
});
