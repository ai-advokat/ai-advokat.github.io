// AI ADVOKAT 4 MVP v2 — isolated JSON dossier -> Legal Document AST adapter.
// Synthetic/working use only. No provider, network, persistence, filing or production action.

export const MVP_V2_VERSION = '2.0.1-uat';
export const PR_B_HEAD = 'f649672172e5b558f5f89084684949cc5590ca0b';
export const PR_C_HEAD = 'f106b3da14671828d0b8eaa6b2a1308ccf5b0b66';

const REQUIRED_FIELDS = Object.freeze([
  'plaintiff','defendant','court','job','dismissDate','decisionNo','employerClaim','workerClaim'
]);

function text(value){ return String(value ?? '').normalize('NFKC').trim(); }
function dateLabel(value){
  const v=text(value);
  if(!v) return '[НЕВНЕСЕН ДАТУМ]';
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : v;
}
function lines(value){
  if(Array.isArray(value)) return value.map(text).filter(Boolean);
  return text(value).split(/\r?\n/).map(text).filter(Boolean);
}
function unique(list){ return [...new Set(list.map(text).filter(Boolean))]; }
function evidenceNorm(value){ return text(value).toLowerCase().replace(/[^\p{L}\p{N}.]+/gu,' ').replace(/\s+/g,' ').trim(); }
function deliveryDate(value){
  const m=/(\d{2})[.\/-](\d{2})[.\/-](\d{4})/.exec(text(value));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
}
function semanticEvidenceTitles(d){
  const supplied=unique(lines(d.otherEvidence));
  const out=[]; const exact=new Set();
  const add=title=>{ const key=evidenceNorm(title); if(!key||exact.has(key)) return; exact.add(key); out.push(title); };
  for(const title of supplied) add(title);
  add('Договор за вработување');
  add('Одлука за отказ');
  if(text(d.emailText)) add('Е-пошта од раководител');
  if(text(d.receiveDate)){
    const hasMatchingDelivery=supplied.some(title=>{
      if(!/повратница|врачува/i.test(title)) return false;
      const date=deliveryDate(title);
      return !date || date===text(d.receiveDate);
    });
    if(!hasMatchingDelivery) add('Доказ за врачување / повратница');
  }
  return out;
}

export function validateMvpDossier(input){
  const d = input && typeof input === 'object' && !Array.isArray(input)
    ? (input.d && typeof input.d === 'object' ? input.d : input)
    : {};
  const missing = REQUIRED_FIELDS.filter(k=>!text(d[k]));
  return Object.freeze({ok:missing.length===0,missing:Object.freeze(missing),data:Object.freeze({...d})});
}

function evidenceAnalysis(title,{emailText='',employerClaim='',workerClaim=''}={}){
  const low=title.toLowerCase();
  if(/е-?пошта|email|мејл/.test(low)){
    return {
      proves: emailText ? `Содржи наведена комуникација: ${emailText}` : 'Постоење на наведена електронска комуникација, доколку документот е автентичен.',
      doesNotProve:'Не ја докажува автентичноста, целосноста на нишката, овластувањето на испраќачот или конечната правна квалификација.',
      verificationRequired:'Да се проверат оригиналната порака, headers, целата нишка, испраќачот и неговото овластување.'
    };
  }
  if(/отказ|одлука/.test(low)){
    return {
      proves: employerClaim ? `Го евидентира наведеното образложение на работодавачот: ${employerClaim}` : 'Го евидентира текстот на отказната одлука, доколку документот е автентичен.',
      doesNotProve:'Не докажува сама по себе дека наведените факти се точни или дека постапката била законита.',
      verificationRequired:'Да се проверат оригиналот, врачувањето, образложението, овластувањето и целата постапка.'
    };
  }
  if(/договор/.test(low)){
    return {
      proves:'Може да го потврди постоењето и дел од содржината на работниот однос, доколку документот е автентичен.',
      doesNotProve:'Не ја докажува законитоста или незаконитоста на отказот.',
      verificationRequired:'Да се проверат оригиналот, страните, датумот, анексите и релевантните одредби.'
    };
  }
  return {
    proves:`Постоење на наведениот доказ „${title}“ само доколку содржината и автентичноста се потврдени.`,
    doesNotProve:'Не се извлекува конечен фактички или правен заклучок само од називот на доказот.',
    verificationRequired:'Да се проверат содржината, автентичноста, потеклото и доказната цел.'
  };
}

