#!/usr/bin/env node
// Normalize an owner/licensed Paragraf / Lex / Nova / LexAI export into
// AI Advokat's governed legacy-document landing format.
//
// This tool does not connect to Paragraf, bypass access controls, or import
// directly into production. It only transforms a supplied export package.

import fs from "node:fs";
import crypto from "node:crypto";

const SECRET_KEY_RE=/(password|passwd|secret|token|cookie|session|authorization|api[_-]?key|credential|private[_-]?key)/i;
const ALLOWED_VISIBILITY=new Set(["public","restricted","private"]);
const ALLOWED_PRODUCTS=new Set(["Lex","Nova","LexAI","unknown"]);
const KNOWLEDGE_ROLES=new Set(["primary_law","case_law","publication","commentary","template","reference"]);

function text(v,max=2000000){
  if(v===null||v===undefined) return null;
  const s=String(v).normalize("NFKC").trim();
  if(s.length>max) throw new Error("Text field exceeds maximum length");
  return s||null;
}

function assertNoSecrets(value,path="root"){
  if(Array.isArray(value)){
    value.forEach((v,i)=>assertNoSecrets(v,path+"["+i+"]"));
    return;
  }
  if(!value||typeof value!=="object") return;
  for(const [k,v] of Object.entries(value)){
    if(SECRET_KEY_RE.test(k)) throw new Error("Forbidden credential/session field: "+path+"."+k);
    assertNoSecrets(v,path+"."+k);
  }
}

function sha256(value){
  return crypto.createHash("sha256").update(String(value??""),"utf8").digest("hex");
}

function canonicalType(raw){
  const s=String(raw??"reference").toLowerCase().replace(/[\s-]+/g,"_");
  if(["judgment","judgement","case","case_law","court_decision","presuda","odluka"].includes(s)) return "case_law";
  if(["law","statute","act","regulation","legislation","primary_law","zakon","propis"].includes(s)) return "primary_law";
  if(["publication","book","paper","article_publication","monograph"].includes(s)) return "publication";
  if(["commentary","comment","analysis","legal_commentary","annotation"].includes(s)) return "commentary";
  if(["template","form","contract_template","motion_template","podnesok_template"].includes(s)) return "template";
  if(["private_case","client_case","client_file","matter"].includes(s)) return "private_case";
  if(["account","user_account","profile"].includes(s)) return "account";
  if(["billing","invoice","payment","subscription"].includes(s)) return "commercial";
  return "reference";
}

function parseInput(raw){
  const trimmed=raw.trim();
  if(!trimmed) throw new Error("Empty export");
  try{
    const parsed=JSON.parse(trimmed);
    if(Array.isArray(parsed)) return {manifest:{},records:parsed};
    if(parsed&&Array.isArray(parsed.records)) return {manifest:parsed.manifest??{},records:parsed.records};
    if(parsed&&parsed.type==="paragraf_full_export_manifest") return {manifest:parsed,records:[]};
  }catch{}
  const lines=trimmed.split(/\r?\n/).filter(Boolean).map((line,i)=>{
    try{return JSON.parse(line);}catch{throw new Error("Invalid JSON at input line "+(i+1));}
  });
  const manifest=lines.find(x=>x?.type==="paragraf_full_export_manifest")??{};
  const records=lines.filter(x=>x?.type!=="paragraf_full_export_manifest");
  return {manifest,records};
}

