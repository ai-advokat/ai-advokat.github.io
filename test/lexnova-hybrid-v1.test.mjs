import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {routeLexNovaLegalIntent,LEXNOVA_ROUTER_VERSION} from "../src/lexnova-legal-router.js";
import {reviewLexNovaDocument,applyLexNovaDecisions,lexnovaReviewExport} from "../assets/lexnova-document-copilot.mjs";
const fixtures=JSON.parse(fs.readFileSync("test/fixtures/lexnova-mk-legal-acceptance-v1.json","utf8"));

test("96 independently specified synthetic scenarios match bounded current-turn routes",()=>{
 assert.equal(fixtures.sampleCount,96);
 assert.equal(fixtures.data.length,96);
 assert.equal(new Set(fixtures.data.map(x=>x.id)).size,96);
 assert.equal(new Set(fixtures.data.map(x=>x.domain)).size,12);
 const mismatches=[];
 for(const item of fixtures.data){
  assert.equal(item.synthetic,true);
  assert.equal(item.humanExpertVerdict,"PENDING_INDEPENDENT_LEGAL_REVIEW");
  const result=routeLexNovaLegalIntent(item.prompt);
  if(result.intent!==item.expectedIntent || result.capabilityRoute!==item.expectedCapabilityRoute || result.requiresHumanReview!==true) mismatches.push({
   id:item.id,expected:item.expectedIntent,got:result.intent,route:result.capabilityRoute,
   needsReview:result.requiresHumanReview,prompt:item.prompt
  });
  assert.equal(result.version,LEXNOVA_ROUTER_VERSION);
  assert.equal(result.executionAuthorization,"NO_EXTERNAL_ACTION");
  assert.equal(result.verifiedAuthority,false);
 }
 assert.deepEqual(mismatches,[],"Golden-set intent regressions: "+JSON.stringify(mismatches));
});

test("notice never becomes lawsuit, and confidential case is not granted public-chat access",()=>{
 assert.equal(routeLexNovaLegalIntent("Опомена пред Тужба за развод").intent,"family_notice");
 assert.equal(routeLexNovaLegalIntent("Напиши тужба за развод, а не опомена").intent,"family_lawsuit");
 assert.equal(routeLexNovaLegalIntent("Приватен предмет CasePilot, внеси лични податоци").intent,"secure_case");
 assert.equal(routeLexNovaLegalIntent("Објасни во две реченици што е Human Gate").executionAuthorization,"NO_EXTERNAL_ACTION");
});

test("Document Copilot compares Unicode legal text and never auto-accepts changes",()=>{
 const old="ИЗМИСЛЕН ДОГОВОР\nПредмет: Правна услуга.\nРок: 10 дена.\nПотпис: [проверка]";
 const proposed="ИЗМИСЛЕН ДОГОВОР\nПредмет: Правна услуга.\nРок: 15 дена.\nПотпис: [проверка]";
 const review=reviewLexNovaDocument(old,proposed);
 assert.equal(review.ok,true);
 assert.equal(review.totalChanges,1);
 assert.equal(review.changes[0].status,"AWAITING_HUMAN_DECISION");
 const notChosen=applyLexNovaDecisions(review,{});
 assert.equal(notChosen.ok,false);
 const reject=applyLexNovaDecisions(review,{[review.changes[0].id]:"reject"});
 assert.equal(reject.ok,true);
 assert.equal(reject.text,old);
 const accept=applyLexNovaDecisions(review,{[review.changes[0].id]:"accept"});
 assert.equal(accept.ok,true);
 assert.equal(accept.text,proposed);
 const exportPack=lexnovaReviewExport(review,{[review.changes[0].id]:"accept"});
 assert.equal(exportPack.ok,true);
 assert.match(exportPack.content,/HUMAN REVIEWED WORKING DRAFT/);
 assert.match(exportPack.content,/Рок: 15 дена/);
});

test("Document Copilot fail-closes on oversized or missing content and cannot fabricate new source",()=>{
 assert.equal(reviewLexNovaDocument("","test").ok,false);
 assert.equal(reviewLexNovaDocument("A".repeat(40001),"text").ok,false);
 assert.equal(reviewLexNovaDocument("old","new").ok,true);
 const review=reviewLexNovaDocument("A\nB\nC","A\nD\nC");
 assert.equal(review.ok,true);
 assert.equal(applyLexNovaDecisions(review,Object.fromEntries(review.changes.map(c=>[c.id,"accept"]))).text,"A\nD\nC");
 const script=fs.readFileSync("assets/lexnova-document-copilot.mjs","utf8");
 assert.doesNotMatch(script,/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|WebSocket/);
});

