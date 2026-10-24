import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  LEGAL_DOMAIN_ROUTER_VERSION,
  classifyLegalDomain,
  assessGuideDomainCompatibility,
  assessSourceDomainCompatibility,
  filterGuideRecordsForLegalDomain
} from "../src/legal-domain-router.js";
import { governedGuideContext } from "../src/index.js";

const guides=JSON.parse(fs.readFileSync("data/guides.json","utf8"));
const records=guides.records;
const byId=id=>records.find(r=>r.id===id);

test("LDR-01 reinstatement pleading resolves to labour primary domain",()=>{
  const out=classifyLegalDomain("Направи ми тужба за враќање на работник на работа.");
  assert.equal(LEGAL_DOMAIN_ROUTER_VERSION,"1.0.0");
  assert.equal(out.routingState,"RESOLVED");
  assert.equal(out.primaryDomain,"labour_social");
  assert.ok(Array.isArray(out.secondaryDomains));
  assert.ok(out.matchedSignals.some(x=>/работник|vrakanje na rabota|rabotnik/i.test(x.signal)));
});

test("LDR-02 verified administrative guide is incompatible with labour reinstatement",()=>{
  const q="Направи ми тужба за враќање на работник на работа.";
  const out=assessGuideDomainCompatibility(q,byId("guide-administrative-v2"));
  assert.equal(out.allowed,false);
  assert.equal(out.state,"INCOMPATIBLE");
  assert.equal(out.sourceDomain,"administrative_law");
});

test("LDR-03 verification state cannot rescue or reclassify an incompatible source",()=>{
  const original=structuredClone(byId("guide-administrative-v2"));
  const out=assessGuideDomainCompatibility("Работодавачот ми даде отказ.",original);
  assert.equal(out.allowed,false);
  assert.equal(out.state,"INCOMPATIBLE");
  assert.equal(original.activation_state,"active_verified");
  assert.equal(original.current_law_authority,false);
  assert.equal(out.authorityClassChanged,false);
});

test("LDR-04 administrative court claim stays administrative",()=>{
  const out=classifyLegalDomain("Сакам да поднесам тужба пред Управен суд.");
  assert.equal(out.routingState,"RESOLVED");
  assert.equal(out.primaryDomain,"administrative_law");
  assert.equal(assessGuideDomainCompatibility("Сакам да поднесам тужба пред Управен суд.",byId("guide-administrative-v2")).allowed,true);
});

test("LDR-05 appeal against administrative decision stays administrative",()=>{
  const out=classifyLegalDomain("Жалба против управно решение.");
  assert.equal(out.primaryDomain,"administrative_law");
  assert.equal(out.routingState,"RESOLVED");
});

test("LDR-06 workplace discrimination and harassment stay labour",()=>{
  for(const q of [
    "Дискриминација и вознемирување на работното место.",
    "Работодавачот ме вознемирува на работа."
  ]){
    const out=classifyLegalDomain(q);
    assert.equal(out.primaryDomain,"labour_social",q);
  }
});

test("LDR-07 generic pleading wording fails safe",()=>{
  const out=classifyLegalDomain("Направи ми тужба.");
  assert.equal(out.primaryDomain,"unknown");
  assert.equal(out.routingState,"UNRESOLVED");
  const filtered=filterGuideRecordsForLegalDomain(records,"Направи ми тужба.",["guide-administrative-v2","guide-05-workplace"]);
  assert.deepEqual(filtered.allowed,[]);
  assert.equal(filtered.blocked.length,2);
});

test("LDR-08 Cyrillic and common Latin transliteration are domain-equivalent",()=>{
  const pairs=[
    ["Работодавачот ми даде отказ и сакам враќање на работа.","rabotodavacot mi dade otkaz i sakam vrakanje na rabota"],
    ["Жалба против управно решение.","zalba protiv upravno resenie"],
    ["Ме повика полиција како осомничен.","me povika policija kako osomnicen"],
    ["Сакам развод и издршка за детето.","sakam razvod i izdrska za deteto"]
  ];
  for(const [mk,lat] of pairs){
    assert.equal(classifyLegalDomain(mk).primaryDomain,classifyLegalDomain(lat).primaryDomain,mk);
  }
});

