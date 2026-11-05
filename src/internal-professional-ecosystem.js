// AI Advokat · Internal Professional Ecosystem.
// Deterministic utilities only. No calculator in this module supplies a legal
// rate, tariff, deadline rule or jurisdictional conclusion from model memory.

export const INTERNAL_PROFESSIONAL_ECOSYSTEM_VERSION="AI_ADVOCAT_INTERNAL_PRO_ECOSYSTEM_V2";

export const LIVING_LAW_ACTIONS=Object.freeze([
  {
    id:"current-law-status",
    title:"Провери важечка верзија",
    prompt:"Провери ја важечката верзија на наведениот пропис. Оддели: објавување, стапување во сила, почеток на примена, преодни одредби и Human Gate. Не прогласувај current-law статус без официјален извор."
  },
  {
    id:"article-version-diff",
    title:"Спореди член низ верзии",
    prompt:"Спореди го наведениот член меѓу две конкретни верзии/датуми. Прикажи OLD ↔ NEW, извор за секоја верзија и правно значење само ако е проверливо."
  },
  {
    id:"regulatory-lineage",
    title:"Регулаторна линија",
    prompt:"Изгради lineage: ЕНЕР предлог → Собрание → Службен весник → стапување во сила → почеток на примена → current-law Human Gate. Ако недостига чекор, означи SOURCE/VERSION GAP."
  },
  {
    id:"historical-law",
    title:"Историско право",
    prompt:"Утврди кој текст на прописот важел на конкретниот историски датум. Не пренесувај денешна правна состојба во минатото и не третирај стар судски став како автоматски важечки денес."
  }
]);

export const LEGAL_OPERATIONS_REGISTRY=Object.freeze([
  {
    id:"statutory-interest",
    title:"Законска/казнена камата",
    valueState:"source_required",
    sourceRule:"Стапката мора да биде внесена од проверен официјален извор за точниот период; системот не претпоставува стапка.",
    calculator:"simple_interest"
  },
  {
    id:"court-fees",
    title:"Судски такси",
    valueState:"source_required",
    sourceRule:"Такса се прикажува само по проверка на важечка тарифа, вид на постапка и вредност на спорот.",
    calculator:null
  },
  {
    id:"salary-thresholds",
    title:"Плати, прагови и надоместоци",
    valueState:"source_required",
    sourceRule:"Секој износ мора да има период на важност и официјален/верификуван извор.",
    calculator:"percentage"
  },
  {
    id:"procedural-date",
    title:"Процесни датуми",
    valueState:"rule_required",
    sourceRule:"Календарскиот калкулатор не решава правила за доставување, неработни денови, продолжување или враќање во поранешна состојба.",
    calculator:"calendar_deadline"
  }
]);

export const LEGAL_CALCULATORS=Object.freeze([
  {
    id:"simple_interest",
    title:"Информативна проста камата",
    required:["principal","annualRatePct","fromDate","toDate"],
    optional:["dayBasis","rateSource","rateVerified"],
    boundary:"Аритметичка пресметка. Не утврдува која законска стапка важи."
  },
  {
    id:"calendar_deadline",
    title:"Календарски датум + N дена",
    required:["baseDate","days"],
    optional:[],
    boundary:"Не применува процесни правила за почеток на рок, доставување, празници или неработни денови."
  },
  {
    id:"percentage",
    title:"Процент од износ",
    required:["amount","percent"],
    optional:["source"],
    boundary:"Аритметичка пресметка; правната основа за процентот мора да се провери одделно."
  }
]);

