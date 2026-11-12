const $=id=>document.getElementById(id);
const JUR={MK:"Северна Македонија",AT:"Австрија",RS:"Србија",DE:"Германија",AL:"Албанија",XK:"Косово",TR:"Турција",EU:"ЕУ / супранационално"};
let currentPlan=null;

function value(id){return $(id)?.value?.trim()||""}
function checked(id){return Boolean($(id)?.checked)}
function item(title,text){const d=document.createElement("div");d.className="item";const b=document.createElement("b");b.textContent=title;const p=document.createElement("p");p.textContent=text;d.append(b,p);return d}
function clear(node){while(node.firstChild)node.removeChild(node.firstChild)}
function listHost(id,items){const host=$(id);clear(host);if(!items.length){host.textContent="Нема автоматски детектирана ставка.";host.className="output muted";return}host.className="output";const ul=document.createElement("ul");for(const x of items){const li=document.createElement("li");li.textContent=x;ul.appendChild(li)}host.appendChild(ul)}

export function buildHybridMatterPlan(input){
  const crossBorder=Boolean(input.foreignJurisdiction&&input.foreignJurisdiction!==input.homeJurisdiction);
  const team=[
    {role:"Lead Legal",why:"Води правна квалификација, извори, процесна стратегија и Human Gate."}
  ];
  if(crossBorder) team.push({role:"Cross-Border Counsel",why:"Проверува надлежност, применливо право, признавање/извршување и локален counsel."});
  if(input.hasDigitalEvidence) team.push({role:"Digital Evidence / IT Forensics",why:"Автентичност, metadata, chain of custody и технички ограничувања."});
  if(input.hasFinance) team.push({role:"Finance / Tax Specialist",why:"Финансиска изложеност, даночни импликации и бројчени претпоставки."});
  if(input.hasMedical) team.push({role:"Medical / Psychology Expert",why:"Стручно прашање се издвојува од правната оценка; AI не симулира медицинско вештачење."});
  if(input.hasTechnical) team.push({role:"Technical Expert",why:"Градежно, инженерско или друго стручно прашање со посебен Expert Brief."});

  const missing=[];
  if(!input.facts||input.facts.length<80) missing.push("Подетална фактичка хронологија со датуми и извори.");
  if(input.hasContract) missing.push("Комплетен договор, анекси, клаузула за применливо право и надлежност/арбитража.");
  if(input.hasDeadline) missing.push("Точен датум на настан, прием, достава или рок; официјално пресметување на процесниот рок.");
  if(input.hasDigitalEvidence) missing.push("Оригинални пораки/датотеки, header metadata и зачуван chain of custody.");
  if(crossBorder) missing.push("Потврда од локален правник за странското право и процесните правила.");
  if(!input.hasContract&&!input.hasDigitalEvidence) missing.push("Примарни документи што директно ја поддржуваат главната фактичка теза.");

  const preventive=[
    "Провери рокови и можни preclusion/limitation ризици пред било каква consequential action.",
    "Оддели FACT од правна квалификација и од претпоставка.",
    "Зачувај оригинални докази и provenance пред редакција или превод."
  ];
  if(crossBorder) preventive.push("Не пренесувај автоматски македонско право во странската јурисдикција; направи двојна проверка.");

  const jurisdictionMatrix=[
    "Primary: "+(JUR[input.homeJurisdiction]||input.homeJurisdiction||"неутврдено"),
    crossBorder?"Secondary: "+(JUR[input.foreignJurisdiction]||input.foreignJurisdiction):"Secondary: нема",
    crossBorder?"Провери: forum / applicable law / service / evidence / recognition & enforcement.":"Провери: стварна и месна надлежност, применлива постапка и правни лекови.",
    crossBorder?"Локален counsel: REQUIRED before reliance on foreign-law conclusion.":"Локален counsel: според ризикот и видот на предметот."
  ];

  let authority=20,evidence=15,procedure=20,jurisdiction=35;
  if(input.hasContract) evidence+=20;
  if(input.hasDigitalEvidence) evidence+=15;
  if(input.facts&&input.facts.length>=80) evidence+=20;
  if(input.hasDeadline) procedure+=20;
  if(input.stage==="litigation"||input.stage==="appeal") procedure+=15;
  if(input.homeJurisdiction) jurisdiction+=30;
  if(crossBorder) jurisdiction-=10; else jurisdiction+=20;
  authority+=input.legalArea?25:0;
  authority+=input.homeJurisdiction?20:0;
  const clamp=n=>Math.max(0,Math.min(100,n));
  authority=clamp(authority);evidence=clamp(evidence);procedure=clamp(procedure);jurisdiction=clamp(jurisdiction);
  const average=(authority+evidence+procedure+jurisdiction)/4;
  const risk=average>=75?"НИЗОК СТРУКТУРЕН РИЗИК":average>=50?"СРЕДЕН СТРУКТУРЕН РИЗИК":"ВИСОК СТРУКТУРЕН РИЗИК";

  return {
    version:"HYBRID_MATTER_COMMAND_R1",
    status:"WORKING_MATERIAL_HUMAN_GATE_LOCKED",
    matter:{title:input.title||"Ненасловен предмет",legalArea:input.legalArea,stage:input.stage,homeJurisdiction:input.homeJurisdiction,foreignJurisdiction:input.foreignJurisdiction||null},
    team,
    jurisdictionMatrix,
    missingEvidence:missing,
    preventiveRadar:preventive,
    strategies:[
      {name:"Strategy A · Preserve & Verify",text:"Зачувај докази, заклучи timeline, провери надлежност и рокови; без надворешно дејство пред verification."},
      {name:"Strategy B · Controlled Engagement",text:"Подготви правна позиција и контролирана комуникација/преговори со јасни non-admission и escalation граници."},
      {name:"Strategy C · Procedural Action",text:"Подготви поднесок или процесен чекор само по source verification, deadline check и адвокатски Human Gate."}
    ],
    readiness:{authority,evidence,procedure,jurisdiction,risk,outcomePrediction:false},
    humanGate:{required:true,locked:true,checks:["official_sources","jurisdiction","evidence","deadlines","lawyer_approval"]}
  };
}

