import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {pathToFileURL} from "node:url";
import {createRequire} from "node:module";

const home=fs.readFileSync("index.html","utf8");
const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const css=fs.readFileSync("assets/ai-advokat-chat.css","utf8");

test("main AI Advokat chat exposes AIAdvokat4 LexNova governed workbench",()=>{
  assert.match(home,/AIAdvokat4 · LexNova UX/);
  for(const action of ["consolidator","analyzer","predictor","casepilot","sources","human-gate"]){
    assert.match(home,new RegExp('data-ai-workbench="'+action+'"'));
  }
  assert.match(home,/КОНСОЛИДАТОР/);
  assert.match(home,/АНАЛИЗАТОР/);
  assert.match(home,/ПРЕДИКТОР/);
  assert.match(home,/20261031-aiadvokat4-workbench/);
});

test("Consolidator is exact Legal Formatter v10.4 CORE and not a prompt surrogate",()=>{
  const require=createRequire(import.meta.url);
  const C=require("../assets/legal-formatter-v10.4/lfcore.js");
  assert.equal(C.version,"10.4.0");
  assert.equal(typeof C.consolidate,"function");
  assert.equal(typeof C.buildResolutionWorkflow,"function");
  assert.equal(typeof C.applyResolutionsToLaw,"function");
  assert.match(chat,/window\.open\("\/consolidator\/"/);
});

test("Analyzer is the existing deterministic Legal Analyzer v1.0.1",async()=>{
  const mod=await import(pathToFileURL(process.cwd()+"/src/legal-analyzer.js").href+"?workbench-test="+Date.now());
  assert.equal(mod.LEGAL_ANALYZER_VERSION,"1.0.1");
  const result=mod.analyzeLegalDocument({
    filename:"sample.txt",
    text:"Основен суд Скопје. К.бр. 12/2026. Член 10 од Закон за облигационите односи. Рок 8 дена.",
    sourceVerification:"not_verified"
  });
  assert.equal(result.version,"1.0.1");
  assert.equal(result.humanGate.required,true);
  assert.equal(result.provenance.generatedOfficialIdentifier,false);
  assert.match(chat,/import\("\/src\/legal-analyzer\.js"\)/);
});

test("Predictor is governed scenario/risk workflow with CasePilot and no fake success percentages",()=>{
  assert.match(chat,/PREDICTOR MODE — GOVERNED SCENARIO \/ RISK ENGINE \+ CASEPILOT INTELLIGENCE/);
  assert.match(chat,/Не давај процент на успех/);
  assert.match(chat,/не гарантирај исход/);
  assert.match(chat,/Secure Case Workspace \/ CasePilot/);
  assert.match(chat,/HUMAN GATE REQUIRED/);
});

test("Sources and Human Gate panels use existing governed response fields",()=>{
  for(const key of ["legalSources","caseLawSources","guideSources","publicationSources","sources"]){
    assert.match(chat,new RegExp('"'+key+'"'));
  }
  assert.match(chat,/m\?\.governance/);
  assert.match(chat,/humanReviewRequired/);
  assert.match(chat,/requiredGateTypes/);
  assert.match(chat,/executionAuthorization/);
  assert.match(chat,/specialistExecution/);
});

test("CasePilot privacy boundary and governed backend remain intact",()=>{
  assert.match(chat,/window\.open\("\/casepilot-workspace\.html"/);
  assert.match(chat,/localConfidentialCasePrompt/);
  assert.match(chat,/Public chat processing stopped before network\/provider execution/);
  assert.match(chat,/CHAT_API_BASE\+"\/api\/chat"/);
  assert.match(home,/Доверливи предмети не се внесуваат во јавниот слој|Secure Case Workspace/);
});

test("workbench is responsive and visually integrated in main chat",()=>{
  assert.match(css,/\.ai-prof-workbench/);
  assert.match(css,/\.ai-prof-chain/);
  assert.match(css,/\.ai-prof-analyzer-dialog/);
  assert.match(css,/@media\(max-width:760px\)/);
});
