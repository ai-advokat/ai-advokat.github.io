#!/usr/bin/env node
// Convert normalized Paragraf full-export NDJSON into rerun-resistant SQL for the
// legacy landing tables. Generated SQL is intended for staging first.
//
// This script never connects to Paragraf or a database and never promotes
// records to reviewed/approved status.

import fs from "node:fs";

const ALLOWED_VISIBILITY=new Set(["public","restricted","private"]);
const ALLOWED_ROLES=new Set([
  "primary_law","case_law","publication","commentary","template","reference",
  "commercial","account","private_case"
]);
const FORBIDDEN=/(password|passwd|secret|token|cookie|session|authorization|api[_-]?key|credential|private[_-]?key)/i;

function sqlString(value){
  if(value===null||value===undefined) return "NULL";
  return "'" + String(value).replaceAll("'","''") + "'";
}
function validSha(value){
  return /^[a-f0-9]{64}$/i.test(String(value??""));
}
function requireText(value,label,max=2000){
  const s=String(value??"").normalize("NFKC").trim();
  if(!s||s.length>max) throw new Error("Invalid "+label);
  return s;
}
function optionalText(value,max=2000000){
  if(value===null||value===undefined||value==="") return null;
  const s=String(value).normalize("NFKC").trim();
  if(s.length>max) throw new Error("Field too long");
  return s||null;
}
function assertNoSecrets(value,path="root"){
  if(Array.isArray(value)){
    value.forEach((v,i)=>assertNoSecrets(v,path+"["+i+"]"));
    return;
  }
  if(!value||typeof value!=="object") return;
  for(const [k,v] of Object.entries(value)){
    if(FORBIDDEN.test(k)) throw new Error("Forbidden credential/session field: "+path+"."+k);
    assertNoSecrets(v,path+"."+k);
  }
}