test("LDR-09 server-side governed context rejects an incompatible browser-selected guide",async()=>{
  const assetFiles={
    "/data/guides.json":"data/guides.json",
    "/data/public-practical-guides-38-73.json":"data/public-practical-guides-38-73.json",
    "/data/guide-law-dependencies-2026.json":"data/guide-law-dependencies-2026.json",
    "/data/mk-current-law-readiness-2026.json":"data/mk-current-law-readiness-2026.json"
  };
  const env={ASSETS:{fetch:async req=>{
    const path=new URL(req.url).pathname;
    const file=assetFiles[path];
    return file
      ? new Response(fs.readFileSync(file,"utf8"),{status:200,headers:{"content-type":"application/json"}})
      : new Response("not found",{status:404});
  }}};
  const request=new Request("https://ai-advokat.github.io/api/bot");
  const labour=await governedGuideContext(request,env,["guide-administrative-v2"],"Направи ми тужба за враќање на работник на работа.");
  assert.deepEqual(labour,[]);
  const administrative=await governedGuideContext(request,env,["guide-administrative-v2"],"Тужба пред Управен суд по управно решение.");
  assert.ok(administrative.length>=1);
  assert.ok(administrative.some(x=>String(x.text||"").includes("Водич низ управната постапка")));
});

test("LDR-10 current administrative fixtures remain resolved and compatible",()=>{
  const fixtures=[
    ["Институцијата не ми одговара на барањето.","guide-administrative-v2"],
    ["Жалба против управно решение.","guide-administrative-v2"],
    ["Тужба пред управен суд.","guide-administrative-v2"],
    ["Повторување управна постапка поради нови докази.","guide-administrative-v2"]
  ];
  for(const [q,id] of fixtures){
    assert.equal(classifyLegalDomain(q).primaryDomain,"administrative_law",q);
    assert.equal(assessGuideDomainCompatibility(q,byId(id)).allowed,true,q);
  }
});

test("LDR-11 explicit primary and secondary domains remain separate and authority is untouched",()=>{
  const out=classifyLegalDomain("Работодавачот ми даде отказ и ми треба бесплатен адвокат.");
  assert.equal(out.primaryDomain,"labour_social");
  assert.ok(out.secondaryDomains.some(x=>x.domain==="access_to_justice"));
  const record=byId("guide-free-legal-aid");
  const assessed=assessGuideDomainCompatibility("Работодавачот ми даде отказ и ми треба бесплатен адвокат.",record,out);
  assert.equal(assessed.allowed,true);
  assert.equal(assessed.state,"COMPATIBLE_SECONDARY");
  assert.match(assessed.reason,/secondary/i);
  assert.equal(record.current_law_authority,false);
});

test("LDR-12 cross-domain compatibility requires a concrete reason and implementation is provider-free",()=>{
  const classification=classifyLegalDomain("Работникот бара судска заштита по отказ.");
  const cross=assessSourceDomainCompatibility(classification,"civil_procedure",{
    question:"Работникот бара судска заштита по отказ.",
    sourceId:"synthetic-civil-procedure"
  });
  assert.equal(cross.allowed,true);
  assert.equal(cross.state,"COMPATIBLE_CROSS_DOMAIN");
  assert.match(cross.reason,/civil_procedure|procedur/i);

  const source=fs.readFileSync("src/legal-domain-router.js","utf8");
  assert.doesNotMatch(source,/api\.openai\.com|OPENAI_API_KEY|\/v1\/responses|wrangler|migration/i);
  assert.doesNotMatch(source,/\bfetch\s*\(/);
});
