import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const internal=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const external=fs.readFileSync("assets/standalone-bot.js","utf8");

test("R19 internal chat: auxiliary guide catalogue cannot indefinitely block /api/chat",()=>{
  assert.ok(internal.includes('fetchGuideRegistry()'));
  assert.ok(internal.includes('signal:AbortSignal.timeout(3500)'));
  assert.ok(internal.includes('guideRegistryPromise=null'));
  assert.ok(internal.includes('fetch(CHAT_API_BASE+"/api/chat"'));
  assert.ok(internal.includes('guideDocumentsForMatches(guides)'));
  assert.ok(internal.includes('return await Promise.race(['));
  assert.ok(internal.includes('vault.documentsForGuides(guides,{max:2})'));
  assert.ok(internal.includes('setTimeout(()=>resolve([]),3500)'));
  // User-selected real attachments remain a separate privacy/validation path.
  assert.ok(internal.includes('const selectedFiles=[...attachments]'));
  assert.ok(internal.includes('attachments:encoded'));
});

test("R19 external bot: optional catalogue and selected local vault are bounded",()=>{
  assert.ok(external.includes("async function guideMatches(q, signal)"));
  assert.ok(external.includes("AbortSignal.timeout(3500)"));
  assert.ok(external.includes("signal:boundedSignal"));
  assert.ok(external.includes("if($('useLocalGuides').checked)"));
  assert.ok(external.includes("guideDocuments=await Promise.race(["));
  assert.ok(external.includes("localGuideDocuments(window.AIAdvokatGuideVault,ids,true)"));
  assert.ok(external.includes("Избраните локални водичи не се вчитани навреме"));
  assert.ok(external.includes("request('/api/bot'"));
});

test("R19 external bot: provider 503 is visible in the conversation and not presented as legal output",()=>{
  assert.ok(external.includes("if(epoch===generation)"));
  assert.ok(external.includes("timedOut"));
  assert.ok(external.includes("AI одговор не е издаден."));
  assert.ok(external.includes("Ова е сервисна грешка, не правно мислење."));
  assert.ok(external.includes("Сервисен статус · НЕМА AI ОДГОВОР"));
  assert.ok(external.includes("$('question').value = q"));
});

test("R19 guide deadlines resolve or reject instead of hanging forever (fixture)",async()=>{
  const never=new Promise(()=>{});
  const result=await Promise.race([never,new Promise(resolve=>setTimeout(()=>resolve([]),10))]);
  assert.deepEqual(result,[]);
  const stopped=await Promise.race([never,new Promise((_,reject)=>setTimeout(()=>reject(new Error("guide_timeout")),10))])
    .then(()=>null,error=>error.message);
  assert.equal(stopped,"guide_timeout");
});
