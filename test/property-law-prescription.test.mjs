import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  PROPERTY_LAW_PRESCRIPTION_VERSION,
  isPropertyPrescriptionQuery,
  formatPropertyPrescriptionAnswer,
  propertyPrescriptionLegalSources
} from "../src/property-law-prescription.js";

const worker=fs.readFileSync("src/index.js","utf8");
const chatJs=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const prompt=fs.readFileSync("src/ai-advokat-central-prompt.js","utf8");

test("odrzuvacka semantic router recognises Macedonian and Latin spelling plus long possession context",()=>{
  assert.equal(isPropertyPrescriptionQuery("Што е одржувачка кај недвижен имот?"),true);
  assert.equal(isPropertyPrescriptionQuery("odrzuvacka za parcela po 20 godini vladenie"),true);
  assert.equal(isPropertyPrescriptionQuery("Имам долгогодишно владение на земјиште повеќе од 20 години"),true);
  assert.equal(isPropertyPrescriptionQuery("Како се одржува зграда?"),false);
});

test("concept answer characterises odrzuvacka as property law and states statutory periods",()=>{
  const answer=formatPropertyPrescriptionAnswer("Објасни ми одржувачка за недвижност и долготрајно владение");
  assert.ok(answer);
  assert.match(answer,/стварноправен институт/iu);
  assert.match(answer,/usucapio/iu);
  assert.match(answer,/ЧЛЕН 124/);
  assert.match(answer,/10 години/);
  assert.match(answer,/20 години/);
  assert.match(answer,/ЧЛЕН 125/);
  assert.match(answer,/Не значи „одржување“/);
  assert.match(answer,/Само тоа што некој долго време користел недвижност НЕ значи автоматски/);
});

test("draft answer produces ownership declaratory claim scaffold, not maintenance prose",()=>{
  const answer=formatPropertyPrescriptionAnswer("Состави тужба за утврдување сопственост по одржувачка, со судска пракса");
  assert.ok(answer);
  assert.match(answer,/ТУЖБА ЗА УТВРДУВАЊЕ ПРАВО НА СОПСТВЕНОСТ ПО ОСНОВ НА ОДРЖУВАЧКА/);
  assert.match(answer,/Член 124/);
  assert.match(answer,/Член 125/);
  assert.match(answer,/Член 163/);
  assert.match(answer,/СУДСКА ПРАКСА · PROVENANCE GATE/);
  assert.match(answer,/HUMAN GATE/);
  assert.doesNotMatch(answer,/техничко одржување|maintenance service|сервисирање/iu);
});

test("property-law sources expose official statute and Constitutional Court doctrine",()=>{
  const sources=propertyPrescriptionLegalSources();
  assert.equal(sources.length,3);
  assert.ok(sources.some(s=>String(s.url).includes("pravda.gov.mk")));
  assert.ok(sources.some(s=>String(s.url).includes("ustavensud.mk")));
  assert.ok(sources.some(s=>Array.isArray(s.articles)&&s.articles.includes("124")));
  assert.equal(PROPERTY_LAW_PRESCRIPTION_VERSION,"AI_ADVOCAT_PROPERTY_LAW_PRESCRIPTION_V1");
});

test("public chat routes odrzuvacka before generic model fallback and labels provenance correctly",()=>{
  assert.match(worker,/isPropertyPrescriptionQuery\(routingQuery\)/);
  assert.match(worker,/canonical_property_law_prescription/);
  assert.match(worker,/canonical_property_law_odrzuvacka_no_model/);
  assert.match(worker,/provider:"canonical_corpus_no_model"/);
  assert.match(worker,/providerCalls:0/);
  assert.match(chatJs,/canonical_property_law_odrzuvacka_no_model/);
  assert.match(chatJs,/одржувачка\/usucapio/);
});

test("central prompt never interprets odrzuvacka as ordinary maintenance",()=>{
  assert.match(prompt,/MACEDONIAN LEGAL TERM RESOLUTION — ОДРЖУВАЧКА/);
  assert.match(prompt,/Never interpret одржувачка as ordinary maintenance\/upkeep/);
  assert.match(prompt,/стварно право/);
});
