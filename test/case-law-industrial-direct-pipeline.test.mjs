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
  assert.match(workflow,/rights-review/);
  assert.doesNotMatch(workflow,/permissions:\s*\n\s*contents:\s*write/);
});

test("standards note locks out fabricated ECLI and binary Word guessing",()=>{
  const doc=fs.readFileSync("architecture/CASE_LAW_METADATA_STANDARD_MK_ECLI_HUDOC.md","utf8");
  assert.match(doc,/generatedOfficialIdentifier=false/);
  assert.match(doc,/dcterms:isVersionOf/);
  assert.match(doc,/file\.text\(\)/);
  assert.match(doc,/needs_text_extraction/);
});
