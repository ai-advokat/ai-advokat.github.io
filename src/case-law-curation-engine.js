export const CASE_LAW_CURATION_VERSION="AI_ADVOCAT_CASE_LAW_CURATION_V1";

export const CASE_LAW_1000_TARGET=Object.freeze({
  supreme:250,
  appellate:350,
  constitutional:100,
  echr:150,
  first_instance_and_administrative:100,
  counter_authority_reserve:50
});

const LEVEL_POINTS=Object.freeze({
  supreme:25,
  constitutional:24,
  echr_grand_chamber:25,
  echr_chamber:22,
  appellate:18,
  administrative_high:18,
  basic:10,
  other:8
});

function clamp(n,min,max){return Math.max(min,Math.min(max,Number(n)||0));}
function text(v){return String(v??"").normalize("NFKC").trim();}
function norm(v){return text(v).toLocaleLowerCase("mk");}

export function scoreCaseForCuration(record={}){
  const level=norm(record.court_level||record.courtLevel||record.level);
  const authority=LEVEL_POINTS[level] ?? clamp(record.authority_score,0,25);
  const legalUsefulness=clamp(record.legal_usefulness ?? record.legalUsefulness ?? 10,0,20);
  const recurrence=clamp(record.recurrence ?? record.issue_recurrence ?? 8,0,15);
  const reasoning=clamp(record.reasoning_quality ?? record.reasoningQuality ?? 8,0,15);
  const distinctiveness=clamp(record.distinctiveness ?? 5,0,10);
  const recency=clamp(record.recency ?? 3,0,5);
  const provenance=clamp(record.provenance_quality ?? record.provenanceQuality ?? 5,0,10);
  const total=authority+legalUsefulness+recurrence+reasoning+distinctiveness+recency+provenance;
  const selectionClass=total>=85?"A":total>=75?"B":total>=60?"C":"D";
  return {
    version:CASE_LAW_CURATION_VERSION,
    total,
    class:selectionClass,
    dimensions:{authority,legalUsefulness,recurrence,reasoning,distinctiveness,recency,provenance},
    retrievalPriority:selectionClass==="A"?"core_authority_candidate":
      selectionClass==="B"?"high_value_case":
      selectionClass==="C"?"gap_fill_or_comparative":"archive_low_priority",
    authorityPromotion:false,
    humanGateRequired:true
  };
}

function authorityRank(row={}){
  const level=norm(row.court_level||row.courtLevel);
  if(level==="supreme"||level==="echr_grand_chamber") return 5;
  if(level==="constitutional"||level==="echr_chamber") return 4;
  if(level==="appellate"||level==="administrative_high") return 3;
  if(level==="basic") return 2;
  return 1;
}

function rowDate(row={}){return text(row.decision_date||row.decisionDate);}
function role(row={}){return norm(row.outcome_side||row.outcomeRole||row.role||"neutral");}
function identity(row={}){return text(row.id||row.case_law_id||row.caseNumber||row.case_number||row.case_title||row.title);}

export function selectBalancedAuthorities(rows=[],limit=4){
  const safeLimit=Math.max(1,Math.min(8,Number(limit)||4));
  const ranked=[...rows].sort((a,b)=>{
    const scoreDiff=Number(b._score||0)-Number(a._score||0);
    if(scoreDiff) return scoreDiff;
    const authorityDiff=authorityRank(b)-authorityRank(a);
    if(authorityDiff) return authorityDiff;
    return rowDate(b).localeCompare(rowDate(a));
  });

  const buckets={
    supporting:ranked.filter(x=>["supporting","favorable","favourable"].includes(role(x))),
    adverse:ranked.filter(x=>["adverse","contrary","unfavorable","unfavourable"].includes(role(x))),
    distinguishing:ranked.filter(x=>role(x)==="distinguishing"),
    neutral:ranked.filter(x=>!["supporting","favorable","favourable","adverse","contrary","unfavorable","unfavourable","distinguishing"].includes(role(x)))
  };

  const chosen=[];
  const seen=new Set();
  const take=row=>{
    if(!row) return;
    const key=identity(row);
    if(!key||seen.has(key)) return;
    seen.add(key);chosen.push(row);
  };

  take(buckets.supporting[0]);
  take(buckets.adverse[0]);
  take(buckets.distinguishing[0]);

  const strongest=[...ranked].sort((a,b)=>{
    const d=authorityRank(b)-authorityRank(a);
    if(d) return d;
    const scoreDiff=Number(b._score||0)-Number(a._score||0);
    if(scoreDiff) return scoreDiff;
    return rowDate(b).localeCompare(rowDate(a));
  })[0];
  take(strongest);

  for(const row of ranked){
    if(chosen.length>=safeLimit) break;
    take(row);
  }
  return chosen.slice(0,safeLimit);
}

