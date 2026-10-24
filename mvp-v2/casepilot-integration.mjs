// AI ADVOKAT 4 MVP v2 — PR-A Legal Domain Router + CasePilot integration.
// TEST ONLY / SYNTHETIC ONLY / NO PRODUCTION.

import {
  LEGAL_DOMAIN_ROUTER_VERSION,
  classifyLegalDomain,
  assessSourceDomainCompatibility
} from '../src/legal-domain-router.js';
import {
  CASEPILOT_MATTER_VERSION,
  createMatter,
  documentRecord,
  timelineEvent,
  participant,
  legalIssue,
  claim,
  evidenceItem,
  claimEvidenceLink,
  contradiction,
  evidenceGap,
  proceduralRisk,
  aiFinding,
  addMatterObject,
  matterReadiness
} from '../src/casepilot-matter.js';
import {
  CASEPILOT_EXPORT_ADAPTER_VERSION,
  casePilotMatterToExportReport
} from '../src/casepilot-export-adapter.js';

export const PR_A_HEAD='95f666a795354681264f073060ebe9ed5817dfe5';

function t(v){return String(v??'').normalize('NFKC').trim();}
function lines(v){return t(v).split(/\r?\n/).map(t).filter(Boolean);}

function evidenceKey(value){
  const s=t(value).toLowerCase();
  if(/договор.*вработ|вработ.*договор/.test(s)) return 'contract';
  if(/одлука.*отказ|отказ.*одлука/.test(s)) return 'dismissal';
  if(/е-?пошта|email|мејл/.test(s)) return 'email';
  if(/повратница|врачува/.test(s)) return 'delivery';
  if(/интерна.*евиденц|евиденц.*интерна/.test(s)) return 'internal-record';
  if(/лог.*извештај|извештај.*лог/.test(s)) return 'report-log';
  return s.replace(/[^\p{L}\p{N}]+/gu,' ').trim();
}

export function dedupeMvpEvidence(value){
  const seen=new Set(), out=[];
  for(const item of lines(value)){
    const key=evidenceKey(item);
    if(!key||seen.has(key)) continue;
    seen.add(key); out.push(item);
  }
  return Object.freeze(out);
}

export function normalizeMvpV2DossierForIntegration(dossier){
  const d={...(dossier||{})};
  d.otherEvidence=dedupeMvpEvidence(d.otherEvidence).join('\n');
  return Object.freeze(d);
}

export function routeMvpV2LegalDomain(dossier){
  const d=dossier||{};
  const question=[
    d.employerClaim,d.workerClaim,d.notes,
    'работен однос','отказ','враќање на работа'
  ].map(t).filter(Boolean).join(' ');
  return classifyLegalDomain(question);
}

export function validateMvpV2SourceDomain(dossier,sourceDomain,sourceId='synthetic-source'){
  const classification=routeMvpV2LegalDomain(dossier);
  return assessSourceDomainCompatibility(classification,sourceDomain,{
    question:[dossier?.employerClaim,dossier?.workerClaim,'отказ враќање на работа'].map(t).filter(Boolean).join(' '),
    sourceId
  });
}

function add(matter,collection,item){return addMatterObject(matter,collection,item);}