function collect(){
  return {
    title:value("matterTitle"),legalArea:value("legalArea"),stage:value("stage"),facts:value("facts"),
    homeJurisdiction:value("homeJurisdiction"),foreignJurisdiction:value("foreignJurisdiction"),
    hasContract:checked("hasContract"),hasDeadline:checked("hasDeadline"),hasDigitalEvidence:checked("hasDigitalEvidence"),
    hasFinance:checked("hasFinance"),hasMedical:checked("hasMedical"),hasTechnical:checked("hasTechnical")
  };
}
function render(plan){
  $("authorityScore").textContent=plan.readiness.authority;
  $("evidenceScore").textContent=plan.readiness.evidence;
  $("procedureScore").textContent=plan.readiness.procedure;
  $("jurisdictionScore").textContent=plan.readiness.jurisdiction;
  $("riskLevel").textContent=plan.readiness.risk;
  const team=$("teamGrid");clear(team);for(const x of plan.team)team.appendChild(item(x.role,x.why));
  listHost("crossBorder",plan.jurisdictionMatrix);
  listHost("missingEvidence",[...plan.missingEvidence,...plan.preventiveRadar]);
  const s=$("strategies");clear(s);for(const x of plan.strategies)s.appendChild(item(x.name,x.text));
  $("exportPlan").disabled=false;
}
$("buildPlan").addEventListener("click",()=>{
  const input=collect();
  if(!input.title){$("status").textContent="Внесете назив на предмет.";return}
  currentPlan=buildHybridMatterPlan(input);
  render(currentPlan);
  $("status").textContent="Hybrid работната карта е создадена локално. Human Gate останува LOCKED.";
});
$("clearPlan").addEventListener("click",()=>location.reload());
$("exportPlan").addEventListener("click",()=>{
  if(!currentPlan)return;
  const blob=new Blob([JSON.stringify(currentPlan,null,2)],{type:"application/json"});
  const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="ai-advokat-hybrid-matter-plan.json";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
