// AI Advokat Hybrid Legal Intelligence Engine R1
// Five governed capabilities:
// 1) Article Time Machine
// 2) Law <-> Bylaw graph
// 3) Law <-> Case-Law by Article
// 4) Legal Effective-Date Calendar
// 5) Visual Consolidation Diff
//
// Pure deterministic functions only. No network access, no autonomous authority promotion.

export const HYBRID_LEGAL_INTELLIGENCE_VERSION="AI_ADVOCAT_HYBRID_LEGAL_INTELLIGENCE_R1";

const ISO=/^\d{4}-\d{2}-\d{2}$/;
const REVIEWED=new Set(["approved","reviewed"]);

function clean(v,max=4000){
  if(v===undefined||v===null)return null;
  const s=String(v).normalize("NFKC").trim();
  return s?s.slice(0,max):null;
}
function normArticle(v){
  return String(v??"").normalize("NFKC").toLocaleLowerCase("mk")
    .replace(/[–—−]/g,"-").replace(/^член(?:от|ови|овите)?\s*/u,"")
    .replace(/\s+/g,"").trim();
}
function validDate(v){return typeof v==="string"&&ISO.test(v);}
function inWindow(date,start,end){
  return validDate(date)&&(!start||start<=date)&&(!end||date<end);
}
function articleText(row){return clean(row?.article_text??row?.text??"",200000)||"";}
function rowVersionStart(row){
  return row?.application_from||row?.valid_from||row?.version_application_from||row?.version_valid_from||null;
}
function rowVersionEnd(row){
  return row?.valid_to||row?.version_valid_to||null;
}

export function articleTimeMachine(articleRows,{instrumentKey=null,articleNumber,referenceDate}={}){
  if(!Array.isArray(articleRows))throw new TypeError("article_rows_required");
  const n=normArticle(articleNumber);
  if(!n)throw new TypeError("article_number_required");
  if(!validDate(referenceDate))return Object.freeze({ok:false,error:"invalid_reference_date"});

  const candidates=articleRows.filter(r=>{
    if(instrumentKey&&String(r.instrument_key||r.canonical_key||"")!==String(instrumentKey))return false;
    return normArticle(r.article_number_normalized||r.article_number)===n;
  });

  const applicable=candidates.filter(r=>inWindow(referenceDate,rowVersionStart(r),rowVersionEnd(r)));
  if(applicable.length!==1){
    return Object.freeze({
      ok:false,
      error:applicable.length?"article_version_ambiguous":"article_version_not_found_on_date",
      articleNumber:n,
      referenceDate,
      candidates:Object.freeze(candidates.map(r=>Object.freeze({
        versionId:r.instrument_version_id??r.version_id??null,
        versionLabel:clean(r.version_label||r.instrument_version_label,240),
        validFrom:rowVersionStart(r),
        validTo:rowVersionEnd(r),
        sourceUrl:clean(r.source_url,1200),
        sourceSha256:clean(r.source_sha256,80)
      })))
    });
  }

  const row=applicable[0];
  return Object.freeze({
    ok:true,
    instrumentKey:clean(row.instrument_key||row.canonical_key||instrumentKey,160),
    articleNumber:n,
    referenceDate,
    articleText:articleText(row),
    articleHeading:clean(row.article_heading,500),
    version:Object.freeze({
      id:row.instrument_version_id??row.version_id??null,
      label:clean(row.version_label||row.instrument_version_label,240),
      validFrom:rowVersionStart(row),
      applicationFrom:row.application_from||row.version_application_from||null,
      validTo:rowVersionEnd(row),
      humanReviewStatus:clean(row.version_human_review_status||row.human_review_status,80)
    }),
    provenance:Object.freeze({
      sourceUrl:clean(row.source_url,1200),
      sourceSha256:clean(row.source_sha256,80),
      sourceIssueNumber:clean(row.source_issue_number,80),
      sourceIssueDate:clean(row.source_issue_date,40),
      derivationTrace:row.derivation_trace??row.derived_from??null
    }),
    humanGateRequired:true
  });
}

