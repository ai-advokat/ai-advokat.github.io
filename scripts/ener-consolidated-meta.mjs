#!/usr/bin/env node
import fs from "node:fs";

const ALLOWED_OFFICIALNESS=new Set([
  "government_hosted_reference",
  "explicit_unofficial_version"
]);

function text(v,label,max=2000){
  const s=String(v??"").normalize("NFKC").trim();
  if(!s||s.length>max) throw new Error("Invalid "+label);
  return s;
}
function nullable(v,max=2000){
  if(v===null||v===undefined||v==="") return null;
  const s=String(v).normalize("NFKC").trim();
  if(s.length>max) throw new Error("Field too long");
  return s||null;
}
function isEnerUrl(value){
  let u;
  try{u=new URL(String(value));}catch{return false;}
  const h=u.hostname.toLowerCase();
  return u.protocol==="https:"&&(h==="ener.gov.mk"||h.endsWith(".ener.gov.mk"));
}
function validDate(value){
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value??""));
}
function validSha(value){
  return /^[a-f0-9]{64}$/i.test(String(value??""));
}

export function prepareEnerConsolidatedMetadata(input){
  const raw=typeof input==="string"?JSON.parse(input):input;
  if(!raw||typeof raw!=="object"||Array.isArray(raw)) throw new Error("Input must be a JSON object.");
  if(raw.source_system!=="ENER") throw new Error("source_system must be ENER.");
  if(raw.lane!=="consolidated_text_snapshot") throw new Error("lane must be consolidated_text_snapshot.");

  const instrumentKey=text(raw.instrument_key,"instrument_key",200);
  const instrumentTitle=text(raw.instrument_title,"instrument_title",1000);
  const listingDate=text(raw.ener_listing_date,"ener_listing_date",40);
  if(!validDate(listingDate)) throw new Error("ener_listing_date must be YYYY-MM-DD.");

  const officialness=text(raw.ener_officialness,"ener_officialness",100);
  if(!ALLOWED_OFFICIALNESS.has(officialness)) throw new Error("Unsupported ener_officialness.");

  const sourceUrl=text(raw.source_url,"source_url",3000);
  if(!isEnerUrl(sourceUrl)) throw new Error("source_url must be HTTPS on ener.gov.mk.");

  const sourceSha=text(raw.source_sha256,"source_sha256",64).toLowerCase();
  if(!validSha(sourceSha)) throw new Error("source_sha256 must be 64 hex characters.");

  const versionId="ener-"+listingDate+"-"+sourceSha.slice(0,12);

  return {
    instrument_key:instrumentKey,
    instrument_title:instrumentTitle,
    version_id:versionId,
    source_url:sourceUrl,
    source_sha256:sourceSha,
    source_issue_number:nullable(raw.source_issue_number,120),
    source_issue_date:nullable(raw.source_issue_date,40),
    status:"needs_version_review",
    human_review_status:"pending",
    source_kind:"ener_consolidated_text_snapshot",
    ener_listing_date:listingDate,
    ener_label:nullable(raw.ener_label,300)??"консолидиран текст",
    ener_officialness:officialness,
    current_law_authority:false,
    official_gazette_binding_required:true,
    notes:nullable(raw.notes,3000)
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,inputPath,outPath]=process.argv;
  if(!inputPath||!outPath){
    console.error("Usage: node scripts/ener-consolidated-meta.mjs <intake.json> <parser-meta.json>");
    process.exit(2);
  }
  const result=prepareEnerConsolidatedMetadata(fs.readFileSync(inputPath,"utf8"));
  fs.writeFileSync(outPath,JSON.stringify(result,null,2)+"\n","utf8");
  console.error(JSON.stringify({ok:true,version_id:result.version_id,status:result.status,out:outPath},null,2));
}