test("Provenance card models missing edition, legal effect and official URL as unknown",()=>{
 const script=fs.readFileSync("assets/lexnova-source-card.js","utf8");
 const ctx={URL};ctx.globalThis=ctx;
 vm.runInNewContext(script,ctx);
 const card=ctx.LexNovaSourceCard.sourceModel({title:"Закон (пример)",url:"https://ldbis.pravda.gov.mk/example",articles:["10","11"]});
 assert.equal(card.article,"10, 11");
 assert.equal(card.edition,"не е потврдена");
 assert.equal(card.effective,"не е потврдена");
 assert.equal(card.verifiedLegally,false);
 assert.ok(card.officialUrl.startsWith("https:"));
 assert.equal(ctx.LexNovaSourceCard.sourceModel({url:"javascript:alert(1)"}).officialUrl,null);
 assert.equal(ctx.LexNovaSourceCard.sourceModel({url:"http://example.org"}).officialUrl,null);
});

test("Conversation Intelligence remains disabled until opt-in, stores only aggregates",()=>{
 const store=new Map();
 const localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>{store.set(k,v);},removeItem:k=>store.delete(k)};
 const ctx={localStorage,Date,Number,JSON,Math};ctx.globalThis=ctx;
 vm.runInNewContext(fs.readFileSync("assets/lexnova-local-analytics.js","utf8"),ctx);
 const api=ctx.LexNovaAnalytics;
 assert.equal(api.enabled(),false);
 assert.equal(api.record({category:"documents",outcome:"success",durationMs:1200,question:"PRIVATE PERSON",answer:"SECRET"}),false);
 assert.equal(api.snapshot().total,0);
 api.setEnabled(true);
 assert.equal(api.record({category:"documents",outcome:"success",durationMs:1200,question:"PRIVATE PERSON",answer:"SECRET"}),true);
 const records=Array.from(store.values()).join("\n");
 assert.doesNotMatch(records,/PRIVATE PERSON|SECRET|prompt|answer|docId|email|caseId/);
 assert.equal(api.snapshot().total,1);
 assert.equal(api.snapshot().routes.documents,1);
 assert.equal(api.snapshot().outcomes.success,1);
 api.reset();
 assert.equal(api.snapshot().total,0);
});

test("no third provider bot and no auto handoff: shared UI remains optional",()=>{
 const ext=fs.readFileSync("bot/index.html","utf8");
 const internal=fs.readFileSync("index.html","utf8");
 const global=fs.readFileSync("assets/analytics.js","utf8");
 const standalone=fs.readFileSync("assets/standalone-bot.js","utf8");
 const root=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
 const handoff=fs.readFileSync("assets/lexnova-human-handoff.js","utf8");
 const quick=fs.readFileSync("assets/lexnova-quick-chat.js","utf8");
 assert.ok(ext.includes("lexnova-source-card.js"));
 assert.ok(internal.includes("lexnova-source-card.js"));
 assert.ok(ext.includes("lexnova-human-handoff.js")&&internal.includes("lexnova-human-handoff.js"));
 assert.ok(ext.includes("lexnova-local-analytics.js")&&internal.includes("lexnova-local-analytics.js"));
 assert.ok(ext.includes("/lexnova-document-copilot.html"));
 assert.ok(ext.includes("/lexnova-conversation-intelligence.html"));
 assert.ok(internal.includes("/assets/lexnova-quick-chat.js"));
 assert.ok(global.includes("installLexNovaQuickChatBridge()"));
 assert.ok(standalone.includes("LexNovaHandoff?.attach"));
 assert.ok(root.includes("LexNovaHandoff?.attach"));
 assert.match(handoff,/Ништо не се испраќа автоматски/);
 assert.doesNotMatch(handoff,/\bfetch\s*\(|navigator\.sendBeacon|XMLHttpRequest/);
 assert.match(quick,/https:\/\/ai-advokat-github-io\.aiadvokat16\.workers\.dev/);
 assert.match(quick,/frame\.loading="lazy"/);
 assert.match(quick,/full/iu);
 assert.doesNotMatch(quick,/\/api\/chat|\/api\/bot/);
});

test("Worker uses LexNova intent as a hint only; prior privacy and membership remain",()=>{
 const src=fs.readFileSync("src/index.js","utf8");
 const i=src.indexOf("async function handleGPTChat(");
 const at=t=>src.indexOf(t,i);
 assert.ok(i>0);
 assert.ok(at("const confidentiality=detectConfidentialCasePrompt(userQ);")>i);
 assert.ok(at("const lexnovaRoute=routeLexNovaLegalIntent(userQ);")>at("const confidentiality=detectConfidentialCasePrompt(userQ);"));
 assert.ok(at("const lexnovaRoute=routeLexNovaLegalIntent(userQ);")<at("const historyCheck=validateChatHistory(payload.history);"));
 assert.match(src,/lexnovaRoute:\{version:LEXNOVA_ROUTER_VERSION/);
 assert.match(src,/executionAuthorization:"NO_EXTERNAL_ACTION"/);
 assert.match(src,/if\(openAIOnly && !botMembership && !trainingOpen\)/);
});