const ISSUE_BUCKETS=Object.freeze([
  {id:"money_laundering",re:/перење пари|money laundering/i,targetShare:0.08},
  {id:"migrant_smuggling",re:/мигрант|криумчарење/i,targetShare:0.08},
  {id:"narcotics",re:/наркот|дрог/i,targetShare:0.08},
  {id:"abuse_of_office",re:/злоупотреба на службен|несовесно работење|поткуп|посредување/i,targetShare:0.08},
  {id:"organized_crime",re:/злосторничко здружување|организирање група/i,targetShare:0.06},
  {id:"evidence_and_fair_trial",re:/доказ|правична постапка|член 6|fair trial/i,targetShare:0.12},
  {id:"detention_and_liberty",re:/притвор|лишување од слобода|член 5|detention/i,targetShare:0.08},
  {id:"property_and_civil",re:/сопственост|имот|договор|надомест|граѓан/i,targetShare:0.12},
  {id:"administrative",re:/управен|administrative/i,targetShare:0.10},
  {id:"constitutional_and_human_rights",re:/устав|човекови права|есчп|echr|конвенц/i,targetShare:0.10}
]);

export function auditCaseLawDiversity(records=[],target=1000){
  const total=records.length;
  const counts=Object.fromEntries(ISSUE_BUCKETS.map(x=>[x.id,0]));
  for(const rec of records){
    const hay=[rec.i,rec.issue,rec.legal_area,rec.legalArea,rec.legal_issue_keys,rec.title].filter(Boolean).join(" ");
    for(const b of ISSUE_BUCKETS) if(b.re.test(hay)) counts[b.id]++;
  }
  const recommendations=ISSUE_BUCKETS.map(b=>{
    const desired=Math.round(target*b.targetShare);
    const current=counts[b.id];
    return {bucket:b.id,current,desired,gap:Math.max(0,desired-current)};
  }).filter(x=>x.gap>0).sort((a,b)=>b.gap-a.gap);

  const concentration=total?Math.max(...Object.values(counts))/total:0;
  return {
    version:CASE_LAW_CURATION_VERSION,
    currentTotal:total,
    targetTotal:target,
    issueCounts:counts,
    concentrationRatio:Number(concentration.toFixed(3)),
    overconcentrationWarning:concentration>0.30,
    nextCollectionPriorities:recommendations.slice(0,8),
    rule:"Optimize legal coverage and authority diversity, not raw document count.",
    humanGateRequired:true
  };
}

export function caseLawCurationPromptPolicy(){
  return [
    "CASE_LAW_CURATION_POLICY: "+CASE_LAW_CURATION_VERSION,
    "Do not cherry-pick favourable authority.",
    "When available, retrieve a balanced set: supporting, adverse, distinguishing, and the strongest/higher authority.",
    "A lower court case never outranks a materially relevant higher authority merely because it is favourable.",
    "Historical law requires temporal verification before current-law use.",
    "Discovery-only material is not citable authority until source binding, holding verification and Human Gate.",
    "Do not infer finality, binding force or precedential status when the record does not prove it."
  ].join("\n");
}
