// AI Advokat matter-wide search primitives.
// Operates only on caller-supplied, already-authorised extracted records.
// No persistence, no cross-matter access and no source-less result is allowed.

export const MATTER_SEARCH_VERSION="1.0.0";
export const MATTER_SEARCH_MAX_RECORDS=5000;
export const MATTER_SEARCH_MAX_RESULTS=50;

const STOP=new Set([
  "и","или","во","на","од","до","за","со","без","пред","по","се","е","да","што","како","дали",
  "the","and","or","of","to","for","with","without","is","are","how","what"
]);

function norm(value){
  return String(value||"")
    .normalize("NFKC")
    .toLocaleLowerCase("mk")
    .replace(/[^\p{L}\p{N}]+/gu," ")
    .trim();
}

function tokens(value){
  return [...new Set(norm(value).split(/\s+/).filter(t=>t.length>=3&&!STOP.has(t)).slice(0,40))];
}

function validAnchor(value){
  return value
    && typeof value.sourceId==="string"
    && value.sourceId.trim()
    && Number.isInteger(value.page)
    && value.page>0;
}

export function validateMatterSearchRecord(record,index=0){
  const errors=[];
  if(!record||typeof record!=="object"||Array.isArray(record)) return {ok:false,errors:[`record_${index}_required`]};
  if(typeof record.id!=="string"||!record.id.trim()) errors.push(`record_${index}_id_required`);
  if(typeof record.text!=="string"||!record.text.trim()) errors.push(`record_${index}_text_required`);
  if(!validAnchor(record)) errors.push(`record_${index}_source_page_required`);
  if(record.matterId!==undefined && (typeof record.matterId!=="string"||!record.matterId.trim())) errors.push(`record_${index}_matter_id_invalid`);
  return {ok:errors.length===0,errors};
}

export function matterWideSearch(records,query,{matterId=null,limit=12}={}){
  if(!Array.isArray(records)) throw new TypeError("matter_search_records_array_required");
  if(records.length>MATTER_SEARCH_MAX_RECORDS) throw new TypeError("matter_search_record_limit_exceeded");
  const qTokens=tokens(query);
  if(!qTokens.length) return Object.freeze({version:MATTER_SEARCH_VERSION,query:String(query||""),results:Object.freeze([])});

  const safeLimit=Math.max(1,Math.min(MATTER_SEARCH_MAX_RESULTS,Number(limit)||12));
  const seen=new Set();
  const scored=[];

  records.forEach((record,index)=>{
    const check=validateMatterSearchRecord(record,index);
    if(!check.ok) return;
    if(matterId && record.matterId!==matterId) return;
    const key=String(record.id).trim();
    if(seen.has(key)) return;
    seen.add(key);

    const hay=norm([record.title,record.text,record.kind,record.tags?.join?.(" ")].filter(Boolean).join(" "));
    let score=0;
    const matched=[];
    for(const token of qTokens){
      if(!hay.includes(token)) continue;
      matched.push(token);
      score+=hay.startsWith(token)?5:2;
      if(norm(record.title||"").includes(token)) score+=3;
    }
    if(!score) return;

    scored.push({
      id:key,
      matterId:record.matterId||null,
      sourceId:record.sourceId.trim(),
      page:record.page,
      kind:record.kind||"source_excerpt",
      title:record.title||null,
      excerpt:String(record.text).slice(0,1200),
      matched:Object.freeze(matched),
      score
    });
  });

  scored.sort((a,b)=>b.score-a.score||a.sourceId.localeCompare(b.sourceId)||a.page-b.page);
  return Object.freeze({
    version:MATTER_SEARCH_VERSION,
    query:String(query||"").slice(0,500),
    matterId:matterId||null,
    results:Object.freeze(scored.slice(0,safeLimit).map(x=>Object.freeze(x))),
    sourceAnchorsRequired:true,
    crossMatterSearch:false
  });
}
