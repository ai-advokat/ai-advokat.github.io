import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {createRequire} from "node:module";
const require=createRequire(import.meta.url);
const formatter=require("../assets/legal-formatter-v10.4/lfcore.js");
const read=p=>fs.readFileSync(p,"utf8");
const evidence=JSON.parse(read("data/zoki-rc16-official-source-evidence-2026-11-14.json"));

test("Zoki's 3 new source PDFs are represented ONLY by verified evidence metadata",()=>{
  assert.equal(evidence.review_status,"REVIEW_ONLY_LEGAL_HOLD");
  assert.equal(evidence.public_repo_contains_raw_law_text,false);
  assert.equal(evidence.source_count,3);
  assert.deepEqual(evidence.sources.map(x=>x.role),["base_law","amendment","new_law_future_application"]);
  assert.deepEqual(evidence.sources.map(x=>x.pdf_original_sha256),[
    "028f63f0a07393c464941a0069cb9e0d51e02ade8caf856ed7bc280d47f21568",
    "38d7391de8ab33d6f3a1936b52cdf2eea13d8080063463282df0b87f3e4951aa",
    "8312c7b3a1c7d9f59d73d48ffddd820b1aa0774a7f5e4afb7515819d6be49553"
  ]);
  for(const src of evidence.sources){
    assert.match(src.pdf_original_sha256,/^[a-f0-9]{64}$/);
    assert.match(src.official_ldbis,/^https:\/\/ldbis\.pravda\.gov\.mk\//);
    assert.equal(src.human_legal_review,"pending");
  }
  assert.deepEqual(evidence.non_activation,{
    human_gate:"PENDING",article_promotion:false,db_migrations:false,
    cloudflare_deploy:false,merge_authorization:false,release_status:"NO_GO"
  });
});

test("2019 BPP + 2024 amendments are one 53-heading candidate; new 2026 ZPP is separate",()=>{
  const [bpp,amend,zpp]=evidence.sources;
  assert.equal(bpp.verified_original_article_headings,50);
  assert.deepEqual(amend.operation_targets,["13(6)","insert 34-а","insert 34-б","insert 34-в"]);
  assert.equal(amend.expected_structural_bpp_article_count_after_review,53);
  assert.equal(bpp.instrument_family,amend.instrument_family);
  assert.notEqual(bpp.instrument_family,zpp.instrument_family);
  assert.equal(zpp.instrument_key,"mk:zpp");
  assert.equal(zpp.verified_article_headings,519);
  assert.equal(zpp.article_184_original_pdf_page,47);
  assert.equal(zpp.applicable_in_2026_11,false);
  assert.equal(zpp.do_not_use_as_current_zpp_article_184,true);
  assert.deepEqual(zpp.transitional_articles,[517,518,519]);
  assert.equal(zpp.ldbis_application_date,"2027-01-18");
  assert.equal(zpp.application_date_disagreement_requires_human_review,true);
});

test("Consolidator PDF conversion and file picker never silently truncate legal text",()=>{
  const worker=read("src/index.js");
  const start=worker.indexOf("async function handleConsolidatorImport");
  const end=worker.indexOf("async function handleUiTranslation",start);
  assert.ok(start>0&&end>start);
  const handler=worker.slice(start,end);
  assert.doesNotMatch(handler,/\.slice\(0,\s*180000\)/);
  assert.match(handler,/maxImportChars=750000/);
  assert.match(handler,/error:"consolidator_import_text_too_large"/);
  assert.match(handler,/text:convertedText/);
  const html=read("consolidator/index.html");
  assert.doesNotMatch(html,/\.slice\(0,\s*180000\)/);
  assert.match(html,/maxImportChars=750000/);
  assert.match(html,/\$\(targetId\)\.value=importedText/);
  assert.match(html,/Нема скратен увоз/);
});

test("Consolidator identifies BPP and ZPP headings to prevent accidental cross-law merge",()=>{
  const html=read("consolidator/index.html");
  assert.match(html,/baseFamily!==amdFamily/);
  assert.match(html,/Различни закони:/);
  const extracted=html.match(/function detectedLawFamily\(text\)\{[\s\S]*?\n\}/);
  assert.ok(extracted,"missing pure law-family guard");
  const context={};
  vm.runInNewContext(extracted[0]+"\nthis.detectedLawFamily=detectedLawFamily;",context);
  assert.equal(context.detectedLawFamily("ЗАКОН ЗА БЕСПЛАТНА ПРАВНА ПОМОШ\nЧлен 1"),"bpp");
  assert.equal(context.detectedLawFamily("ЗАКОН ЗА ИЗМЕНУВАЊЕ И ДОПОЛНУВАЊЕ НА ЗАКОНОТ ЗА БЕСПЛАТНА ПРАВНА ПОМОШ"),"bpp");
  assert.equal(context.detectedLawFamily("ЗАКОН ЗА ПАРНИЧНАТА ПОСТАПКА\nЧлен 1"),"zpp");
  assert.equal(context.detectedLawFamily("З А К О Н\nЗА БЕСПЛАТНА\nПРАВНА ПОМОШ"),"bpp");
  assert.equal(context.detectedLawFamily("З А К О Н\nЗА ПАРНИЧНАТА\nПОСТАПКА"),"zpp");
  assert.equal(context.detectedLawFamily("Непознат правен текст"),null);
});

test("LFCore locally parses a >180k character, 519-article statute without dropping article 519",()=>{
  const body="(1) Технички тест на целосен член и верност на пасусот. ".repeat(15);
  const source="ЗАКОН ЗА ПАРНИЧНАТА ПОСТАПКА\n"+Array.from({length:519},(_,i)=>
    "Член "+(i+1)+"\n"+body+(i===518?" КРАЈ_ЧЛЕН_519":"")+"\n"
  ).join("\n");
  assert.ok(source.length>180000&&source.length<750000,"synthetic test must cover old unsafe truncation boundary");
  const law=formatter.parseBaseLaw(source);
  assert.equal(law.articles.length,519);
  assert.equal(law.articles[0].number,"1");
  assert.equal(law.articles[518].number,"519");
  assert.match(JSON.stringify(law.articles[518]),/КРАЈ_ЧЛЕН_519/);
  // Human Gate still required; parsing all 519 synthetic articles is NOT legal attestation.
});
