import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  FAMILY_DIVORCE_DRAFT_VERSION,
  isFamilyDivorceDraftRequest,
  formatFamilyDivorceDraft,
  familyDivorceLegalSources
} from "../src/family-divorce-draft.js";

const worker=fs.readFileSync("src/index.js","utf8");
const chatJs=fs.readFileSync("assets/ai-advokat-chat.js","utf8");

test("family divorce lane recognises drafting requests",()=>{
  assert.equal(isFamilyDivorceDraftRequest("Направи ми тужба за развод, со измислени податоци, судска пракса и законски прописи."),true);
  assert.equal(isFamilyDivorceDraftRequest("Кој е рокот за жалба?"),false);
});

test("family divorce draft is complete, Macedonian and source-first",()=>{
  const answer=formatFamilyDivorceDraft("Направи ми тужба за развод, со измислени податоци, судска пракса и законски прописи.");
  assert.ok(answer);
  assert.match(answer,/ТУЖБА ЗА РАЗВОД НА БРАК/);
  assert.match(answer,/ОСНОВЕН ГРАЃАНСКИ СУД СКОПЈЕ/);
  assert.match(answer,/Член 40/);
  assert.match(answer,/Член 41/);
  assert.match(answer,/Член 228/);
  assert.match(answer,/Член 229/);
  assert.match(answer,/Член 237/);
  assert.match(answer,/СУДСКА ПРАКСА · PROVENANCE GATE/);
  assert.match(answer,/НЕ се наведува конкретен број на судски предмет/);
  assert.match(answer,/HUMAN GATE/);
  assert.doesNotMatch(answer,/Рајонски суд/);
  assert.doesNotMatch(answer,/Закон за брак и семејство/);
  assert.doesNotMatch(answer,/член 106/iu);
  assert.doesNotMatch(answer,/венчанје|воажување|непречисти односи/iu);
  assert.equal(FAMILY_DIVORCE_DRAFT_VERSION,"AI_ADVOCAT_FAMILY_DIVORCE_DRAFT_V1");
});

test("family divorce source metadata is explicit and bounded",()=>{
  const sources=familyDivorceLegalSources();
  assert.equal(sources.length,3);
  assert.ok(sources.some(s=>String(s.url).includes("mtsp.gov.mk")));
  assert.ok(sources.some(s=>String(s.url).includes("ldbis.pravda.gov.mk")));
  assert.ok(sources.some(s=>String(s.title).includes("192/2025")));
});

test("chat route bypasses generic model fallback and reports exact provenance",()=>{
  assert.match(worker,/canonical_family_divorce_draft/);
  assert.match(worker,/canonical_family_law_divorce_no_model/);
  assert.match(worker,/provider:"canonical_corpus_no_model"/);
  assert.match(worker,/providerCalls:0/);
  assert.match(chatJs,/canonical_family_law_divorce_no_model/);
  assert.match(chatJs,/Закон за семејството · source-first deterministic draft/);
});
