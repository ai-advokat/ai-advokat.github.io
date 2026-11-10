import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const root=fs.readFileSync("index.html","utf8");
const externalHtml=fs.readFileSync("bot/index.html","utf8");
const core=fs.readFileSync("assets/standalone-bot.js","utf8");
const vnext=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");
const vnextCss=fs.readFileSync("assets/standalone-bot-vnext.css","utf8");
const worker=fs.readFileSync("src/index.js","utf8");
const ecosystem=fs.readFileSync("src/internal-professional-ecosystem.js","utf8");

const workbenchMap={
  "justice-daily":"justice-daily",
  "cases":"cases",
  "assistant":"assistant",
  "analyzer":"analyzer",
  "consolidator":"consolidator",
  "predictor":"predictor",
  "casepilot":"casepilot",
  "sources":"sources",
  "public-evidence":"public-evidence",
  "documents":"documents",
  "library":"library",
  "workflows":"workflows",
  "professional-ecosystem":"professional-ecosystem",
  "human-gate":"review"
};

test("R14 full parity: every internal workbench has an external hidden counterpart",()=>{
  const internal=[...root.matchAll(/data-ai-workbench="([^"]+)"/g)].map(m=>m[1]);
  assert.ok(internal.length>=14,"unexpectedly small internal workbench catalogue");
  for(const id of internal){
    assert.ok(workbenchMap[id],"missing parity map for internal workbench "+id);
    assert.ok(vnext.includes('data-vnext-action="'+workbenchMap[id]+'"'),"external action missing for "+id);
  }
  assert.match(vnextCss,/data-external-experience="conversation"/);
  assert.match(vnextCss,/\.vnext-sidebar\{[\s\S]*display:none!important/);
});

test("R14 full parity: shared Professional Ecosystem is no longer marked internal-only",()=>{
  assert.match(ecosystem,/internalAiAdvokatOnly:false/);
  assert.match(ecosystem,/sharedWithExternalProfessionalBot:true/);
  assert.match(ecosystem,/externalProfessionalBotChanged:true/);
  assert.match(ecosystem,/externalInterfaceMode:"conversation_first_hidden_capabilities"/);
  for(const marker of ["livingLaw","operationsRegistry","calculators","smartDocuments","legalWatch"]){
    assert.ok(ecosystem.includes(marker),marker);
  }
});

test("R14 full parity: conversational router covers internal and advanced professional capabilities",()=>{
  for(const route of [
    "SECURE_CASE","AI_CONTRACT_PRO","CONSOLIDATOR","LEGAL_ANALYZER","GOVERNED_PREDICTOR",
    "CASE_LAW_RESEARCH","ECHR_CROSSWALK","PUBLIC_EVIDENCE","JUSTICE_DAILY",
    "PROFESSIONAL_ECOSYSTEM","LIVING_LAW","SMART_DOCUMENTS","LEGAL_WATCH",
    "HYBRID_LEGAL_INTELLIGENCE","LEGAL_SOURCES","DOCUMENTS","LIBRARY","WORKFLOWS",
    "HUMAN_GATE","LEGAL_COMMAND_CENTER","PROACTIVE_RUNTIME","PROACTIVE_AGENTS",
    "FACT_EVIDENCE_GRAPH","CONNECTOR_LIBRARY","REVIEW_VAULT"
  ]){
    assert.ok(core.includes('"'+route+'"'),"client route missing "+route);
    assert.ok(worker.includes('"'+route+'"'),"worker route missing "+route);
  }
  assert.match(vnext,/window\.AIAdvokatVNext\.runAction=runAction/);
  assert.match(vnext,/capabilityMode="conversation-first-full-parity"/);
});

test("R14 full parity: AI Contract works as both conversational intelligence and explicit hidden action",()=>{
  assert.match(core,/return "AI_CONTRACT_PRO"/);
  assert.match(core,/\["contract-intelligence",\/\(\?:ai\\s\*contract/);
  assert.match(vnext,/data-vnext-action="contract-intelligence"/);
  assert.match(vnext,/window\.open\('\/ai-contract\.html'/);
  assert.match(worker,/HIDDEN CAPABILITY: AI_CONTRACT_PRO/);
  assert.match(worker,/governed contract intelligence, drafting or review/);
});

test("R14 full parity: external translator mirrors the 33-language governed interface contract",()=>{
  const select=externalHtml.match(/<select id="botLanguage"[\s\S]*?<\/select>/)?.[0]||"";
  assert.equal([...select.matchAll(/<option value="[a-z]{2}"/g)].length,33);
  assert.match(core,/fetch\(base\+"\/api\/ui-translate"/);
  assert.match(core,/targetLanguage:code/);
  assert.match(core,/collectBotUiUnits/);
  assert.match(core,/new MutationObserver/);
  assert.match(core,/conversationalLanguageSwitch/);
  assert.match(core,/writePreferredLanguage\(languageSwitch\)/);
});

test("R14 full parity: voice, Human Gate and five requested export formats remain available",()=>{
  assert.match(externalHtml,/id="mic"/);
  assert.match(externalHtml,/Human Gate/);
  for(const fmt of ["docx","pdf","md","json","csv"]){
    assert.ok(externalHtml.includes('data-export="'+fmt+'"'),fmt);
  }
});