export function buildDelegatedLegislationGraph(records,{instrumentKey=null}={}){
  if(!Array.isArray(records))throw new TypeError("delegated_legislation_records_required");
  const edges=[];
  const rejected=[];
  for(const r of records){
    if(instrumentKey&&String(r.parent_instrument_key||r.instrument_key||"")!==String(instrumentKey))continue;
    const parent=clean(r.parent_instrument_key||r.instrument_key,160);
    const child=clean(r.bylaw_key||r.child_instrument_key,160);
    const sourceUrl=clean(r.source_url,1200);
    const basisArticle=normArticle(r.basis_article||r.delegating_article||"");
    const authority=String(r.authority_status||"").toLowerCase();
    const reviewed=REVIEWED.has(String(r.human_review_status||"").toLowerCase());
    const official=authority==="primary_official"||authority==="official_supporting"||r.official_source===true||Number(r.official_source)===1;
    if(!parent||!child||!sourceUrl||!basisArticle||!official||!reviewed){
      rejected.push(Object.freeze({id:r.id??null,reason:"delegated_legislation_not_official_reviewed_and_bound"}));
      continue;
    }
    edges.push(Object.freeze({
      id:r.id??null,
      parentInstrumentKey:parent,
      basisArticle,
      childInstrumentKey:child,
      childTitle:clean(r.bylaw_title||r.child_title,500),
      actType:clean(r.act_type||r.document_type,120),
      sourceUrl,
      sourceIssueNumber:clean(r.source_issue_number,80),
      publicationDate:clean(r.publication_date,40),
      effectiveFrom:clean(r.effective_from||r.valid_from,40),
      applicationFrom:clean(r.application_from,40),
      status:clean(r.status||"verified_link",120),
      humanReviewStatus:String(r.human_review_status),
      humanGateRequired:true
    }));
  }
  return Object.freeze({
    version:HYBRID_LEGAL_INTELLIGENCE_VERSION,
    edges:Object.freeze(edges),
    rejected:Object.freeze(rejected),
    safeguards:Object.freeze({
      officialSourceRequired:true,
      delegatingArticleRequired:true,
      humanReviewRequired:true,
      secondaryDiscoveryCannotCreateAuthority:true
    })
  });
}

function splitArticles(value){
  if(Array.isArray(value))return value.map(normArticle).filter(Boolean);
  return String(value||"").split(/[,;|]/).map(normArticle).filter(Boolean);
}

export function buildArticleCaseLawGraph(records,{instrumentKey=null,articleNumber=null}={}){
  if(!Array.isArray(records))throw new TypeError("case_law_records_required");
  const target=articleNumber?normArticle(articleNumber):null;
  const links=[];
  const rejected=[];
  for(const r of records){
    const official=String(r.source_status||"")==="official";
    const binding=r.official_binding_verified===true||Number(r.official_binding_verified)===1;
    const reviewed=REVIEWED.has(String(r.human_review_status||"").toLowerCase())
      && REVIEWED.has(String(r.authority_review_status||"").toLowerCase());
    const sourceUrl=clean(r.source_url||r.registry_source_url,1200);
    const key=clean(r.instrument_key||r.domestic_instrument_key,160);
    const arts=splitArticles(r.domestic_articles||r.article_numbers||[]);
    if(instrumentKey&&key&&key!==String(instrumentKey))continue;
    if(target&&!arts.includes(target))continue;
    if(!official||!binding||!reviewed||!sourceUrl||!arts.length){
      rejected.push(Object.freeze({caseLawId:r.id??null,reason:"case_law_not_official_bound_dual_reviewed"}));
      continue;
    }
    for(const a of arts){
      if(target&&a!==target)continue;
      links.push(Object.freeze({
        caseLawId:r.id??null,
        instrumentKey:key||instrumentKey||null,
        articleNumber:a,
        caseTitle:clean(r.case_title,500),
        court:clean(r.court,240),
        caseNumber:clean(r.case_number,120),
        decisionDate:clean(r.decision_date,40),
        decisionType:clean(r.decision_type,100),
        finalityStatus:clean(r.finality_status,100),
        precedentialWeight:clean(r.precedential_weight,100),
        holding:clean(r.reviewed_holdings,2500),
        reasoningSummary:clean(r.reasoning_summary,2500),
        sourceUrl,
        humanReviewStatus:String(r.human_review_status),
        authorityReviewStatus:String(r.authority_review_status),
        humanGateRequired:true
      }));
    }
  }
  links.sort((a,b)=>String(b.decisionDate||"").localeCompare(String(a.decisionDate||"")));
  return Object.freeze({
    version:HYBRID_LEGAL_INTELLIGENCE_VERSION,
    links:Object.freeze(links),
    rejected:Object.freeze(rejected),
    safeguards:Object.freeze({
      officialBindingRequired:true,
      dualHumanReviewRequired:true,
      articleLinkMustBeExplicit:true,
      adverseAuthorityMustNotBeHidden:true
    })
  });
}

