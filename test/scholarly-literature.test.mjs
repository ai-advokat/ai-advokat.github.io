import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  flattenScholarlyRegistry,
  findScholarlyRecords,
  scholarlySearchItems,
  scholarlyPromptBlock,
  scholarlyContextItems
} from "../src/scholarly-literature.js";
import {enforceCanonicalContextProvenance} from "../src/canonical-provenance-gate.js";
import {KNOWLEDGE_CLASSES,createKnowledgeIntakeRecord} from "../src/knowledge-intake.js";
import {AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT} from "../src/ai-advokat-central-prompt.js";

const registry=JSON.parse(fs.readFileSync("data/scholarly-legal-literature-2026.json","utf8"));
const library=JSON.parse(fs.readFileSync("data/professional-library.json","utf8"));
const corpus=JSON.parse(fs.readFileSync("data/professional-legal-corpus-2026.json","utf8"));
const libraryHtml=fs.readFileSync("professional-library/index.html","utf8");
const academyHtml=fs.readFileSync("academy/index.html","utf8");
const worker=fs.readFileSync("src/index.js","utf8");

test("SCH1 MACLC registry preserves official issue identity and secondary authority",()=>{
  assert.equal(registry.journal.issn,"1409-5327");
  assert.equal(registry.journal.authority_role,"scholarly_secondary_reference");
  assert.equal(registry.journal.current_law_authority,false);
  for(const y of [2017,2022,2024,2025]){
    const issue=registry.journal.issues.find(x=>x.year===y && Array.isArray(x.articles));
    assert.ok(issue,"missing detailed issue "+y);
    assert.match(issue.source_sha256,/^[0-9a-f]{64}$/);
    assert.ok(issue.articles.length>=5);
  }
  assert.equal(registry.journal.peer_review,"fully_blinded_double_peer_review");
  assert.equal(registry.journal.rights.commercial_use,"prohibited");
});

test("SCH2 supplied duplicate legacy contents are deduplicated and unresolved, never guessed",()=>{
  const x=registry.unresolved_artifacts.find(x=>x.id==="maclc-legacy-contents-unknown-issue");
  assert.equal(x.duplicate_count,2);
  assert.equal(x.source_sha256,"d78d13cb3963e24883a416cfaaba9c7f72c31f805b03b90262cc8e0d13a2eaeb");
  assert.equal(x.source_state,"issue_identity_pending");
  assert.doesNotMatch(JSON.stringify(x),/"year"\s*:/);
});

test("SCH3 search finds doctrine and historical advocacy without promoting either to law",()=>{
  const confiscation=findScholarlyRecords(registry,"конфискација",{limit:4});
  assert.ok(confiscation.some(x=>x.year===2024 && /Конфискацијата/.test(x.title)));
  const detention=findScholarlyRecords(registry,"притвор",{limit:6});
  assert.ok(detention.some(x=>x.id==="criminal-defence-advocacy-manual-2009"));
  for(const r of [...confiscation,...detention]){
    assert.equal(r.legalAuthority,false);
    assert.equal(r.currentLawAuthority,false);
  }
});

test("SCH4 public scholarly search labels matches as secondary papers",()=>{
  const rows=scholarlySearchItems(registry,"задолжителна одбрана",{limit:5});
  assert.ok(rows.some(x=>/задолжителна одбрана/i.test(x.title)));
  assert.ok(rows.every(x=>x.type==="paper"));
  assert.ok(rows.every(x=>x.legalAuthority===false));
  assert.ok(rows.every(x=>/секундарен извор/i.test(x.snippet)));
});

test("SCH5 prompt block is explicit about metadata-only limits and primary-source verification",()=>{
  const rows=findScholarlyRecords(registry,"перење пари",{limit:2});
  const block=scholarlyPromptBlock(rows);
  assert.match(block,/SECONDARY CONTEXT ONLY/);
  assert.match(block,/DO NOT USE ALONE FOR: current law/);
  assert.match(block,/metadata_or_contents_only_not_article_fulltext/);
  assert.match(block,/do not attribute substantive conclusions/i);
});

test("SCH6 scholarly runtime records pass canonical provenance only as non-authority",()=>{
  const rows=findScholarlyRecords(registry,"екоцид",{limit:2});
  const context=scholarlyContextItems(rows);
  assert.ok(context.length>=1);
  const gate=enforceCanonicalContextProvenance(context);
  assert.equal(gate.blocked.length,0);
  assert.equal(gate.state,"verified");
  assert.ok(gate.context.every(x=>x.provenance.kind==="scholarly_literature"));
  assert.ok(gate.context.every(x=>x.provenance.legalAuthority===false));
});

test("SCH7 historical 2009 manual remains methodology with mandatory current-law remapping",()=>{
  const manual=registry.professional_practice.find(x=>x.id==="criminal-defence-advocacy-manual-2009");
  assert.equal(manual.publication_date,"2009-03");
  assert.equal(manual.current_law_mapping_required,true);
  assert.equal(manual.current_law_authority,false);
  assert.match(manual.source_sha256,/^[0-9a-f]{64}$/);
  assert.ok(manual.chapters.includes("Одбрана со притвор пред судење"));
  assert.ok(manual.chapters.includes("Правна етика и професионална одговорност"));
});

test("SCH8 knowledge intake has a dedicated fail-closed scholarly class",()=>{
  assert.equal(KNOWLEDGE_CLASSES.SCHOLARLY,"scholarly_legal_literature");
  const record=createKnowledgeIntakeRecord({
    id:"scholarly-test",
    title:"Test article",
    sourceSha256:"a".repeat(64),
    classification:KNOWLEDGE_CLASSES.SCHOLARLY,
    authorityRole:"scholarly_secondary_reference"
  });
  assert.equal(record.gates.ragEligibility,"not_authorized");
  assert.match(record.usePolicy.scholarly,/current_law_requires_primary_source/);
});

test("SCH9 library and Lex Nova Academy expose the shared scholarly layer",()=>{
  assert.equal(library.collection.scholarly_registry,"/data/scholarly-legal-literature-2026.json");
  assert.ok(library.scholarly_collections.some(x=>x.id==="maclc-macedonian-journal-criminal-law-criminology"));
  assert.match(libraryHtml,/Научно-стручна литература и професионална практика/);
  assert.match(libraryHtml,/scholarly-legal-literature-2026\.json/);
  assert.match(academyHtml,/LEX NOVA RESEARCH LIBRARY/);
  assert.match(academyHtml,/научна\/стручна литература — секундарен извор/i);
});

test("SCH10 professional corpus and bot contract preserve the authority hierarchy",()=>{
  const cohort=corpus.cohorts.find(x=>x.id==="scholarly_legal_literature_2026");
  assert.ok(cohort);
  assert.equal(cohort.count,2);
  assert.ok(corpus.content_roles.includes("scholarly_secondary_reference"));
  assert.ok(corpus.content_roles.includes("historical_professional_practice"));
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/SCHOLARLY DOCTRINE IS SECONDARY/);
  assert.match(AI_ADVOKAT_CENTRAL_SYSTEM_PROMPT,/HISTORICAL PRACTICE MATERIAL/);
  assert.match(worker,/findGovernedScholarly/);
  assert.match(worker,/<<<SCHOLARLY_CONTEXT>>>/);
  assert.match(worker,/scholarlyBundle\.context/);
});
