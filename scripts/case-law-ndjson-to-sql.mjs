#!/usr/bin/env node
// Governed case-law NDJSON -> SQL staging importer.
// Supports official public material and separately authorised licensed exports.
// It never accepts credentials/session material and never imports directly as reviewed authority.

import fs from "node:fs";

const OFFICIAL_HOST_SUFFIXES=[
  "sud.mk",
  "vrhoven.sud.mk",
  "ustavensud.mk",
  "hudoc.echr.coe.int",
  "echr.coe.int",
  "biroescp.gov.mk",
  "curia.europa.eu",
  "eur-lex.europa.eu",
  "icj-cij.org",
  "itlos.org",
  "corteidh.or.cr",
  "icc-cpi.int"
];
const LICENSED_HOST_SUFFIXES=["paragraf.mk"];
const SECRET_KEY_RE=/(password|passwd|secret|token|cookie|session|authorization|api[_-]?key|credential)/i;

function sqlString(v){
  if(v===null || v===undefined) return "NULL";
  return "'" + String(v).replaceAll("'","''") + "'";
}
function assertNoSecrets(value,path="root"){
  if(Array.isArray(value)){
    value.forEach((v,i)=>assertNoSecrets(v,path+"["+i+"]"));
    return;
  }
  if(!value || typeof value!=="object") return;
  for(const [k,v] of Object.entries(value)){
    if(SECRET_KEY_RE.test(k)) throw new Error("Credential/session field is forbidden in case-law import: "+path+"."+k);
    assertNoSecrets(v,path+"."+k);
  }
}
function requireText(value,label,max=1000){
  const text=String(value??"").normalize("NFKC").trim();
  if(!text || text.length>max) throw new Error("Invalid "+label);
  return text;
}
function optionalText(value,max=10000){
  if(value===null || value===undefined || value==="") return null;
  const text=String(value).normalize("NFKC").trim();
  if(text.length>max) throw new Error("Text field too long");
  return text;
}
function validSha(value){
  return /^[a-f0-9]{64}$/i.test(String(value||""));
}
function parseHttps(value,label){
  let url;
  try{url=new URL(String(value||""));}catch{throw new Error("Invalid "+label);}
  if(url.protocol!=="https:") throw new Error(label+" must use https");
  return url;
}
function hostAllowed(host,suffixes){
  const h=String(host||"").toLowerCase();
  return suffixes.some(s=>h===s||h.endsWith("."+s));
}
function sourceStatusFor(manifest,url){
  if(manifest.source_class==="official_public"){
    if(!hostAllowed(url.hostname,OFFICIAL_HOST_SUFFIXES)){
      throw new Error("Official-public import URL is outside the approved official host set: "+url.hostname);
    }
    return "official";
  }
  if(manifest.source_class==="licensed_secondary_export"){
    if(manifest.authorized_export!==true) throw new Error("Licensed secondary import requires authorized_export=true");
    requireText(manifest.license_or_access_basis,"license_or_access_basis",500);
    if(!hostAllowed(url.hostname,LICENSED_HOST_SUFFIXES)){
      throw new Error("Licensed-secondary URL is outside the approved licensed host set: "+url.hostname);
    }
    return "verified";
  }
  throw new Error("Unsupported source_class");
}

function governedBindingState(manifest,item,sourceUrl){
  if(manifest.source_class!=="official_public"){
    if(item.official_binding_verified===true) throw new Error("Secondary source cannot claim official binding");
    return {sourceClass:"licensed_secondary",officialBinding:0,discoveryOnly:1};
  }

  if(item.official_binding_verified!==true){
    return {sourceClass:"official_primary",officialBinding:0,discoveryOnly:1};
  }

  const evidence=item.source_binding;
  if(!evidence || typeof evidence!=="object" || Array.isArray(evidence)){
    throw new Error("Verified official binding requires source_binding evidence");
  }
  const method=requireText(evidence.verification_method,"source_binding.verification_method",120);
  if(!["direct_https_retrieval_sha256","official_remote_hash_match"].includes(method)){
    throw new Error("Unsupported official binding verification method");
  }
  if(evidence.remote_content_hash_verified!==true){
    throw new Error("Verified official binding requires remote_content_hash_verified=true");
  }
  const evidenceUrl=parseHttps(evidence.source_url,"source_binding.source_url");
  if(evidenceUrl.href!==sourceUrl.href){
    throw new Error("Verified official binding source URL mismatch");
  }
  const evidenceSha=requireText(evidence.source_sha256,"source_binding.source_sha256",64).toLowerCase();
  if(!validSha(evidenceSha) || evidenceSha!==String(item.source_sha256).toLowerCase()){
    throw new Error("Verified official binding SHA-256 mismatch");
  }
  if(!["approved","reviewed"].includes(String(evidence.human_gate_status||"").toLowerCase())){
    throw new Error("Verified official binding requires approved Human Gate");
  }
  requireText(evidence.reviewed_by,"source_binding.reviewed_by",240);
  requireText(evidence.reviewed_at,"source_binding.reviewed_at",80);
  return {sourceClass:"official_primary",officialBinding:1,discoveryOnly:0};
}