export function buildLegalEffectiveDateCalendar(records,{from,to,includePublication=false}={}){
  if(!Array.isArray(records))throw new TypeError("legal_calendar_records_required");
  if(!validDate(from)||!validDate(to)||to<from)return Object.freeze({ok:false,error:"invalid_calendar_window"});
  const events=[];
  for(const r of records){
    const base={
      id:r.id??null,
      instrumentKey:clean(r.instrument_key||r.canonical_key,160),
      title:clean(r.instrument_title||r.title||r.amendment_title,600),
      actType:clean(r.act_type||r.kind,120),
      sourceUrl:clean(r.source_url,1200),
      sourceIssueNumber:clean(r.source_issue_number||r.gazette_issue,80),
      humanReviewStatus:clean(r.human_review_status,80),
      humanGateRequired:true
    };
    const add=(date,eventType,label)=>{
      if(validDate(date)&&from<=date&&date<=to)events.push(Object.freeze({...base,date,eventType,label}));
    };
    if(includePublication)add(r.publication_date||r.source_issue_date,"PUBLICATION","Објавување");
    add(r.entry_into_force_date||r.valid_from||r.effective_from,"ENTRY_INTO_FORCE","Стапување во сила");
    add(r.application_from,"APPLICATION_START","Почеток на примена");
    add(r.valid_to||r.application_to,"APPLICATION_END","Престанок/крај на примена");
    add(r.legal_effect_from,"LEGAL_EFFECT","Правно дејство");
  }
  events.sort((a,b)=>a.date.localeCompare(b.date)||String(a.title||"").localeCompare(String(b.title||"")));
  return Object.freeze({
    ok:true,
    version:HYBRID_LEGAL_INTELLIGENCE_VERSION,
    from,to,
    events:Object.freeze(events),
    counts:Object.freeze({
      total:events.length,
      entryIntoForce:events.filter(x=>x.eventType==="ENTRY_INTO_FORCE").length,
      applicationStart:events.filter(x=>x.eventType==="APPLICATION_START").length,
      applicationEnd:events.filter(x=>x.eventType==="APPLICATION_END").length,
      legalEffect:events.filter(x=>x.eventType==="LEGAL_EFFECT").length
    }),
    humanGateRequired:true
  });
}

function indexArticles(rows){
  const map=new Map();
  for(const r of Array.isArray(rows)?rows:[]){
    const n=normArticle(r.article_number_normalized||r.article_number||r.number);
    if(n)map.set(n,r);
  }
  return map;
}

export function visualConsolidationDiff(beforeRows,afterRows,{instrumentKey=null,beforeLabel=null,afterLabel=null}={}){
  const before=indexArticles(beforeRows),after=indexArticles(afterRows);
  const numbers=[...new Set([...before.keys(),...after.keys()])].sort((a,b)=>a.localeCompare(b,"mk",{numeric:true}));
  const rows=[];
  for(const n of numbers){
    const b=before.get(n),a=after.get(n);
    let changeType;
    if(!b)changeType="ADDED";
    else if(!a)changeType="REMOVED";
    else changeType=articleText(b)===articleText(a)?"UNCHANGED":"MODIFIED";
    rows.push(Object.freeze({
      instrumentKey:instrumentKey||clean(a?.instrument_key||b?.instrument_key,160),
      articleNumber:n,
      changeType,
      beforeText:b?articleText(b):null,
      afterText:a?articleText(a):null,
      beforeHeading:clean(b?.article_heading,500),
      afterHeading:clean(a?.article_heading,500),
      beforeSourceUrl:clean(b?.source_url,1200),
      afterSourceUrl:clean(a?.source_url,1200),
      beforeDerivation:b?.derivation_trace??b?.derived_from??null,
      afterDerivation:a?.derivation_trace??a?.derived_from??null
    }));
  }
  return Object.freeze({
    version:HYBRID_LEGAL_INTELLIGENCE_VERSION,
    instrumentKey,
    beforeLabel:clean(beforeLabel,240),
    afterLabel:clean(afterLabel,240),
    rows:Object.freeze(rows),
    counts:Object.freeze({
      added:rows.filter(x=>x.changeType==="ADDED").length,
      removed:rows.filter(x=>x.changeType==="REMOVED").length,
      modified:rows.filter(x=>x.changeType==="MODIFIED").length,
      unchanged:rows.filter(x=>x.changeType==="UNCHANGED").length
    }),
    releaseBoundary:"WORKING_DIFF_NOT_CURRENT_LAW_AUTHORITY",
    humanGateRequired:true
  });
}

export function hybridLegalIntelligenceSummary({
  articleRows=[],
  delegatedLegislation=[],
  caseLawRecords=[],
  calendarRecords=[],
  beforeArticles=[],
  afterArticles=[],
  query={}
}={}){
  const timeMachine=query.articleNumber&&query.referenceDate
    ? articleTimeMachine(articleRows,{instrumentKey:query.instrumentKey,articleNumber:query.articleNumber,referenceDate:query.referenceDate})
    : null;
  const bylaws=buildDelegatedLegislationGraph(delegatedLegislation,{instrumentKey:query.instrumentKey});
  const caseLaw=buildArticleCaseLawGraph(caseLawRecords,{instrumentKey:query.instrumentKey,articleNumber:query.articleNumber});
  const calendar=query.calendarFrom&&query.calendarTo
    ? buildLegalEffectiveDateCalendar(calendarRecords,{from:query.calendarFrom,to:query.calendarTo})
    : null;
  const diff=visualConsolidationDiff(beforeArticles,afterArticles,{instrumentKey:query.instrumentKey,beforeLabel:query.beforeLabel,afterLabel:query.afterLabel});
  return Object.freeze({
    version:HYBRID_LEGAL_INTELLIGENCE_VERSION,
    timeMachine,
    bylaws,
    caseLaw,
    calendar,
    diff,
    authorityBoundary:Object.freeze({
      primaryLawMustComeFromOfficialSource:true,
      secondarySignalsAreDiscoveryOnly:true,
      currentLawPromotionRequiresHumanGate:true
    })
  });
}
