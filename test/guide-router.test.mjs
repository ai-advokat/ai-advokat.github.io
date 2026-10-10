import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const Router=require("../assets/guide-router.js");
const registry=JSON.parse(fs.readFileSync("data/guides.json","utf8"));
const html=fs.readFileSync("index.html","utf8");
const records=registry.records;

function ids(question,limit=3){
  return Router.routeGuides(question,records,{limit,minScore:10}).map(x=>x.id);
}

test("CGR1 all 39 governed public records have clickable stable public URLs",()=>{
  const publicRecords=records.filter(r=>r.catalog_public===true&&r.public_record_enabled===true);
  assert.equal(publicRecords.length,39);
  assert.equal(new Set(publicRecords.map(r=>r.public_record_url)).size,39);
  for(const r of publicRecords){
    assert.match(r.public_record_url,/^\/guides\/record\.html\?g=[a-z0-9-]+$/);
  }
});

test("CGR2 current public guide set excludes version-history records by default",()=>{
  const current=Router.currentPublicGuides(records);
  assert.equal(current.length,37);
  assert.ok(current.every(r=>r.source_role!=="version_history"));
  assert.ok(current.some(r=>r.id==="guide-administrative-v2"));
  assert.ok(!current.some(r=>r.id==="guide-administrative-v1"));
});

test("CGR3 ordinary Cyrillic citizen questions route to expected guides",()=>{
  assert.ok(ids("Ме повика полиција на информативен разговор").includes("guide-41-full-word-2026"));
  assert.ok(ids("Институцијата не ми одговара на барањето").includes("guide-54-full-word-2026"));
  assert.ok(ids("Сакам развод и издршка за детето").includes("guide-09-family"));
  assert.ok(ids("Ми треба бесплатен адвокат затоа што немам пари").includes("guide-free-legal-aid"));
  assert.ok(ids("Сакам да поднесам кривична пријава").includes("guide-43-full-word-2026"));
  assert.ok(ids("Ме задржаа во полициска станица").includes("guide-42-full-word-2026"));
  assert.ok(ids("Како се бара условен отпуст").includes("guide-47-full-word-2026"));
  assert.ok(ids("Како да поднесам молба за помилување").includes("guide-50-full-word-2026"));
  assert.ok(ids("Ми недостига работен стаж во евиденцијата").includes("guide-38-full-word-2026"));
  assert.ok(ids("Сакам полномошно кај нотар").includes("guide-61-full-word-2026"));
});

test("CGR4 common Latin transliteration routes to the same citizen topics",()=>{
  assert.ok(ids("me povika policija na informativen razgovor").includes("guide-41-full-word-2026"));
  assert.ok(ids("institucijata ne mi odgovara").includes("guide-54-full-word-2026"));
  assert.ok(ids("sakam razvod i izdrska za dete").includes("guide-09-family"));
  assert.ok(ids("mi treba besplaten advokat").includes("guide-free-legal-aid"));
  assert.ok(ids("soobrakjajka osiguritel shteta").some(id=>["guide-10-traffic","guide-40-full-word-2026"].includes(id)));
  assert.ok(ids("notarsko polnomosno").includes("guide-61-full-word-2026"));
});

test("CGR5 specific administrative and insurance questions prefer useful specific guides",()=>{
  assert.ok(ids("жалба против управно решение").includes("guide-52-full-word-2026"));
  assert.ok(ids("тужба пред управен суд").includes("guide-53-full-word-2026"));
  assert.ok(ids("повторување управна постапка поради нови докази").includes("guide-56-full-word-2026"));
  assert.ok(ids("извод од јавна евиденција").includes("guide-57-full-word-2026"));
  assert.ok(ids("надомест на штета од сообраќајна незгода").some(id=>["guide-10-traffic","guide-40-full-word-2026"].includes(id)));
});

