import {LEGAL_NEWS_SOURCES} from "./legal-news-aggregator.js";
import {assessMacedonianOutput,macedonianDeliveryVerdict} from "./macedonian-language-guard.js";

// P0 legal daily briefing: a verified-link report, not AI-generated news.
// No change of applicable jurisdiction, no translation of foreign legislation,
// no automatic promotion of headlines into legally effective acts.
export const LEGAL_DAILY_BRIEFING_VERSION="LEGAL_DAILY_BRIEFING_SOURCE_FIRST_R30_20261117";
export const LEGAL_DAILY_OFFICIAL_IDS=Object.freeze([
  "assembly","constitutional-court","supreme-court","judicial-council",
  "ministry-justice","official-gazette","serbia-pis","slovenia-justice"
]);
const DOMESTIC_IDS=new Set(LEGAL_DAILY_OFFICIAL_IDS.slice(0,6));
const REGIONAL_IDS=new Set(["serbia-pis","slovenia-justice"]);
const DIRECTORY=new Map(LEGAL_NEWS_SOURCES.map(source=>[source.id,source]));

export function isDailyLegalBriefingRequest(value){
  const q=String(value||"").normalize("NFKC").toLocaleLowerCase("mk");
  return /(?:дневн|утринск|daily)/iu.test(q)
    && /(?:брифинг|преглед|вест[и]?\b|веси\b|новости|brief)/iu.test(q)
    && /(?:правн|судск|закон|правосуд|legal)/iu.test(q)
    && !/(?:што е|дефинирај|објасни поим)/iu.test(q);
}

function isAllowedItem(row,now){
  const id=String(row?.sourceId||"");
  if(!DOMESTIC_IDS.has(id)&&!REGIONAL_IDS.has(id))return false;
  const source=DIRECTORY.get(id);
  if(!source)return false;
  const date=String(row?.publishedDate||"");
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date))return false;
  const day=Date.parse(date+"T00:00:00Z");
  const today=Date.parse(now.toISOString().slice(0,10)+"T00:00:00Z");
  if(!Number.isFinite(day)||day>today||day<today-86400000)return false;
  try{
    const uri=new URL(String(row?.url||""));
    if(uri.protocol!=="https:"||uri.username||uri.password||uri.port)return false;
    const hosts=Array.isArray(source.articleHosts)?source.articleHosts:[];
    if(!hosts.includes(uri.hostname.toLowerCase()))return false;
  }catch{return false;}
  return true;
}

function itemTitle(row,query){
  const original=String(row?.title||"").normalize("NFKC")
    .replace(/[\u0000-\u001F\u007F<>]/gu," ").replace(/\s+/gu," ").trim().slice(0,150);
  // Never display an unedited Serbian/Slovenian title as Macedonian text.
  if(!DOMESTIC_IDS.has(row.sourceId))return "Регионална институционална објава";
  if(original.length<10)return "Институционална правна објава";
  return assessMacedonianOutput(original,{userText:query}).ok
    ?original:"Институционална објава – потребна е проверка на насловот";
}

export function buildDailyLegalBriefing(payload,{userText="",now=new Date()}={}){
  const today=now.toISOString().slice(0,10);
  const raw=Array.isArray(payload?.items)?payload.items:[];
  const items=raw.filter(item=>isAllowedItem(item,now)).slice(0,12).map(item=>{
    const source=DIRECTORY.get(item.sourceId);
    return {
      sourceId:item.sourceId,
      zone:DOMESTIC_IDS.has(item.sourceId)?"mk":"regional",
      title:itemTitle(item,userText),
      publishedDate:item.publishedDate,
      url:item.url,
      institution:source.title,
      sourceRole:source.sourceRole,
      legalEffectVerified:false
    };
  });
  const mk=items.filter(item=>item.zone==="mk").slice(0,6);
  const regional=items.filter(item=>item.zone==="regional").slice(0,4);
  const effective=[...mk,...regional];
  const lines=[
    "ДНЕВЕН ПРАВЕН БРИФИНГ · "+today,
    "Проверени врски до институционални објави од денес и вчера.",
    "Ова е преглед на објави, не автоматска потврда за важечко право.",
    "",
    "МАКЕДОНИЈА"
  ];
  if(!mk.length)lines.push("Нема потврдени актуелни ставки од опфатените службени извори. Ова не значи дека нема правни новости.");
  mk.forEach((item,i)=>lines.push(
    String(i+1)+". "+item.title,
    "Датум на објава: "+item.publishedDate,
    "Службен извор: "+item.url,
    "Правно дејство: не е потврдено само од насловот.",
    ""
  ));
  lines.push("","РЕГИОН · ОГРАНИЧЕНА ПОКРИЕНОСТ");
  if(!regional.length)lines.push("Нема потврдени ставки во достапните службени регионални извори.");
  regional.forEach((item,i)=>lines.push(
    String(i+1)+". "+item.title,
    "Датум на објава: "+item.publishedDate,
    "Службен извор: "+item.url,
    "Не претставува македонско право; содржината бара независна проверка.",
    ""
  ));
  lines.push(
    "",
    "ОГРАНИЧУВАЊА И ЧОВЕЧКА ПРОВЕРКА",
    "Регионалниот опфат е ограничен на службени извори од Србија и Словенија. Не се тврди целосна покриеност на Балканот.",
    "За правна употреба проверете го оригиналниот акт, датумот на објавување, стапувањето во сила, надлежноста и применливоста.",
    "Ниту една вест, најава или предлог не се третира автоматски како важечки закон."
  );
  let answer=lines.join("\n");
  let verdict=macedonianDeliveryVerdict(answer,{userText});
  // Fail closed on language without repeating generic provider-error messages.
  // Minimal canonical summary still explains which source stage failed.
  if(!verdict.deliver){
    answer=[
      "ДНЕВЕН ПРАВЕН БРИФИНГ · "+today,
      "Достапните ставки не поминаа целосна јазична проверка и затоа не се објавуваат како правни вести.",
      "Проверете ги службените институционални извори. Правното дејство мора посебно да се потврди.",
      "Нема автоматско преземање странско право и нема автоматско правно мислење."
    ].join("\n");
    verdict=macedonianDeliveryVerdict(answer,{userText});
  }
  return {
    answer:verdict.deliver?verdict.text:"",
    state:verdict.deliver?(effective.length?"official_headlines_only":"no_verified_items"):"language_gate_blocked",
    languageGate:verdict.releaseGate,
    selectedItems:effective,
    sourceCount:effective.length,
    checkedAt:now.toISOString(),
    legalSources:effective.map(item=>({
      title:item.title,
      url:item.url,
      jurisdiction:item.zone==="mk"?"MK":"REGIONAL_NOT_APPLICABLE_IN_MK",
      relation:"official_headline_discovery_only",
      legalEffectVerified:false,
      publishedDate:item.publishedDate
    }))
  };
}
