import { describe,test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const data=JSON.parse(fs.readFileSync("data/guides.json","utf8"));
const taxonomy=JSON.parse(fs.readFileSync("data/guides-taxonomy-v2.json","utf8"));
const reviewQueue=JSON.parse(fs.readFileSync("data/guides-human-review-queue.json","utf8"));
const html=fs.readFileSync("guides/index.html","utf8");
const recordHtml=fs.readFileSync("guides/record.html","utf8");
const sitemapXml=fs.readFileSync("sitemap.xml","utf8");
const sitemapTxt=fs.readFileSync("sitemap.txt","utf8");

describe("Zoran guides library governance",()=>{
  test("G1 registry contains 39 governed records including controlled Administrative V2",()=>{
    assert.equal(data.records.length,39);
    assert.equal(new Set(data.records.map(x=>x.id)).size,39);
  });

  test("G2 no guide exposes a public PDF or AI-corpus eligibility before Human Gate",()=>{
    assert.ok(data.records.every(x=>x.public_pdf===null));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
    assert.equal(data.records.find(x=>x.id==="guide-administrative-v2").public_pdf,null);
  });

  test("G3 Guide 02 keeps explicit version history",()=>{
    const old=data.records.find(x=>x.id==="guide-02-victim-draft-2026-09-29");
    const current=data.records.find(x=>x.id==="guide-02-victim-edited-2026-10-01");
    assert.equal(old.superseded_by,current.id);
    assert.equal(current.supersedes,old.id);
    assert.equal(old.status,"superseded_draft");
    assert.equal(old.verification_level,"archive");
  });

  test("G4 administrative version hierarchy is explicit and Human-Gated",()=>{
    const short=data.records.find(x=>x.id==="guide-26-administrative-short");
    const v1=data.records.find(x=>x.id==="guide-administrative-v1");
    const v2=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.ok(short);
    assert.equal(v1.superseded_by,v2.id);
    assert.equal(v2.supersedes,v1.id);
    assert.equal(v1.source_role,"version_history");
    assert.equal(v2.source_role,"primary");
    assert.equal(v2.provenance.provenance_role,"conceptual_and_organizational_reference_only");
    assert.equal(v2.catalog_public,false);
  });

  test("G5 every delivered source has immutable provenance metadata",()=>{
    for(const r of data.records){
      assert.match(r.sha256,/^[0-9a-f]{64}$/);
      assert.ok(Number.isInteger(r.source_size_bytes) && r.source_size_bytes>0);
    }
  });

  test("G6 public page states source-first and human legal control boundaries in citizen-facing language",()=>{
    assert.match(html,/секундарни авторски\/редакциски материјали/);
    assert.match(html,/човечка правна ревизија/);
    assert.match(html,/не се прикажуваат како важечки закон/i);
    assert.match(html,/целосните DOCX\/PDF датотеки/);
  });

  test("G7 FULL Word batch 38-63 is complete, provenance-locked and does not pretend Word has fixed page counts",()=>{
    const batch=data.records.filter(x=>x.source_role==="primary_full_word");
    assert.equal(batch.length,26);
    assert.deepEqual(batch.map(x=>Number(x.guide_no)).sort((a,b)=>a-b),Array.from({length:26},(_,i)=>i+38));
    for(const r of batch){
      assert.equal(r.source_format,"docx");
      assert.equal(r.pages,null);
      assert.equal(r.display_format,"Практичен водич");
      assert.match(r.page_count_note,/DOCX/);
      assert.equal(r.public_pdf,null);
      assert.equal(r.ai_use,"reference_only_until_human_gate");
      assert.equal(r.source_package,"Pravni_vodichi_38_63_FULL_WORD_ALL.zip");
      assert.equal(r.source_package_sha256,"5c6aedf360b0376e1e24bdbe9df6b49e393eff8a8984a476e06ad6b05c884172");
    }
  });

  test("G8 Guide 53 remains blocked on the silence-of-administration deadline correction",()=>{
    const g=data.records.find(x=>x.id==="guide-53-full-word-2026");
    assert.equal(g.status,"legal_approval_required");
    assert.match(g.review_note,/У\.бр\.148\/2024/);
  });

  test("G9 source-checked Word guides remain Human-Gated and have distinct verification labels",()=>{
    const expected={
      "guide-39-full-word-2026":"specific_point_checked",
      "guide-51-full-word-2026":"specific_provision_checked",
      "guide-52-full-word-2026":"specific_provision_checked"
    };
    for(const [id,level] of Object.entries(expected)){
      const g=data.records.find(x=>x.id===id);
      assert.equal(g.status,"source_checked_review");
      assert.equal(g.verification_level,level);
      assert.equal(g.professional_use,"human_review_required");
    }
  });

  test("G10 public catalogue activation covers exactly 38 records",()=>{
    assert.equal(data.collection.catalog_visibility.state,"public");
    assert.equal(data.collection.catalog_visibility.decision_id,"catalog-visibility-38-2026-10-03");
    assert.equal(data.records.filter(x=>x.catalog_public===true).length,38);
    assert.equal(data.records.find(x=>x.id==="guide-administrative-v2").catalog_public,false);
    assert.match(html,/Каталогот е <strong>јавно активиран<\/strong>/);
  });

  test("G11 catalogue visibility does not open document, AI-corpus or production gates",()=>{
    assert.equal(data.collection.catalog_visibility.public_download,false);
    assert.equal(data.collection.catalog_visibility.rag_eligibility,false);
    assert.equal(data.collection.catalog_visibility.production_corpus_write,false);
    assert.equal(data.collection.catalog_visibility.legal_corpus_promotion,false);
    assert.ok(data.records.every(x=>x.public_pdf===null));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
  });

  test("G12 Administrative V2 FINAL MASTER candidate is fingerprint-bound and still fail-closed",()=>{
    const g=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.equal(g.status,"corrected_candidate");
    assert.equal(g.pages,15);
    assert.equal(g.candidate_artifact.artifact_version,"V2.0 FINAL MASTER");
    assert.equal(g.candidate_artifact.docx_sha256,"de609c4526eee401a3759ff2fe22556cacded9bef87cdf675213e69e8a10ed11");
    assert.equal(g.candidate_artifact.pdf_sha256,"4c11375551a705173d7cf6d2785b5351c8dc61df76ae7ef7a7a35de14b3c721d");
    assert.equal(g.candidate_artifact.author_approval,"pending");
    assert.equal(g.candidate_artifact.public_release,"not_authorized");
    assert.equal(g.candidate_artifact.rag_eligibility,"not_authorized");
    assert.equal(g.candidate_artifact.production_corpus_write,"not_authorized");
    assert.equal(g.catalog_public,false);
    assert.equal(g.public_pdf,null);
  });

  test("G13 final catalogue control metrics remain internally consistent",()=>{
    const publicRecords=data.records.filter(x=>x.catalog_public===true);
    assert.equal(data.generated_on,"2026-10-04");
    assert.equal(publicRecords.length,38);
    assert.equal(publicRecords.filter(x=>x.source_role!=="version_history").length,36);
    assert.equal(publicRecords.filter(x=>x.source_role==="version_history").length,2);
    assert.equal(publicRecords.filter(x=>x.public_pdf!==null).length,0);
    assert.equal(data.collection.final_control.registry_total,39);
    assert.equal(data.collection.final_control.public_catalog_records,38);
    assert.equal(data.collection.final_control.public_document_downloads,0);
  });

  test("G14 public catalogue removes the flagged citizen-facing jargon from primary explanatory text",()=>{
    assert.match(html,/архивски верзии/);
    assert.match(html,/траен линк/);
    assert.match(html,/AI-базата/);
    assert.ok(!html.includes("version-history записи"));
    assert.ok(!html.includes("permanent link"));
    assert.ok(!html.includes("reference-only"));
    assert.ok(!html.includes("RAG/AI"));
  });

  test("G15 version graph has no broken or non-reciprocal links",()=>{
    const byId=new Map(data.records.map(x=>[x.id,x]));
    for(const r of data.records){
      if(r.supersedes){
        assert.ok(byId.has(r.supersedes));
        assert.equal(byId.get(r.supersedes).superseded_by,r.id);
      }
      if(r.superseded_by){
        assert.ok(byId.has(r.superseded_by));
        assert.equal(byId.get(r.superseded_by).supersedes,r.id);
      }
    }
  });

  test("G16 all 38 public records have unique friendly slugs; Administrative V2 has none",()=>{
    const publicRecords=data.records.filter(x=>x.catalog_public===true);
    assert.equal(publicRecords.length,38);
    assert.equal(new Set(publicRecords.map(x=>x.public_slug)).size,38);
    for(const r of publicRecords){
      assert.equal(r.public_record_enabled,true);
      assert.match(r.public_slug,/^[a-z0-9-]+$/);
      assert.equal(r.public_record_url,`/guides/record.html?g=${encodeURIComponent(r.public_slug)}`);
    }
    const admin=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.equal(admin.public_record_enabled,false);
    assert.equal(admin.public_record_url,null);
    assert.equal(admin.public_slug,null);
  });

  test("G17 public detail experience remains catalogue-only and fail-closed",()=>{
    assert.match(recordHtml,/јавен каталошки запис/i);
    assert.match(recordHtml,/Целосната датотека и внесувањето во AI-базата не се активирани/);
    assert.match(recordHtml,/catalog_public===true/);
    assert.ok(!recordHtml.includes("public_pdf"));
  });

  test("G18 catalogue exposes controlled categories, verification levels, sorting and friendly detail links",()=>{
    assert.match(html,/id="sort"/);
    assert.match(html,/Ниво на проверка/);
    assert.match(html,/category_code/);
    assert.match(html,/verification_level/);
    assert.match(html,/Отвори детален запис/);
    assert.match(html,/Копирај линк/);
    assert.match(recordHtml,/public_slug===slug/);
  });

  test("G19 public experience gate remains exactly the approved 38-record catalogue scope",()=>{
    assert.equal(data.collection.public_experience.scope,"exact_38_public_catalog_records");
    assert.equal(data.collection.public_experience.public_document_download,false);
    assert.equal(data.collection.public_experience.rag_eligibility,false);
    assert.equal(data.collection.public_experience.production_corpus_write,false);
    assert.equal(data.collection.public_experience.legal_corpus_promotion,false);
    assert.equal(data.collection.public_experience.version,"2.0");
  });

  test("G20 all 38 friendly public URLs are discoverable in both sitemaps and old machine-id URLs are not advertised",()=>{
    const publicRecords=data.records.filter(x=>x.catalog_public===true&&x.public_record_enabled===true);
    assert.equal(publicRecords.length,38);
    for(const r of publicRecords){
      const url="https://ai-advokat.github.io"+r.public_record_url;
      assert.ok(sitemapXml.includes("<loc>"+url.replace(/&/g,"&amp;")+"</loc>"),url);
      assert.ok(sitemapTxt.split(/\r?\n/).includes(url),url);
    }
    assert.ok(!sitemapXml.includes("record.html?id=guide-"));
    assert.ok(!sitemapTxt.includes("record.html?id=guide-"));
  });

  test("G21 structured discoverability metadata no longer hard-codes unresolved authorship",()=>{
    assert.match(html,/CollectionPage/);
    assert.match(html,/numberOfItems/);
    assert.match(html,/og:title/);
    assert.match(recordHtml,/application\/ld\+json/);
    assert.ok(!recordHtml.includes('"author":{"@type":"Person","name":"Зоран Стојанкиќ"}'));
  });

  test("G22 every record maps to the controlled eight-category taxonomy while preserving the source label",()=>{
    assert.equal(taxonomy.taxonomy_id,"AI_ADVOKAT_GUIDE_TAXONOMY_v2");
    assert.equal(taxonomy.categories.length,8);
    const codes=new Set(taxonomy.categories.map(x=>x.code));
    for(const r of data.records){
      assert.ok(codes.has(r.category_code),r.id);
      assert.ok(r.category_original);
      assert.ok(r.category_label);
      assert.ok(r.subcategory_label);
    }
  });

  test("G23 verification labels separate source checks, specific legal checks and broader legal review",()=>{
    const choose=data.records.find(x=>x.id==="guide-choose-lawyer");
    const bpp=data.records.find(x=>x.id==="guide-free-legal-aid");
    const fzo=data.records.find(x=>x.id==="guide-39-full-word-2026");
    const zoup=data.records.find(x=>x.id==="guide-51-full-word-2026");
    assert.equal(choose.verification_level,"sources_checked");
    assert.equal(fzo.verification_level,"specific_point_checked");
    assert.equal(zoup.verification_level,"specific_provision_checked");
    assert.equal(bpp.verification_level,"base_legal_reviewed");
  });

  test("G24 explicitly identified cross-series related guides are reciprocal",()=>{
    const byId=new Map(data.records.map(x=>[x.id,x]));
    for(const r of data.records){
      for(const rel of r.related_records||[]){
        const target=byId.get(rel.target_id);
        assert.ok(target,`${r.id} -> ${rel.target_id}`);
        assert.ok((target.related_records||[]).some(x=>x.target_id===r.id),`missing reciprocal relation ${rel.target_id} -> ${r.id}`);
      }
    }
    assert.ok(byId.get("guide-02-victim-edited-2026-10-01").related_records.some(x=>x.target_id==="guide-45-full-word-2026"));
    assert.ok(byId.get("guide-21-witness").related_records.some(x=>x.target_id==="guide-44-full-word-2026"));
    assert.ok(byId.get("guide-10-traffic").related_records.some(x=>x.target_id==="guide-40-full-word-2026"));
  });

  test("G25 primary public titles use display_title while preserving the original source title",()=>{
    const batch=data.records.filter(x=>x.source_role==="primary_full_word");
    assert.ok(batch.every(x=>x.display_title && x.title));
    assert.ok(batch.every(x=>x.display_title!==x.title));
    assert.equal(data.records.find(x=>x.id==="guide-60-full-word-2026").display_title.includes("РСМ"),true);
  });

  test("G26 primary UI does not print raw guide machine IDs",()=>{
    assert.ok(!html.includes("guide-02-victim-edited-2026-10-01"));
    assert.ok(!recordHtml.includes("Record ID"));
    assert.ok(!recordHtml.includes("guide-administrative-v2"));
  });

  test("G27 numbering gaps are explicitly described without inventing a status for missing numbers",()=>{
    assert.match(data.collection.numbering_note_mk,/Неприкажаните броеви 01–37/);
    assert.match(html,/Неприкажаните броеви 01–37/);
    assert.ok(!data.collection.numbering_note_mk.includes("откажани се"));
  });

  test("G28 the legal/authorship review queue is fail-closed and does not mutate public legal labels",()=>{
    assert.equal(reviewQueue.queue_id,"AI_ADVOKAT_GUIDES_HUMAN_REVIEW_QUEUE_2026-10-04");
    assert.ok(reviewQueue.items.length>=7);
    assert.ok(reviewQueue.items.every(x=>x.public_catalog_change_in_this_pr===false));
    assert.ok(reviewQueue.items.some(x=>x.issue_id==="silence-of-administration-consistency"));
    assert.ok(reviewQueue.items.some(x=>x.issue_id==="zpp-2027-transition-crosscheck"));
    assert.ok(reviewQueue.items.some(x=>x.issue_id==="authorship-editorial-role-normalization"));
  });

  test("G29 unused author_version_checked status is not emitted by the registry or UI",()=>{
    assert.ok(!data.records.some(x=>x.status==="author_version_checked"));
    assert.ok(!html.includes("author_version_checked"));
    assert.ok(!recordHtml.includes("author_version_checked"));
  });
});
