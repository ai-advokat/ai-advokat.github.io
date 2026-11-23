import test from "node:test";
import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {readFileSync} from "node:fs";
test("R25 33-language truth-in-advertising and protected legal source gates",()=>{
  const out=JSON.parse(execFileSync(process.execPath,["scripts/translator-33-language-audit-r25.mjs"],{encoding:"utf8",timeout:10000}));
  assert.equal(out.expectedLanguages,33);
  assert.equal(out.fullyProfessionallyVerifiedLocales,0);
  assert.equal(out.legalCorpusTranslated,false);
  assert.deepEqual(out.availableOfflineDraftPacks,["el"]);
  assert.equal(Object.keys(out.localeStatus).length,33);
  assert.equal(out.productionRelease,"NO-GO");
  assert.ok(out.greekDictionaryEntries>=550);
  assert.equal(out.status,"INVENTORY_PASS_NOT_TRANSLATION_CERTIFICATION");
});
test("R25 Greek workspace uses explicit UI pairing; source text never auto-translated",()=>{
  const root=readFileSync("index.html","utf8");
  assert.match(root,/if\(siteLanguage==="el"\)/);
  assert.match(root,/AIADVOKAT_STATIC_LOCALES\?\.el\?\.\[key\]/);
  assert.match(root,/Original legal text — not automatically translated/);
  assert.match(root,/data-no-translate style="white-space:pre-wrap/);
  assert.match(root,/const T=\(mk,en\)=>\{/);
});
