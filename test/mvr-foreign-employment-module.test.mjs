import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const html=fs.readFileSync("index.html","utf8");
const js=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const data=JSON.parse(fs.readFileSync("data/mvr-foreign-employment-checklists.json","utf8"));

test("AI chat exposes dedicated foreign employment icon/module",()=>{
  assert.match(html,/Престој и вработување на странци/);
  assert.match(html,/data-foreign-employment="verify"/);
  assert.match(html,/МВР чек-листи · прв пат \/ продолжување/);
});

test("module preserves both photographed MVR checklists",()=>{
  assert.equal(data.checklists.first_time.items.length,10);
  assert.equal(data.checklists.renewal.items.length,9);
  assert.match(data.checklists.first_time.items.join("\n"),/неосудуван/);
  assert.match(data.checklists.renewal.items.join("\n"),/Здравствено осигурување/);
  assert.match(data.submission.as_posted,/канцеларија 901/);
  assert.match(data.fees.as_posted.join("\n"),/4\.000 денари/);
  assert.match(data.fees.as_posted.join("\n"),/2\.150 денари/);
});

test("bot prompt enforces source/version verification",()=>{
  assert.match(js,/НЕ е сама по себе важечки правен извор/);
  assert.match(js,/Провери ја секоја ставка според важечките прописи и официјалните извори/);
  assert.match(js,/точен извор, член\/одредба, верзија и датум/);
  assert.equal(data.fees.status,"must_verify_before_payment");
  assert.equal(data.submission.verification_required,true);
});

test("module includes separate official MVR and MFA references without conflating procedures",()=>{
  assert.equal(data.official_sources.mvr_residence_registration.url,"https://mvr.gov.mk/mk-MK/prijavi-stranci");
  assert.match(data.official_sources.mvr_residence_registration.rules_as_published.join("\n"),/12 часа/);
  assert.match(data.official_sources.mvr_residence_registration.rules_as_published.join("\n"),/48 часа/);
  assert.equal(data.official_sources.mvr_residence_registration.legal_anchor.article,"190");
  assert.equal(data.official_sources.mfa_travel_document_for_foreigners.fee_as_published,"20 евра");
  assert.match(data.official_sources.mfa_travel_document_for_foreigners.tariff_reference_as_published,/134/);
  assert.match(data.official_sources.mfa_travel_document_for_foreigners.scope_warning,/не смее да се меша/);
  assert.match(html,/Официјален МВР извор · пријава на престој/);
  assert.match(html,/Официјален МНР извор · патен лист за странци/);
});

test("foreign-employment reference is sent as JSON attachment instead of oversized q payload",()=>{
  assert.match(js,/new File\(\[refText\],"mvr-foreign-employment-reference\.json"/);
  assert.match(js,/attachments=\[\.\.\.withoutOld,refFile\]/);
  assert.doesNotMatch(js,/JSON\.stringify\(\{source:data\.source,selected_checklists:selected/);
  const promptParts=[
    "AI Advokat, анализирај го приложениот JSON референтен пакет за престој и вработување на странци.",
    "Фотографираните МВР листи се практична институционална информација, не сами по себе важечки правен извор.",
    "Одделно користи ги официјалните МВР и МНР веб-извори наведени во прилогот и не мешај патен лист за странци со дозвола за привремен престој.",
    "Провери ја секоја ставка според важечките прописи и официјалните извори. Разликувај: што пишува на листата, што е правно потврдено и што бара дополнителна проверка.",
    "За секој правен заклучок наведи точен извор, член/одредба, верзија и датум. Такси, рокови и ослободувања не преземај без проверка."
  ];
  assert.ok(promptParts.join("\n\n").length<4000);
});

test("Nexa immigration.mk is governed as secondary comparison source only",()=>{
  assert.equal(data.secondary_sources.nexa_immigration_mk.status,"comparison_only_not_authoritative");
  assert.match(data.secondary_sources.nexa_immigration_mk.governance_rule,/Не смее да биде единствена основа/);
  assert.ok(data.secondary_sources.nexa_immigration_mk.claims_requiring_primary_source_verification.length>=5);
  assert.match(js,/secondary_sources:data\.secondary_sources/);
  assert.match(html,/Секундарен практичен извор:/);
});
