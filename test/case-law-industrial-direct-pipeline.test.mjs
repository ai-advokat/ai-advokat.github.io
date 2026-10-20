import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("case-law workbench exposes the extended governed metadata profile",()=>{
  const page=fs.readFileSync("case-law-metadata.html","utf8");
  const client=fs.readFileSync("assets/case-law-metadata.js","utf8");
  assert.match(page,/ECLI\/Dublin Core/);
  assert.match(page,/HUDOC/);
  assert.match(page,/Судија\/совет/);
  assert.match(client,/judicialActors/);
  assert.match(client,/remedyAndFinancial/);
  assert.match(client,/dcterms:creator/);
});

test("direct Supreme Court workflow is bounded and Human Gate protected",()=>{
  const workflow=fs.readFileSync(".github/workflows/supreme-case-law-intake.yml","utf8");
  assert.match(workflow,/options:\s*\n\s*- "50"\s*\n\s*- "100"/);
  assert.match(workflow,/approved_for_bounded_automated_retrieval/);
  assert.match(workflow,/collect-and-stage-mk-supreme-decisions\.mjs/);
  assert.match(workflow,/capture-mk-supreme-rights-evidence\.mjs/);
  assert.match(workflow,/policy-evidence/);
  assert.match(workflow,/poppler-utils/);
  assert.match(workflow,/antiword/);
  assert.match(workflow,/unrtf/);
  assert.match(workflow,/approved_for_bounded_automated_retrieval/);
  assert.match(workflow,/rights-review/);
  assert.doesNotMatch(workflow,/permissions:\s*\n\s*contents:\s*write/);
});

test("standards note locks out fabricated ECLI and binary guessing while documenting real extraction",()=>{
  const doc=fs.readFileSync("architecture/CASE_LAW_METADATA_STANDARD_MK_ECLI_HUDOC.md","utf8");
  assert.match(doc,/generatedOfficialIdentifier=false/);
  assert.match(doc,/dcterms:isVersionOf/);
  assert.match(doc,/file\.text\(\)/);
  assert.match(doc,/pdftotext/);
  assert.match(doc,/ZIP\/XML/);
  assert.match(doc,/needs_text_extraction/);
});


test("production hardening requires explicit source-binding Human Gate",()=>{
  const importer=fs.readFileSync("scripts/case-law-ndjson-to-sql.mjs","utf8");
  const reviewer=fs.readFileSync("scripts/apply-case-law-source-binding-review.mjs","utf8");
  const runtime=fs.readFileSync("src/index.js","utf8");
  const bridge=fs.readFileSync("src/casepilot-case-law-bridge.js","utf8");
  assert.match(importer,/remote_content_hash_verified/);
  assert.match(importer,/approved Human Gate/);
  assert.match(reviewer,/case_law_source_binding/);
  assert.match(reviewer,/source_sha256/);
  assert.match(runtime,/case_law_provenance/);
  assert.match(runtime,/official_binding_verified=1/);
  assert.match(runtime,/discovery_only=0/);
  assert.match(bridge,/official_binding_verified/);
});

test("rights evidence capture is evidence-only and cannot auto-approve",()=>{
  const source=fs.readFileSync("scripts/capture-mk-supreme-rights-evidence.mjs","utf8");
  assert.match(source,/robots\.txt/);
  assert.match(source,/automatic_rights_approval:false/);
  assert.match(source,/human_review_required:true/);
  assert.doesNotMatch(source,/approved_for_bounded_automated_retrieval\s*:\s*true/);
});


test("case-law audit migration persists binding and extraction evidence",()=>{
  const migration=fs.readFileSync("migrations/0049_case_law_binding_extraction_audit.sql","utf8");
  for(const column of [
    "remote_content_hash_verified",
    "binding_verification_method",
    "binding_reviewed_by",
    "binding_reviewed_at",
    "extraction_method",
    "extracted_text_sha256"
  ]){
    assert.match(migration,new RegExp(column));
  }
  assert.match(migration,/schema_migrations/);
  assert.match(migration,/'49'/);
});