export const SMART_DOCUMENTS=Object.freeze([
  {
    id:"divorce-claim",
    title:"Тужба за развод",
    fields:["суд","тужител","тужен","датум и место на брак","последно заедничко живеалиште","малолетни деца","фактичка основа","докази"],
    prompt:"Изработи професионален WORKING DRAFT на тужба за развод. Не измислувај суд, факти, деца, датум, правен основ, рокови или трошоци. Означи ги сите празни полиња и заврши со Human Gate."
  },
  {
    id:"debt-claim",
    title:"Тужба / судска наплата на долг",
    fields:["доверител","должник","основа","главнина","доспеаност","докази","опомена ако постои","камата само ако е проверена"],
    prompt:"Изработи професионален WORKING DRAFT за судска наплата на долг. Не измислувај доспеаност, камата, суд, членови, трошоци или извршност. Оддели факти, докази, правна основа и petitum; Human Gate задолжителен."
  },
  {
    id:"appeal",
    title:"Жалба",
    fields:["одлука","суд/орган","датум на прием","рок","жалбени причини","докази","барање"],
    prompt:"Изработи WORKING DRAFT на жалба само од дадените факти. Рокот, надлежноста и правниот лек мора да бидат изречно верификувани; ако не се, означи VERIFICATION REQUIRED."
  },
  {
    id:"response-to-claim",
    title:"Одговор на тужба",
    fields:["суд","предмет","тужител","тужен","тужбени наводи","оспорени факти","докази","приговори"],
    prompt:"Изработи WORKING DRAFT на одговор на тужба. Мапирај секое тврдење кон доказ или оспорување. Не измислувај процесни рокови или правни ефекти."
  },
  {
    id:"pre-action-demand",
    title:"Опомена пред тужба",
    fields:["доверител","должник","основа","износ","доспеаност","барање","рок само ако е авторски зададен или правно проверен"],
    prompt:"Изработи WORKING DRAFT на опомена пред тужба. Не претпоставувај договорен рок, камата или последица. Оддели авторски зададен рок од законски рок."
  },
  {
    id:"power-of-attorney",
    title:"Полномошно",
    fields:["давател","полномошник","опфат","предмет","ограничувања","датум"],
    prompt:"Изработи WORKING DRAFT на полномошно со јасно дефиниран опфат и ограничувања. Не додавај овластувања што корисникот не ги дал."
  }
]);

export const LEGAL_WATCH_CHANNELS=Object.freeze([
  {
    id:"official-gazette",
    title:"Службен весник",
    url:"https://slvesnik.com.mk/",
    watchRole:"publication_and_amendment_watch",
    prompt:"Провери што е ново објавено во Службен весник и кои записи може да бидат релевантни за мојата правна област. Не извлекувај current-law заклучок без version/effective-date проверка."
  },
  {
    id:"ener",
    title:"ЕНЕР",
    url:"https://ener.gov.mk/",
    watchRole:"proposal_and_consultation_watch",
    prompt:"Провери нови предлог-прописи и консултации на ЕНЕР. Јасно означи дека предлогот не е важечко право."
  },
  {
    id:"assembly",
    title:"Собрание",
    url:"https://www.sobranie.mk/",
    watchRole:"legislative_procedure_watch",
    prompt:"Провери релевантни законски постапки во Собранието и поврзи ги со Службен весник пред да тврдиш дека нешто е донесено и важечко."
  },
  {
    id:"constitutional-court",
    title:"Уставен суд",
    url:"https://ustavensud.mk/",
    watchRole:"constitutional_review_watch",
    prompt:"Провери нови одлуки/решенија на Уставниот суд и наведи точен предмет, датум, диспозитив и извор. Не претпоставувај правно дејство без проверка."
  },
  {
    id:"supreme-court",
    title:"Врховен суд",
    url:"https://www.vrhoven.sud.mk/",
    watchRole:"highest_domestic_case_law_watch",
    prompt:"Провери нови официјални публикации/одлуки на Врховниот суд и оддели discovery од item-level authority verification."
  },
  {
    id:"state-audit",
    title:"Државен завод за ревизија",
    url:"https://dzr.mk/",
    watchRole:"audit_and_public_funds_watch",
    prompt:"Провери нови конечни ревизорски извештаи. Ревизорски наод не претставува кривична пресуда; извлечи го точно статусот и изворот."
  }
]);

