#!/usr/bin/env node
import fs from "node:fs";
import crypto from "node:crypto";
import { parseLegalText } from "./parse-mk-legal-text.mjs";

const REVIEWED_BASE_VERSION="official-consolidated-snapshot-2023-111-reviewed-base-v1";

const clone=x=>JSON.parse(JSON.stringify(x));
const sha256=s=>crypto.createHash("sha256").update(String(s)).digest("hex");

export function readNdjson(text){
  const rows=String(text).split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  return {
    manifest:rows.find(x=>x.type==="ingest_manifest")||null,
    records:rows.filter(x=>x.type==="article")
  };
}

function normalizeRecordStructure(record,meta){
  const parsed=parseLegalText(
    `Член ${record.article_number}\n${record.article_text}`,
    {
      instrument_key:meta.instrument_key,
      instrument_title:meta.instrument_title,
      version_id:REVIEWED_BASE_VERSION,
      source_url:meta.source_url,
      source_sha256:meta.source_sha256,
      source_issue_number:record.source?.issue_number||meta.source_issue_number||null,
      source_issue_date:record.source?.issue_date||meta.source_issue_date||null,
      status:record.status,
      human_review_status:"pending"
    }
  );
  if(parsed.article_count!==1 || parsed.warning_count!==0 || parsed.errors.length){
    throw new Error(`Reviewed article ${record.article_number_normalized} did not re-parse cleanly`);
  }
  const p=parsed.records[0];
  record.article_heading=p.article_heading;
  record.paragraphs=p.paragraphs;
}

