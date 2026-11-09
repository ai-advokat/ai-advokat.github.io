import test from "node:test";
import assert from "node:assert/strict";
import {
  MACEDONIAN_LANGUAGE_STANDARD_VERSION,
  MACEDONIAN_ORTHOGRAPHY_2017_SOURCE,
  MACEDONIAN_ORTHOGRAPHY_2017_RULE_PROFILE,
  MACEDONIAN_2017_SYSTEM_RULES
} from "../src/macedonian-language-guard.js";

test("Pravopis 2017 is a language authority only, never legal authority",()=>{
  assert.match(MACEDONIAN_LANGUAGE_STANDARD_VERSION,/V15_PROFESSIONAL_LEGAL_STYLE/);
  assert.equal(MACEDONIAN_ORTHOGRAPHY_2017_SOURCE.year,2017);
  assert.equal(MACEDONIAN_ORTHOGRAPHY_2017_SOURCE.edition,"второ издание");
  assert.equal(MACEDONIAN_ORTHOGRAPHY_2017_SOURCE.legalAuthority,false);
  assert.equal(MACEDONIAN_ORTHOGRAPHY_2017_SOURCE.legalTextAuthority,false);
});

test("professional Macedonian legal style profile covers high-value Pravopis rules",()=>{
  const byId=new Map(MACEDONIAN_ORTHOGRAPHY_2017_RULE_PROFILE.map(rule=>[rule.id,rule]));
  for(const id of ["R56","R57","R212","R330","SECTION-VII","R396","R418","LEGAL-NUMBERING"]){
    assert.ok(byId.has(id),id);
  }
  assert.match(byId.get("R56").policy,/Титулите и звањата/);
  assert.match(byId.get("LEGAL-NUMBERING").policy,/член 5, став 1/);
  assert.match(byId.get("SECTION-VII").policy,/големи букви и без точки/);
  assert.match(byId.get("R418").policy,/библиографскиот опис/);
});

test("system prompt preserves source fidelity while enforcing legal-document language quality",()=>{
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/professional titles and ranks with lower-case initials/i);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/capital letters without full stops/i);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/citation method internally consistent/i);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/VERBATIM SOURCE PRESERVATION OVERRIDE/);
  assert.match(MACEDONIAN_2017_SYSTEM_RULES,/never upgrades secondary literature into legal authority/i);
});