function normalizeRecord(raw,index,manifest){
  assertNoSecrets(raw,"record["+index+"]");
  const role=canonicalType(raw.corpus_role??raw.document_type??raw.type);
  const title=text(raw.title??raw.case_title??raw.name,1000);
  if(!title) throw new Error("Missing title at record "+(index+1));

  const visibility=String(raw.visibility??(role==="private_case"||role==="account"?"private":"public"));
  if(!ALLOWED_VISIBILITY.has(visibility)) throw new Error("Invalid visibility at record "+(index+1));

  const product=String(raw.source_product??manifest.source_product??"unknown");
  if(!ALLOWED_PRODUCTS.has(product)) throw new Error("Unsupported source_product at record "+(index+1));

  const body=text(raw.text_content??raw.full_text??raw.text??raw.content);
  const legacyId=text(raw.legacy_id??raw.source_record_id??raw.id,300);
  const sourceUrl=text(raw.source_url??raw.url,2000);
  const sourcePath=text(raw.source_path??raw.file_path??raw.path,2000);
  const mimeType=text(raw.mime_type??raw.content_type,200);
  const jurisdiction=text(raw.jurisdiction??"MK",40)??"MK";

  const administrative = role==="account" || role==="commercial";
  const privateMaterial = visibility==="private" || role==="private_case" || administrative;
  const eligible = KNOWLEDGE_ROLES.has(role) && !privateMaterial && raw.knowledge_eligible!==false;

  const canonicalPayload={
    legacy_id:legacyId,
    document_type:role,
    title,
    jurisdiction,
    source_url:sourceUrl,
    source_path:sourcePath,
    mime_type:mimeType,
    visibility,
    corpus_role:role,
    knowledge_eligible:eligible?1:0,
    source_product:product,
    source_record_id:text(raw.source_record_id??legacyId,300),
    text_content:body,
    metadata_json:JSON.stringify({
      source_provider:raw.source_provider??manifest.source_provider??"Paragraf.mk",
      export_run_id:manifest.run_id??null,
      license_or_access_basis:manifest.license_or_access_basis??null,
      original_metadata:raw.metadata??raw.meta??null,
      external_ids:raw.external_ids??null,
      court:raw.court??null,
      case_number:raw.case_number??null,
      decision_date:raw.decision_date??null,
      legal_area:raw.legal_area??null,
      cited_articles:raw.cited_articles??null,
      finality_status:raw.finality_status??null
    })
  };

  canonicalPayload.source_sha256=text(raw.source_sha256,64)??sha256(body??JSON.stringify(canonicalPayload));
  if(!/^[a-f0-9]{64}$/i.test(canonicalPayload.source_sha256)) throw new Error("Invalid source_sha256 at record "+(index+1));
  return canonicalPayload;
}

export function normalizeParagrafFullExport(inputText){
  const {manifest,records}=parseInput(String(inputText??""));
  assertNoSecrets(manifest,"manifest");
  if(manifest.authorized_export!==true) throw new Error("Full migration requires manifest.authorized_export=true");
  if(!text(manifest.license_or_access_basis,1000)) throw new Error("Full migration requires manifest.license_or_access_basis");
  if(!records.length) throw new Error("No export records supplied");

  const normalized=records.map((r,i)=>normalizeRecord(r,i,manifest));
  const counts={};
  for(const r of normalized) counts[r.corpus_role]=(counts[r.corpus_role]??0)+1;

  const outManifest={
    type:"ai_advokat_paragraf_normalized_manifest",
    run_id:text(manifest.run_id,200)??("paragraf-"+new Date().toISOString()),
    source_provider:text(manifest.source_provider,300)??"Paragraf.mk",
    source_product:text(manifest.source_product,80)??"unknown",
    authorized_export:true,
    license_or_access_basis:text(manifest.license_or_access_basis,1000),
    normalized_record_count:normalized.length,
    corpus_role_counts:counts,
    production_eligible:false,
    human_gate_required:true
  };

  return {
    manifest:outManifest,
    records:normalized,
    ndjson:[JSON.stringify(outManifest),...normalized.map(x=>JSON.stringify(x))].join("\n")+"\n"
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,inputPath,outPath]=process.argv;
  if(!inputPath||!outPath){
    console.error("Usage: node scripts/normalize-paragraf-full-export.mjs <export.json|jsonl> <normalized.ndjson>");
    process.exit(2);
  }
  const result=normalizeParagrafFullExport(fs.readFileSync(inputPath,"utf8"));
  fs.writeFileSync(outPath,result.ndjson,"utf8");
  console.error(JSON.stringify({ok:true,records:result.records.length,roles:result.manifest.corpus_role_counts,out:outPath},null,2));
}