export function deriveReviewedBase(corpus,review){
  if(!corpus?.manifest) throw new Error("Missing ingest manifest");
  const manifest=clone(corpus.manifest);
  const records=clone(corpus.records||[]);

  if(manifest.instrument_key!=="mk:zro") throw new Error("Unexpected instrument");
  if(manifest.source_url!==review.source_url) throw new Error("Source URL mismatch");
  if(String(manifest.source_sha256||"").toLowerCase()!==String(review.source_sha256||"").toLowerCase()) throw new Error("Source SHA-256 mismatch");
  if(records.length!==298 || Number(manifest.article_count)!==298) throw new Error("Expected exact 298-row ZRO base");

  const expectedGaps=["98","253","254","255"];
  if(JSON.stringify(manifest.gaps)!==JSON.stringify(expectedGaps)) throw new Error("Unexpected ZRO gap topology");

  const gapReviews=review.dispositions.filter(x=>x.code==="unexplained_gap");
  if(JSON.stringify(gapReviews.map(x=>x.article))!==JSON.stringify(expectedGaps)) throw new Error("Gap review set mismatch");
  if(!gapReviews.every(x=>x.disposition==="RESOLVED_EXPLICITLY_DELETED")) throw new Error("Every gap must be explicitly resolved as deleted");

  const unresolved=(manifest.warnings||[]).filter(x=>x.severity==="stop"||x.severity==="warning");
  const expectedFindingKeys=[
    "amending_act_contamination:2",
    "mixed_script_token:259",
    "mixed_script_token:264",
    "mixed_script_token:265",
    "mixed_script_token:266-в"
  ].sort();
  const actualFindingKeys=unresolved.map(x=>`${x.code}:${x.article}`).sort();
  if(JSON.stringify(actualFindingKeys)!==JSON.stringify(expectedFindingKeys)){
    throw new Error("Unexpected unresolved parser finding set: "+JSON.stringify(actualFindingKeys));
  }

  const by=new Map(records.map(r=>[r.article_number_normalized,r]));
  const transformations=[];

  const foot=review.dispositions.find(x=>x.code==="amending_act_contamination"&&x.article==="2");
  const a2=by.get("2");
  if(!foot||!a2) throw new Error("Article 2 footnote review missing");
  const raw2=String(a2.article_text||"");
  const marker=foot.raw_marker;
  const count2=raw2.split(marker).length-1;
  if(count2!==1) throw new Error(`Article 2 footnote marker matched ${count2} times`);
  const cut=raw2.slice(0,raw2.indexOf(marker)).trim().replace(/\s+1$/u,"").trim();
  if(cut!==foot.reviewed_text) throw new Error("Article 2 reviewed boundary does not match the approved normative text");
  a2.raw_article_text_sha256=sha256(raw2);
  a2.article_text=cut;
  a2.extraction_method="reviewed_derived_from_official_source_v1";
  a2.reviewed_derivation={review_id:review.review_id,kind:"editorial_footnote_boundary",raw_source_preserved:true};
  normalizeRecordStructure(a2,manifest);
  transformations.push({article:"2",kind:"editorial_footnote_boundary",before_sha256:sha256(raw2),after_sha256:sha256(cut)});

  const headingReview=review.dispositions.find(x=>x.code==="next_section_heading_contamination"&&x.article==="104");
  const a104=by.get("104");
  if(!headingReview||!a104) throw new Error("Article 104 heading-boundary review missing");
  const raw104=String(a104.article_text||"");
  const marker104=String(headingReview.raw_marker||"");
  const marker104Count=raw104.split(marker104).length-1;
  if(marker104Count!==1) throw new Error(`Article 104 chapter marker matched ${marker104Count} times`);
  if(String(headingReview.secondary_marker||"")){
    const secondaryCount=raw104.split(String(headingReview.secondary_marker)).length-1;
    if(secondaryCount!==1) throw new Error(`Article 104 secondary heading marker matched ${secondaryCount} times`);
  }
  const cut104=raw104.slice(0,raw104.indexOf(marker104)).trim();
  if(cut104!==headingReview.reviewed_text) throw new Error("Article 104 reviewed boundary does not match the approved normative text");
  a104.raw_article_text_sha256=sha256(raw104);
  a104.article_text=cut104;
  a104.extraction_method="reviewed_derived_from_official_source_v1";
  a104.reviewed_derivation={review_id:review.review_id,kind:"next_section_heading_boundary",raw_source_preserved:true};
  normalizeRecordStructure(a104,manifest);
  transformations.push({article:"104",kind:"next_section_heading_boundary",before_sha256:sha256(raw104),after_sha256:sha256(cut104)});

  for(const d of review.dispositions.filter(x=>x.code==="mixed_script_token")){
    const r=by.get(d.article);
    if(!r) throw new Error(`Missing reviewed article ${d.article}`);
    const raw=String(r.article_text||"");
    const matches=raw.split(d.from).length-1;
    if(matches!==d.expected_matches) throw new Error(`Article ${d.article} token '${d.from}' matched ${matches}, expected ${d.expected_matches}`);
    if(d.from===d.to) throw new Error("Normalization cannot be a no-op");
    const next=raw.split(d.from).join(d.to);
    r.raw_article_text_sha256=sha256(raw);
    r.article_text=next;
    r.extraction_method="reviewed_derived_from_official_source_v1";
    r.reviewed_derivation={review_id:review.review_id,kind:"unicode_homoglyph_normalization",from:d.from,to:d.to,raw_source_preserved:true};
    normalizeRecordStructure(r,manifest);
    transformations.push({article:d.article,kind:"unicode_homoglyph_normalization",from:d.from,to:d.to,before_sha256:sha256(raw),after_sha256:sha256(next)});
  }

  for(const r of records){
    r.version_id=REVIEWED_BASE_VERSION;
    r.instrument_version_label=REVIEWED_BASE_VERSION;
    r.human_review_status="pending";
    if(r.status==="current_consolidated") throw new Error("Current-consolidated record not allowed in reviewed base");
  }

  const retainedInfo=(manifest.warnings||[]).filter(x=>x.severity==="info");
  for(const g of gapReviews){
    retainedInfo.push({
      severity:"info",
      code:"reviewed_deleted_gap",
      article:g.article,
      line:null,
      detail:`Article ${g.article} absence is explicitly explained by the official consolidated source (${g.amending_issue}).`
    });
  }
  for(const t of transformations){
    retainedInfo.push({
      severity:"info",
      code:"reviewed_source_derivation",
      article:t.article,
      line:null,
      detail:`Reviewed derivation applied: ${t.kind}; raw source text is preserved separately.`
    });
  }

  manifest.version_id=REVIEWED_BASE_VERSION;
  manifest.instrument_version_label=REVIEWED_BASE_VERSION;
  manifest.warning_count=0;
  manifest.info_count=retainedInfo.length;
  manifest.warnings=retainedInfo;
  manifest.errors=[];
  manifest.reviewed_base={
    review_id:review.review_id,
    source_sha256:review.source_sha256,
    raw_source_preserved:true,
    transformations,
    deleted_gap_articles:expectedGaps,
    current_law_authority:false,
    human_gate_approved:false
  };

  return {manifest,records,log:{
    verdict:"REVIEWED_BASE_READY",
    review_id:review.review_id,
    source_sha256:review.source_sha256,
    article_count:records.length,
    transformations,
    deleted_gap_articles:expectedGaps,
    raw_source_preserved:true,
    current_law_authority:false,
    human_gate_approved:false
  }};
}

export function toNdjson({manifest,records}){
  return [
    JSON.stringify({...manifest,type:"ingest_manifest"}),
    ...records.map(r=>JSON.stringify({...r,type:"article"}))
  ].join("\n")+"\n";
}

if(import.meta.url===`file://${process.argv[1]}`){
  const [,,rawPath,reviewPath,outPath,logPath]=process.argv;
  if(!rawPath||!reviewPath||!outPath||!logPath){
    console.error("Usage: node scripts/derive-reviewed-zro-2023-base.mjs <raw.ndjson> <review.json> <reviewed.ndjson> <log.json>");
    process.exit(2);
  }
  const corpus=readNdjson(fs.readFileSync(rawPath,"utf8"));
  const review=JSON.parse(fs.readFileSync(reviewPath,"utf8"));
  const result=deriveReviewedBase(corpus,review);
  fs.writeFileSync(outPath,toNdjson(result),"utf8");
  fs.writeFileSync(logPath,JSON.stringify(result.log,null,2)+"\n","utf8");
  console.error(`REVIEWED BASE READY: ${result.records.length} articles; transformations=${result.log.transformations.length}; Human Gate=pending`);
}
