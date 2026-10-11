#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";

const FORBIDDEN = [
  /password/i,
  /passwd/i,
  /secret/i,
  /api[_-]?key/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /session[_-]?id/i,
  /authorization/i,
  /credential/i,
  /private[_-]?key/i,
  /zenodo\.org\/uploads\//i
];

const ALLOWED_VISIBILITY=new Set(["public","restricted","private"]);
const ALLOWED_ROLES=new Set([
  "primary_law","case_law","publication","commentary","template","reference",
  "commercial","account","private_case"
]);

function parseLine(line,index){
  try{return JSON.parse(line);}catch{throw new Error(`Invalid JSON at line ${index+1}`);}
}
function validSha(value){
  return /^[a-f0-9]{64}$/i.test(String(value??""));
}
function assertNoForbidden(row,lineNo){
  const serialized=JSON.stringify(row);
  if(FORBIDDEN.some(rx=>rx.test(serialized))){
    throw new Error(`Forbidden sensitive material at line ${lineNo}`);
  }
}

export function validateParagrafImport(inputText,{apply=false,staging=false}={}){
  if(apply && !staging) throw new Error("Fail closed: --apply requires --staging.");

  const lines=String(inputText??"").split(/\r?\n/).filter(Boolean);
  if(!lines.length) throw new Error("Empty import file.");

  let manifest=null;
  const records=[];

  for(let i=0;i<lines.length;i++){
    const row=parseLine(lines[i],i);
    assertNoForbidden(row,i+1);

    if(row?.type==="ai_advokat_paragraf_normalized_manifest"){
      if(manifest) throw new Error("Multiple normalized manifests are not allowed.");
      if(row.authorized_export!==true) throw new Error("Normalized manifest requires authorized_export=true.");
      if(row.production_eligible!==false) throw new Error("Normalized manifest must remain production_eligible=false.");
      if(row.human_gate_required!==true) throw new Error("Normalized manifest requires human_gate_required=true.");
      if(!row.run_id) throw new Error("Normalized manifest requires run_id.");
      if(!row.license_or_access_basis) throw new Error("Normalized manifest requires license_or_access_basis.");
      if(row.package_sha256 && !validSha(row.package_sha256)) throw new Error("Invalid package_sha256 in manifest.");
      if(row.normalized_payload_sha256 && !validSha(row.normalized_payload_sha256)) throw new Error("Invalid normalized_payload_sha256 in manifest.");
      manifest=row;
      continue;
    }

    if(!row.title || !row.document_type){
      throw new Error(`Missing title/document_type at line ${i+1}`);
    }
    if(!ALLOWED_VISIBILITY.has(row.visibility??"public")){
      throw new Error(`Invalid visibility at line ${i+1}`);
    }
    if(row.corpus_role!==undefined && !ALLOWED_ROLES.has(row.corpus_role)){
      throw new Error(`Invalid corpus_role at line ${i+1}`);
    }
    if(row.knowledge_eligible!==undefined && ![0,1,false,true].includes(row.knowledge_eligible)){
      throw new Error(`Invalid knowledge_eligible at line ${i+1}`);
    }
    if(row.source_sha256!==undefined && !validSha(row.source_sha256)){
      throw new Error(`Invalid source_sha256 at line ${i+1}`);
    }
    row.source_sha256 ??= crypto.createHash("sha256")
      .update(String(row.text_content??JSON.stringify(row)))
      .digest("hex");
    records.push(row);
  }

  if(manifest){
    if(Number(manifest.normalized_record_count)!==records.length){
      throw new Error(`Manifest normalized_record_count mismatch: expected ${manifest.normalized_record_count}, got ${records.length}`);
    }
  }

  return {
    ok:true,
    mode:apply?"staging-apply-ready":"dry-run",
    records:records.length,
    has_manifest:Boolean(manifest),
    run_id:manifest?.run_id??null,
    package_sha256:manifest?.package_sha256??null
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const args=new Set(process.argv.slice(2));
  const apply=args.has("--apply");
  const staging=args.has("--staging");
  const file=process.argv.find(x=>x.endsWith(".jsonl")||x.endsWith(".ndjson"));
  if(!file) throw new Error("Provide a .jsonl or .ndjson export file.");
  const result=validateParagrafImport(fs.readFileSync(file,"utf8"),{apply,staging});
  console.log(JSON.stringify(result,null,2));
  if(apply){
    console.log("Validated for staging. Database write is intentionally delegated to a guarded staging workflow/operator command.");
  }
}
