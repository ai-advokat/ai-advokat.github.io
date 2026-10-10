import { describe,test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const data=JSON.parse(fs.readFileSync("data/guides.json","utf8"));
const taxonomy=JSON.parse(fs.readFileSync("data/guides-taxonomy-v2.json","utf8"));
const reviewQueue=JSON.parse(fs.readFileSync("data/guides-human-review-queue.json","utf8"));
const resolutionPack=JSON.parse(fs.readFileSync("data/guides-human-gate-resolution-pack-2026-10-04.json","utf8"));
const html=fs.readFileSync("guides/index.html","utf8");
const recordHtml=fs.readFileSync("guides/record.html","utf8");
const sitemapXml=fs.readFileSync("sitemap.xml","utf8");
const sitemapTxt=fs.readFileSync("sitemap.txt","utf8");

describe("Zoran guides library governance",()=>{
  test("G1 registry contains 39 governed records including controlled Administrative V2",()=>{
    assert.equal(data.records.length,39);
    assert.equal(new Set(data.records.map(x=>x.id)).size,39);
  });

  test("G2 PDF release is authorized but no guide exposes a PDF before exact asset binding; AI corpus stays closed",()=>{
    assert.ok(data.records.every(x=>x.public_pdf===null));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
    assert.equal(data.records.find(x=>x.id==="guide-administrative-v2").public_pdf,null);
    assert.equal(data.collection.public_pdf_release_authorization.scope,"all_39_public_catalog_records_pdf_only");
    assert.equal(data.collection.public_pdf_release_authorization.publication_state,"hold_pending_full_content_reaudit");
    assert.equal(data.collection.public_pdf_release_authorization.public_docx_release,false);
    assert.equal(data.collection.public_pdf_release_authorization.rag_eligibility,false);
  });

  test("G3 Guide 02 keeps explicit version history",()=>{
    const old=data.records.find(x=>x.id==="guide-02-victim-draft-2026-09-29");
    const current=data.records.find(x=>x.id==="guide-02-victim-edited-2026-10-01");
    assert.equal(old.superseded_by,current.id);
    assert.equal(current.supersedes,old.id);
    assert.equal(old.status,"superseded_draft");
    assert.equal(old.verification_level,"archive");
  });

  test("G4 administrative version hierarchy is explicit and V2 FINAL MASTER is the active public master record",()=>{
    const short=data.records.find(x=>x.id==="guide-26-administrative-short");
    const v1=data.records.find(x=>x.id==="guide-administrative-v1");
    const v2=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.ok(short);
    assert.equal(v1.superseded_by,v2.id);
    assert.equal(v2.supersedes,v1.id);
    assert.equal(v1.source_role,"version_history");
    assert.equal(v2.source_role,"primary");
    assert.equal(v2.provenance.provenance_role,"conceptual_and_organizational_reference_only");
    assert.equal(v2.catalog_public,true);
    assert.equal(v2.public_record_enabled,true);
    assert.equal(v2.status,"final_master_catalogue_active");
    assert.equal(v2.public_slug,"upravna-postapka-v2");
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
    assert.match(html,/Јавното PDF-објавување е одобрено во принцип, но е ставено на hold/);
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

  test("G10 public catalogue activation covers exactly 39 records including V2 FINAL MASTER",()=>{
    assert.equal(data.collection.catalog_visibility.state,"public");
    assert.equal(data.collection.catalog_visibility.decision_id,"catalog-visibility-39-v2-final-master-2026-10-04");
    assert.equal(data.collection.catalog_visibility.scope,"all_39_governed_records");
    assert.equal(data.records.filter(x=>x.catalog_public===true).length,39);
    assert.equal(data.records.find(x=>x.id==="guide-administrative-v2").catalog_public,true);
    assert.match(html,/Каталогот е <strong>јавно активиран<\/strong>/);
  });

  test("G11 catalogue visibility remains separate; new PDF release gate is authorized but no unbound file URL is exposed",()=>{
    assert.equal(data.collection.catalog_visibility.public_download,false);
    assert.equal(data.collection.catalog_visibility.rag_eligibility,false);
    assert.equal(data.collection.catalog_visibility.production_corpus_write,false);
    assert.equal(data.collection.catalog_visibility.legal_corpus_promotion,false);
    assert.ok(data.records.every(x=>x.public_pdf===null));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
    assert.equal(data.collection.public_pdf_release_authorization.target_count,39);
    assert.equal(data.collection.public_pdf_release_authorization.source_fingerprint_required,true);
    assert.equal(data.collection.public_pdf_release_authorization.pdf_fingerprint_required,true);
  });

  test("G12 Administrative V2 FINAL MASTER is fingerprint-bound, PDF-release-authorized and AI gates remain fail-closed",()=>{
    const g=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.equal(g.status,"final_master_catalogue_active");
    assert.equal(g.pages,15);
    assert.equal(g.candidate_artifact.artifact_version,"V2.0 FINAL MASTER");
    assert.equal(g.candidate_artifact.docx_sha256,"de609c4526eee401a3759ff2fe22556cacded9bef87cdf675213e69e8a10ed11");
    assert.equal(g.candidate_artifact.pdf_sha256,"4c11375551a705173d7cf6d2785b5351c8dc61df76ae7ef7a7a35de14b3c721d");
    assert.equal(g.candidate_artifact.author_approval,"pending");
    assert.equal(g.candidate_artifact.public_release,"authorized_by_project_lead_2026-10-04_pending_asset_publication");
    assert.equal(g.candidate_artifact.rag_eligibility,"not_authorized");
    assert.equal(g.candidate_artifact.production_corpus_write,"not_authorized");
    assert.equal(g.public_master_artifact.artifact_version,"V2.0 FINAL MASTER");
    assert.equal(g.public_master_artifact.docx_sha256,g.candidate_artifact.docx_sha256);
    assert.equal(g.public_master_artifact.pdf_sha256,g.candidate_artifact.pdf_sha256);
    assert.equal(g.public_master_artifact.catalogue_status,"active");
    assert.equal(g.public_master_artifact.public_download,"authorized_by_project_lead_2026-10-04_pending_asset_publication");
    assert.equal(g.catalog_public,true);
    assert.equal(g.public_record_enabled,true);
    assert.equal(g.public_pdf,null);
    assert.equal(g.ai_use,"reference_only_until_human_gate");
  });

  test("G13 final catalogue control metrics remain internally consistent",()=>{
    const publicRecords=data.records.filter(x=>x.catalog_public===true);
    assert.equal(data.generated_on,"2026-10-10");
    assert.equal(publicRecords.length,39);
    assert.equal(publicRecords.filter(x=>x.source_role!=="version_history").length,37);
    assert.equal(publicRecords.filter(x=>x.source_role==="version_history").length,2);
    assert.equal(publicRecords.filter(x=>x.public_pdf!==null).length,0);
    assert.equal(data.collection.final_control.registry_total,39);
    assert.equal(data.collection.final_control.public_catalog_records,39);
    assert.equal(data.collection.final_control.public_active_or_special_records,37);
    assert.equal(data.collection.final_control.controlled_nonpublic_candidates,0);
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

  test("G16 all 39 public records have unique friendly slugs including Administrative V2",()=>{
    const publicRecords=data.records.filter(x=>x.catalog_public===true);
    assert.equal(publicRecords.length,39);
    assert.equal(new Set(publicRecords.map(x=>x.public_slug)).size,39);
    for(const r of publicRecords){
      assert.equal(r.public_record_enabled,true);
      assert.match(r.public_slug,/^[a-z0-9-]+$/);
      assert.equal(r.public_record_url,`/guides/record.html?g=${encodeURIComponent(r.public_slug)}`);
    }
    const admin=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.equal(admin.public_record_enabled,true);
    assert.equal(admin.public_record_url,"/guides/record.html?g=upravna-postapka-v2");
    assert.equal(admin.public_slug,"upravna-postapka-v2");
  });

  test("G17 public detail experience is PDF-aware while remaining fail-closed for unbound assets and AI use",()=>{
    assert.match(recordHtml,/Public PDF Human Gate/);
    assert.match(recordHtml,/Отвори цел PDF/);
    assert.match(recordHtml,/публикацијата е на hold до финално пречистување и повторна проверка/);
    assert.match(recordHtml,/catalog_public===true/);
    assert.match(recordHtml,/public_pdf/);
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

  test("G19 public experience metadata is v2.2, uses friendly slugs and records the authorized PDF release",()=>{
    assert.equal(data.collection.public_experience.scope,"exact_39_public_catalog_records");
    assert.equal(data.collection.public_experience.detail_route,"/guides/record.html?g={public_slug}");
    assert.equal(data.collection.public_experience.public_document_download,false);
    assert.equal(data.collection.public_experience.rag_eligibility,false);
    assert.equal(data.collection.public_experience.production_corpus_write,false);
    assert.equal(data.collection.public_experience.legal_corpus_promotion,false);
    assert.equal(data.collection.public_experience.version,"2.2");
    assert.equal(data.collection.public_experience.public_pdf_release_authorized,true);
    assert.ok(data.collection.public_experience.features.includes("fingerprint_bound_public_pdf_open_action"));
  });

  test("G20 all 39 friendly public URLs are discoverable in both sitemaps and old machine-id URLs are not advertised",()=>{
    const publicRecords=data.records.filter(x=>x.catalog_public===true&&x.public_record_enabled===true);
    assert.equal(publicRecords.length,39);
    for(const r of publicRecords){
      const url="https://ai-advokat.github.io"+r.public_record_url;
      assert.ok(sitemapXml.includes("<loc>"+url.replace(/&/g,"&amp;")+"</loc>"),url);
      assert.ok(sitemapTxt.split(/\r?\n/).includes(url),url);
    }
    assert.ok(sitemapXml.includes("<loc>https://ai-advokat.github.io/guides/record.html?g=upravna-postapka-v2</loc>"));
    assert.ok(sitemapTxt.split(/\r?\n/).includes("https://ai-advokat.github.io/guides/record.html?g=upravna-postapka-v2"));
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

  test("G28 approved legal/authorship queue is implemented catalogue-only and release gates stay closed",()=>{
    assert.equal(reviewQueue.queue_id,"AI_ADVOKAT_GUIDES_HUMAN_REVIEW_QUEUE_2026-10-04");
    assert.equal(reviewQueue.status,"implemented_catalogue_only");
    assert.equal(reviewQueue.resolution_pack.status,"implemented_catalogue_only");
    assert.ok(reviewQueue.items.length>=7);
    assert.ok(reviewQueue.items.every(x=>x.human_gate_status==="approved_for_implementation"));
    assert.ok(reviewQueue.items.every(x=>x.implementation_status==="implemented_catalogue_only"));
    assert.ok(reviewQueue.items.every(x=>x.implementation_catalogue_change===true));
    assert.ok(reviewQueue.items.every(x=>x.source_document_change===false));
    for(const [key,value] of Object.entries(reviewQueue.implementation)){
      if(["status","implementation_branch","implemented_on","catalogue_and_ui_changes"].includes(key)) continue;
      assert.equal(value,false,key);
    }
    assert.equal(resolutionPack.status,"implemented_catalogue_only");
  });

  test("G29 unused author_version_checked status is not emitted by the registry or UI",()=>{
    assert.ok(!data.records.some(x=>x.status==="author_version_checked"));
    assert.ok(!html.includes("author_version_checked"));
    assert.ok(!recordHtml.includes("author_version_checked"));
  });

  test("G30 U.br.148/2024 silence warning is implemented consistently on all four scoped records",()=>{
    const ids=["guide-53-full-word-2026","guide-54-full-word-2026","guide-26-administrative-short","guide-administrative-v1"];
    for(const id of ids){
      const r=data.records.find(x=>x.id===id);
      const n=(r.legal_notices||[]).find(x=>x.id==="u148-2024-silence-of-administration");
      assert.ok(n,id);
      assert.match(n.text_mk,/не применувајте фиксен дополнителен рок од 30 дена/);
      assert.match(n.text_mk,/член 26 став 2/);
      assert.equal(n.official_source.reference,"У.бр.148/2024");
    }
  });

  test("G31 ZPP 151/2026 transition warning is implemented on the approved five-guide scope",()=>{
    const ids=["guide-10-traffic","guide-40-full-word-2026","guide-59-full-word-2026","guide-05-workplace","guide-09-family"];
    for(const id of ids){
      const r=data.records.find(x=>x.id===id);
      const n=(r.legal_notices||[]).find(x=>x.id==="zpp-151-2026-transition");
      assert.ok(n,id);
      assert.equal(n.official_source.published,"2026-07-08");
      assert.equal(n.official_source.entry_into_force,"2026-07-16");
      assert.equal(n.official_source.application_from,"2027-01-18");
      assert.match(n.limitation_mk,/веќе започнати предмети/);
    }
  });

  test("G32 Guide 05 names the exact workplace-harassment statute without claiming the conflict is settled",()=>{
    const r=data.records.find(x=>x.id==="guide-05-workplace");
    assert.equal(r.legal_issue.statute,"Закон за заштита од вознемирување на работно место");
    assert.deepEqual(r.legal_issue.provisions,["чл. 18","чл. 22 ст. 4"]);
    assert.deepEqual(r.legal_issue.source_versions,["79/2013","147/2015"]);
    assert.equal(r.legal_issue.interpretation_status,"open_pending_authoritative_resolution");
    assert.match(r.status_label,/Закон за заштита од вознемирување на работно место/);
  });

  test("G33 free legal aid review is bound to the exact approved file fingerprint",()=>{
    const r=data.records.find(x=>x.id==="guide-free-legal-aid");
    assert.equal(r.legal_review_binding.status,"author_confirmed_exact_artifact");
    assert.equal(r.legal_review_binding.file,"Kako_da_pobaram_BPP_vizuelno_izdanie.pdf");
    assert.equal(r.legal_review_binding.sha256,"1ca100dca77169b851f02567924203ef00ed64b27d22dbe5c5e9823c8d89be0e");
    assert.equal(r.legal_review_binding.approved_by,"Zoran Stojankich");
    assert.equal(r.legal_review_binding.approved_at,"2026-10-04T18:24:00+02:00");
  });

  test("G34 structured attribution separates author, source provider, review target, AI support and legacy branding",()=>{
    for(const r of data.records){
      assert.ok(r.attribution_public,r.id);
      assert.ok(r.attribution_roles,r.id);
      assert.equal(r.attribution_roles.ai_assisted_editorial_support.scope,"catalogue_metadata_and_editorial_governance");
      assert.equal(r.attribution_roles.ai_assisted_editorial_support.legal_authority,false);
      assert.equal(r.attribution_roles.human_gate_approval.pack_id,"AI_ADVOKAT_GUIDES_HUMAN_GATE_RESOLUTION_PACK_2026-10-04");
    }
    const delivered=data.records.find(x=>x.id==="guide-40-full-word-2026");
    assert.equal(delivered.attribution_roles.author,null);
    assert.equal(delivered.attribution_roles.source_provider,"адвокат Зоран Стојанкиќ");
    const authored=data.records.find(x=>x.id==="guide-administrative-v1");
    assert.equal(authored.attribution_roles.author,"адвокат Зоран Стојанкиќ");
  });

  test("G35 Administrative V1 and V2 expose complete YUCOM provenance without treating it as Macedonian positive law",()=>{
    for(const id of ["guide-administrative-v1","guide-administrative-v2"]){
      const r=data.records.find(x=>x.id===id);
      assert.equal(r.provenance.reference_publisher,"Комитет правника за људска права – YUCOM");
      assert.equal(r.provenance.reference_isbn,"978-86-82222-18-7");
      assert.deepEqual(r.provenance.original_authors,["Теодора Томиќ Лазаревиќ","Драгиша Ќалиќ","Катарина Голубовиќ"]);
      assert.match(r.provenance.public_note_mk,/не е извор на македонското позитивно право/);
    }
  });

  test("G36 Paragraf.mk and Lex AI are preserved as provenance without an AI-generated inference",()=>{
    const batch=data.records.filter(x=>x.source_role==="primary_full_word");
    assert.equal(batch.length,26);
    for(const r of batch){
      assert.ok(r.attribution_roles.legacy_branding.includes("Paragraf.mk"),r.id);
      assert.ok(r.attribution_roles.legacy_branding.includes("Lex AI"),r.id);
      assert.match(r.legacy_branding_note_mk,/не се толкува како доказ дека текстот е AI-генериран/);
    }
  });


  test("G38 V2 FINAL MASTER activation is catalogue-only and every downstream release gate remains closed",()=>{
    const a=data.collection.v2_final_master_activation;
    const v2=data.records.find(x=>x.id==="guide-administrative-v2");
    assert.equal(a.decision_id,"v2-final-master-catalogue-activation-2026-10-04");
    assert.equal(a.scope,"public_catalogue_master_record_only");
    assert.equal(a.public_catalogue_record,true);
    for(const key of ["public_docx_download","public_pdf_download","rag_eligibility","ai_corpus_eligibility","production_corpus_write","legal_corpus_promotion","provider_activation"]){
      assert.equal(a[key],false,key);
    }
    assert.equal(v2.catalogue_activation.status,"active_current_master_record");
    assert.equal(v2.catalogue_activation.public_file_release,"authorized_by_project_lead_2026-10-04_pending_asset_publication");
    assert.equal(v2.catalogue_activation.ai_use,"not_authorized");
    assert.equal(v2.pdf_release_authorization.decision_id,"all-guides-public-pdf-release-2026-10-04");
    assert.equal(v2.pdf_release_authorization.publication_state,"hold_pending_full_content_reaudit");
    assert.equal(v2.public_pdf,null);
    assert.equal(v2.ai_use,"reference_only_until_human_gate");
  });

  test("G39 catalogue v2.2 UI advertises authorized PDF release without exposing unbound downloads",()=>{
    assert.match(html,/39 јавно видливи каталошки записи/);
    assert.match(html,/Каталог v2\.2 · PDF објавување на hold до финално пречистување/);
    assert.match(html,/Public PDF release е одобрен за сите 39, но физичкото објавување е на hold/);
    assert.match(recordHtml,/Активен master артефакт/);
    assert.match(recordHtml,/јавен PDF:/);
    assert.match(recordHtml,/upravna-postapka-v2|public_slug===slug/);
  });

  test("G37 public UI renders warnings, structured attribution and the new PDF-only Human Gate while AI use stays locked",()=>{
    assert.match(html,/Правно предупредување:/);
    assert.match(html,/Јавна атрибуција:/);
    assert.match(recordHtml,/Public PDF Human Gate/);
    assert.match(recordHtml,/AI-поддршката не е правен авторитет/);
    assert.match(recordHtml,/Историско\/изворно брендирање/);
    assert.match(recordHtml,/Официјален извор:/);
    assert.match(recordHtml,/PDF: HOLD · финално пречистување/);
    assert.match(recordHtml,/DOCX и трајното внесување во AI-базата остануваат посебно контролирани/);
    assert.ok(data.records.every(x=>x.public_pdf===null));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
    assert.equal(data.collection.human_gate_implementation.separate_closed_gates.public_pdf_release,false);
    assert.equal(data.collection.public_pdf_release_authorization.public_docx_release,false);
    assert.equal(data.collection.public_pdf_release_authorization.ai_corpus_eligibility,false);
    assert.equal(data.collection.public_pdf_release_authorization.rag_eligibility,false);
    assert.equal(data.collection.human_gate_implementation.separate_closed_gates.rag_eligibility,false);
    assert.equal(data.collection.human_gate_implementation.separate_closed_gates.production_corpus_write,false);
  });
  test("G40 public PDF release never exposes an unverified path",()=>{
    const active=data.records.filter(x=>x.public_pdf!==null);
    assert.equal(active.length,data.collection.final_control.public_document_downloads);
    for(const r of active){
      assert.match(r.public_pdf,/^\/guides\/pdfs\/[a-z0-9-]+\.pdf$/);
      assert.match(r.public_pdf_sha256,/^[0-9a-f]{64}$/);
      assert.equal(r.pdf_publication?.verified,true);
    }
    assert.equal(data.collection.public_pdf_release_authorization.public_docx_release,false);
    assert.equal(data.collection.public_pdf_release_authorization.production_corpus_write,false);
    assert.equal(data.collection.public_pdf_release_authorization.provider_activation,false);
  });

  test("G41 publication hold prevents binding stale candidate PDFs",()=>{
    const a=data.collection.public_pdf_release_authorization;
    assert.equal(a.publication_state,"hold_pending_full_content_reaudit");
    assert.match(a.hold_reason,/Claude\/GPT/);
    assert.equal(a.hold_evidence.source_package_38_63_sha256,"5c6aedf360b0376e1e24bdbe9df6b49e393eff8a8984a476e06ad6b05c884172");
    assert.ok(data.records.every(x=>x.public_pdf===null));
  });


  test("G42 private Guide Vault reading is authorized without changing legacy RAG/publication gates",()=>{
    const a=data.collection.ai_reading_authorization;
    assert.equal(a.decision_id,"private-guide-reading-2026-10-05");
    assert.equal(a.current_public_records_eligible,37);
    assert.equal(a.public_full_text_release,false);
    assert.equal(a.rag_eligibility,false);
    assert.equal(a.production_corpus_write,false);
    assert.equal(a.legal_corpus_promotion,false);
    const current=data.records.filter(x=>x.catalog_public===true&&x.public_record_enabled===true&&x.source_role!=="version_history");
    assert.ok(current.every(x=>x.ai_reading==="authorized_private_vault_secondary_context"));
    assert.ok(current.every(x=>x.ai_legal_authority===false));
    assert.ok(data.records.filter(x=>x.source_role==="version_history").every(x=>x.ai_reading==="archive_explicit_request_only"));
    assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
    assert.ok(data.collection.public_experience.features.includes("private_fingerprint_verified_guide_vault"));
  });

});


test("G30 current-law activation states are explicit and conservative",()=>{
  const current=data.records.filter(x=>x.source_role!=="version_history");
  const archive=data.records.filter(x=>x.source_role==="version_history");
  assert.equal(current.length,37);
  assert.equal(archive.length,2);
  assert.equal(current.filter(x=>x.activation_state==="active_verified").length,5);
  assert.equal(current.filter(x=>x.activation_state==="active_with_warning").length,3);
  assert.equal(current.filter(x=>x.activation_state==="review_required").length,29);
  assert.ok(archive.every(x=>x.activation_state==="archive"));
  assert.ok(data.records.every(x=>x.current_law_authority===false || x.source_role==="version_history"));
  assert.ok(current.every(x=>x.ai_authority_class==="secondary_guide"));
});

test("G31 only the source-checked first wave is promoted to active_verified",()=>{
  const ids=data.records.filter(x=>x.activation_state==="active_verified").map(x=>x.id).sort();
  assert.deepEqual(ids,[
    "guide-39-full-word-2026",
    "guide-51-full-word-2026",
    "guide-52-full-word-2026",
    "guide-administrative-v2",
    "guide-free-legal-aid"
  ].sort());
  const warned=new Set(data.records.filter(x=>x.activation_state==="active_with_warning").map(x=>x.id));
  for(const id of ["guide-02-victim-edited-2026-10-01","guide-05-workplace","guide-choose-lawyer"]) assert.ok(warned.has(id));
  assert.equal(data.records.find(x=>x.id==="guide-53-full-word-2026").activation_state,"review_required");
});

test("G32 current-law review metadata does not silently open PDF or production corpus gates",()=>{
  assert.equal(data.collection.current_law_review.review_id,"AI_ADVOKAT_GUIDES_CURRENT_LAW_REVIEW_2026-10-10");
  assert.equal(data.collection.current_law_review.active_verified,5);
  assert.equal(data.collection.current_law_review.active_with_warning,3);
  assert.equal(data.collection.current_law_review.review_required,29);
  assert.ok(data.records.every(x=>x.public_pdf===null));
  assert.ok(data.records.every(x=>x.ai_use==="reference_only_until_human_gate"));
  assert.ok(data.records.filter(x=>x.source_role!=="version_history").every(x=>x.current_law_authority===false));
});
