#!/usr/bin/env node
import fs from "node:fs";

export const CASE_LAW_BINDING_REVIEW_VERSION="1.0.0";

function requiredText(value,label,max=1000){
  const text=String(value??"").normalize("NFKC").trim();
  if(!text || text.length>max) throw new Error("Invalid "+label);
  return text;
}
function validSha(value){
  return /^[a-f0-9]{64}$/i.test(String(value||""));
}
function parseHttps(value,label){
  let url;
  try{url=new URL(String(value||""));}catch{throw new Error("Invalid "+label);}
  if(url.protocol!=="https:") throw new Error(label+" must use https");
  return url.href;
}
function approvalKey(url,sha){
  return parseHttps(url,"approval.source_url")+"|"+String(sha||"").toLowerCase();
}

export function applyCaseLawSourceBindingReview(ndjsonText,approval){
  const rows=String(ndjsonText||"").split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const manifest=rows.find(x=>x.type==="case_law_manifest");
  const cases=rows.filter(x=>x.type==="case_law_case");
  if(!manifest) throw new Error("Missing case_law_manifest");
  if(!cases.length) throw new Error("No case_law_case records");
  if(manifest.source_class!=="official_public") throw new Error("Source-binding approval applies only to official_public manifests");

  if(!approval || typeof approval!=="object" || Array.isArray(approval)) throw new Error("Invalid binding approval");
  if(approval.gate_type!=="case_law_source_binding") throw new Error("Invalid gate_type");
  if(approval.decision_state!=="approved") throw new Error("Binding review is not approved");
  const reviewedBy=requiredText(approval.reviewed_by,"reviewed_by",240);
  const reviewedAt=requiredText(approval.reviewed_at,"reviewed_at",80);
  const decisionBasis=requiredText(approval.decision_basis,"decision_basis",2000);
  if(!Array.isArray(approval.records)||!approval.records.length) throw new Error("Binding approval records required");

  const approved=new Map();
  for(const rec of approval.records){
    const sourceUrl=parseHttps(rec?.source_url,"approval.source_url");
    const sourceSha=String(rec?.source_sha256||"").toLowerCase();
    if(!validSha(sourceSha)) throw new Error("Invalid approval source_sha256");
    approved.set(approvalKey(sourceUrl,sourceSha),{sourceUrl,sourceSha});
  }

  let approvedCount=0;
  const out=rows.map(row=>{
    if(row.type!=="case_law_case") return row;
    const sourceUrl=parseHttps(row.source_url,"case.source_url");
    const sourceSha=String(row.source_sha256||"").toLowerCase();
    if(!validSha(sourceSha)) throw new Error("Invalid case source_sha256");
    const key=approvalKey(sourceUrl,sourceSha);
    if(!approved.has(key)) return row;

    const evidence=row.source_binding;
    if(!evidence || typeof evidence!=="object" || Array.isArray(evidence)){
      throw new Error("Approved case lacks direct source_binding evidence");
    }
    if(!["direct_https_retrieval_sha256","official_remote_hash_match"].includes(evidence.verification_method)){
      throw new Error("Unsupported source_binding verification method");
    }
    if(evidence.remote_content_hash_verified!==true){
      throw new Error("Approved case lacks remote hash verification");
    }
    if(parseHttps(evidence.source_url,"source_binding.source_url")!==sourceUrl){
      throw new Error("Approved case source_binding URL mismatch");
    }
    if(String(evidence.source_sha256||"").toLowerCase()!==sourceSha){
      throw new Error("Approved case source_binding SHA-256 mismatch");
    }

    approvedCount++;
    return {
      ...row,
      source_binding:{
        ...evidence,
        human_gate_status:"approved",
        reviewed_by:reviewedBy,
        reviewed_at:reviewedAt,
        decision_basis:decisionBasis,
        official_binding_verified:true
      },
      discovery_only:false,
      official_binding_verified:true,
      binding_review_status:"approved"
    };
  });

  const requested=approval.records.length;
  if(approvedCount!==requested){
    throw new Error("Binding approval contains URL/SHA records not present in the staged batch");
  }

  const allCasesApproved=approvedCount===cases.length;
  const finalRows=out.map(row=>row.type==="case_law_manifest"?{
    ...row,
    discovery_only:!allCasesApproved,
    binding_required:!allCasesApproved,
    binding_review:{
      version:CASE_LAW_BINDING_REVIEW_VERSION,
      gate_type:"case_law_source_binding",
      decision_state:"approved",
      reviewed_by:reviewedBy,
      reviewed_at:reviewedAt,
      decision_basis:decisionBasis,
      approved_records:approvedCount,
      total_records:cases.length
    },
    production_eligible:false,
    human_gate_required:true
  }:row);

  return {
    ndjson:finalRows.map(x=>JSON.stringify(x)).join("\n")+"\n",
    approvedCount,
    totalCases:cases.length,
    allCasesApproved
  };
}

if(import.meta.url==="file://"+process.argv[1]){
  const [,,inputPath,approvalPath,outPath]=process.argv;
  if(!inputPath||!approvalPath||!outPath){
    console.error("Usage: node scripts/apply-case-law-source-binding-review.mjs <staged.ndjson> <approval.json> <out.ndjson>");
    process.exit(2);
  }
  try{
    const result=applyCaseLawSourceBindingReview(
      fs.readFileSync(inputPath,"utf8"),
      JSON.parse(fs.readFileSync(approvalPath,"utf8"))
    );
    fs.writeFileSync(outPath,result.ndjson,"utf8");
    console.error(`Approved source binding for ${result.approvedCount}/${result.totalCases} records -> ${outPath}`);
  }catch(error){
    console.error(String(error?.message||error));
    process.exit(1);
  }
}
