// LexNova Legal Copilot · Hybrid Intelligence Layer v1
// Deterministic, content-minimising routing hint. This module NEVER executes actions,
// elevates sources, bypasses access/privacy checks or stores a user's question.
export const LEXNOVA_ROUTER_VERSION="LEXNOVA_HYBRID_ROUTER_V1_20261117";
const NORMALISE=value=>String(value||"").normalize("NFKC").toLocaleLowerCase("mk").replace(/\s+/gu," ").trim();

const ROUTES=Object.freeze({
  secure_case:{tool:"SECURE_CASE",label:"Приватен правен предмет",risk:"protected"},
  family_notice:{tool:"SMART_DOCUMENTS",label:"Доброволна опомена / покана",risk:"legal"},
  family_lawsuit:{tool:"SMART_DOCUMENTS",label:"Судски поднесок",risk:"legal"},
  daily_briefing:{tool:"JUSTICE_DAILY",label:"Дневен правен брифинг",risk:"source"},
  case_law:{tool:"CASE_LAW_RESEARCH",label:"Судска пракса",risk:"source"},
  consolidator:{tool:"CONSOLIDATOR",label:"Консолидирање на правен текст",risk:"legal"},
  contract:{tool:"AI_CONTRACT_PRO",label:"Договори и клаузули",risk:"legal"},
  document_review:{tool:"DOCUMENTS",label:"Преглед и споредба на документ",risk:"legal"},
  law_version:{tool:"LIVING_LAW",label:"Важечка редакција на закон",risk:"source"},
  legal_sources:{tool:"LEGAL_SOURCES",label:"Правни извори",risk:"source"},
  risk_analysis:{tool:"GOVERNED_PREDICTOR",label:"Сценарија и ризици",risk:"legal"},
  legal_analysis:{tool:"LEGAL_ANALYZER",label:"Правна анализа",risk:"legal"},
  general:{tool:null,label:"Правен разговор",risk:"general"}
});
export const LEXNOVA_ROUTED_TOOLS=Object.freeze(
  Object.fromEntries(Object.entries(ROUTES).map(([key,v])=>[key,v.tool]))
);

function decideIntent(q){
  // Secure-case determination is additionally enforced by the existing, stronger
  // server-side privacy and entitlement gates. Never rely on a keyword alone.
  if(/(?:casepilot|secure case|приватен предмет|оригиналн[а-я]* документ|доверлив предмет|заштитен[а-я]* простор)/u.test(q))return "secure_case";
  const divorce=/(?:развод|бракоразвод|разведувањ)/u.test(q);
  const notice=/(?:опомен|покан|предтужбен|пред тужба)/u.test(q);
  const excludesNotice=/(?:наместо опомен[а-я]*|без опомен[а-я]*|а не опомен[а-я]*)/u.test(q);
  if(divorce&&notice&&!excludesNotice)return "family_notice";
  if(divorce&&/(?:тужба|судск[иа] поднесок|предлог за развод)/u.test(q))return "family_lawsuit";
  if(/(?:брифинг|правн[иае]* (?:вес[ти]|новост|вест[иа]))/u.test(q)&&/(?:дневен|дневн|утринск|денес)/u.test(q))return "daily_briefing";
  if(/(?:судск[аи].*(?:пракс|одлук|пресуд)|пресуд[аи].*суд|case law|hudoc|есчп)/u.test(q))return "case_law";
  if(/(?:консолид|пречистен текст|интегрирај измен[аи]|измени и дополнувања)/u.test(q))return "consolidator";
  if(/(?:спореди|редактирај|коригирај|провери документ|следење на измен|redline|tracked changes)/u.test(q))return "document_review";
  if(/(?:предвид|веројатност за успех|ризик од спор|ризици од спор|сценари|исход на спор)/u.test(q))return "risk_analysis";
  if(/(?:договор|анекс|спогодб|закуп|клаузул|contract)/u.test(q))return "contract";
  if(/(?:важечк[иао]|последн[иао] редакциј|кога стапува во сила|временска важност|пречистен закон)/u.test(q))return "law_version";
  if(/(?:закон|член|правилник|службен весник|правен извор|ldbis)/u.test(q))return "legal_sources";

  if(/(?:анализирај|правно мислење|правна анализа|правен основ)/u.test(q))return "legal_analysis";
  return "general";
}

export function routeLexNovaLegalIntent(question){
  const q=NORMALISE(question).slice(0,4000);
  const intent=decideIntent(q);
  const route=ROUTES[intent];
  return Object.freeze({
    version:LEXNOVA_ROUTER_VERSION,
    intent,
    capabilityRoute:route.tool,
    label:route.label,
    requiresHumanReview:route.risk!=="general",
    executionAuthorization:"NO_EXTERNAL_ACTION",
    verifiedAuthority:false,
    mode:"INTENT_HINT_ONLY"
  });
}
export function canAttachLexNovaRoute(route){
  return Boolean(route?.version===LEXNOVA_ROUTER_VERSION
    && Object.prototype.hasOwnProperty.call(ROUTES,String(route.intent||""))
    && route.executionAuthorization==="NO_EXTERNAL_ACTION");
}
