import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DETENTION_PROCEDURAL_TERMINOLOGY_VERSION,
  DETENTION_PROCEDURAL_TERMINOLOGY_EVIDENCE,
  ZKP_JUDGMENT_TYPE_TAXONOMY,
  isDetentionContext,
  normaliseDetentionProceduralTerminology,
  assessDetentionProceduralTerminology
} from "../src/detention-procedural-terminology.js";

const q="Жалба против притвор – дај ми поддржувачка и спротивна судска практика.";

test("detention terminology policy is tied to verified ZKP official-source evidence",()=>{
  assert.equal(DETENTION_PROCEDURAL_TERMINOLOGY_VERSION,"AI_ADVOCAT_DETENTION_PROCEDURAL_TERMINOLOGY_V2");
  assert.equal(DETENTION_PROCEDURAL_TERMINOLOGY_EVIDENCE.ldbisLawId,20679);
  assert.equal(DETENTION_PROCEDURAL_TERMINOLOGY_EVIDENCE.officialGazette,"Службен весник на Република Македонија бр. 150/2010");
  assert.ok(DETENTION_PROCEDURAL_TERMINOLOGY_EVIDENCE.provisions.some(x=>x.article==="169"&&/решение/u.test(x.rule)));
  assert.ok(DETENTION_PROCEDURAL_TERMINOLOGY_EVIDENCE.provisions.some(x=>x.article==="173"&&/укинува/u.test(x.rule)));
  assert.deepEqual(ZKP_JUDGMENT_TYPE_TAXONOMY.map(x=>x.label),["одбивателна пресуда","ослободителна пресуда","осудителна пресуда"]);
  assert.equal(DETENTION_PROCEDURAL_TERMINOLOGY_EVIDENCE.judgmentTypesArticle,"401");
});

test("detention context is detected without affecting unrelated criminal-law answers",()=>{
  assert.equal(isDetentionContext(q),true);
  assert.equal(isDetentionContext("Објасни ми пресуда за надомест на штета."),false);
});

test("detention headings use neutral судска практика, not generic пресуди",()=>{
  const bad="1. Поддржувачки пресуди\n2. Спротивни пресуди";
  const clean=normaliseDetentionProceduralTerminology(bad,{userText:q});
  assert.match(clean,/Поддржувачка судска практика/u);
  assert.match(clean,/Спротивна судска практика/u);
  assert.doesNotMatch(clean,/Поддржувачки пресуди/u);
  assert.doesNotMatch(clean,/Спротивни пресуди/u);
});

test("detention procedural acts are corrected from пресуда to решение",()=>{
  const bad=[
    "Пресуда за определување притвор.",
    "Пресуда за продолжување на притворот.",
    "Пресуда за укинување на притворот.",
    "Жалба против пресудата за притвор.",
    "Пресудата со која се укинува притворот."
  ].join("\n");
  const clean=normaliseDetentionProceduralTerminology(bad,{userText:q});
  assert.match(clean,/решение за определување притвор/iu);
  assert.match(clean,/решение за продолжување на притворот/iu);
  assert.match(clean,/решение за укинување на притворот/iu);
  assert.match(clean,/жалба против решението за притвор/iu);
  assert.match(clean,/решението со кое се укинува притворот/iu);
  assert.equal(assessDetentionProceduralTerminology(clean,{userText:q}).ok,true);
});

test("legitimate judgment references remain intact",()=>{
  const text=[
    "По објавување на пресудата, судот одделно одлучува за притворот.",
    "Пресуда на ЕСЧП може да биде релевантна како меѓународна судска практика."
  ].join("\n");
  const clean=normaliseDetentionProceduralTerminology(text,{userText:q});
  assert.equal(clean,text);
  assert.equal(assessDetentionProceduralTerminology(clean,{userText:q}).ok,true);
});

test("residual direct mislabelling fails closed",()=>{
  const gate=assessDetentionProceduralTerminology("Судот донел пресуда за укинување на притворот.",{userText:q});
  assert.equal(gate.ok,false,JSON.stringify(gate));
  assert.ok(gate.issues.some(x=>/пресуда за укинување/u.test(x)),JSON.stringify(gate));
});

test("runtime enforces terminology on both provider paths and UI exposes the gate",()=>{
  const index=fs.readFileSync("src/index.js","utf8");
  const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
  const central=fs.readFileSync("src/ai-advokat-central-prompt.js","utf8");
  const orchestrator=fs.readFileSync("src/agent-orchestrator.js","utf8");
  assert.match(index,/fallbackDetentionTerminologyGate=assessDetentionProceduralTerminology/);
  assert.match(index,/governedDetentionTerminologyGate=assessDetentionProceduralTerminology/);
  assert.match(index,/procedural_act_terminology_blocked/);
  assert.match(chat,/ZKP Procedural-Act Gate · BLOCK/);
  assert.match(central,/DETENTION PROCEDURAL-ACT TERMINOLOGY/);
  assert.match(orchestrator,/ZKP PROCEDURAL-ACT TERMINOLOGY/);
});
