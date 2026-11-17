/* LexNova uniform provenance cards: informational only, not verification. */
(function(scope){
"use strict";
const VERSION="LEXNOVA_SOURCE_CARD_V1";
function safeUrl(input){
  try{const u=new URL(String(input||""));return u.protocol==="https:"&&!u.username&&!u.password?u.href:null;}catch{return null;}
}
function bounded(value,n=150){return String(value??"").replace(/[\u0000-\u001F\u007F]/g," ").trim().slice(0,n);}
function sourceModel(row){
  const source=row&&typeof row==="object"?row:{};
  const rawUrl=source.url||source.sourceUrl||source.source_url||source.officialUrl||"";
  const link=safeUrl(rawUrl);
  const articles=Array.isArray(source.articles)?source.articles.join(", "):source.articleNumber||source.article||"";
  const date=source.effectiveDate||source.effectiveFrom||null;
  const verified=source.verificationState==="HUMAN_VERIFIED"||source.humanReviewStatus==="approved";
  return Object.freeze({
    version:VERSION,
    act:bounded(source.actName||source.act||source.title||source.label||source.name||"Правен извор"),
    article:bounded(articles||"не е наведено",60),
    edition:bounded(source.version||source.versionId||source.consolidationDate||"не е потврдена"),
    effective:bounded(date||"не е потврдена"),
    officialUrl:link,
    jurisdiction:bounded(source.jurisdiction||"не е наведена",50),
    legalVerification:verified?"Човечка проверка означена во изворот — проверете го записот":"Потребна е адвокатска проверка",
    sourceStatus:link?"Прикажана е врска; службениот статус не е утврден само од адресата":"Нема проверлива HTTPS-врска",
    verifiedLegally:false
  });
}
function makeElement(row){
  const m=sourceModel(row);
  const card=document.createElement("section");
  card.className="lexnova-source-card";
  card.setAttribute("aria-label","Изворна картичка: "+m.act);
  const h=document.createElement("strong");h.textContent=m.act;card.append(h);
  const dl=document.createElement("dl");
  for(const [label,value] of [
    ["Член",m.article],["Редакција",m.edition],["Важност",m.effective],
    ["Надлежност",m.jurisdiction],["Статус",m.legalVerification]
  ]){
    const dt=document.createElement("dt");dt.textContent=label;
    const dd=document.createElement("dd");dd.textContent=value;
    dl.append(dt,dd);
  }
  card.append(dl);
  const p=document.createElement("small");p.textContent=m.sourceStatus;card.append(p);
  if(m.officialUrl){
    const a=document.createElement("a");a.href=m.officialUrl;a.target="_blank";a.rel="noopener noreferrer";
    a.textContent="Отвори ја изворната врска";card.append(a);
  }
  return card;
}
scope.LexNovaSourceCard=Object.freeze({version:VERSION,sourceModel,makeElement,safeUrl});
})(typeof window!=="undefined"?window:globalThis);
