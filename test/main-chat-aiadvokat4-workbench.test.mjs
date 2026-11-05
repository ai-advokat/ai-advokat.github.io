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
  for(const action of ["assistant","analyzer","consolidator","predictor","sources","public-evidence","professional-ecosystem","cases","casepilot","documents","workflows","human-gate","library"]){
    assert.match(home,new RegExp('data-ai-workbench="'+action+'"'));
  }
  assert.match(home,/КОНСОЛИДАТОР/);
  assert.match(home,/АНАЛИЗАТОР/);
  assert.match(home,/ПРЕДИКТОР/);
  assert.match(home,/20261105-root-r14-visible-internal-ecosystem-v2/);
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
  for(const label of ["Правен асистент","Анализатор","Консолидатор","Предиктор","Правни извори","Јавни докази","Pro Ecosystem","Судска практика","CasePilot","Документи","Workflows","Human Gate","Library"]){
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

test("PR #534 internal toolkit remains directly visible when the left sidebar is hidden",()=>{
  const publicEvidenceCount=(home.match(/data-ai-workbench="public-evidence"/g)||[]).length;
  const professionalEcosystemCount=(home.match(/data-ai-workbench="professional-ecosystem"/g)||[]).length;
  assert.ok(publicEvidenceCount>=3, "Public Evidence must be exposed in sidebar, central workbench and More/tools");
  assert.ok(professionalEcosystemCount>=3, "Professional Ecosystem must be exposed in sidebar, central workbench and More/tools");
  assert.match(home,/<div class="ai-prof-actions">[\s\S]*data-ai-workbench="public-evidence"[\s\S]*data-ai-workbench="professional-ecosystem"[\s\S]*<\/div>/);
  assert.match(chat,/action==="public-evidence"/);
  assert.match(chat,/action==="professional-ecosystem"/);
  assert.match(css,/@media\(max-width:820px\)[\s\S]*\.ai-chat-side\{display:none\}/);
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

test("top menu matches external bot conversation and Professional-access controls",()=>{
  for(const id of ["aiChatMenuNew","aiChatExportConversation","aiChatMaterialsTop","aiChatProfessionalAccess","aiChatLogout","aiChatAccessDialog","aiChatAccessForm","aiChatRememberAccess"]){
    assert.match(home,new RegExp('id="'+id+'"'));
  }
  assert.match(home,/Преземи разговор \(\.txt\)/);
  assert.match(home,/Материјали и алатки/);
  assert.match(home,/Професионален пристап/);
  assert.match(home,/Одјави се и заборави го пристапот/);
  assert.match(home,/Не внесувајте OpenAI API клуч/);
  assert.match(chat,/CHAT_API_BASE\+"\/api\/membership\/status"/);
  assert.match(chat,/import\("\/assets\/bot-device-access\.mjs"\)/);
  assert.match(chat,/saveDeviceAccess/);
  assert.match(chat,/readDeviceAccess/);
  assert.match(chat,/forgetDeviceAccess/);
  assert.match(chat,/\^sk-/);
  assert.match(chat,/function exportCurrentConversation\(\)/);
  assert.match(chat,/AI-Advokat-razgovor\.txt/);
  assert.match(chat,/FREE активен · јавен текстуален chat · Workers AI/);
  assert.match(chat,/Професионален пристап · /);
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


test("main Human Gate evidence exposes source temporal and jurisdiction verification plus provider recovery",()=>{
  assert.match(chat,/providerRecovery/);
  assert.match(chat,/Provider recovery/);
  assert.match(chat,/sourceVerificationState/);
  assert.match(chat,/temporalVerificationState/);
  assert.match(chat,/jurisdictionVerificationState/);
  assert.match(chat,/Warning: /);
});


test("TEMP LIVE QA · internal toolkit production endpoints",async()=>{
  const BASE="https://ai-advokat-github-io.aiadvokat16.workers.dev";
  const SITE="https://ai-advokat.github.io";

  const liveHome=await fetch(SITE+"/?internal_toolkit_qa="+Date.now(),{headers:{"cache-control":"no-cache"}});
  assert.equal(liveHome.ok,true,"GitHub Pages homepage must be reachable");
  const liveHtml=await liveHome.text();
  assert.match(liveHtml,/20261105-root-r14-visible-internal-ecosystem-v2/);
  assert.ok((liveHtml.match(/data-ai-workbench="public-evidence"/g)||[]).length>=3);
  assert.ok((liveHtml.match(/data-ai-workbench="professional-ecosystem"/g)||[]).length>=3);
  assert.match(liveHtml,/>Јавни докази</);
  assert.match(liveHtml,/>Pro Ecosystem</);

  const toolkitRes=await fetch(BASE+"/api/internal-toolkit",{headers:{accept:"application/json"}});
  assert.equal(toolkitRes.ok,true,"internal toolkit endpoint must return 2xx");
  const toolkit=await toolkitRes.json();
  assert.equal(toolkit.ok,true);
  assert.equal(toolkit.scope,"internal_ai_advokat_only");
  assert.equal(toolkit.externalBotChanged,false);
  assert.equal(toolkit.humanGate,"required");
  assert.ok(toolkit.ecosystem.livingLaw.length>=4);
  assert.ok(toolkit.ecosystem.operationsRegistry.length>=4);
  assert.ok(toolkit.ecosystem.calculators.length>=3);
  assert.ok(toolkit.ecosystem.smartDocuments.length>=6);
  assert.ok(toolkit.ecosystem.legalWatch.length>=5);
  assert.equal(toolkit.ecosystem.boundaries.internalAiAdvokatOnly,true);
  assert.equal(toolkit.ecosystem.boundaries.humanGateRequired,true);

  const tasks=["entity","procurement","public_money","regulatory_change","property","digital_entity","open_data","web_history"];
  for(const task of tasks){
    const res=await fetch(BASE+"/api/internal-toolkit?task="+encodeURIComponent(task),{headers:{accept:"application/json"}});
    assert.equal(res.ok,true,task+" endpoint must return 2xx");
    const data=await res.json();
    assert.equal(data.ok,true);
    const wf=data.publicEvidence?.workflow;
    assert.equal(wf?.task,task);
    assert.ok(Array.isArray(wf?.steps)&&wf.steps.length>=5,task+" must have governed steps");
    assert.ok(Array.isArray(wf?.sources)&&wf.sources.length>=1,task+" must have at least one source");
    assert.equal(wf?.humanGateRequired,true);
  }

  const evidenceRes=await fetch(BASE+"/api/public-evidence/card",{
    method:"POST",
    headers:{"content-type":"application/json","accept":"application/json"},
    body:JSON.stringify({
      title:"QA public source",
      url:"https://slvesnik.com.mk/",
      task:"regulatory_change",
      observedAt:"2026-11-05T13:00:00.000Z",
      contentSha256:"a".repeat(64),
      note:"Non-confidential automated QA record.",
      status:"SOURCE_BACKED"
    })
  });
  assert.equal(evidenceRes.ok,true,"Evidence Card endpoint must return 2xx");
  const evidence=await evidenceRes.json();
  assert.equal(evidence.ok,true);
  assert.equal(evidence.scope,"internal_ai_advokat_only");
  assert.equal(evidence.card.schema,"AI_ADVOCAT_PUBLIC_EVIDENCE_CARD_V1");
  assert.equal(evidence.card.status,"SOURCE_BACKED");
  assert.equal(evidence.card.legalConclusion,false);
  assert.equal(evidence.card.humanGateRequired,true);
  assert.equal(evidence.card.contentSha256,"a".repeat(64));

  async function calc(calculator,input){
    const res=await fetch(BASE+"/api/internal-toolkit/calculate",{
      method:"POST",
      headers:{"content-type":"application/json","accept":"application/json"},
      body:JSON.stringify({calculator,input})
    });
    assert.equal(res.ok,true,calculator+" endpoint must return 2xx");
    const data=await res.json();
    assert.equal(data.ok,true);
    assert.equal(data.scope,"internal_ai_advokat_only");
    return data.result;
  }

  const pct=await calc("percentage",{amount:1000,percent:15,source:"QA arithmetic test"});
  assert.equal(pct.value,150);
  assert.equal(pct.legalBasisDetermined,false);
  assert.equal(pct.humanGateRequired,true);

  const cal=await calc("calendar_deadline",{baseDate:"2026-11-05",days:10});
  assert.equal(cal.calendarDate,"2026-11-15");
  assert.equal(cal.legalDeadlineDetermined,false);
  assert.equal(cal.humanGateRequired,true);

  const interest=await calc("simple_interest",{
    principal:100000,
    annualRatePct:5,
    fromDate:"2026-01-01",
    toDate:"2026-01-31",
    dayBasis:365,
    rateSource:"QA supplied rate only",
    rateVerified:true
  });
  assert.equal(interest.days,30);
  assert.equal(interest.interest,410.96);
  assert.equal(interest.total,100410.96);
  assert.equal(interest.legalRateDetermined,false);
  assert.equal(interest.humanGateRequired,true);
  assert.equal(interest.evidenceState,"CALCULATED_FROM_USER_MARKED_VERIFIED_RATE");
});
