// R25 truthful inventory of all advertised UI languages. No provider calls and no deployment.
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";
const root=readFileSync("index.html","utf8");
const matrix=JSON.parse(readFileSync("data/ui-locale-coverage-r25.json","utf8"));
assert.equal(matrix.languages.length,33,"exactly 33 selector languages required");
const codes=[...root.matchAll(/SITE_LANGUAGE_CODES=Object\.freeze\((\[[^\]]+\])/g)];
assert.equal(codes.length,1);
const selected=JSON.parse(codes[0][1]);
assert.deepEqual(matrix.languages.map(x=>x.code),selected,"manifest must follow actual site language selector");
assert.equal(new Set(selected).size,33);
assert.ok(root.includes('#sourceWorkspace')&&root.includes('data-no-translate style="white-space:pre-wrap'),'official law source text must remain protected');
const rtl=new Set(["ar","he","fa","ur"]);
for(const e of matrix.languages){
  assert.equal(e.direction,rtl.has(e.code)?"rtl":"ltr",e.code+" direction");
  assert.equal(e.fullInterfaceVerified,false,"must not claim human-verified full locale "+e.code);
  assert.equal(e.professionalLanguageReviewed,false,"must not claim language review "+e.code);
  assert.equal(e.legalSourceTranslation,false,"UI packs must not assert translated legal sources");
  if(e.code!=="mk")assert.equal(e.gate,"HOLD");
}
assert.equal(matrix.languages.filter(e=>e.offlinePackage).length,1,"only Greek offline draft exists");
assert.equal(matrix.languages.find(e=>e.code==="el").interfaceSource,"versioned_offline_draft_pack");
const greekAssets=[
 "assets/ui-locale-el-r24-1.js","assets/ui-locale-el-r24-2.js",
 "assets/ui-locale-el-r24-3.js","assets/ui-locale-el-r24-4.js",
 "assets/ui-locale-el-r24-5.js","assets/ui-locale-el-laws-r25.js"
];
const context={window:{AIADVOKAT_STATIC_LOCALES:{}}};
vm.createContext(context);
for(const path of greekAssets)vm.runInContext(readFileSync(path,"utf8"),context,{timeout:1500,filename:path});
const greek=context.window.AIADVOKAT_STATIC_LOCALES.el;
const greekKeys=Object.keys(greek);
assert.ok(greekKeys.length>=550,"R25 legal-workspace Greek dictionary must extend existing 512 keys");
for(const [source,target] of Object.entries(greek)){
  assert.equal(typeof source,"string");
  assert.equal(typeof target,"string");
  assert.ok(source.trim().length>0&&target.trim().length>0);
}
const toCodes=matrix.languages.filter(e=>e.offlinePackage).map(e=>e.code);
assert.deepEqual(toCodes,["el"]);
const uiPairedSources=[...new Set([...root.matchAll(/\bT\(\s*"((?:\\.|[^"])*)"\s*,/g)].map(m=>m[1]))];
const greekPairs=uiPairedSources.filter(k=>Object.hasOwn(greek,k.replace(/\s+/gu," ").trim())).length;
const result={
  schema:matrix.schema,
  expectedLanguages:33,localeStatus:Object.fromEntries(matrix.languages.map(e=>[e.code,e.interfaceSource])),
  availableOfflineDraftPacks:toCodes,greekDictionaryEntries:greekKeys.length,
  extractedPairedUiLabels:uiPairedSources.length,
  greekExactMatchPairedLabels:greekPairs,
  partialLanguageCount:33,fullyProfessionallyVerifiedLocales:0,
  legalCorpusTranslated:false,productionRelease:"NO-GO",status:"INVENTORY_PASS_NOT_TRANSLATION_CERTIFICATION"
};
console.log(JSON.stringify(result));
