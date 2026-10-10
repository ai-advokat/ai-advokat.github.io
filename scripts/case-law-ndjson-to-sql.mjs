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
  "curia.europa.eu",
  "eur-lex.europa.eu"
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
      if(!["ecli","celex","echr_application_number","hudoc_item_id","domestic_case_number","constitutional_reference","paragraf_legacy_id","other"].includes(scheme)){
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

    const sourceClass=manifest.source_class==="official_public" ? "official_primary" : "licensed_secondary";
    const officialBinding=manifest.source_class==="official_public" ? 1 : 0;
    const discoveryOnly=manifest.source_class==="official_public" ? 0 : 1;
    sql.push(
      "INSERT INTO case_law_provenance(case_law_id,source_class,source_provider,source_product,source_url,source_sha256,source_record_id,discovery_only,official_binding_verified,license_or_access_basis,imported_batch_key,human_review_status) SELECT "+
      [
        caseIdExpr,sqlString(sourceClass),sqlString(provider),sqlString(sourceProduct),sqlString(sourceUrl.href),
        sqlString(String(item.source_sha256).toLowerCase()),sqlString(sourceRecordId),String(discoveryOnly),String(officialBinding),
        sqlString(manifest.license_or_access_basis||null),sqlString(runId),"'pending'"
      ].join(",")+
      " WHERE NOT EXISTS (SELECT 1 FROM case_law_provenance WHERE case_law_id="+caseIdExpr+" AND source_url="+sqlString(sourceUrl.href)+" AND COALESCE(source_sha256,'')="+sqlString(String(item.source_sha256).toLowerCase())+");"
    );

    for(const [scheme,value] of idPairs){
      sql.push(
        "INSERT OR IGNORE INTO case_law_external_ids(case_law_id,id_scheme,id_value,source_url,is_primary_identifier,human_review_status) VALUES ("+
        [caseIdExpr,sqlString(scheme),sqlString(value),sqlString(sourceUrl.href),"'"+(scheme==="ecli"||scheme==="echr_application_number"||scheme==="domestic_case_number"||scheme==="constitutional_reference"?"1":"0")+"'", "'pending'"].join(",")+");"
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
