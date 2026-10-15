import test from "node:test";
import assert from "node:assert/strict";
import {
  MACEDONIAN_LANGUAGE_STANDARD_VERSION,
  MACEDONIAN_2017_SYSTEM_RULES,
  shouldEnforceMacedonianOutput,
  assessMacedonianOutput,
  buildMacedonianRepairMessages
} from "../src/macedonian-language-guard.js";

test("runtime contract is explicitly anchored to the 2017 Macedonian orthography",()=>{
  assert.match(MACEDONIAN_LANGUAGE_STANDARD_VERSION,/2017/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/2017/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/standard literary Macedonian/i);
});

test("Macedonian questions activate the language gate",()=>{
  assert.equal(shouldEnforceMacedonianOutput("Замолувам да ми направиш правна анализа на македонски."),true);
  assert.equal(shouldEnforceMacedonianOutput("Што предвидува законот?"),true);
  assert.equal(shouldEnforceMacedonianOutput("Please answer in English."),false);
});

test("clean literary Macedonian passes",()=>{
  const out="Краток преглед на фактите. Потребно е да се проверат наследниците, полномошното и важечкиот правен извор во Северна Македонија.";
  const check=assessMacedonianOutput(out,{userText:"Направи анализа на македонски."});
  assert.equal(check.ok,true,JSON.stringify(check));
});

test("Serbian Bulgarian Russian hybrid regression is rejected",()=>{
  const bad="Краток преглед на информация. Догађајот бара поступак, а треба да се проверат документы и становище. Трябва да се обжалвайте.";
  const check=assessMacedonianOutput(bad,{userText:"Направи анализа на македонски."});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes("foreign_cyrillic_letters"));
  assert.ok(check.reasons.includes("foreign_lexical_contamination"));
});

test("unrequested foreign-law substitution is rejected",()=>{
  const bad="Применете Български закон за наследство и проверете во Народен парламент.";
  const check=assessMacedonianOutput(bad,{userText:"Анализирај наследување во Северна Македонија."});
  assert.equal(check.ok,false);
  assert.ok(check.reasons.includes("foreign_jurisdiction_substitution"));
});

test("repair pass is source-preserving and non-expansive by contract",()=>{
  const messages=buildMacedonianRepairMessages({text:"Догађај",userText:"Анализа"});
  assert.equal(messages.length,2);
  assert.match(messages[0].content,/Do not add new facts, laws, citations, deadlines, legal effects or recommendations/);
  assert.match(messages[0].content,/Return only the corrected answer/);
});


test("repair prompt contains Macedonian-native quality instructions",()=>{
  const messages=buildMacedonianRepairMessages({
    text:"пријстак приетување притбор",
    userText:"Направи потсетник на македонски."
  });
  assert.match(messages[0].content,/МАКЕДОНСКА ЈАЗИЧНА РЕДАКЦИЈА/);
  assert.match(messages[0].content,/не создавај непостоечки македонски зборови/i);
  assert.match(messages[0].content,/постапка, поднесување, барање, решение, притвор/);
  assert.match(messages[0].content,/немакедонски кирилични букви/i);
});
