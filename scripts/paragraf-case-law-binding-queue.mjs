#!/usr/bin/env node
// Build an official-source binding queue from bridged Paragraf case-law NDJSON.

import fs from "node:fs";

function text(v,max=500){
  if(v===null||v===undefined||v==="") return null;
  const s=String(v).normalize("NFKC").trim();
  return s.length>max?s.slice(0,max):s;
}

export function buildParagrafBindingQueue(caseLawNdjson){
  const rows=String(caseLawNdjson??"").split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const manifest=rows.find(x=>x?.type==="case_law_manifest");
  const cases=rows.filter(x=>x?.type==="case_law_case");
  if(!manifest||manifest.source_class!=="licensed_secondary_export") throw new Error("Expected licensed-secondary case-law manifest.");
  if(!cases.length) throw new Error("No case-law cases.");

  const entries=cases.map((c,index)=>{
    const ids=c.external_ids&&typeof c.external_ids==="object"?c.external_ids:{};
    const officialIds={
      ecli:ids.ecli??null,
      celex:ids.celex??null,
      echr_application_number:ids.echr_application_number??null,
      hudoc_item_id:ids.hudoc_item_id??null,
      domestic_case_number:ids.domestic_case_number??c.case_number??null,
      constitutional_reference:ids.constitutional_reference??null
    };
    const hasStrongId=Boolean(
      officialIds.ecli||officialIds.celex||officialIds.echr_application_number||
      officialIds.hudoc_item_id||officialIds.domestic_case_number||officialIds.constitutional_reference
    );
    return {
      type:"official_binding_candidate",
      queue_key:"bind:"+String(ids.paragraf_legacy_id??c.source_record_id??c.case_key??index),
      paragraf_legacy_id:text(ids.paragraf_legacy_id??c.source_record_id,300),
      case_title:text(c.case_title,500),
      court:text(c.court,300),
      case_number:text(c.case_number,200),
      decision_date:text(c.decision_date,40),
      jurisdiction:text(c.jurisdiction,32),
      legal_area:text(c.legal_area,300),
      official_identifiers:officialIds,
      lookup_readiness:hasStrongId?"identifier_ready":"metadata_search_required",
      binding_status:"pending",
      human_review_status:"pending",
      paragraf_source_url:text(c.source_url,2000),
      paragraf_source_sha256:text(c.source_sha256,64)
    };
  });

  const outManifest={
    type:"official_binding_queue_manifest",
    source_run_id:manifest.run_id,
    record_count:entries.length,
    official_source_required:true,
    human_gate_required:true
  };
  return {
    manifest:outManifest,
    entries,
    ndjson:[JSON.stringify(outManifest),...entries.map(x=>JSON.stringify(x))].join("\n")+"\n"
  };
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,inputPath,outPath]=process.argv;
  if(!inputPath||!outPath){
    console.error("Usage: node scripts/paragraf-case-law-binding-queue.mjs <cases.ndjson> <binding-queue.ndjson>");
    process.exit(2);
  }
  const result=buildParagrafBindingQueue(fs.readFileSync(inputPath,"utf8"));
  fs.writeFileSync(outPath,result.ndjson,"utf8");
  console.error(JSON.stringify({ok:true,candidates:result.entries.length,output:outPath},null,2));
}