function provenanceAuditFields(item,sourceUrl){
  let remoteContentHashVerified=0;
  let bindingVerificationMethod=null;
  let bindingReviewedBy=null;
  let bindingReviewedAt=null;
  const evidence=item.source_binding;
  if(evidence!==null && evidence!==undefined){
    if(typeof evidence!=="object" || Array.isArray(evidence)) throw new Error("Invalid source_binding evidence");
    bindingVerificationMethod=requireText(evidence.verification_method,"source_binding.verification_method",120);
    if(!["direct_https_retrieval_sha256","official_remote_hash_match"].includes(bindingVerificationMethod)){
      throw new Error("Unsupported source_binding verification method");
    }
    if(evidence.remote_content_hash_verified!==true) throw new Error("source_binding remote hash must be verified");
    const evidenceUrl=parseHttps(evidence.source_url,"source_binding.source_url");
    if(evidenceUrl.href!==sourceUrl.href) throw new Error("source_binding source URL mismatch");
    const evidenceSha=String(evidence.source_sha256||"").toLowerCase();
    if(!validSha(evidenceSha)||evidenceSha!==String(item.source_sha256||"").toLowerCase()){
      throw new Error("source_binding SHA-256 mismatch");
    }
    remoteContentHashVerified=1;
    bindingReviewedBy=optionalText(evidence.reviewed_by,240);
    bindingReviewedAt=optionalText(evidence.reviewed_at,80);
  }

  let extractionMethod=null;
  let extractedTextSha256=null;
  if(item.text_extraction!==null && item.text_extraction!==undefined){
    if(typeof item.text_extraction!=="object" || Array.isArray(item.text_extraction)){
      throw new Error("Invalid text_extraction metadata");
    }
    extractionMethod=optionalText(item.text_extraction.method,120);
    extractedTextSha256=optionalText(item.text_extraction.extractedTextSha256,64);
    if(extractedTextSha256 && !validSha(extractedTextSha256)){
      throw new Error("Invalid extracted_text_sha256");
    }
  }

  return {
    remoteContentHashVerified,
    bindingVerificationMethod,
    bindingReviewedBy,
    bindingReviewedAt,
    extractionMethod,
    extractedTextSha256
  };
}

