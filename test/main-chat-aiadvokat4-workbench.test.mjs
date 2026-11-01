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
  for(const action of ["assistant","analyzer","consolidator","predictor","sources","cases","casepilot","documents","workflows","human-gate","library"]){
    assert.match(home,new RegExp('data-ai-workbench="'+action+'"'));
  }
  assert.match(home,/КОНСОЛИДАТОР/);
  assert.match(home,/АНАЛИЗАТОР/);
  assert.match(home,/ПРЕДИКТОР/);
  assert.match(home,/20261101-root-r12-complete/);
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

test("main workspace has standalone-bot parity on left modules and right evidence tabs",()=>{
  for(const label of ["Правен асистент","Анализатор","Консолидатор","Предиктор","Правни извори","Судска практика","CasePilot","Документи","Workflows","Human Gate","Library"]){
    assert.ok(home.includes(label), "missing main workspace label: "+label);
  }
  for(const tab of ["sources","context","human","artifact"]){
    assert.ok(home.includes('data-ai-evidence-tab="'+tab+'"'), "missing evidence tab: "+tab);
  }
  assert.match(css,/grid-template-columns:248px minmax\(0,1fr\) 326px/);
  assert.match(chat,/window\.open\("\/case-law-metadata\.html"/);
  assert.match(chat,/openMaterialsDialog\("library"\)/);
  assert.match(chat,/href="\/professional-library\/" target="_blank"/);
  assert.match(chat,/ensureWorkflowDialog/);
  assert.match(chat,/openWorkspaceSearch/);
  assert.match(chat,/aiChatHistorySearch/);
});

test("message actions match the external professional bot controls",()=>{
  assert.match(chat,/⧉ Копирај/);
  assert.match(chat,/✎ Уреди/);
  assert.match(chat,/↺ Повтори/);
  assert.match(chat,/▤ Извори/);
  assert.match(chat,/✓ Проверка/);
  assert.match(chat,/▧ DOCX/);
  assert.match(chat,/▧ PDF/);
  assert.match(chat,/exportAssistantMessage\(m,current\(\),"docx"/);
  assert.match(chat,/exportAssistantMessage\(m,current\(\),"pdf"/);
});

test("main workspace matches external bot interaction parity beyond labels",()=>{
  assert.match(chat,/↺ Повтори/);
  assert.match(chat,/renameChatThread/);
  assert.match(chat,/ensureMaterialsDialog/);
  assert.match(chat,/openMaterialsDialog\("documents"\)/);
  assert.match(chat,/openMaterialsDialog\("library"\)/);
  assert.match(chat,/data-materials-export="txt"/);
  assert.match(chat,/data-materials-export="md"/);
  assert.match(chat,/exportPlainAssistantMessage/);
  assert.match(chat,/gazetteIssueMetadata/);
  assert.match(chat,/canonical_gazette_issue_metadata_no_model/);
  assert.match(chat,/Governed corpus · без модел/);
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
