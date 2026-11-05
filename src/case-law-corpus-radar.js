import { CASE_LAW_1000_TARGET, auditCaseLawDiversity } from "./case-law-curation-engine.js";

function n(v){return Number(v||0)||0;}
function key(v){return String(v||"unknown").trim()||"unknown";}

export function summarizeCaseLawCorpus(rows=[],discoveryRecords=[]){
  const reviewed=Array.isArray(rows)?rows:[];
  const discovery=Array.isArray(discoveryRecords)?discoveryRecords:[];
  const hierarchy={supreme:0,appellate:0,constitutional:0,echr:0,first_instance_and_administrative:0,other:0};
  const outcomeRoles={supporting:0,adverse:0,distinguishing:0,neutral:0,other:0};
  const issueRecords=[];

  for(const row of reviewed){
    const level=key(row.court_level).toLowerCase();
    const jurisdiction=key(row.jurisdiction).toUpperCase();
    if(level==="supreme") hierarchy.supreme++;
    else if(level==="appellate") hierarchy.appellate++;
    else if(level==="constitutional") hierarchy.constitutional++;
    else if(jurisdiction==="ECHR" || level.includes("echr")) hierarchy.echr++;
    else if(level==="basic" || level.includes("administrative")) hierarchy.first_instance_and_administrative++;
    else hierarchy.other++;

    const role=key(row.outcome_side).toLowerCase();
    if(["supporting","favorable","favourable"].includes(role)) outcomeRoles.supporting++;
    else if(["adverse","contrary","unfavorable","unfavourable"].includes(role)) outcomeRoles.adverse++;
    else if(role==="distinguishing") outcomeRoles.distinguishing++;
    else if(role==="neutral"||role==="unknown") outcomeRoles.neutral++;
    else outcomeRoles.other++;

    issueRecords.push({
      legal_area:row.legal_area||"",
      legal_issue_keys:row.legal_issue_keys||"",
      title:row.case_title||""
    });
  }

  const discoveryIssueRecords=discovery.map(x=>({i:x.i||"",title:x.n||""}));
  const diversity=auditCaseLawDiversity([...issueRecords,...discoveryIssueRecords],1000);
  const targets={
    supreme:CASE_LAW_1000_TARGET.supreme,
    appellate:CASE_LAW_1000_TARGET.appellate,
    constitutional:CASE_LAW_1000_TARGET.constitutional,
    echr:CASE_LAW_1000_TARGET.echr,
    first_instance_and_administrative:CASE_LAW_1000_TARGET.first_instance_and_administrative
  };
  const hierarchyGaps=Object.entries(targets).map(([id,target])=>({
    id,
    current:n(hierarchy[id]),
    target,
    gap:Math.max(0,target-n(hierarchy[id]))
  })).sort((a,b)=>b.gap-a.gap);

  return {
    reviewedAuthorityCount:reviewed.length,
    discoveryCount:discovery.length,
    totalVisibleCorpus:reviewed.length+discovery.length,
    hierarchy,
    hierarchyGaps,
    outcomeRoles,
    diversity,
    nextPriority:hierarchyGaps[0]||null,
    authorityBoundary:"Reviewed authority and discovery-only records remain separate. Counts never promote authority.",
    humanGateRequired:true
  };
}

export function corpusRadarPrompt(summary={}){
  const priorities=(summary?.diversity?.nextCollectionPriorities||[]).slice(0,5)
    .map(x=>x.bucket+" (gap "+x.gap+")").join(", ");
  const hierarchy=(summary?.hierarchyGaps||[]).slice(0,4)
    .map(x=>x.id+" (gap "+x.gap+")").join(", ");
  return [
    "AI Advokat, подготви план за следниот пакет судска практика според Case-Law Corpus Radar.",
    "Не оптимизирај за број на документи, туку за правна покриеност, authority diversity, спротивни исходи и provenance.",
    hierarchy?"Hierarchy gaps: "+hierarchy+".":"",
    priorities?"Issue gaps: "+priorities+".":"",
    "За предложениот пакет наведи: приоритетен суд/извор, правни теми, минимален квалитет, потребни metadata полиња, dedupe правило, supporting/adverse/distinguishing баланс и Human Gate чекори.",
    "Не промовирај discovery-only материјал во citable authority без official item binding и review."
  ].filter(Boolean).join("\n");
}
