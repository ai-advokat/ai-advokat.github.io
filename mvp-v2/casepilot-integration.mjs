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
function deliveryEvidenceDate(value){
  const v=t(value);
  const iso=/\b(\d{4})-(\d{2})-(\d{2})\b/.exec(v);
  if(iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy=/(\d{2})[.\/](\d{2})[.\/](\d{4})/.exec(v);
  return dmy ? `${dmy[3]}-${dmy[2]}-${dmy[1]}` : '';
}

function evidenceKey(value){
  const s=t(value).toLowerCase();
  const normalized=s.replace(/[^\p{L}\p{N}.\/-]+/gu,' ').replace(/\s+/g,' ').trim();
  if(/договор.*вработ|вработ.*договор/.test(s)) return 'contract:'+normalized;
  if(/одлука.*отказ|отказ.*одлука/.test(s)) return 'dismissal:'+normalized;
  if(/е-?пошта|email|мејл/.test(s)) return 'email:'+normalized;
  if(/повратница|врачува/.test(s)){
    const date=deliveryEvidenceDate(s);
    return date ? 'delivery:'+date+':'+normalized : 'delivery:'+normalized;
  }
  if(/интерна.*евиденц|евиденц.*интерна/.test(s)) return 'internal-record:'+normalized;
  if(/лог.*извештај|извештај.*лог/.test(s)) return 'report-log:'+normalized;
  return normalized;
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

  const suppliedEvidence=lines(d.otherEvidence);
  const hasEmailDocument=Boolean(
    t(d.emailText) || suppliedEvidence.some(x=>/е-?пошта|email|мејл/i.test(x))
  );
  const deliveryDocuments=suppliedEvidence.filter(x=>/повратница|врачува/i.test(x));
  const hasDeliveryDocument=deliveryDocuments.length>0;
  const hasMatchingDeliveryDocument=Boolean(
    t(d.receiveDate) && deliveryDocuments.some(x=>deliveryEvidenceDate(x)===t(d.receiveDate))
  );
  const hasInternalRecordDocument=suppliedEvidence.some(x=>/интерна.*евиденц|евиденц.*интерна/i.test(x));

  const docs=[
    documentRecord({id:'DOC-CONTRACT',title:'Договор за вработување',sha256:'1'.repeat(64),pageCount:3}),
    documentRecord({id:'DOC-DISMISSAL',title:'Одлука за отказ',sha256:'2'.repeat(64),pageCount:2})
  ];
  if(hasEmailDocument){
    docs.push(documentRecord({id:'DOC-EMAIL',title:'Е-пошта од раководител',sha256:'3'.repeat(64),pageCount:1}));
  }
  if(hasDeliveryDocument){
    docs.push(documentRecord({id:'DOC-DELIVERY',title:'Доказ за врачување / повратница',sha256:'4'.repeat(64),pageCount:1}));
  }
  if(hasInternalRecordDocument){
    docs.push(documentRecord({id:'DOC-RECORD',title:'Интерна евиденција',sha256:'5'.repeat(64),pageCount:1}));
  }
  for(const doc of docs) matter=add(matter,'documents',doc);

  matter=add(matter,'participants',participant({id:'P-WORKER',name:t(d.plaintiff),role:'тужител / работник',sourceId:'DOC-CONTRACT',page:1}));
  matter=add(matter,'participants',participant({id:'P-EMPLOYER',name:t(d.defendant),role:'тужен / работодавач',sourceId:'DOC-CONTRACT',page:1}));

  matter=add(matter,'timeline',timelineEvent({id:'T-DISMISSAL',date:t(d.dismissDate)||null,text:'Донесена е наведена одлука за отказ '+t(d.decisionNo)+'.',sourceId:'DOC-DISMISSAL',page:1,status:'confirmed_from_source'}));
  if(t(d.receiveDate)&&hasMatchingDeliveryDocument){
    matter=add(matter,'timeline',timelineEvent({id:'T-DELIVERY-CLAIM',date:t(d.receiveDate),text:'Наведен датум на врачување според странката.',sourceId:'DOC-DELIVERY',page:1,status:'indication'}));
  }
  if(t(d.recordDate)&&hasInternalRecordDocument){
    matter=add(matter,'timeline',timelineEvent({id:'T-DELIVERY-RECORD',date:t(d.recordDate),text:'Наведен датум на врачување според интерната евиденција.',sourceId:'DOC-RECORD',page:1,status:'indication'}));
  }

  matter=add(matter,'legal_issues',legalIssue({
    id:'LI-1',
    title:'Законитост на отказ и враќање на работа',
    question:'Дали се исполнети материјалните и процесните услови за оспорување на отказот и барање враќање на работа?',
    sourceIds:['DOC-DISMISSAL','DOC-CONTRACT',hasEmailDocument?'DOC-EMAIL':null].filter(Boolean)
  }));

  matter=add(matter,'claims',claim({id:'CL-EMPLOYER',text:t(d.employerClaim),sourceId:'DOC-DISMISSAL',page:1,status:'disputed'}));
  if(hasEmailDocument){
    matter=add(matter,'claims',claim({id:'CL-WORKER',text:t(d.workerClaim),sourceId:'DOC-EMAIL',page:1,status:'disputed'}));
  }

  const evidence=[
    evidenceItem({id:'EV-CONTRACT',title:'Договор за вработување',sourceId:'DOC-CONTRACT',page:1,notes:'Работен однос и работно место.'}),
    evidenceItem({id:'EV-DISMISSAL',title:'Одлука за отказ',sourceId:'DOC-DISMISSAL',page:1,notes:'Содржина и образложение на отказната одлука.'})
  ];
  if(hasEmailDocument){
    evidence.push(evidenceItem({id:'EV-EMAIL',title:'Е-пошта од раководител',sourceId:'DOC-EMAIL',page:1,notes:t(d.emailText)||'Наведена е-пошта за проверка.'}));
  }
  if(hasDeliveryDocument){
    evidence.push(evidenceItem({id:'EV-DELIVERY',title:'Доказ за врачување / повратница',sourceId:'DOC-DELIVERY',page:1,notes:'Датумот на врачување мора да се провери.'}));
  }
  if(hasInternalRecordDocument){
    evidence.push(evidenceItem({id:'EV-RECORD',title:'Интерна евиденција',sourceId:'DOC-RECORD',page:1,notes:'Наведена интерна евиденција за проверка.'}));
  }
  for(const e of evidence) matter=add(matter,'evidence',e);

  matter=add(matter,'claim_evidence',claimEvidenceLink({
    id:'CE-EMPLOYER',
    claimId:'CL-EMPLOYER',
    evidenceId:'EV-DISMISSAL',
    supportType:'supports',
    counterevidenceIds:hasEmailDocument?['EV-EMAIL']:[]
  }));
  if(hasEmailDocument){
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
  }
  if(
    t(d.receiveDate)&&t(d.recordDate)&&t(d.receiveDate)!==t(d.recordDate)
    && hasMatchingDeliveryDocument&&hasInternalRecordDocument
  ){
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
  if(!hasEmailDocument){
    matter=add(matter,'evidence_gaps',evidenceGap({
      id:'GAP-WORKER-CLAIM',
      issue:'Тврдењето на работникот нема приложен документарен извор во досието.',
      whyMaterial:'CasePilot не смее да претстави непостоечка е-пошта како регистриран доказ.',
      collectionPlan:'Да се приложи оригинална е-пошта, порака или друг релевантен доказ и да се провери автентичноста.'
    }));
  }
  if(t(d.receiveDate)&&!hasMatchingDeliveryDocument){
    matter=add(matter,'evidence_gaps',evidenceGap({
      id:'GAP-DELIVERY',
      issue:'Наведен е датум на врачување, но нема приложен доказ со истиот датум.',
      whyMaterial:'Роковите не смеат да се врзуваат за повратница со друг датум или за непостоечки регистриран документ.',
      collectionPlan:'Да се приложи и провери повратница, потврда за прием или друг оригинален доказ што го потврдува наведениот датум.'
    }));
  }
  if(t(d.recordDate)&&!hasInternalRecordDocument){
    matter=add(matter,'evidence_gaps',evidenceGap({
      id:'GAP-INTERNAL-RECORD',
      issue:'Наведен е датум од интерна евиденција, но интерниот запис не е приложен.',
      whyMaterial:'Интерна евиденција не смее да се прикажува како документ ако не е доставена.',
      collectionPlan:'Да се приложи и провери релевантниот интерен запис.'
    }));
  }
  matter=add(matter,'procedural_risks',proceduralRisk({
    id:'RISK-DEADLINE',
    title:'Рок за правна заштита',
    description:t(d.receiveDate)&&t(d.recordDate)
      ? 'Постојат два наведени датума поврзани со врачување и рокот не е правно верификуван.'
      : (t(d.receiveDate)||t(d.recordDate))
        ? 'Наведен е датум поврзан со врачување, но рокот и доказната основа не се правно верификувани.'
        : 'Рокот за правна заштита и неговата почетна точка не се правно верификувани.',
    severity:'high',
    mitigation:'Да се провери оригиналниот доказ за врачување и важечкиот закон пред професионална употреба.'
  }));
  matter=add(matter,'ai_findings',aiFinding({
    id:'AI-1',
    text:hasEmailDocument
      ? 'Постојат материјални противречности и невeрификувани докази што бараат адвокатска проверка.'
      : 'Постојат невeрификувани тврдења и недостасува документарен извор за тврдењето на работникот.',
    sources:[
      {sourceId:'DOC-DISMISSAL',page:1},
      ...(hasEmailDocument?[{sourceId:'DOC-EMAIL',page:1}]:[])
    ],
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