export function buildMvpV2CasePilotMatter(input){
  const d=normalizeMvpV2DossierForIntegration(input);
  let matter=createMatter({
    matterId:'MVP2-SYN-LABOUR-001',
    title:'MVP v2 синтетички работноправен предмет',
    legalArea:'labour_social',
    phase:'pre-filing-working',
    perspective:'worker',
    version:'0.3'
  });

  const docs=[
    documentRecord({id:'DOC-CONTRACT',title:'Договор за вработување',sha256:'1'.repeat(64),pageCount:3}),
    documentRecord({id:'DOC-DISMISSAL',title:'Одлука за отказ',sha256:'2'.repeat(64),pageCount:2}),
    documentRecord({id:'DOC-EMAIL',title:'Е-пошта од раководител',sha256:'3'.repeat(64),pageCount:1}),
    documentRecord({id:'DOC-DELIVERY',title:'Доказ за врачување / повратница',sha256:'4'.repeat(64),pageCount:1}),
    documentRecord({id:'DOC-RECORD',title:'Интерна евиденција',sha256:'5'.repeat(64),pageCount:1})
  ];
  for(const doc of docs) matter=add(matter,'documents',doc);

  matter=add(matter,'participants',participant({id:'P-WORKER',name:t(d.plaintiff),role:'тужител / работник',sourceId:'DOC-CONTRACT',page:1}));
  matter=add(matter,'participants',participant({id:'P-EMPLOYER',name:t(d.defendant),role:'тужен / работодавач',sourceId:'DOC-CONTRACT',page:1}));

  matter=add(matter,'timeline',timelineEvent({id:'T-DISMISSAL',date:t(d.dismissDate)||null,text:'Донесена е наведена одлука за отказ '+t(d.decisionNo)+'.',sourceId:'DOC-DISMISSAL',page:1,status:'confirmed_from_source'}));
  if(t(d.receiveDate)) matter=add(matter,'timeline',timelineEvent({id:'T-DELIVERY-CLAIM',date:t(d.receiveDate),text:'Наведен датум на врачување според странката.',sourceId:'DOC-DELIVERY',page:1,status:'indication'}));
  if(t(d.recordDate)) matter=add(matter,'timeline',timelineEvent({id:'T-DELIVERY-RECORD',date:t(d.recordDate),text:'Наведен датум на врачување според интерната евиденција.',sourceId:'DOC-RECORD',page:1,status:'indication'}));

  matter=add(matter,'legal_issues',legalIssue({
    id:'LI-1',
    title:'Законитост на отказ и враќање на работа',
    question:'Дали се исполнети материјалните и процесните услови за оспорување на отказот и барање враќање на работа?',
    sourceIds:['DOC-DISMISSAL','DOC-CONTRACT','DOC-EMAIL']
  }));

  matter=add(matter,'claims',claim({id:'CL-EMPLOYER',text:t(d.employerClaim),sourceId:'DOC-DISMISSAL',page:1,status:'disputed'}));
  matter=add(matter,'claims',claim({id:'CL-WORKER',text:t(d.workerClaim),sourceId:'DOC-EMAIL',page:1,status:'disputed'}));

  const evidence=[
    evidenceItem({id:'EV-CONTRACT',title:'Договор за вработување',sourceId:'DOC-CONTRACT',page:1,notes:'Работен однос и работно место.'}),
    evidenceItem({id:'EV-DISMISSAL',title:'Одлука за отказ',sourceId:'DOC-DISMISSAL',page:1,notes:'Содржина и образложение на отказната одлука.'}),
    evidenceItem({id:'EV-EMAIL',title:'Е-пошта од раководител',sourceId:'DOC-EMAIL',page:1,notes:t(d.emailText)||'Синтетичка е-пошта за проверка.'}),
    evidenceItem({id:'EV-DELIVERY',title:'Доказ за врачување / повратница',sourceId:'DOC-DELIVERY',page:1,notes:'Датумот на врачување мора да се провери.'}),
    evidenceItem({id:'EV-RECORD',title:'Интерна евиденција',sourceId:'DOC-RECORD',page:1,notes:'Синтетичка интерна евиденција.'})
  ];
  for(const e of evidence) matter=add(matter,'evidence',e);

  matter=add(matter,'claim_evidence',claimEvidenceLink({
    id:'CE-EMPLOYER',claimId:'CL-EMPLOYER',evidenceId:'EV-DISMISSAL',supportType:'supports',counterevidenceIds:['EV-EMAIL']
  }));
  matter=add(matter,'claim_evidence',claimEvidenceLink({
    id:'CE-WORKER',claimId:'CL-WORKER',evidenceId:'EV-EMAIL',supportType:'supports',counterevidenceIds:['EV-DISMISSAL']
  }));

  matter=add(matter,'contradictions',contradiction({
    id:'CP-CON-1',
    left:{text:t(d.employerClaim),sourceId:'DOC-DISMISSAL',page:1},
    right:{text:t(d.workerClaim),sourceId:'DOC-EMAIL',page:1},
    meaning:'Спротивставени тврдења за оправданоста/одобрението на спорното отсуство или работа од дома.',
    question:'Кој документ и која фактичка околност ја потврдуваат конечната верзија?'
  }));
  if(t(d.receiveDate)&&t(d.recordDate)&&t(d.receiveDate)!==t(d.recordDate)){
    matter=add(matter,'contradictions',contradiction({
      id:'CP-CON-2',
      left:{text:'Врачување според странката: '+t(d.receiveDate),sourceId:'DOC-DELIVERY',page:1},
      right:{text:'Врачување според интерна евиденција: '+t(d.recordDate),sourceId:'DOC-RECORD',page:1},
      meaning:'Различен датум на врачување може да влијае врз пресметка на рок.',
      question:'Кој датум е правно релевантен и со кој оригинален доказ се потврдува?'
    }));
  }

  matter=add(matter,'evidence_gaps',evidenceGap({
    id:'GAP-LAW',
    issue:'Недостасува проверена важечка правна основа и официјален извор.',
    whyMaterial:'Без проверена правна основа не смее да се отклучи PROFESSIONAL употреба.',
    collectionPlan:'Проверка на важечкиот закон, роковите, надлежноста и евентуалната претходна правна заштита.'
  }));
  matter=add(matter,'procedural_risks',proceduralRisk({
    id:'RISK-DEADLINE',
    title:'Рок за правна заштита',
    description:'Постојат два синтетички датума поврзани со врачување и рокот не е правно верификуван.',
    severity:'high',
    mitigation:'Да се провери оригиналниот доказ за врачување и важечкиот закон пред професионална употреба.'
  }));
  matter=add(matter,'ai_findings',aiFinding({
    id:'AI-1',
    text:'Постојат материјални противречности и невeрификувани докази што бараат адвокатска проверка.',
    sources:[{sourceId:'DOC-DISMISSAL',page:1},{sourceId:'DOC-EMAIL',page:1}],
    status:'professional_review_required'
  }));

  return matter;
}

