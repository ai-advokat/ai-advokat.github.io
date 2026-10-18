import { enforceCanonicalContextProvenance } from "./canonical-provenance-gate.js";

export const GAZETTE_OPEN_DATA_DATASET_URL="https://data.gov.mk/dataset/n3dahnja-ha-cjiyx6eh-bechnk-do-2017";
export const GAZETTE_OPEN_DATA_RESOURCE_URL="https://data.gov.mk/dataset/05342c32-f4a6-49c3-b8fa-5a555a6df6ff/resource/9a039791-1abb-411f-bc04-bf136776a83a/download/izdanija-sluzben-vesnik-do-2017.xlsx";
export const GAZETTE_OPEN_DATA_SHA256="4d111eb03ed0b8e877d151e030bf38096831cedc7a26f4a09121d9e6dfac5a18";
const MAX_RESULTS=8;

function norm(v){
  return String(v??"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
}

export function extractGazetteIssueNeedles(q){
  const raw=norm(q);
  const explicitSignal=/(службен\s+(?:весник|лист)|сл\.?\s*(?:весник|лист)|газет|official\s+gazette)/u.test(raw);
  const pair=raw.match(/(?:бр\.?|број)?\s*([0-9]{1,4})\s*\/\s*((?:19|20)[0-9]{2})/u);
  const isoDate=raw.match(/\b((?:19|20)[0-9]{2}-[01][0-9]-[0-3][0-9])\b/u);
  const mkDate=raw.match(/\b([0-3]?[0-9])[.\/-]([01]?[0-9])[.\/-]((?:19|20)[0-9]{2})\b/u);
  const labeledIssue=raw.match(/(?:бр\.?|број)\s*([0-9]{1,4})\b/u);
  let issueDate=isoDate?.[1]||null;
  if(!issueDate && mkDate){
    issueDate=mkDate[3]+"-"+String(mkDate[2]).padStart(2,"0")+"-"+String(mkDate[1]).padStart(2,"0");
  }
  return {
    issueNumber:pair?.[1]||labeledIssue?.[1]||null,
    year:pair?.[2]||mkDate?.[3]||(isoDate?.[1]?.slice(0,4)||null),
    issueDate,
    explicitSignal,
    usable:Boolean(pair || isoDate || mkDate || (explicitSignal && labeledIssue))
  };
}

export function scoreGazetteIssueMetadata(row,q){
  const needles=extractGazetteIssueNeedles(q);
  let score=0;
  if(needles.issueNumber && String(row.issue_number)===needles.issueNumber) score+=700;
  if(needles.year && String(row.year)===needles.year) score+=500;
  if(needles.issueDate && String(row.issue_date)===needles.issueDate) score+=1000;
  if(needles.explicitSignal) score+=50;
  const query=norm(q);
  const hay=norm([row.publication_type,row.issue_number,row.issue_date,row.year].join(" "));
  for(const token of [...new Set(query.split(/[^\p{L}\p{N}-]+/u).filter(x=>x.length>=3).slice(0,18))]){
    if(hay.includes(token)) score+=4;
  }
  return score;
}

export async function findGazetteIssueMetadata(env,q,{limit=6}={}){
  const take=Math.max(1,Math.min(MAX_RESULTS,Number(limit)||6));
  const n=extractGazetteIssueNeedles(q);
  if(!n.usable) return {state:"no_match",issues:[]};
  try{
    const where=[];
    const binds=[];
    if(n.issueNumber){where.push("issue_number=?");binds.push(n.issueNumber);}
    if(n.year){where.push("year=?");binds.push(Number(n.year));}
    if(n.issueDate){where.push("issue_date=?");binds.push(n.issueDate);}
    if(!where.length) return {state:"no_match",issues:[]};
    const sql=`SELECT publication_type,issue_number,issue_date,year,source_row_first,source_occurrences,
                      source_authority,dataset_id,resource_id,dataset_url,resource_url,snapshot_sha256,
                      source_class,human_review_status,runtime_eligible,legal_text_authority,current_law_authority
                 FROM gazette_issue_metadata
                WHERE ${where.join(" AND ")}
                ORDER BY issue_date DESC,publication_type
                LIMIT 40`;
    const res=await env.DB.prepare(sql).bind(...binds).all();
    const ranked=(res.results||[])
      .map(row=>({row,score:scoreGazetteIssueMetadata(row,q)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score || String(b.row.issue_date).localeCompare(String(a.row.issue_date)))
      .slice(0,take);
    return {state:ranked.length?"matched":"no_match",issues:ranked.map(x=>({...x.row,relevance_score:x.score}))};
  }catch(error){
    return {state:"unavailable",issues:[],error:String(error?.message||error).slice(0,180)};
  }
}

export function gazetteIssueMetadataToContext(bundle){
  if(!bundle || bundle.state!=="matched") return [];
  const raw=bundle.issues.map(i=>({
    source:"ЈП Службен весник на РСМ · data.gov.mk issue metadata",
    locator:`${i.publication_type} · бр. ${i.issue_number}/${i.year} · ${i.issue_date}`,
    version:"official-issue-metadata-only",
    provenance:{
      kind:"gazette_issue",
      sourceIdentity:"ЈП Службен весник на РСМ · data.gov.mk",
      authorityClass:"primary_official_metadata",
      locator:`${i.publication_type} · бр. ${i.issue_number}/${i.year} · ${i.issue_date}`,
      releaseRole:"source_registry",
      legalAuthority:false,
      humanReviewStatus:String(i.human_review_status||"reviewed"),
      publicationName:String(i.publication_type||""),
      issueNumber:`${i.issue_number}/${i.year}`,
      issueDate:String(i.issue_date||""),
      sourceUrl:String(i.resource_url||GAZETTE_OPEN_DATA_RESOURCE_URL),
      sourceSha256:String(i.snapshot_sha256||GAZETTE_OPEN_DATA_SHA256),
      currentLawClaim:false
    },
    text:[
      "OFFICIAL_ISSUE_METADATA_ONLY=true",
      "LEGAL_TEXT_AUTHORITY=false",
      "CURRENT_LAW_AUTHORITY=false",
      "The record proves only the issue identity/date/publication type represented in the official data.gov.mk dataset.",
      `PUBLICATION_TYPE=${i.publication_type}`,
      `ISSUE=${i.issue_number}/${i.year}`,
      `ISSUE_DATE=${i.issue_date}`,
      `SOURCE_DATASET=${i.dataset_url||GAZETTE_OPEN_DATA_DATASET_URL}`,
      "Do not infer the contents of the issue, an act, an article, effective date or current-law status from this metadata record."
    ].join("\n")
  }));
  return enforceCanonicalContextProvenance(raw).context;
}