export function generateCaseLawImportSql(ndjsonText){
  const rows=String(ndjsonText||"").split(/\r?\n/).filter(Boolean).map(JSON.parse);
  rows.forEach((row,i)=>assertNoSecrets(row,"row["+i+"]"));
  const manifest=rows.find(x=>x.type==="case_law_manifest");
  const cases=rows.filter(x=>x.type==="case_law_case");
  if(!manifest) throw new Error("Missing case_law_manifest");
  if(!cases.length) throw new Error("No case_law_case records");
  if(!["official_public","licensed_secondary_export"].includes(manifest.source_class)){
    throw new Error("Unsupported source_class");
  }

  const runId=requireText(manifest.run_id,"run_id",160);
  const provider=requireText(manifest.source_provider,"source_provider",240);
  const sql=["PRAGMA foreign_keys=ON;","BEGIN IMMEDIATE;"];
  let holdingCount=0;

  for(const item of cases){
    const caseKey=requireText(item.case_key,"case_key",220);
    const title=requireText(item.case_title,"case_title",500);
    const court=requireText(item.court,"court",300);
    const jurisdiction=requireText(item.jurisdiction,"jurisdiction",32);
    const sourceUrl=parseHttps(item.source_url,"source_url");
    const sourceStatus=sourceStatusFor(manifest,sourceUrl);
    if(!validSha(item.source_sha256)) throw new Error("Invalid source_sha256 for "+caseKey);

    const caseNumber=optionalText(item.case_number,200);
    const decisionDate=optionalText(item.decision_date,40);
    const legalArea=optionalText(item.legal_area,300);
    const outcome=optionalText(item.outcome_summary,10000);
    const reasoning=optionalText(item.reasoning_summary,24000);
    const finality=optionalText(item.finality_status,80)||"unknown";
    const decisionType=optionalText(item.authority?.decision_type,120);
    const courtLevel=optionalText(item.authority?.court_level,120);
    const chamber=optionalText(item.authority?.chamber_or_section,180);
    const weight=optionalText(item.authority?.precedential_weight,80)||"unknown";
    const outcomeSide=optionalText(item.authority?.outcome_side,80)||"neutral";
    const conventionArticles=optionalText(item.authority?.convention_articles,500);
    const domesticArticles=optionalText(item.authority?.domestic_articles,500);
    const issueKeys=optionalText(item.authority?.legal_issue_keys,1500);
    const importance=optionalText(item.authority?.importance_level,80);
    const sourceProduct=optionalText(item.source_product||manifest.source_product,80);
    const sourceRecordId=optionalText(item.source_record_id,220);
    const ids=(item.external_ids && typeof item.external_ids==="object" && !Array.isArray(item.external_ids)) ? item.external_ids : {};
    const idPairs=[];
    for(const [scheme,value] of Object.entries(ids)){
      if(!["ecli","celex","echr_application_number","hudoc_item_id","domestic_case_number","constitutional_reference","paragraf_legacy_id","icj_case_number","itlos_case_number","iacthr_series_number","icc_case_number","un_document_symbol","other"].includes(scheme)){
        throw new Error("Unsupported external id scheme: "+scheme);
      }
      if(Array.isArray(value)){
        for(const v of value) idPairs.push([scheme,requireText(v,"external_id."+scheme,300)]);
      }else if(value!==null && value!==undefined && value!==""){
        idPairs.push([scheme,requireText(value,"external_id."+scheme,300)]);
      }
    }

    sql.push(
      "INSERT OR IGNORE INTO sources(title,url,source_type,issuing_body,jurisdiction,source_status,notes) VALUES ("+
      [
        sqlString(title),
        sqlString(sourceUrl.href),
        sqlString(manifest.source_class==="official_public"?"court_decision":"licensed_case_law_export"),
        sqlString(provider),
        sqlString(jurisdiction),
        sqlString(sourceStatus),
        sqlString("case_law_import "+runId+" · staged pending human review · sha256 "+String(item.source_sha256).toLowerCase())
      ].join(",")+");"
    );

    const identityWhere=
      "source_url="+sqlString(sourceUrl.href)+
      " AND COALESCE(case_number,'')="+sqlString(caseNumber||"")+
      " AND COALESCE(decision_date,'')="+sqlString(decisionDate||"");

    sql.push(
      "INSERT INTO case_law(case_title,court,case_number,jurisdiction,legal_area,decision_date,outcome_summary,reasoning_summary,source_id,source_url,finality_status,human_review_status) "+
      "SELECT "+[
        sqlString(title),sqlString(court),sqlString(caseNumber),sqlString(jurisdiction),sqlString(legalArea),
        sqlString(decisionDate),sqlString(outcome),sqlString(reasoning),
        "(SELECT id FROM sources WHERE url="+sqlString(sourceUrl.href)+")",
        sqlString(sourceUrl.href),sqlString(finality),"'pending'"
      ].join(",")+" WHERE NOT EXISTS (SELECT 1 FROM case_law WHERE "+identityWhere+");"
    );

    const caseIdExpr="(SELECT id FROM case_law WHERE "+identityWhere+" ORDER BY id LIMIT 1)";
    sql.push(
      "INSERT OR IGNORE INTO case_law_authority(case_law_id,court_level,chamber_or_section,decision_type,precedential_weight,outcome_side,convention_articles,domestic_articles,legal_issue_keys,importance_level,human_review_status) VALUES ("+
      [
        caseIdExpr,sqlString(courtLevel),sqlString(chamber),sqlString(decisionType),sqlString(weight),sqlString(outcomeSide),
        sqlString(conventionArticles),sqlString(domesticArticles),sqlString(issueKeys),sqlString(importance),"'pending'"
      ].join(",")+");"
    );

    const binding=governedBindingState(manifest,item,sourceUrl);
    const sourceClass=binding.sourceClass;
    const officialBinding=binding.officialBinding;
    const discoveryOnly=binding.discoveryOnly;
    const audit=provenanceAuditFields(item,sourceUrl);
    sql.push(
      "INSERT INTO case_law_provenance(case_law_id,source_class,source_provider,source_product,source_url,source_sha256,source_record_id,discovery_only,official_binding_verified,license_or_access_basis,imported_batch_key,human_review_status,remote_content_hash_verified,binding_verification_method,binding_reviewed_by,binding_reviewed_at,extraction_method,extracted_text_sha256) SELECT "+
      [
        caseIdExpr,sqlString(sourceClass),sqlString(provider),sqlString(sourceProduct),sqlString(sourceUrl.href),
        sqlString(String(item.source_sha256).toLowerCase()),sqlString(sourceRecordId),String(discoveryOnly),String(officialBinding),
        sqlString(manifest.license_or_access_basis||null),sqlString(runId),"'pending'",
        String(audit.remoteContentHashVerified),sqlString(audit.bindingVerificationMethod),sqlString(audit.bindingReviewedBy),
        sqlString(audit.bindingReviewedAt),sqlString(audit.extractionMethod),sqlString(audit.extractedTextSha256)
      ].join(",")+
      " WHERE NOT EXISTS (SELECT 1 FROM case_law_provenance WHERE case_law_id="+caseIdExpr+" AND source_url="+sqlString(sourceUrl.href)+" AND COALESCE(source_sha256,'')="+sqlString(String(item.source_sha256).toLowerCase())+");"
    );

    for(const [scheme,value] of idPairs){
      sql.push(
        "INSERT OR IGNORE INTO case_law_external_ids(case_law_id,id_scheme,id_value,source_url,is_primary_identifier,human_review_status) VALUES ("+
        [caseIdExpr,sqlString(scheme),sqlString(value),sqlString(sourceUrl.href),String(scheme==="ecli"||scheme==="echr_application_number"||scheme==="domestic_case_number"||scheme==="constitutional_reference"?1:0), "'pending'"].join(",")+");"
      );
    }

    for(const holding of Array.isArray(item.holdings)?item.holdings:[]){
      const proposition=requireText(holding.proposition,"holding.proposition",6000);
      const holdingType=optionalText(holding.holding_type,80)||"holding";
      const locator=optionalText(holding.source_locator,300);
      const quote=optionalText(holding.source_quote,2000);
      const language=optionalText(holding.source_language,40);
      sql.push(
        "INSERT INTO case_law_holdings(case_law_id,holding_type,proposition,source_locator,source_quote,source_language,human_review_status) "+
        "SELECT "+[caseIdExpr,sqlString(holdingType),sqlString(proposition),sqlString(locator),sqlString(quote),sqlString(language),"'pending'"].join(",")+
        " WHERE NOT EXISTS (SELECT 1 FROM case_law_holdings WHERE case_law_id="+caseIdExpr+" AND proposition="+sqlString(proposition)+");"
      );
      holdingCount++;
    }
  }

  sql.push("COMMIT;");
  return {sql:sql.join("\n")+"\n",caseCount:cases.length,holdingCount,sourceClass:manifest.source_class};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,inputPath,outPath]=process.argv;
  if(!inputPath||!outPath){
    console.error("Usage: node scripts/case-law-ndjson-to-sql.mjs <cases.ndjson> <out.sql>");
    process.exit(2);
  }
  const result=generateCaseLawImportSql(fs.readFileSync(inputPath,"utf8"));
  fs.writeFileSync(outPath,result.sql,"utf8");
  console.error(`Generated staged SQL for ${result.caseCount} cases and ${result.holdingCount} holdings -> ${outPath}`);
}
