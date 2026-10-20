import test from "node:test";
import assert from "node:assert/strict";
import {
  extractCaseLawMetadata,
  buildCaseLawMetadataBatch,
  buildGovernedCaseLawNdjson,
  normalizeDecisionDateCandidate
} from "../src/case-law-metadata-processor.js";

test("case-law metadata processor never fabricates domestic ECLI",()=>{
  const r=extractCaseLawMetadata("Основен суд Скопје. К.бр. 101/2026. ПРЕСУДА. 10.10.2026. член 123 од Кривичниот законик. Обвинетиот.");
  assert.equal(r.ecli.primary,null);
  assert.equal(r.ecli.generated,null);
  assert.equal(r.generatedOfficialIdentifier,false);
});

test("case-law metadata processor preserves literal ECHR ECLI and HUDOC-compatible metadata",()=>{
  const r=extractCaseLawMetadata("ECLI:CE:ECHR:2026:0512JUD003795421. Application no. 37954/21. Art. 6 § 1 of the Convention.");
  assert.equal(r.ecli.primary,"ECLI:CE:ECHR:2026:0512JUD003795421");
  assert.deepEqual(r.echr.applicationNumbers,["37954/21"]);
  assert.ok(r.echr.conventionArticles.includes("6 § 1"));
});

test("case-law metadata processor extracts Macedonian case identity candidates",()=>{
  const r=extractCaseLawMetadata("АПЕЛАЦИОНЕН СУД СКОПЈЕ\nК.бр. 55/2025\nОДЛУКА\n10.09.2026\nСогласно член 12 од Законот за судовите.");
  assert.match(r.court,/АПЕЛАЦИОНЕН СУД СКОПЈЕ/i);
  assert.equal(r.caseNumber,"К.бр. 55/2025");
  assert.equal(r.decisionType,"ОДЛУКА");
  assert.equal(r.decisionDate,"10.09.2026");
  assert.equal(r.decisionDateIso,"2026-09-10");
  assert.equal(r.recordKind,"decision");
});

test("date normalization rejects impossible dates",()=>{
  assert.equal(normalizeDecisionDateCandidate("31.02.2026"),null);
  assert.equal(normalizeDecisionDateCandidate("4.3.2026"),"2026-03-04");
});

test("case-law metadata processor flags privacy review without automatic redaction",()=>{
  const r=extractCaseLawMetadata("Сведок: А.А. ЕМБГ 0101999450001. Адреса: Скопје.");
  assert.equal(r.privacyReview.required,true);
  assert.equal(r.privacyReview.automaticRedactionPerformed,false);
  assert.ok(r.privacyReview.flags.includes("possible_personal_id_13_digits"));
});

test("case-law completeness is deterministic and not confidence",()=>{
  const r=extractCaseLawMetadata("ОСНОВЕН СУД СКОПЈЕ\nК.бр. 101/2026\nПРЕСУДА\n10.10.2026\nОбвинетиот. член 123 од Кривичниот законик.");
  assert.equal(r.completeness.statisticalConfidence,null);
  assert.equal(typeof r.completeness.score,"number");
});

test("source fingerprint is validated but does not self-verify official binding",()=>{
  const hash="a".repeat(64);
  const r=extractCaseLawMetadata("Врховен суд. Рев.бр. 5/2025. ПРЕСУДА 04.03.2026.",{
    sourceUrl:"https://www.vrhoven.sud.mk/example",
    sourceClass:"official_public",
    sourceSha256:hash,
    sourceHashBasis:"original_file_bytes_sha256"
  });
  assert.equal(r.sourceIdentity.sourceSha256,hash);
  assert.equal(r.sourceBinding.stagingCandidate,true);
  assert.equal(r.sourceBinding.officialBindingVerified,false);
  assert.equal(r.authorityClass,"unverified_or_secondary");
  assert.throws(()=>extractCaseLawMetadata("одлука",{sourceSha256:"bad"}),/source_sha256_invalid/);
});

test("case-law batch is bounded, hash-deduplicated and Human Gate remains required",()=>{
  const hash="b".repeat(64);
  const b=buildCaseLawMetadataBatch([
    {filename:"a.txt",text:"Уставен суд. У.бр.5/2025. ОДЛУКА 04.03.2026.",sourceSha256:hash},
    {filename:"b.txt",text:"Уставен суд. У.бр.5/2025. ОДЛУКА 04.03.2026.",sourceSha256:hash}
  ]);
  assert.equal(b.recordCount,2);
  assert.equal(b.duplicateHashCount,1);
  assert.equal(b.records[1].duplicateReview.status,"duplicate_content_hash");
  assert.equal(b.records[1].duplicateReview.duplicateOfIndex,0);
  assert.equal(b.humanGateRequired,true);
  assert.throws(()=>buildCaseLawMetadataBatch(Array.from({length:501},(_,i)=>({filename:String(i),text:"одлука"}))),/batch_limit/);
});