export function mapMvpDossierToLegalAst(input,{generatedAt='2026-10-24T21:00:00Z',caseId='MVP2-SYN-LABOUR-001'}={}){
  const validation=validateMvpDossier(input);
  if(!validation.ok){
    const err=new Error('mvp_v2_required_fields_missing');
    err.code='mvp_v2_required_fields_missing';
    err.missing=[...validation.missing];
    throw err;
  }
  const d=validation.data;

  const rawEvidence=semanticEvidenceTitles(d);

  const evidence=rawEvidence.map((title,index)=>({
    id:`E-${index+1}`,
    title,
    description:'Синтетички наведена доказна ставка во MVP v2. Содржината не е автоматски прочитана од датотека.',
    verificationStatus:'unverified',
    requiredForProfessional:true,
    source:{
      id:`SRC-E${index+1}`,
      title,
      locator:'MVP v2 синтетичко досие',
      version:'synthetic-v1',
      sha256:'',
      verificationStatus:'unverified'
    },
    analysis:evidenceAnalysis(title,d)
  }));
  const eid=(pattern)=>evidence.find(e=>pattern.test(e.title.toLowerCase()))?.id || evidence[0]?.id;
  const contractId=eid(/договор/);
  const dismissalId=eid(/отказ|одлука/);
  const emailId=text(d.emailText)?eid(/е-?пошта|email|мејл/):null;
  const deliveryId=text(d.receiveDate)
    ? evidence.find(e=>{
        if(!/врач|поврат/i.test(e.title)) return false;
        const date=deliveryDate(e.title);
        if(date) return date===text(d.receiveDate);
        // semanticEvidenceTitles creates this undated placeholder only when no
        // supplied delivery document matches the claimed delivery date.
        return /^Доказ за врачување \/ повратница$/i.test(e.title);
      })?.id || null
    : null;

  const facts=[
    {id:'F-1',text:`Работниот однос е наведен со почеток ${dateLabel(d.startDate)} на работното место ${text(d.job)}.`,status:'unverified',requiredForProfessional:true,evidenceIds:contractId?[contractId]:[]},
    {id:'F-2',text:`Работодавачот тврди: ${text(d.employerClaim)}`,status:'disputed',requiredForProfessional:true,evidenceIds:[dismissalId,emailId].filter(Boolean)},
    {id:'F-3',text:`Работникот тврди: ${text(d.workerClaim)}`,status:'disputed',requiredForProfessional:true,evidenceIds:emailId?[emailId]:[]}
  ];
  if(text(d.emailText)) facts.push({
    id:'F-EMAIL',
    text:`Во внесеното синтетичко досие е наведена е-пошта со содржина: ${text(d.emailText)}`,
    status:'unverified',requiredForProfessional:true,evidenceIds:emailId?[emailId]:[]
  });
  if(text(d.receiveDate)) facts.push({
    id:'F-DELIVERY-CLAIM',
    text:`Според странката, одлуката е врачена на ${dateLabel(d.receiveDate)}.`,
    status:text(d.recordDate)&&text(d.recordDate)!==text(d.receiveDate)?'disputed':'unverified',
    requiredForProfessional:true,evidenceIds:deliveryId?[deliveryId]:[]
  });
  if(text(d.recordDate)) facts.push({
    id:'F-DELIVERY-RECORD',
    text:`Според интерната евиденција, датумот на врачување е ${dateLabel(d.recordDate)}.`,
    status:text(d.receiveDate)&&text(d.recordDate)!==text(d.receiveDate)?'disputed':'unverified',
    requiredForProfessional:true,evidenceIds:[]
  });

  const contradictions=[{
    id:'CON-1',
    summary:'Работодавачот и работникот имаат спротивставени тврдења за оправданоста/одобрението на спорното отсуство или работа од дома.',
    left:{type:'fact',id:'F-2'},
    right:{type:'fact',id:'F-3'},
    status:'unresolved'
  }];
  if(text(d.receiveDate)&&text(d.recordDate)&&text(d.receiveDate)!==text(d.recordDate)){
    contradictions.push({
      id:'CON-2',
      summary:`Постојат два различни наведени датума на врачување: ${dateLabel(d.receiveDate)} и ${dateLabel(d.recordDate)}.`,
      left:{type:'fact',id:'F-DELIVERY-CLAIM'},
      right:{type:'fact',id:'F-DELIVERY-RECORD'},
      status:'unresolved'
    });
  }

  const argumentEvidence=[dismissalId,emailId,contractId].filter(Boolean);
  const ast={
    version:'1.0.0',
    caseId,
    documentId:'MVP2-PLEADING-001',
    caseVersion:'0.2',
    generatedAt,
    documentType:'employment_claim',
    title:'ТУЖБА — MVP v2 СИНТЕТИЧКИ WORKING DRAFT',
    court:text(d.court),
    summary:'Изолиран синтетички работноправен предмет за end-to-end проверка: внесување → AST → WORKING нацрт → Professional DOCX Engine.',
    parties:[
      {id:'P-1',role:'Тужител',name:text(d.plaintiff),identifier:'СИНТЕТИЧКИ-ПОДАТОК'},
      {id:'P-2',role:'Тужен',name:text(d.defendant),identifier:'СИНТЕТИЧКИ-ПОДАТОК'}
    ],
    facts,
    evidence,
    legalBases:[{
      id:'LB-1',
      proposition:'Да се провери важечката материјална и процесна правна основа за оспорување на отказ, враќање на работа, рок, надлежност и евентуална претходна правна заштита.',
      status:'review_required',
      requiredForProfessional:true
    }],
    arguments:[{
      id:'ARG-1',
      heading:'Работна правна теза — непроверена',
      text:'Постојат спорни факти и можни противречности кои мора да се разрешат со проверка на оригиналните докази и важечките официјални правни извори пред професионална употреба.',
      status:'working',
      requiredForProfessional:true,
      factIds:facts.map(f=>f.id),
      evidenceIds:argumentEvidence,
      legalBasisIds:['LB-1']
    }],
    contradictions,
    petitum:[
      {id:'PET-1',text:`Да се поништи Одлуката за отказ бр. ${text(d.decisionNo)} од ${dateLabel(d.dismissDate)}, само доколку по правната проверка се утврдат сите законски и процесни претпоставки.`,status:'draft',requiredForProfessional:true},
      {id:'PET-2',text:`Да се задолжи тужениот да го врати тужителот ${text(d.plaintiff)} на работното место ${text(d.job)}, во формулација што ќе биде одобрена од адвокат.`,status:'draft',requiredForProfessional:true},
      {id:'PET-3',text:'Да се одлучи за трошоците на постапката согласно проверениот процесен режим и одобрен трошковник.',status:'draft',requiredForProfessional:true}
    ],
    attachments:evidence.map((e,index)=>({id:`ATT-${index+1}`,title:e.title,evidenceId:e.id})),
    blockers:[
      {id:'BL-LEGAL',kind:'legal_basis',summary:'Важечката правна основа не е проверена од официјален извор.',mandatory:true,status:'open'},
      {id:'BL-DEADLINE',kind:'deadline',summary:'Рокот за судска/друга правна заштита мора да се провери.',mandatory:true,status:'open'},
      {id:'BL-JURISDICTION',kind:'jurisdiction',summary:'Надлежноста на судот мора да се провери.',mandatory:true,status:'open'},
      {id:'BL-EVIDENCE',kind:'evidence',summary:'Содржината и автентичноста на доказите не се верификувани.',mandatory:true,status:'open'},
      {id:'BL-PETITUM',kind:'editorial',summary:'Петитумот бара адвокатска редакција и Human Gate одобрување.',mandatory:true,status:'open'}
    ],
    humanGate:{status:'pending'}
  };
  return ast;
}

export function syntheticMvpV2Fixture(){
  return {
    plaintiff:'Ана Стојановска (измислено лице)',
    defendant:'ПРИМЕР ТЕК ДООЕЛ (измислен субјект)',
    court:'Основен граѓански суд Скопје (надлежност непроверена)',
    job:'административен соработник',
    startDate:'2022-03-15',
    dismissDate:'2026-09-02',
    receiveDate:'2026-09-03',
    recordDate:'2026-09-04',
    decisionNo:'08-144/26',
    employerClaim:'Наводно неоправдано отсуство на 27 и 28 август 2026 без одобрение и известување.',
    workerClaim:'Имав писмено одобрение за работа од дома и доставив месечен извештај во рок.',
    emailText:'Во ред, работи од дома во четврток и петок. Месечниот извештај испрати го најдоцна до понеделник до 10:00.',
    otherEvidence:'Договор за вработување\nОдлука за отказ\nПовратница од 03.09.2026\nИнтерна евиденција од 04.09.2026\nЕ-пошта од раководител\nЛог за испраќање извештај',
    notes:'Не е проверено овластувањето на раководителот. Не е утврдено дали има задолжителна претходна правна заштита.'
  };
}
