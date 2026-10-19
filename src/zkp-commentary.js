// Governed retrieval for Zoran Stojankich's ZKP Commentary v6.
// This is secondary authorial analysis and must never override statutory text.

export const ZKP_COMMENTARY_RELEASE_ID='zkp-commentary-v6-2026';
export const ZKP_COMMENTARY_AUTHORITY_ROLE='authorial_analysis';

function parseJsonArray(value){
  if(!value) return [];
  try{ const v=JSON.parse(value); return Array.isArray(v)?v:[]; }catch{ return []; }
}

function parseJsonObject(value){
  if(!value) return null;
  try{ const v=JSON.parse(value); return v && typeof v==='object' && !Array.isArray(v) ? v : null; }catch{ return null; }
}

export async function zkpCommentaryReleaseState(env){
  if(!env?.DB) return {available:false,approved:false,active:false,reason:'db_unavailable'};
  try{
    const row=await env.DB.prepare(
      `SELECT id,title,edition,author,source_sha256,record_count,authority_role,human_gate_status,active,approved_at
         FROM zkp_commentary_releases WHERE id=? LIMIT 1`
    ).bind(ZKP_COMMENTARY_RELEASE_ID).first();
    if(!row) return {available:false,approved:false,active:false,reason:'release_not_registered'};
    return {
      available:true,
      approved:row.human_gate_status==='approved',
      active:Number(row.active)===1,
      id:row.id,title:row.title,edition:row.edition,author:row.author,sourceSha256:row.source_sha256,
      recordCount:Number(row.record_count||0),authorityRole:row.authority_role,humanGateStatus:row.human_gate_status,approvedAt:row.approved_at||null
    };
  }catch(error){
    if(/no such table/i.test(String(error?.message||error))) return {available:false,approved:false,active:false,reason:'schema_not_applied'};
    throw error;
  }
}

export async function findZkpCommentaryByArticles(env,articleNumbers,{requireApproved=true}={}){
  const nums=[...new Set((articleNumbers||[]).map(x=>String(x||'').trim()).filter(Boolean))].slice(0,12);
  if(!nums.length) return {release:null,items:[]};
  const release=await zkpCommentaryReleaseState(env);
  if(!release.available || (requireApproved && (!release.approved || !release.active))) return {release,items:[]};
  const placeholders=nums.map(()=>'?').join(',');
  const query=`SELECT article_number,article_title,law_text_json,commentary_json,practice_json,common_errors_json,
                     formulations_json,related_provisions_json,systematics_json,procedure_phase_json,actors_json,topics_json,
                     related_articles_json,practical_use,risk_level,source_label,record_sha256
                FROM zkp_commentary_articles
               WHERE release_id=? AND article_number IN (${placeholders})`;
  const result=await env.DB.prepare(query).bind(ZKP_COMMENTARY_RELEASE_ID,...nums).all();
  const byNumber=new Map((result.results||[]).map(row=>[String(row.article_number),row]));
  const items=nums.map(n=>byNumber.get(n)).filter(Boolean).map(row=>({
    articleNumber:String(row.article_number),
    articleTitle:String(row.article_title||''),
    lawText:parseJsonArray(row.law_text_json),
    commentary:parseJsonArray(row.commentary_json),
    practice:parseJsonArray(row.practice_json),
    commonErrors:parseJsonArray(row.common_errors_json),
    formulations:parseJsonArray(row.formulations_json),
    relatedProvisions:parseJsonArray(row.related_provisions_json),
    systematics:parseJsonObject(row.systematics_json),
    procedurePhase:parseJsonArray(row.procedure_phase_json),
    actors:parseJsonArray(row.actors_json),
    topics:parseJsonArray(row.topics_json),
    relatedArticles:parseJsonArray(row.related_articles_json),
    practicalUse:String(row.practical_use||''),
    riskLevel:String(row.risk_level||''),
    sourceLabel:String(row.source_label||''),
    recordSha256:String(row.record_sha256||''),
    authorityRole:ZKP_COMMENTARY_AUTHORITY_ROLE
  }));
  return {release,items};
}

export function commentaryPromptBlock(bundle,{maxChars=12000}={}){
  if(!bundle?.items?.length) return '';
  const release=bundle.release||{};
  const blocks=bundle.items.map(item=>[
    `[КОМЕНТАР · Член ${item.articleNumber}]`,
    `AUTHOR: ${release.author||'Адвокат Зоран Стојанкиќ'}`,
    `EDITION: ${release.edition||'6'}; AUTHORITY_ROLE: authorial_analysis; HUMAN_GATE: ${release.humanGateStatus||'unknown'}`,
    `TITLE: ${item.articleTitle}`,
    `COMMENTARY: ${(item.commentary||[]).join(' ')}`,
    `PRACTICAL_APPLICATION: ${(item.practice||[]).join(' ')}`,
    `COMMON_ERRORS: ${(item.commonErrors||[]).join(' ')}`,
    `FORMULATIONS: ${(item.formulations||[]).join(' ')}`,
    `RELATED_PROVISIONS: ${(item.relatedProvisions||[]).join(' | ')}`,
    `PRACTICAL_USE: ${item.practicalUse||''}`,
    `RISK_LEVEL: ${item.riskLevel||''}`,
    `SOURCE: ${item.sourceLabel}`
  ].join('\n'));
  return blocks.join('\n\n---\n\n').slice(0,maxChars);
}
