const TYPE_LABELS=Object.freeze({
  law:"Закон",
  decision:"Одлука",
  rulebook:"Правилник",
  decree:"Уредба",
  resolution:"Решение",
  correction:"Исправка",
  order:"Наредба",
  program:"Програма",
  statute:"Статут",
  instruction:"Упатство",
  announcement:"Објава",
  other:"Друго"
});

function safeText(v){ return String(v??"").trim(); }

export function gazetteActTypeLabel(value){
  const key=safeText(value).toLowerCase();
  return TYPE_LABELS[key]||safeText(value)||TYPE_LABELS.other;
}

export async function findGazetteIssueContents(env,{issueNumber,year}={}){
  const issue=safeText(issueNumber);
  const y=Number(year||0);
  if(!issue || !Number.isInteger(y) || y<1944 || y>2100){
    return {state:"invalid",issue:null,acts:[],total:0,allReviewed:false};
  }
  try{
    const issueRow=await env.DB.prepare(
      `SELECT id,publication_name,publication_name_historical,year,issue_number,issue_date,
              edition_label,source_url,source_access_class,source_sha256,page_count,
              chronological_register_url,human_review_status,provenance_checked_at,notes
         FROM gazette_issues
        WHERE year=? AND issue_number=?
        ORDER BY CASE human_review_status WHEN 'approved' THEN 0 WHEN 'reviewed' THEN 1 ELSE 2 END,id
        LIMIT 1`
    ).bind(y,issue).first();

    if(!issueRow){
      return {state:"not_indexed",issue:null,acts:[],total:0,allReviewed:false};
    }

    const rows=await env.DB.prepare(
      `SELECT id,source_key,ordinal_in_issue,act_number,act_type,title,issuer,
              page_start,page_end,source_url,source_sha256,canonical_instrument_key,
              legal_effect_class,effective_date,application_date,human_review_status
         FROM gazette_acts
        WHERE issue_id=?
        ORDER BY CASE WHEN ordinal_in_issue IS NULL THEN 1 ELSE 0 END,
                 ordinal_in_issue,
                 CASE WHEN page_start IS NULL THEN 1 ELSE 0 END,
                 page_start,
                 id`
    ).bind(issueRow.id).all();

    const acts=(rows.results||[]).map(row=>({
      id:Number(row.id),
      sourceKey:safeText(row.source_key),
      ordinalInIssue:row.ordinal_in_issue==null?null:Number(row.ordinal_in_issue),
      actNumber:safeText(row.act_number)||null,
      actType:safeText(row.act_type)||"other",
      actTypeLabel:gazetteActTypeLabel(row.act_type),
      title:safeText(row.title),
      issuer:safeText(row.issuer)||null,
      pageStart:row.page_start==null?null:Number(row.page_start),
      pageEnd:row.page_end==null?null:Number(row.page_end),
      sourceUrl:safeText(row.source_url)||null,
      sourceSha256:safeText(row.source_sha256)||null,
      canonicalInstrumentKey:safeText(row.canonical_instrument_key)||null,
      legalEffectClass:safeText(row.legal_effect_class)||null,
      effectiveDate:safeText(row.effective_date)||null,
      applicationDate:safeText(row.application_date)||null,
      humanReviewStatus:safeText(row.human_review_status)||"pending"
    }));

    const allReviewed=acts.length>0
      && ["reviewed","approved"].includes(safeText(issueRow.human_review_status))
      && acts.every(a=>["reviewed","approved"].includes(a.humanReviewStatus));

    return {
      state:acts.length?"matched":"issue_only",
      issue:{
        id:Number(issueRow.id),
        publicationName:safeText(issueRow.publication_name),
        publicationNameHistorical:safeText(issueRow.publication_name_historical)||null,
        year:Number(issueRow.year),
        issueNumber:safeText(issueRow.issue_number),
        issueDate:safeText(issueRow.issue_date)||null,
        editionLabel:safeText(issueRow.edition_label)||null,
        sourceUrl:safeText(issueRow.source_url)||null,
        sourceAccessClass:safeText(issueRow.source_access_class)||null,
        sourceSha256:safeText(issueRow.source_sha256)||null,
        pageCount:issueRow.page_count==null?null:Number(issueRow.page_count),
        chronologicalRegisterUrl:safeText(issueRow.chronological_register_url)||null,
        humanReviewStatus:safeText(issueRow.human_review_status)||"pending",
        provenanceCheckedAt:safeText(issueRow.provenance_checked_at)||null,
        notes:safeText(issueRow.notes)||null
      },
      acts,
      total:acts.length,
      allReviewed
    };
  }catch(error){
    return {state:"unavailable",issue:null,acts:[],total:0,allReviewed:false,error:safeText(error?.message||error).slice(0,220)};
  }
}

function actLine(act,index){
  const pieces=[`${index+1}. [${act.actTypeLabel}] ${act.title||"Без наслов"}`];
  if(act.actNumber) pieces.push(`акт бр. ${act.actNumber}`);
  if(act.issuer) pieces.push(`доносител: ${act.issuer}`);
  if(act.pageStart!=null){
    const page=act.pageEnd!=null&&act.pageEnd!==act.pageStart
      ? `${act.pageStart}-${act.pageEnd}`
      : String(act.pageStart);
    pieces.push(`стр. ${page}`);
  }
  if(act.humanReviewStatus) pieces.push(`HG: ${act.humanReviewStatus}`);
  return pieces.join(" · ");
}

export function formatGazetteIssueContents(bundle){
  if(!bundle || bundle.state==="unavailable"){
    return [
      "Содржина на бројот:",
      "• Act-level индексот е привремено недостапен. Не е создаден или измислен список на акти."
    ].join("\n");
  }
  if(bundle.state==="not_indexed" || bundle.state==="issue_only"){
    return [
      "Содржина на бројот:",
      "• За овој број сè уште нема активиран act-level индекс од официјалниот хронолошки регистар.",
      "• Затоа AI Advokat не наведува закони, одлуки, правилници или други акти без изворна потврда."
    ].join("\n");
  }

  const counts=new Map();
  for(const act of bundle.acts){
    const label=act.actTypeLabel||"Друго";
    counts.set(label,(counts.get(label)||0)+1);
  }
  const summary=[...counts.entries()].map(([label,n])=>`${label}: ${n}`).join(" · ");
  const lines=[
    "Содржина на бројот:",
    `• Вкупно индексирани акти: ${bundle.total}`,
    summary?`• По вид: ${summary}`:null,
    `• Статус на листата: ${bundle.allReviewed?"Human-Gate проверена":"официјален register-index / Human Gate сè уште не е финализиран"}`,
    ""
  ].filter(Boolean);

  bundle.acts.forEach((act,index)=>lines.push(actLine(act,index)));
  lines.push(
    "",
    "Граница на употреба:",
    "• Ова е индекс на објавените акти во конкретниот број, не е автоматско тврдење дека секој акт и денес е важечки.",
    "• За важност, изменетост, стапување во сила и примена се отвора конкретниот акт и се прави посебна version/current-law проверка."
  );
  return lines.join("\n");
}
