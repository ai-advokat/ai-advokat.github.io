import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker=fs.readFileSync("src/index.js","utf8");
const runtime=fs.readFileSync("src/case-intelligence-runtime.js","utf8");
const domain=fs.readFileSync("src/case-intelligence.js","utf8");

test("CIR1 document extraction is private, bounded and store-false",()=>{
  assert.match(worker,/CASE_INTELLIGENCE_PROVIDER_MAX_BYTES/);
  assert.match(worker,/case_document_partitioning_required/);
  assert.match(worker,/runPrivateCaseDocumentExtraction/);
  const start=worker.indexOf("async function runPrivateCaseDocumentExtraction");
  const end=worker.indexOf("async function validateGuideDocuments",start);
  const block=worker.slice(start,end);
  assert.match(block,/store:false/);
  assert.doesNotMatch(block,/web_search/);
  assert.match(block,/input_file/);
  assert.match(block,/input_image/);
  assert.match(block,/CASE_DOCUMENT_EXTRACTION_SCHEMA/);
});

test("CIR2 extraction artifacts are private R2 derived records and never public corpus",()=>{
  const start=worker.indexOf('if(tail.startsWith("documents/") && tail.endsWith("/extract"))');
  const end=worker.indexOf('if(tail.startsWith("documents/"))',start+20);
  assert.ok(start>0 && end>start);
  const block=worker.slice(start,end);
  assert.match(block,/case-derived\/v1\/\$\{caseId\}\/\$\{documentId\}\/extraction\.json/);
  assert.match(block,/private_case_derived_artifact_not_public_corpus/);
  assert.match(block,/professional_use_locked=1/);
  assert.match(block,/analysis_requested/);
  assert.doesNotMatch(block,/INSERT INTO legal_articles|INSERT INTO article_chunks|INSERT INTO legal_instruments/i);
});

test("CIR3 whole-case analysis requires every active document to be uploaded and extracted",()=>{
  const start=worker.indexOf('if(tail==="intelligence/analyze")');
  const end=worker.indexOf('if(tail==="intelligence/draft")',start);
  assert.ok(start>0 && end>start);
  const block=worker.slice(start,end);
  assert.match(block,/storage_state!=="uploaded"/);
  assert.match(block,/extraction_state!=="complete"/);
  assert.match(block,/case_intelligence_extraction_incomplete/);
  assert.match(block,/case_extraction_artifact_missing/);
  assert.match(block,/PRIVATE_CASE_DOCUMENT/);
  assert.match(block,/FACTUAL_EVIDENCE_ONLY_NOT_LEGAL_AUTHORITY/);
  assert.match(block,/DO_NOT_TREAT_AS_PUBLIC_CORPUS/);
  assert.match(block,/governedArticleContext/);
  assert.match(block,/governedCaseLawContext/);
  assert.match(block,/governedGazetteChunkContext/);
  assert.match(block,/webSearchEnabled:false/);
  assert.match(block,/WORKING ANALYSIS — HUMAN GATE REQUIRED/);
  assert.match(block,/autonomousFiling:false/);
});

test("CIR4 drafting stays working-copy only and verified-law bounded",()=>{
  const start=worker.indexOf('if(tail==="intelligence/draft")');
  const end=worker.indexOf('if(tail==="casepilot")',start);
  assert.ok(start>0 && end>start);
  const block=worker.slice(start,end);
  assert.match(block,/case_intelligence_analysis_required/);
  assert.match(block,/source-backed факти/);
  assert.match(block,/VERIFY BEFORE FILING/);
  assert.match(block,/adverse authority/);
  assert.match(block,/WORKING DRAFT — HUMAN GATE REQUIRED/);
  assert.match(block,/runLegalPostflightVerifier/);
  assert.match(block,/filing:"forbidden"/);
  assert.match(block,/signature:"forbidden"/);
  assert.match(block,/externalTransmission:"forbidden"/);
  assert.match(block,/professional_use_locked=1/);
});

test("CIR5 document mutation invalidates derived analysis",()=>{
  assert.match(worker,/caseObjectDelete\(env,\x60case-derived\/v1\/\$\{caseId\}\/analysis\/latest\.md\x60\)/);
  assert.match(worker,/caseObjectDelete\(env,\x60case-derived\/v1\/\$\{caseId\}\/\$\{documentId\}\/extraction\.json\x60\)/);
});

test("CIR6 extraction contract forbids unsupported factual completion",()=>{
  assert.match(runtime,/Extract only what is supported by the attached private document/);
  assert.match(runtime,/Do not use model memory to add missing facts/);
  assert.match(runtime,/Do not infer ownership, validity, legal effect, kinship, authenticity or enforceability/);
  assert.match(runtime,/fact_locator_required/);
  assert.match(domain,/accuracyClaimProhibited:true/);
  assert.match(domain,/syntheticAccuracyPercentage:null/);
});


test("CIR7 CasePilot has a private Workers AI fallback for extraction synthesis and drafting",()=>{
  assert.match(worker,/runPrivateWorkersAIDocumentExtraction/);
  assert.match(worker,/runPrivateWorkersAISynthesis/);
  assert.match(worker,/workers_ai_private_case/);
  assert.match(worker,/freeWorkersAIMarkdownConfigured/);
  assert.match(worker,/freeWorkersAIConfigured/);
  assert.match(worker,/CASE-SCOPED CONTEXT/);
  assert.match(worker,/CURRENT-LAW VERIFICATION REQUIRED/);
  assert.match(worker,/paidCaseProviderReady/);
  assert.match(worker,/freeCaseProviderReady/);
  assert.doesNotMatch(
    worker.slice(worker.indexOf("async function runPrivateWorkersAISynthesis"),worker.indexOf("async function runPrivateCaseDocumentExtraction")),
    /web_search|webSearchEnabled:true/
  );
});


test("CIR8 private analysis/draft keep canonical Macedonian QA while only jurisdiction substitution is a hard block",()=>{
  assert.match(worker,/function canonicalMacedonianFinalRelease/);
  const privateHelper=worker.slice(worker.indexOf("async function runPrivateWorkersAISynthesis"),worker.indexOf("function parseModelJsonObject"));
  assert.match(privateHelper,/const startedAt=Date\.now\(\)/);
  assert.match(privateHelper,/canonicalMacedonianFinalRelease\(finalText,task\)/);
  assert.match(privateHelper,/foreign_jurisdiction_substitution_blocked/);

  const analysis=worker.slice(worker.indexOf('if\(tail==="intelligence\/analyze"\)'),worker.indexOf('if\(tail==="intelligence\/draft"\)'));
  assert.match(analysis,/canonicalMacedonianFinalRelease\(analysisText,task\)/);
  assert.match(analysis,/foreign_jurisdiction_substitution_blocked/);

  const draft=worker.slice(worker.indexOf('if\(tail==="intelligence\/draft"\)'),worker.indexOf('if\(tail==="casepilot"\)'));
  assert.match(draft,/canonicalMacedonianFinalRelease\(draftText,task\)/);
  assert.match(draft,/foreign_jurisdiction_substitution_blocked/);
});