test("CGR6 broad administrative question includes V2 FINAL MASTER as a current master guide",()=>{
  const result=ids("управна постапка и управен спор",5);
  assert.ok(result.includes("guide-administrative-v2"));
  assert.ok(!result.includes("guide-administrative-v1"));
});

test("CGR7 archive records are not recommended unless the user explicitly asks for archive/history",()=>{
  const normal=ids("водич управна постапка",6);
  assert.ok(!normal.includes("guide-administrative-v1"));
  const archived=Router.routeGuides("архивска претходна верзија на водич управна постапка",records,{limit:6,minScore:1});
  assert.ok(archived.some(x=>x.id==="guide-administrative-v1"));
});

test("CGR8 exact current guide titles are routeable across the entire current public library",()=>{
  const current=Router.currentPublicGuides(records);
  for(const r of current){
    const routed=Router.routeGuides(r.display_title||r.title,records,{limit:6,minScore:1});
    assert.ok(routed.some(x=>x.id===r.id),r.id);
  }
});

test("CGR9 unrelated text fails closed instead of inventing a guide match",()=>{
  assert.deepEqual(Router.routeGuides("xyzqv completely unrelated token sequence",records,{limit:3,minScore:6}),[]);
});

test("CGR10 inheritance request without a matching guide fails closed and ignores platform self-name",()=>{
  const q="Добро утро почитуван AI Advokat, сакав да те замолам да ми подготвиш се што е потребно за оставинска постапка на плац на која има куќа.";
  assert.deepEqual(Router.routeGuides(q,records,{limit:3,minScore:10}),[]);
  assert.equal(Router.routingQuestion(q).includes("ai advokat"),false);
});

test("CGR11 homepage integrates clickable guide routing before statute-level AI output",()=>{
  assert.match(html,/assets\/guide-router\.js/);
  assert.match(html,/renderCitizenGuideMatches/);
  assert.match(html,/Отвори го водичот/);
  assert.match(html,/Прегледај ги сите 39 водичи/);
  assert.match(html,/guideSlot\.replaceChildren\(await renderCitizenGuideMatches\(q\)\)/);
  assert.match(html,/legalSlot\.append\(renderAssistantAnswer\(data\)\)/);
});

test("CGR12 router governance metadata is active and guide routing does not alter file, RAG or production gates",()=>{
  assert.equal(registry.collection.citizen_guide_router.status,"active_public_metadata_router");
  assert.equal(registry.collection.citizen_guide_router.public_records_available,39);
  assert.equal(registry.collection.citizen_guide_router.current_records_recommended_by_default,37);
  assert.ok(registry.collection.public_experience.features.includes("citizen_guide_router_clickable_recommendations"));
  assert.ok(records.every(r=>r.public_pdf===null));
  assert.ok(records.every(r=>r.ai_use==="reference_only_until_human_gate"));
  assert.equal(registry.collection.public_experience.public_document_download,false);
  assert.equal(registry.collection.public_experience.rag_eligibility,false);
  assert.equal(registry.collection.public_experience.production_corpus_write,false);
  assert.equal(registry.collection.public_experience.legal_corpus_promotion,false);
  assert.equal(registry.collection.v2_final_master_activation.ai_corpus_eligibility,false);
});


test("CGR13 router surfaces activation state and never upgrades a guide to current-law authority",()=>{
  const verified=Router.routeGuides("бесплатна правна помош",records,{limit:3,minScore:1});
  const g=verified.find(x=>x.id==="guide-free-legal-aid");
  assert.ok(g);
  assert.equal(g.activationState,"active_verified");
  assert.match(g.activationLabel,/Активен/);
  assert.equal(g.currentLawAuthority,false);

  const pending=Router.routeGuides("тужба пред управен суд",records,{limit:6,minScore:1})
    .find(x=>x.id==="guide-53-full-word-2026");
  assert.ok(pending);
  assert.equal(pending.activationState,"review_required");
  assert.equal(pending.currentLawAuthority,false);
});