export function buildMvpV2CasePilotBundle(dossier){
  const matter=buildMvpV2CasePilotMatter(dossier);
  const readiness=matterReadiness(matter);
  const report=casePilotMatterToExportReport(matter,{
    summary:'Синтетички CasePilot предмет поврзан со MVP v2 WORKING тек.'
  });
  return Object.freeze({
    matterVersion:CASEPILOT_MATTER_VERSION,
    exportAdapterVersion:CASEPILOT_EXPORT_ADAPTER_VERSION,
    routerVersion:LEGAL_DOMAIN_ROUTER_VERSION,
    matter,
    readiness,
    report
  });
}

export function prepareMvpV2Integration(dossier){
  const normalized=normalizeMvpV2DossierForIntegration(dossier);
  const domainRouting=routeMvpV2LegalDomain(normalized);
  if(domainRouting.routingState!=='RESOLVED'||domainRouting.primaryDomain!=='labour_social'){
    const e=new Error('mvp_v2_legal_domain_not_labour');
    e.code='mvp_v2_legal_domain_not_labour';
    e.status=422;
    e.domainRouting=domainRouting;
    throw e;
  }
  const labourSource=validateMvpV2SourceDomain(normalized,'labour_social','synthetic-labour-source');
  if(!labourSource.allowed){
    const e=new Error('mvp_v2_relevant_source_rejected');
    e.code='mvp_v2_relevant_source_rejected'; e.status=422; throw e;
  }
  const casePilot=buildMvpV2CasePilotBundle(normalized);
  if(casePilot.readiness.sourceProblems.length){
    const e=new Error('mvp_v2_casepilot_source_integrity_failed');
    e.code='mvp_v2_casepilot_source_integrity_failed'; e.status=422; throw e;
  }
  return Object.freeze({dossier:normalized,domainRouting,casePilot,labourSource});
}
