const MAX_GAZETTE_CHUNK_RESULTS=8;

function norm(v){
  return String(v??"").normalize("NFKC").toLowerCase().replace(/\s+/g," ").trim();
}

export function scoreGazetteChunk(row,q){
  const query=norm(q);
  if(!query) return 0;
  const hay=norm([
    row.canonical_instrument_key,row.article_number,row.paragraph_number,row.item_number,
    row.text_content,row.source_issue_number,row.source_issue_date
  ].join(" "));
  let score=0;
  const article=query.match(/(?:член|article)\s*([0-9]+(?:[-–—][\p{L}]+)?)/u);
  if(article && norm(article[1])===norm(row.article_number)) score+=1000;
  const issue=query.match(/(?:службен\s+весник|сл\.?\s*весник|бр\.?|број)\s*([0-9]+(?:\/[0-9]{4})?)/u);
  if(issue && hay.includes(norm(issue[1]))) score+=500;
  for(const token of [...new Set(query.split(/[^\p{L}\p{N}-]+/u).filter(x=>x.length>=3).slice(0,30))]){
    if(hay.includes(token)) score+=8;
  }
  if(Number(row.current_law_eligible)===1) score+=30;
  if(row.human_review_status==="approved") score+=20;
  else if(row.human_review_status==="reviewed") score+=8;
  return score;
}

export async function findGovernedGazetteChunks(env,q,{limit=6}={}){
  const take=Math.max(1,Math.min(MAX_GAZETTE_CHUNK_RESULTS,Number(limit)||6));
  try{
    const sql="SELECT id,chunk_key,chunk_order,chunk_kind,article_number,paragraph_number,item_number,text_content,text_sha256,source_url,source_issue_number,source_issue_date,source_publication_name,canonical_instrument_key,valid_from,valid_to,effective_date,application_date,authority_class,human_review_status,runtime_eligible,current_law_eligible,superseded FROM gazette_article_chunks WHERE runtime_eligible=1 AND human_review_status IN ('reviewed','approved') AND superseded=0 ORDER BY source_issue_date DESC,id DESC LIMIT 1200";
    const rows=await env.DB.prepare(sql).all();
    const ranked=(rows.results||[])
      .map(row=>({row,score:scoreGazetteChunk(row,q)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score || b.row.id-a.row.id)
      .slice(0,take);
    return {state:ranked.length?"matched":"no_match",chunks:ranked.map(x=>({...x.row,relevance_score:x.score}))};
  }catch(error){
    return {state:"unavailable",chunks:[],error:String(error?.message||error).slice(0,180)};
  }
}

export function gazetteChunksToContext(bundle){
  if(!bundle || bundle.state!=="matched") return [];
  return bundle.chunks.map(c=>({
    source:"Службен весник · governed article chunk",
    locator:[
      c.source_issue_number?"бр. "+c.source_issue_number:null,
      c.source_issue_date||null,
      c.article_number?"член "+c.article_number:null,
      c.paragraph_number?"став "+c.paragraph_number:null,
      c.item_number?"точка "+c.item_number:null
    ].filter(Boolean).join(" · "),
    version:c.current_law_eligible===1?"current-law-eligible-after-human-gate":"official-source-historical-or-versioned",
    text:[
      "AUTHORITY_CLASS="+c.authority_class,
      "HUMAN_GATE="+c.human_review_status,
      "CURRENT_LAW_ELIGIBLE="+(c.current_law_eligible===1?"true":"false"),
      "SOURCE="+c.source_url,
      "SHA256="+c.text_sha256,
      "TEXT:",
      c.text_content
    ].join("\n")
  }));
}