function number(value,name){
  const n=Number(value);
  if(!Number.isFinite(n)) throw new TypeError(name+"_invalid");
  return n;
}
function isoDate(value,name){
  const raw=String(value||"").trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(raw)) throw new TypeError(name+"_invalid");
  const d=new Date(raw+"T00:00:00Z");
  if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==raw) throw new TypeError(name+"_invalid");
  return d;
}
function round2(n){return Math.round((Number(n)+Number.EPSILON)*100)/100;}

export function calculateLegalOperation(id,input={}){
  const tool=String(id||"").trim();
  if(tool==="simple_interest"){
    const principal=number(input.principal,"principal");
    const annualRatePct=number(input.annualRatePct,"annual_rate");
    if(principal<0||annualRatePct<0) throw new TypeError("negative_value_not_allowed");
    const from=isoDate(input.fromDate,"from_date");
    const to=isoDate(input.toDate,"to_date");
    if(to<from) throw new TypeError("date_range_invalid");
    const dayBasis=[360,365,366].includes(Number(input.dayBasis))?Number(input.dayBasis):365;
    const days=Math.floor((to-from)/86400000);
    const interest=principal*(annualRatePct/100)*(days/dayBasis);
    const rateVerified=input.rateVerified===true && String(input.rateSource||"").trim().length>=3;
    return Object.freeze({
      ok:true,
      calculator:"simple_interest",
      principal:round2(principal),
      annualRatePct,
      fromDate:input.fromDate,
      toDate:input.toDate,
      days,
      dayBasis,
      interest:round2(interest),
      total:round2(principal+interest),
      evidenceState:rateVerified?"CALCULATED_FROM_USER_MARKED_VERIFIED_RATE":"INFORMATIONAL_ARITHMETIC_ONLY",
      rateSource:rateVerified?String(input.rateSource).trim():null,
      legalRateDetermined:false,
      humanGateRequired:true,
      warning:"AI Advokat не утврдува која законска/договорна стапка важи преку овој калкулатор. Стапката и периодот мора да се проверат од официјален извор."
    });
  }
  if(tool==="calendar_deadline"){
    const base=isoDate(input.baseDate,"base_date");
    const days=number(input.days,"days");
    if(!Number.isInteger(days)||Math.abs(days)>3660) throw new TypeError("days_invalid");
    const result=new Date(base.getTime()+days*86400000);
    return Object.freeze({
      ok:true,
      calculator:"calendar_deadline",
      baseDate:input.baseDate,
      days,
      calendarDate:result.toISOString().slice(0,10),
      legalDeadlineDetermined:false,
      humanGateRequired:true,
      warning:"Ова е календарско додавање. Не ги применува правилата за почеток на рок, доставување, празници, неработни денови, продолжување или преклузија."
    });
  }
  if(tool==="percentage"){
    const amount=number(input.amount,"amount");
    const percent=number(input.percent,"percent");
    const value=amount*(percent/100);
    return Object.freeze({
      ok:true,
      calculator:"percentage",
      amount:round2(amount),
      percent,
      value:round2(value),
      source:String(input.source||"").trim()||null,
      legalBasisDetermined:false,
      humanGateRequired:true,
      warning:"Пресметката е аритметичка. Проверете ја правната основа и важечкиот процент од официјален извор."
    });
  }
  throw new TypeError("calculator_not_supported");
}

export function internalProfessionalEcosystemCatalog(){
  return Object.freeze({
    version:INTERNAL_PROFESSIONAL_ECOSYSTEM_VERSION,
    livingLaw:LIVING_LAW_ACTIONS.map(x=>({...x})),
    operationsRegistry:LEGAL_OPERATIONS_REGISTRY.map(x=>({...x})),
    calculators:LEGAL_CALCULATORS.map(x=>({...x,required:[...x.required],optional:[...x.optional]})),
    smartDocuments:SMART_DOCUMENTS.map(x=>({...x,fields:[...x.fields]})),
    legalWatch:LEGAL_WATCH_CHANNELS.map(x=>({...x})),
    boundaries:{
      internalAiAdvokatOnly:true,
      externalProfessionalBotChanged:false,
      legalAdviceAutonomy:false,
      autonomousFiling:false,
      autonomousSignature:false,
      humanGateRequired:true
    }
  });
}
