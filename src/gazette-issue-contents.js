export const GAZETTE_ISSUE_CONTENTS_VERSION="GAZETTE_ISSUE_CONTENTS_INDEX_V1";

const MAX_ITEMS=1000;
const TYPE_LABELS=Object.freeze({
  law:"ЗАКОН",
  decision:"ОДЛУКА",
  rulebook:"ПРАВИЛНИК",
  decree:"УРЕДБА",
  resolution:"РЕШЕНИЕ",
  correction:"ИСПРАВКА",
  order:"НАРЕДБА",
  program:"ПРОГРАМА",
  statute:"СТАТУТ",
  instruction:"УПАТСТВО",
  announcement:"ОБЈАВА",
  other:"ДРУГО"
});

function cleanIssue(v){
  const raw=String(v??"").trim();
  return /^[0-9]{1,4}$/.test(raw)?raw:null;
}

function cleanYear(v){
  const n=Number(v);
  return Number.isInteger(n) && n>=1991 && n<=2100 ? n : null;
}

export function gazetteActTypeLabel(value){
  const key=String(value||"other").trim().toLowerCase();
  return TYPE_LABELS[key]||String(value||"ДРУГО").toUpperCase();
}

export async function findGazetteIssueContents(env,{year,issueNumber}={}){
  const y=cleanYear(year);
  const issue=cleanIssue(issueNumber);
  if(!y || !issue) return {state:"invalid",complete:false,items:[],manifest:null};

  try{
    const manifest=await env.DB.prepare(
      `SELECT year,register_source_url,register_source_sha256,register_entry_count,issue_count,
              unresolved_count,missing_issue_links_count,reconciliation_status,verification_status,
              human_review_status,runtime_eligible,release_authorization_id,verified_at
         FROM gazette_issue_contents_manifest
        WHERE year=? AND runtime_eligible=1 AND reconciliation_status='reconciled'
        LIMIT 1`
    ).bind(y).first();

    if(!manifest){
      return {state:"not_loaded",complete:false,items:[],manifest:null,year:y,issueNumber:issue};
    }

    const countRow=await env.DB.prepare(
      `SELECT COUNT(*) AS n
         FROM gazette_issue_contents
        WHERE year=? AND issue_number=? AND runtime_eligible=1
          AND verification_status IN ('reconciled','reviewed','approved')`
    ).bind(y,issue).first();
    const total=Number(countRow?.n||0);

    const result=await env.DB.prepare(
      `SELECT year,issue_number,ordinal_in_issue,register_ordinal,act_type,title,page_start,
              register_source_url,register_source_sha256,source_class,verification_status,
              human_review_status,runtime_eligible,legal_text_authority,current_law_authority,
              release_authorization_id
         FROM gazette_issue_contents
        WHERE year=? AND issue_number=? AND runtime_eligible=1
          AND verification_status IN ('reconciled','reviewed','approved')
        ORDER BY ordinal_in_issue,COALESCE(page_start,999999),register_ordinal,id
        LIMIT ?`
    ).bind(y,issue,MAX_ITEMS).all();

    const items=result.results||[];
    const complete=total===items.length && total<=MAX_ITEMS;
    return {
      state:items.length?"matched":"matched_empty",
      complete,
      total,
      items,
      manifest,
      year:y,
      issueNumber:issue,
      completenessBasis:"official_chronological_register_reconciled"
    };
  }catch(error){
    return {
      state:"unavailable",
      complete:false,
      items:[],
      manifest:null,
      year:y,
      issueNumber:issue,
      error:String(error?.message||error).slice(0,180)
    };
  }
}

export function formatGazetteIssueContents(bundle){
  if(!bundle || bundle.state==="not_loaded"){
    return [
      "Содржина на бројот:",
      "• Содржинскиот регистар за оваа година сè уште не е промовиран во governed runtime.",
      "• Метаподатокот за бројот е потврден, но AI Advokat нема да измислува кои акти се објавени."
    ].join("\n");
  }
  if(bundle.state==="unavailable"){
    return [
      "Содржина на бројот:",
      "• Содржинскиот регистар е технички недостапен.",
      "• Метаподатокот останува валиден; список на акти не е генериран."
    ].join("\n");
  }
  if(bundle.state==="matched_empty"){
    return [
      "Содржина на бројот:",
      "• Официјалниот хронолошки регистар за годината е поминат низ reconciliation, но за овој број нема runtime ставки.",
      "• Ова не се претвора автоматски во тврдење дека бројот нема содржина; потребна е проверка на самиот број."
    ].join("\n");
  }
  if(bundle.state!=="matched" || !Array.isArray(bundle.items)){
    return "Содржина на бројот: статусот не е утврден.";
  }

  const lines=[
    `Содржина на предметниот број — ${bundle.items.length} регистарски ставки:`
  ];
  bundle.items.forEach((item,index)=>{
    const type=gazetteActTypeLabel(item.act_type);
    const page=Number(item.page_start)>0 ? ` · стр. ${Number(item.page_start)}` : "";
    lines.push(`${index+1}. ${type} — ${String(item.title||"").trim()}${page}`);
  });

  lines.push(
    "",
    `Комплетност на регистарот: ${bundle.complete?"ДА — целосно според reconciled официјален хронолошки регистар":"НЕ — резултатот е ограничен или нецелосен"}.`,
    "Изворна класа: PRIMARY OFFICIAL CHRONOLOGICAL REGISTER METADATA.",
    "Правна граница: овој список потврдува дека ставките се заведени во официјалниот хронолошки регистар за предметниот број; не го заменува full-text на актите и сам по себе не докажува тековна важност."
  );
  return lines.join("\n");
}
