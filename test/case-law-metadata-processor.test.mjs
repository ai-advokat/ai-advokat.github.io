import test from "node:test";
import assert from "node:assert/strict";
import {
  extractCaseLawMetadata,
  buildCaseLawMetadataBatch,
  buildGovernedCaseLawNdjson
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

test("case-law batch is bounded and Human Gate remains required",()=>{
  const b=buildCaseLawMetadataBatch([{filename:"a.txt",text:"Уставен суд. У.бр.5/2025. ОДЛУКА 04.03.2026."}]);
  assert.equal(b.recordCount,1);
  assert.equal(b.humanGateRequired,true);
  assert.throws(()=>buildCaseLawMetadataBatch(Array.from({length:501},(_,i)=>({filename:String(i),text:"одлука"}))),/batch_limit/);
});

test("governed NDJSON export remains discovery-only and production-ineligible",()=>{
  const b=buildCaseLawMetadataBatch([{filename:"a.txt",text:"Врховен суд. Рев.бр. 5/2025. ПРЕСУДА 04.03.2026."}]);
  const rows=buildGovernedCaseLawNdjson(b).trim().split("\n").map(JSON.parse);
  assert.equal(rows[0].production_eligible,false);
  assert.equal(rows[0].human_gate_required,true);
  assert.equal(rows[1].human_review_status,"pending");
});
