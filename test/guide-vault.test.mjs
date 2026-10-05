import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";

const require=createRequire(import.meta.url);
const Vault=require("../assets/guide-vault.js");
const registry=JSON.parse(fs.readFileSync("data/guides.json","utf8"));
const vaultSource=fs.readFileSync("assets/guide-vault.js","utf8");
const worker=fs.readFileSync("src/index.js","utf8");

test("GV1 private guide reading is explicitly authorized without opening RAG or public full-text gates",()=>{
  const a=registry.collection.ai_reading_authorization;
  assert.equal(a.decision_id,"private-guide-reading-2026-10-05");
  assert.equal(a.mode,"browser_private_vault_fingerprint_verified_transient_provider_reading");
  assert.equal(a.current_public_records_eligible,37);
  assert.equal(a.provider_store,false);
  assert.equal(a.server_persistence,false);
  assert.equal(a.public_full_text_release,false);
  assert.equal(a.rag_eligibility,false);
  assert.equal(a.production_corpus_write,false);
  assert.equal(a.legal_corpus_promotion,false);
  assert.equal(a.legal_authority,false);
});

test("GV2 current public guides are transiently readable but remain non-authoritative and non-RAG",()=>{
  const current=registry.records.filter(r=>r.catalog_public===true&&r.public_record_enabled===true&&r.source_role!=="version_history");
  assert.equal(current.length,37);
  assert.ok(current.every(r=>r.ai_reading==="authorized_private_vault_secondary_context"));
  assert.ok(current.every(r=>r.ai_legal_authority===false));
  assert.ok(registry.records.every(r=>r.ai_use==="reference_only_until_human_gate"));
  assert.equal(registry.collection.public_experience.rag_eligibility,false);
});

test("GV3 archive guide records are not loaded automatically",()=>{
  const archived=registry.records.filter(r=>r.source_role==="version_history");
  assert.equal(archived.length,2);
  assert.ok(archived.every(r=>r.ai_reading==="archive_explicit_request_only"));
  assert.ok(archived.every(r=>Vault.isAiReadable(r)===false));
});

test("GV4 file-to-guide matching requires an exact governed filename",()=>{
  const g39=registry.records.find(r=>r.id==="guide-39-full-word-2026");
  assert.equal(Vault.matchRecordForFile(g39.source_file,registry.records)?.id,g39.id);
  assert.equal(Vault.matchRecordForFile("tampered_"+g39.source_file,registry.records),null);
  assert.ok(Vault.expectedHashes(g39).has(g39.sha256));
});

test("GV5 Administrative V2 FINAL MASTER is matchable by its fingerprint-bound master filename",()=>{
  const admin=registry.records.find(r=>r.id==="guide-administrative-v2");
  const name=admin.public_master_artifact.docx_file;
  assert.equal(Vault.matchRecordForFile(name,registry.records)?.id,admin.id);
  assert.ok(Vault.expectedHashes(admin).has(admin.public_master_artifact.docx_sha256));
});

test("GV6 browser vault uses IndexedDB and SHA-256 rather than publishing guide text in registry",()=>{
  assert.match(vaultSource,/indexedDB/);
  assert.match(vaultSource,/crypto\.subtle\.digest\("SHA-256"/);
  assert.match(vaultSource,/DecompressionStream\("deflate-raw"\)/);
  assert.match(vaultSource,/Pravni_vodichi_38_63_FULL_WORD_ALL/);
  for(const r of registry.records){
    assert.equal(Object.hasOwn(r,"full_text"),false,r.id);
    assert.equal(Object.hasOwn(r,"content"),false,r.id);
  }
});

test("GV7 Worker independently recomputes the uploaded guide fingerprint before GPT use",()=>{
  assert.match(worker,/validateGuideDocuments/);
  assert.match(worker,/sha256BytesHex/);
  assert.match(worker,/guide_document_fingerprint_mismatch/);
  assert.match(worker,/guideAllowedHashes\(record\)\.has\(actualHash\)/);
  assert.match(worker,/LEGAL_AUTHORITY: false/);
  assert.match(worker,/secondary authored\/editorial practical guide/);
});
