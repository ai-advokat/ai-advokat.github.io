#!/usr/bin/env node
// Paragraf full-migration parity audit.
//
// Compares normalized corpus counts and integrity invariants against the
// authoritative export manifest. Optionally cross-checks the case-law binding
// queue. This script is read-only and never writes to a database.

import fs from "node:fs";

const ROLES=[
  "primary_law","case_law","publication","commentary","template","reference",
  "private_case","account","commercial"
];

function parseNdjson(text,label){
  return String(text??"").split(/\r?\n/).filter(Boolean).map((line,i)=>{
    try{return JSON.parse(line);}catch{throw new Error(`${label}: invalid JSON at line ${i+1}`);}
  });
}
function countByRole(records){
  const counts=Object.fromEntries(ROLES.map(r=>[r,0]));
  for(const r of records){
    const role=r.corpus_role??r.document_type??"reference";
    counts[role]=(counts[role]??0)+1;
  }
  return counts;
}
function duplicates(values){
  const seen=new Set(),dups=new Set();
  for(const v of values){
    if(v===null||v===undefined||v==="") continue;
    const key=String(v);
    if(seen.has(key)) dups.add(key);
    else seen.add(key);
  }
  return [...dups].sort();
}

export function auditParagrafParity(normalizedText,bindingQueueText=null){
  const rows=parseNdjson(normalizedText,"normalized");
  const manifest=rows.find(x=>x?.type==="ai_advokat_paragraf_normalized_manifest");
  const records=rows.filter(x=>x?.type!=="ai_advokat_paragraf_normalized_manifest");
  if(!manifest) throw new Error("Missing normalized manifest.");

  const issues=[];
  const warnings=[];
  const actualCounts=countByRole(records);
  const expected=manifest.expected_counts&&typeof manifest.expected_counts==="object"
    ? manifest.expected_counts
    : null;

  if(Number(manifest.normalized_record_count)!==records.length){
    issues.push({
      code:"MANIFEST_RECORD_COUNT_MISMATCH",
      expected:Number(manifest.normalized_record_count),
      actual:records.length
    });
  }

  if(expected){
    for(const [role,value] of Object.entries(expected)){
      if(value===null||value===undefined||value==="") continue;
      const n=Number(value);
      if(!Number.isInteger(n)||n<0){
        issues.push({code:"INVALID_EXPECTED_COUNT",role,value});
        continue;
      }
      const actual=actualCounts[role]??0;
      if(actual!==n) issues.push({code:"ROLE_COUNT_MISMATCH",role,expected:n,actual});
    }
  }else{
    warnings.push({code:"EXPECTED_COUNTS_NOT_SUPPLIED"});
  }

  const missingHashes=records.filter(r=>!/^[a-f0-9]{64}$/i.test(String(r.source_sha256??""))).length;
  if(missingHashes) issues.push({code:"INVALID_OR_MISSING_SOURCE_SHA256",count:missingHashes});

  const duplicateLegacyIds=duplicates(records.map(r=>r.legacy_id));
  if(duplicateLegacyIds.length) warnings.push({
    code:"DUPLICATE_LEGACY_ID",
    count:duplicateLegacyIds.length,
    sample:duplicateLegacyIds.slice(0,20)
  });

  const duplicateHashes=duplicates(records.map(r=>r.source_sha256));
  if(duplicateHashes.length) warnings.push({
    code:"DUPLICATE_SOURCE_SHA256",
    count:duplicateHashes.length,
    sample:duplicateHashes.slice(0,20)
  });

  const privateEligibilityViolations=records.filter(r=>{
    const role=r.corpus_role??r.document_type;
    const privateLike=r.visibility==="private"||role==="private_case"||role==="account"||role==="commercial";
    return privateLike&&(r.knowledge_eligible===1||r.knowledge_eligible===true);
  });
  if(privateEligibilityViolations.length){
    issues.push({code:"PRIVATE_KNOWLEDGE_ELIGIBILITY_VIOLATION",count:privateEligibilityViolations.length});
  }

  const caseRecords=records.filter(r=>(r.corpus_role??r.document_type)==="case_law");
  let bindingQueue=null;
  if(bindingQueueText!==null&&bindingQueueText!==undefined){
    const qrows=parseNdjson(bindingQueueText,"binding queue");
    const qmanifest=qrows.find(x=>x?.type==="official_binding_queue_manifest");
    const entries=qrows.filter(x=>x?.type==="official_binding_candidate");
    if(!qmanifest) issues.push({code:"BINDING_QUEUE_MANIFEST_MISSING"});
    if(qmanifest&&Number(qmanifest.record_count)!==entries.length){
      issues.push({code:"BINDING_QUEUE_MANIFEST_COUNT_MISMATCH",expected:Number(qmanifest.record_count),actual:entries.length});
    }
    if(entries.length!==caseRecords.length){
      issues.push({code:"CASE_LAW_BINDING_QUEUE_COUNT_MISMATCH",case_law_records:caseRecords.length,binding_candidates:entries.length});
    }
    const nonPending=entries.filter(e=>e.binding_status!=="pending"||e.human_review_status!=="pending").length;
    if(nonPending) issues.push({code:"BINDING_QUEUE_NOT_FAIL_CLOSED",count:nonPending});
    bindingQueue={
      candidates:entries.length,
      identifier_ready:entries.filter(e=>e.lookup_readiness==="identifier_ready").length,
      metadata_search_required:entries.filter(e=>e.lookup_readiness==="metadata_search_required").length
    };
  }else if(caseRecords.length){
    warnings.push({code:"BINDING_QUEUE_NOT_SUPPLIED",case_law_records:caseRecords.length});
  }

  const report={
    schema_version:"1.0",
    run_id:manifest.run_id??null,
    source_provider:manifest.source_provider??null,
    source_product:manifest.source_product??null,
    normalized_record_count:records.length,
    corpus_role_counts:actualCounts,
    knowledge_eligible_count:records.filter(r=>r.knowledge_eligible===1||r.knowledge_eligible===true).length,
    private_or_administrative_count:records.filter(r=>{
      const role=r.corpus_role??r.document_type;
      return r.visibility==="private"||role==="private_case"||role==="account"||role==="commercial";
    }).length,
    case_law_count:caseRecords.length,
    binding_queue:bindingQueue,
    duplicate_legacy_id_count:duplicateLegacyIds.length,
    duplicate_source_sha256_count:duplicateHashes.length,
    issues,
    warnings,
    pass:issues.length===0,
    human_gate_required:true,
    production_promotion_authorized:false
  };
  return report;
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,normalizedPath,bindingQueuePath,outPath]=process.argv;
  if(!normalizedPath){
    console.error("Usage: node scripts/paragraf-parity-audit.mjs <normalized.ndjson> [binding-queue.ndjson] [report.json]");
    process.exit(2);
  }
  const normalized=fs.readFileSync(normalizedPath,"utf8");
  const binding=bindingQueuePath&&bindingQueuePath!=="-"?fs.readFileSync(bindingQueuePath,"utf8"):null;
  const report=auditParagrafParity(normalized,binding);
  const json=JSON.stringify(report,null,2)+"\n";
  if(outPath) fs.writeFileSync(outPath,json,"utf8");
  else process.stdout.write(json);
  if(!report.pass) process.exitCode=1;
}
