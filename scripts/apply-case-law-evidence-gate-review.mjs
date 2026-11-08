#!/usr/bin/env node
import fs from "node:fs";
import { assessCanonicalCaseLawState } from "../src/case-law-evidence-gates.js";

export const CASE_LAW_EVIDENCE_REVIEW_VERSION="1.0.0";

function req(v,label,max=2000){
  const x=String(v??"").normalize("NFKC").trim();
  if(!x||x.length>max) throw new Error("Invalid "+label);
  return x;
}
function bool(v){return v===true;}
function mapReview(r){
  return {
    start_page:r.boundary?.start_page,
    start_y:r.boundary?.start_y_pt,
    end_page:r.boundary?.end_page,
    end_y:r.boundary?.end_y_pt,
    start_boundary_independent_signoff:bool(r.boundary?.reviewer_1_approved),
    end_boundary_independent_signoff:bool(r.boundary?.reviewer_2_approved),
    attribution_independent_signoff:bool(r.boundary?.attribution_verified),
    complete_unit_accepted:bool(r.boundary?.complete_unit_verified),
    warning_flags:r.boundary?.warning_flags||[],
    warning_disposition:r.boundary?.warning_disposition||"",

    article_text_verified:bool(r.temporal?.article_text_verified),
    historical_required:bool(r.temporal?.historical_law_required),
    historical_authentic_gazette:bool(r.temporal?.historical_authentic_gazette_verified),
    transitional_rules:bool(r.temporal?.transitional_rules_verified),
    current_applicability:bool(r.temporal?.current_applicability_verified),
    contrary_case_law:bool(r.temporal?.contrary_authority_checked),

    legal_review_status:r.legal_review?.status||"pending",
    legal_verified:["reviewed","approved"].includes(String(r.legal_review?.status||"").toLowerCase()),
    authority_review_status:r.authority_review?.status||"pending",
    holding_review_status:r.holding_review?.status||"pending",
    holding_verified:["reviewed","approved"].includes(String(r.holding_review?.status||"").toLowerCase()),

    publication_approved:bool(r.release?.publication_approved),
    human_gate_approved:bool(r.release?.human_gate_approved)
  };
}

export function applyCaseLawEvidenceGateReview(ndjsonText,review){
  const rows=String(ndjsonText||"").split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const manifest=rows.find(x=>x.type==="case_law_manifest");
  const cases=rows.filter(x=>x.type==="case_law_case");
  if(!manifest||!cases.length) throw new Error("Case-law manifest and records required");
  if(!review||review.gate_type!=="case_law_evidence_review") throw new Error("Invalid gate_type");
  if(review.decision_state!=="approved") throw new Error("Evidence review is not approved");
  const reviewedBy=req(review.reviewed_by,"reviewed_by",240);
  const reviewedAt=req(review.reviewed_at,"reviewed_at",100);
  const decisionBasis=req(review.decision_basis,"decision_basis",4000);
  if(!Array.isArray(review.records)||!review.records.length) throw new Error("Evidence review records required");

  const byKey=new Map();
  for(const r of review.records){
    const key=req(r.case_key,"record.case_key",500);
    if(byKey.has(key)) throw new Error("Duplicate review case_key");
    byKey.set(key,r);
  }

  let applied=0,productionCitable=0;
  const out=rows.map(row=>{
    if(row.type!=="case_law_case") return row;
    const r=byKey.get(String(row.case_key));
    if(!r) return row;
    const patch=mapReview(r);
    const gate=assessCanonicalCaseLawState({...row,...patch});
    if((patch.publication_approved||patch.human_gate_approved) && !gate.productionCitable){
      throw new Error("Release approval attempted before all evidence gates passed for "+row.case_key);
    }
    applied++;
    if(gate.productionCitable) productionCitable++;
    return {
      ...row,
      ...patch,
      migration_state:gate.state,
      evidence_gate:gate,
      discovery_only:!gate.productionCitable,
      production_eligible:gate.productionCitable,
      evidence_review:{
        version:CASE_LAW_EVIDENCE_REVIEW_VERSION,
        reviewed_by:reviewedBy,
        reviewed_at:reviewedAt,
        decision_basis:decisionBasis,
        reviewer_evidence_reference:req(r.reviewer_evidence_reference,"reviewer_evidence_reference",1000),
        reviewer_notes:String(r.reviewer_notes||"").normalize("NFKC").trim().slice(0,4000)
      }
    };
  });

  if(applied!==review.records.length) throw new Error("Evidence review contains case_key not present in staged batch");
  const finalRows=out.map(row=>row.type==="case_law_manifest"?{
    ...row,
    evidence_gate_review:{
      version:CASE_LAW_EVIDENCE_REVIEW_VERSION,
      reviewed_by:reviewedBy,
      reviewed_at:reviewedAt,
      decision_basis:decisionBasis,
      reviewed_records:applied,
      production_citable_records:productionCitable
    },
    discovery_only:productionCitable!==cases.length,
    production_eligible:productionCitable===cases.length,
    human_gate_required:true
  }:row);

  return {
    ndjson:finalRows.map(x=>JSON.stringify(x)).join("\n")+"\n",
    applied,
    productionCitable,
    totalCases:cases.length
  };
}

if(import.meta.url==="file://"+process.argv[1]){
  const [,,inputPath,reviewPath,outPath]=process.argv;
  if(!inputPath||!reviewPath||!outPath){
    console.error("Usage: node scripts/apply-case-law-evidence-gate-review.mjs <staged.ndjson> <review.json> <out.ndjson>");
    process.exit(2);
  }
  try{
    const result=applyCaseLawEvidenceGateReview(
      fs.readFileSync(inputPath,"utf8"),
      JSON.parse(fs.readFileSync(reviewPath,"utf8"))
    );
    fs.writeFileSync(outPath,result.ndjson,"utf8");
    console.error(JSON.stringify({ok:true,applied:result.applied,productionCitable:result.productionCitable,totalCases:result.totalCases},null,2));
  }catch(error){
    console.error(String(error?.message||error));
    process.exit(1);
  }
}
