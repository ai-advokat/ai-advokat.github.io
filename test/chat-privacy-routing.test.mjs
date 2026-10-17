import test from "node:test";
import assert from "node:assert/strict";
import { detectConfidentialCasePrompt } from "../src/chat-privacy.js";
import fs from "node:fs";

const worker=fs.readFileSync("src/index.js","utf8");
const ui=fs.readFileSync("assets/ai-advokat-chat.js","utf8");

test("CPR1 general legal research stays available in public chat",()=>{
  for(const q of [
    "Имаме оставинска постапка. Што треба да подготвиме и кои прашања да ги провериме?",
    "Кои се условите за тужба за утврдување право на сопственост?",
    "Што значи имотен лист и каде се проверува?"
  ]){
    assert.equal(detectConfidentialCasePrompt(q).confidential,false,q);
  }
});

test("CPR2 national identifiers fail closed before public provider execution",()=>{
  assert.equal(detectConfidentialCasePrompt("Лицето има ЕМБГ и барам анализа на предметот.").confidential,true);
  assert.equal(detectConfidentialCasePrompt("ЕМБГ: 0101000450001").confidential,true);
  assert.equal(detectConfidentialCasePrompt("лична карта број 123456 и тужба за имот").confidential,true);
});

test("CPR3 concrete case narrative plus contact details routes to Secure Case Workspace",()=>{
  const q=[
    "Предмет: оставинска постапка.",
    "КП 2236, ИЛ 5032, договор и тужба за право на сопственост.",
    "Контакт: user@example.com, адреса ул. Пример бр. 10.",
    "Ова е конкретниот предмет на странката и барам целосна анализа."
  ].join(" ");
  const result=detectConfidentialCasePrompt(q.repeat(8));
  assert.equal(result.confidential,true);
  assert.ok(result.reasons.includes("concrete_case_details"));
});

test("CPR4 backend privacy gate runs before quota reservation and orchestrator",()=>{
  const gate=worker.indexOf("const confidentiality=detectConfidentialCasePrompt(q)");
  const quota=worker.indexOf("reserveMonthlyQuota",gate);
  const provider=worker.indexOf("runOpenAIOrchestrator(env",gate);
  assert.ok(gate>0 && quota>gate && provider>quota);
  const block=worker.slice(gate,quota);
  assert.match(block,/confidential_case_workspace_required/);
  assert.match(block,/providerCalled:false/);
  assert.match(block,/quotaConsumed:false/);
  assert.match(block,/casepilot-workspace\.html/);
});

test("CPR5 public provider failures do not expose raw failure detail",()=>{
  const start=worker.indexOf("if(!result.ok)",worker.indexOf("async function handleGPTChat"));
  const end=worker.indexOf("const postflight=",start);
  const block=worker.slice(start,end);
  assert.match(block,/AI runtime не успеа безбедно/);
  assert.match(block,/failureDetail:null/);
});

test("CPR6 UI renders a direct private-workspace action",()=>{
  assert.match(ui,/confidential_case_workspace_required/);
  assert.match(ui,/Privacy gate · public GPT call stopped/);
  assert.match(ui,/casepilot-workspace\.html/);
  assert.match(ui,/if\(m\.action && typeof m\.action==="object"\)/);
  assert.match(ui,/href\.startsWith\("\/"\)/);
});


test("CPR7 browser preflight stops obvious confidential case text before public chat persistence or network",()=>{
  assert.match(ui,/function localConfidentialCasePrompt\(value\)/);
  assert.match(ui,/function confidentialCaseHandoffMessage\(\)/);
  const sendStart=ui.indexOf("async function send(forcedText=null)");
  const localGate=ui.indexOf("if(localConfidentialCasePrompt(q))",sendStart);
  const title=ui.indexOf("setTitle(chat,q)",sendStart);
  const publicFetch=ui.indexOf('fetch(CHAT_API_BASE+"\/api\/chat"',sendStart);
  assert.ok(sendStart>0 && localGate>sendStart);
  assert.ok(title>localGate);
  assert.ok(publicFetch>title);
  const localBlock=ui.slice(localGate,title);
  assert.match(localBlock,/Доверлив правен предмет/);
  assert.match(localBlock,/чувствителната содржина не е зачувана/);
  assert.match(localBlock,/return;/);
  assert.doesNotMatch(localBlock,/guideMatches\(q\)/);
  assert.doesNotMatch(localBlock,/fetch\(/);
});

test("CPR8 server fallback scrubs confidential text from public session history",()=>{
  assert.match(ui,/function scrubConfidentialPublicTurn/);
  assert.match(ui,/Privacy-redacted/);
  assert.match(ui,/чувствителната содржина е отстранета од јавната session history/);
  assert.match(ui,/chat\.title="Доверлив правен предмет"/);
  const branch=ui.indexOf('"confidential_case_workspace_required","public_attachment_secure_workspace_required","public_history_secure_workspace_required"');
  assert.ok(branch>0);
  const block=ui.slice(branch,branch+1400);
  assert.match(block,/scrubConfidentialPublicTurn\(\{userIndex,assistantIndex\}\)/);
  assert.match(block,/guides:\[\]/);
});

test("CPR9 public UI exposes the private workspace before confidential data entry",()=>{
  const html=fs.readFileSync("index.html","utf8");
  assert.match(html,/id="secureCaseWorkspaceCta"/);
  assert.match(html,/Доверлив предмет\? Отвори Secure Case Workspace/);
  assert.match(html,/href="\/casepilot-workspace\.html"/);
});


test("CPR10 public user attachments fail closed before quota reservation and provider execution",()=>{
  const gate=worker.indexOf("public_attachment_secure_workspace_required");
  const quota=worker.indexOf("reserveMonthlyQuota",gate);
  const provider=worker.indexOf("runOpenAIOrchestrator(env",gate);
  assert.ok(gate>0 && quota>gate && provider>quota);
  const block=worker.slice(gate,quota);
  assert.match(block,/providerCalled:false/);
  assert.match(block,/quotaConsumed:false/);
  assert.match(block,/attachmentsAccepted:false/);
  assert.match(block,/casepilot-workspace\.html/);
});

test("CPR11 confidential public history is checked before attachment processing and provider execution",()=>{
  const historyGate=worker.indexOf("const confidentialHistory=historyCheck.history.some");
  const attachment=worker.indexOf("const attachmentCheck=validateChatAttachments",historyGate);
  const provider=worker.indexOf("runOpenAIOrchestrator(env",historyGate);
  assert.ok(historyGate>0 && attachment>historyGate && provider>attachment);
  assert.match(worker.slice(historyGate,attachment),/public_history_secure_workspace_required/);
  assert.match(worker.slice(historyGate,attachment),/providerCalled:false/);
  assert.match(worker.slice(historyGate,attachment),/quotaConsumed:false/);
});

test("CPR12 public browser file controls route directly to Secure Case Workspace",()=>{
  assert.match(ui,/function openSecureAttachmentWorkspace\(\)/);
  assert.match(ui,/window\.location\.href="\/casepilot-workspace\.html"/);
  assert.match(ui,/attachBtn\.addEventListener\("click",openSecureAttachmentWorkspace\)/);
  assert.match(ui,/if\(e\.dataTransfer\?\.files\?\.length\) openSecureAttachmentWorkspace\(\)/);
  assert.match(ui,/if\(files\?\.length\)[\s\S]*?openSecureAttachmentWorkspace\(\)/);
});