export function generateParagrafFullImportSql(ndjsonText){
  const rows=String(ndjsonText??"").split(/\r?\n/).filter(Boolean).map((line,i)=>{
    try{return JSON.parse(line);}catch{throw new Error("Invalid JSON at line "+(i+1));}
  });
  const manifest=rows.find(x=>x?.type==="ai_advokat_paragraf_normalized_manifest");
  const docs=rows.filter(x=>x?.type!=="ai_advokat_paragraf_normalized_manifest");

  if(!manifest) throw new Error("Missing ai_advokat_paragraf_normalized_manifest.");
  assertNoSecrets(manifest,"manifest");
  if(manifest.authorized_export!==true) throw new Error("Import requires authorized_export=true.");
  if(manifest.production_eligible!==false) throw new Error("Manifest must remain production_eligible=false.");
  if(manifest.human_gate_required!==true) throw new Error("Manifest requires human_gate_required=true.");
  if(Number(manifest.normalized_record_count)!==docs.length){
    throw new Error("Manifest record count does not match supplied records.");
  }
  if(!docs.length) throw new Error("No normalized records.");

  const runId=requireText(manifest.run_id,"run_id",220);
  const provider=requireText(manifest.source_provider??"Paragraf.mk","source_provider",300);
  const product=requireText(manifest.source_product??"unknown","source_product",80);
  const accessBasis=requireText(manifest.license_or_access_basis,"license_or_access_basis",1000);
  const packageSha=manifest.package_sha256??manifest.normalized_payload_sha256??null;
  if(packageSha && !validSha(packageSha)) throw new Error("Invalid manifest export SHA-256.");

  const sql=["PRAGMA foreign_keys=ON;","BEGIN IMMEDIATE;"];
  const batchNotes=`provider=${provider}; product=${product}; owner/licensed export; Human Gate required; no production eligibility implied; access_basis=${accessBasis}`;

  sql.push(
    "INSERT INTO legacy_import_batches(source_system,source_export_id,source_export_sha256,import_status,item_count,notes) "+
    "SELECT 'paragraf.mk',"+sqlString(runId)+","+sqlString(packageSha)+",'validated',"+String(docs.length)+","+sqlString(batchNotes)+
    " WHERE NOT EXISTS (SELECT 1 FROM legacy_import_batches WHERE source_export_id="+sqlString(runId)+
    " AND COALESCE(source_export_sha256,'')=COALESCE("+sqlString(packageSha)+",''));"
  );

  const batchIdExpr="(SELECT id FROM legacy_import_batches WHERE source_export_id="+sqlString(runId)+
    " AND COALESCE(source_export_sha256,'')=COALESCE("+sqlString(packageSha)+",'') ORDER BY id DESC LIMIT 1)";

  let privateCount=0;
  let eligibleCount=0;
  const roles={};

  docs.forEach((doc,index)=>{
    assertNoSecrets(doc,"record["+index+"]");
    const title=requireText(doc.title,"title",1000);
    const documentType=requireText(doc.document_type,"document_type",100);
    const role=requireText(doc.corpus_role??documentType,"corpus_role",100);
    if(!ALLOWED_ROLES.has(role)) throw new Error("Invalid corpus_role at record "+(index+1));
    const visibility=String(doc.visibility??"public");
    if(!ALLOWED_VISIBILITY.has(visibility)) throw new Error("Invalid visibility at record "+(index+1));
    if(!validSha(doc.source_sha256)) throw new Error("Invalid source_sha256 at record "+(index+1));

    const administrative=role==="account"||role==="commercial";
    const privateMaterial=visibility==="private"||role==="private_case"||administrative;
    const requestedEligible=doc.knowledge_eligible===1||doc.knowledge_eligible===true;
    const safeEligible=requestedEligible && !privateMaterial ? 1 : 0;
    const textContent=privateMaterial ? null : optionalText(doc.text_content,5000000);

    if(privateMaterial) privateCount++;
    if(safeEligible) eligibleCount++;
    roles[role]=(roles[role]??0)+1;

    const metadataRaw=optionalText(doc.metadata_json,1000000);
    if(metadataRaw){
      try{JSON.parse(metadataRaw);}catch{throw new Error("Invalid metadata_json at record "+(index+1));}
    }

    sql.push(
      "INSERT OR IGNORE INTO legacy_documents("+
      "batch_id,legacy_id,document_type,title,jurisdiction,source_url,source_path,source_sha256,mime_type,visibility,"+
      "provenance_status,human_review_status,text_content,metadata_json,knowledge_eligible,corpus_role"+
      ") VALUES ("+
      [
        batchIdExpr,
        sqlString(optionalText(doc.legacy_id,300)),
        sqlString(documentType),
        sqlString(title),
        sqlString(optionalText(doc.jurisdiction,40)??"MK"),
        sqlString(optionalText(doc.source_url,2000)),
        sqlString(optionalText(doc.source_path,2000)),
        sqlString(String(doc.source_sha256).toLowerCase()),
        sqlString(optionalText(doc.mime_type,200)),
        sqlString(visibility),
        "'pending'",
        "'pending'",
        sqlString(textContent),
        sqlString(metadataRaw),
        String(safeEligible),
        sqlString(role)
      ].join(",")+
      ");"
    );
  });

  sql.push("COMMIT;");
  return {
    sql:sql.join("\n")+"\n",
    runId,
    records:docs.length,
    privateCount,
    knowledgeEligibleCount:eligibleCount,
    roleCounts:roles
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,inputPath,outPath]=process.argv;
  if(!inputPath||!outPath){
    console.error("Usage: node scripts/paragraf-full-ndjson-to-sql.mjs <normalized.ndjson> <staging.sql>");
    process.exit(2);
  }
  const result=generateParagrafFullImportSql(fs.readFileSync(inputPath,"utf8"));
  fs.writeFileSync(outPath,result.sql,"utf8");
  console.error(JSON.stringify({
    ok:true,
    run_id:result.runId,
    records:result.records,
    private_records:result.privateCount,
    knowledge_eligible_records:result.knowledgeEligibleCount,
    roles:result.roleCounts,
    output:outPath
  },null,2));
}