test("governed NDJSON export remains discovery-only and production-ineligible",()=>{
  const hash="c".repeat(64);
  const b=buildCaseLawMetadataBatch([{filename:"a.txt",text:"Врховен суд. Рев.бр. 5/2025. ПРЕСУДА 04.03.2026.",sourceSha256:hash}]);
  const rows=buildGovernedCaseLawNdjson(b).trim().split("\n").map(JSON.parse);
  assert.equal(rows[0].source_class,"local_unverified");
  assert.equal(rows[0].production_eligible,false);
  assert.equal(rows[0].human_gate_required,true);
  assert.equal(rows[1].source_sha256,hash);
  assert.equal(rows[1].official_binding_verified,false);
  assert.equal(rows[1].human_review_status,"pending");
  assert.match(rows[1].case_title,/Рев\.бр\. 5\/2025/);
});


test("extended metadata keeps ECLI metadata profile separate from ECLI assignment",()=>{
  const r=extractCaseLawMetadata(
    "ВРХОВЕН СУД НА РЕПУБЛИКА СЕВЕРНА МАКЕДОНИЈА\nРев.бр. 44/2026\nПРЕСУДА\nод 05.10.2026\nсудија-известител Ана Стојановска\nчлен 8 од Законот за судовите.",
    {sourceUrl:"https://www.vrhoven.sud.mk/decision?id=44"}
  );
  assert.equal(r.ecli.primary,null);
  assert.equal(r.standards.ecliMetadata["dcterms:isVersionOf"],null);
  assert.equal(r.standards.ecliMetadata["dcterms:creator"],r.court);
  assert.equal(r.standards.ecliMetadata["dcterms:coverage"],"MK");
  assert.equal(r.standards.ecliMetadata["dcterms:date"],"2026-10-05");
  assert.equal(r.standards.ecliMetadata.generatedEcli,false);
  assert.ok(r.judicialActors.judges.includes("Ана Стојановска"));
});

test("extended metadata captures review-only parties remedies and financial fields",()=>{
  const r=extractCaseLawMetadata(
    "Основен суд Скопје\nП.бр. 12/2026\nПРЕСУДА\n10.10.2026\nТужител: Петар Петров\nТужен: Друштво АД\nВредност на спорот: 120.000 денари\nПарнични трошоци: 15.000 денари\nПротив пресудата е дозволена жалба во рок од 15 дена."
  );
  assert.ok(r.partyRoles.plaintiff.some(x=>x.includes("Петар")));
  assert.ok(r.partyRoles.defendant.some(x=>x.includes("Друштво")));
  assert.equal(r.partyRoles.publicationUse,"review_only");
  assert.match(r.remedyAndFinancial.disputeValue,/120\.000/);
  assert.match(r.remedyAndFinancial.costs,/15\.000/);
  assert.equal(r.remedyAndFinancial.appealDeadline,"15 дена");
  assert.ok(r.privacyReview.flags.includes("party_identity_publication_review_required"));
  assert.equal(r.publicationReview.ruleProfile,"MK_CASE_PUBLICATION_ART9_POST_U5_2025");
});

test("literal ECLI remains the only ECLI assigned into the Dublin Core profile",()=>{
  const ecli="ECLI:CE:ECHR:2026:0512JUD003795421";
  const r=extractCaseLawMetadata(ecli+" Application no. 37954/21. Art. 6 § 1 of the Convention.");
  assert.equal(r.ecli.primary,ecli);
  assert.equal(r.standards.ecliMetadata["dcterms:isVersionOf"],ecli);
  assert.equal(r.standards.ecliMetadata.officialEcliAssigned,true);
  assert.equal(r.generatedOfficialIdentifier,false);
});


test("governed NDJSON can preserve official-public source class without promoting authority",()=>{
  const hash="d".repeat(64);
  const b=buildCaseLawMetadataBatch([{
    filename:"supreme.html",
    text:"Врховен суд. Рев.бр. 8/2026. ПРЕСУДА 05.10.2026.",
    sourceUrl:"https://www.vrhoven.sud.mk/decision?id=8",
    sourceClass:"official_public",
    sourceSha256:hash
  }]);
  const rows=buildGovernedCaseLawNdjson(b,{sourceClass:"official_public"}).trim().split("\n").map(JSON.parse);
  assert.equal(rows[0].source_class,"official_public");
  assert.equal(rows[1].source_class,"official_public");
  assert.equal(rows[0].production_eligible,false);
  assert.equal(rows[1].official_binding_verified,false);
});
