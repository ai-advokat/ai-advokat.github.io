import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync(new URL("../casepilot-workspace.html",import.meta.url),"utf8");
const js=fs.readFileSync(new URL("../assets/casepilot-workspace-ui.js",import.meta.url),"utf8");

test("secure workspace exposes case picker and creation controls",()=>{
  assert.match(html,/id="loadCases"/);
  assert.match(html,/id="casePickerBody"/);
  assert.match(html,/id="createCase"/);
  assert.match(html,/id="newCaseTitle"/);
  assert.match(html,/Private Document Vault/);
  assert.match(html,/Побарајте пристап/);
  assert.match(html,/membership\.html#request/);
});

test("case listing is authenticated and case-scoped",()=>{
  assert.match(js,/api\("\/api\/cases"\)/);
  assert.match(js,/"X-Membership-Key":accessKey/);
  assert.match(js,/openCaseById/);
  assert.match(js,/\/api\/cases\/"\+encodeURIComponent\(caseId\)\+"\/casepilot"/);
});

test("new workspace creation sends only allowed metadata fields",()=>{
  const start=js.indexOf('$("createCase").addEventListener');
  const end=js.indexOf('$("forgetAccess").addEventListener',start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/title,/);
  assert.match(block,/clientReference:clientReference\|\|null/);
  assert.match(block,/legalArea:legalArea\|\|null/);
  assert.match(block,/retentionUntil:retentionUntil\|\|null/);
  assert.doesNotMatch(block,/documentText|fullText|attachments|fileBytes|ocrText/);
});

test("membership key is still memory-only after case picker addition",()=>{
  assert.doesNotMatch(js,/localStorage|sessionStorage|document\.cookie|indexedDB/);
  assert.match(js,/let accessKey=""/);
});

test("forget access hides private case list and create controls",()=>{
  const start=js.indexOf('$("forgetAccess").addEventListener');
  const block=js.slice(start,start+1200);
  assert.match(block,/casePickerCard.*classList\.add\("hidden"\)/s);
  assert.match(block,/createCaseCard.*classList\.add\("hidden"\)/s);
  assert.match(block,/accessKey=""/);
});


test("secure workspace first screen uses plain-language access",()=>{
  assert.match(html,/Отворете го Вашиот правен предмет/);
  assert.match(html,/Приватен код за пристап/);
  assert.match(html,/Внесете го кодот што го добивте/);
  assert.match(html,/id="loadCases"[^>]*>Продолжи</);
  assert.match(html,/Клучот не се зачувува/);
  assert.doesNotMatch(html,/>\s*Membership key\s*</);
  assert.doesNotMatch(html,/>\s*Case ID\s*</);
});

test("direct existing-case code is hidden under an advanced disclosure",()=>{
  const start=html.indexOf('<details class="advanced-access">');
  const end=html.indexOf("</details>",start);
  assert.ok(start>0 && end>start);
  const block=html.slice(start,end);
  assert.match(block,/Имам код за конкретен постоечки предмет/);
  assert.match(block,/Код на предмет/);
  assert.match(block,/id="caseId"/);
  assert.match(block,/Отвори го предметот/);
});

test("validated empty account is guided directly to new-case creation",()=>{
  const start=js.indexOf('$("loadCases").addEventListener');
  const end=js.indexOf('$("membershipKey").addEventListener',start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.match(block,/const cases=Array\.isArray\(data\.cases\)\?data\.cases:\[\]/);
  assert.match(block,/Немате предмети/);
  assert.match(block,/createCaseCard.*scrollIntoView/s);
});

test("membership key and Case ID support keyboard-first access",()=>{
  assert.match(js,/\$\("membershipKey"\)\.addEventListener\("keydown"/);
  assert.match(js,/\$\("caseId"\)\.addEventListener\("keydown"/);
  assert.match(js,/\$\("loadCases"\)\.click\(\)/);
  assert.match(js,/\$\("openCase"\)\.click\(\)/);
});


test("simple post-access choice exposes one-click new case and plain-language case list",()=>{
  assert.match(html,/id="casePickerTitle">Мои предмети</);
  assert.match(html,/id="newCaseShortcut"[^>]*>➕ Нов предмет</);
  assert.match(html,/id="createCaseTitle">Нов предмет</);
  assert.match(html,/Креирај нов предмет/);
  assert.match(html,/<th>Проверка<\/th>/);
  assert.match(js,/item\.professionalUseLocked\?"Потребна":"Одобрена"/);
  assert.match(js,/\$\("newCaseShortcut"\)\.addEventListener\("click"/);
  assert.match(js,/newCaseTitle.*focus/s);
});

test("simple access wording does not expose internal terms in user status messages",()=>{
  const start=js.indexOf('$("loadCases").addEventListener');
  const end=js.indexOf("function renderCasePicker",start);
  const block=js.slice(start,end);
  assert.match(block,/Внесете го приватниот код за пристап/);
  assert.match(block,/Се проверува кодот/);
  assert.doesNotMatch(block,/Внесете membership key/);
  assert.doesNotMatch(block,/валиден Case ID/);
});
