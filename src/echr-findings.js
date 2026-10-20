// Deterministic ECHR operative-part extraction.
// Preserves what the source states; it does not infer holdings from summaries.

export const ECHR_FINDINGS_VERSION="1.0.0";

function clean(value=""){
  return String(value||"").normalize("NFKC").replace(/\r\n?/g,"\n").trim();
}
function compact(value=""){return clean(value).replace(/\s+/g," ").trim();}
function uniqueObjects(items){
  const seen=new Set();
  return items.filter(item=>{
    const key=JSON.stringify(item);
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
function normalizeArticle(value){
  return compact(value)
    .replace(/^Article\s+/i,"")
    .replace(/^Art\.\s*/i,"")
    .replace(/^член(?:от)?\s+/iu,"")
    .replace(/\s*(?:of the Convention|од Конвенцијата).*$/iu,"")
    .replace(/\s+/g," ")
    .trim();
}
function resultFromSentence(sentence){
  const s=compact(sentence).toLocaleLowerCase("en");
  if(/no need to (?:examine|consider)|нема потреба да .*?(?:испита|преиспита|разглед)/iu.test(s)) return "no_separate_examination";
  if(/no violation|нема повреда/iu.test(s)) return "no_violation";
  if(/violation|повреда/iu.test(s)) return "violation";
  if(/inadmissible|недопуштен/iu.test(s)) return "inadmissible";
  if(/admissible|допуштен/iu.test(s)) return "admissible";
  return "unclassified";
}
function aspectFromSentence(sentence){
  const s=compact(sentence);
  const patterns=[
    /\bconcerning\s+(.+?)(?:;|\.|$)/i,
    /\bas a result of\s+(.+?)(?:;|\.|$)/i,
    /\bon account of\s+(.+?)(?:;|\.|$)/i,
    /\bregarding\s+(.+?)(?:;|\.|$)/i,
    /во\s+поглед\s+на\s+(.+?)(?:;|\.|$)/iu,
    /во\s+однос\s+на\s+(.+?)(?:;|\.|$)/iu,
    /поради\s+(.+?)(?:;|\.|$)/iu
  ];
  for(const re of patterns){
    const m=s.match(re);
    if(m) return compact(m[1]).slice(0,500);
  }
  return null;
}

export function extractEchrDocumentIdentity(textInput){
  const text=clean(textInput);
  const head=text.slice(0,18000);
  const applications=[...head.matchAll(/(?:application(?:s)?(?:\s+no\.?|\s+nos\.?)?|апликаци(?:ја|и|ите|јата)(?:\s+бр\.?)?)[^\d]{0,50}(\d{1,6}\/\d{2,4})/giu)]
    .map(m=>m[1]);
  for(const m of head.matchAll(/\b(\d{1,6}\/\d{2,4})\b/g)){
    if(/application|апликаци|жалб/iu.test(head.slice(Math.max(0,m.index-120),m.index+40))) applications.push(m[1]);
  }
  const app=[...new Set(applications)].slice(0,30);
  const isDecision=/\(DECISION\)|\(ОДЛУКА\)|\bDECISION\b|ОДЛУКА/iu.test(head);
  const isJudgment=/\bJUDGMENT\b|ПРЕСУДА/iu.test(head);
  let documentType="unknown";
  if(isDecision && !isJudgment) documentType="decision";
  else if(isJudgment) documentType="judgment";

  const finalMatch=head.match(/\bFINAL\s*\n?\s*(\d{1,2}[\/.]\d{1,2}[\/.]\d{4})/iu);
  const anonymised=/decision not to have the applicants'? names disclosed|имињата на апликант(?:ите|ките).*не.*објав/iu.test(text);

  return Object.freeze({
    documentType,
    applicationNumbers:Object.freeze(app),
    finalDateSourceText:finalMatch?finalMatch[1]:null,
    anonymisedApplicants:anonymised,
    humanReviewRequired:true
  });
}

export function extractEchrOperativeFindings(textInput){
  const text=clean(textInput);
  const markerMatches=[
    text.search(/FOR THESE REASONS,? THE COURT/iu),
    text.search(/ОД ТИЕ ПРИЧИНИ,? СУДОТ/iu),
    text.search(/ОД ОВИЕ ПРИЧИНИ,? СУДОТ/iu)
  ].filter(i=>i>=0);
  const operative=markerMatches.length?text.slice(Math.min(...markerMatches)):text.slice(Math.max(0,text.length-16000));
  const findings=[];

  const sentences=operative
    .split(/\n(?=\s*(?:\d+\.|Declares|Holds|Dismisses|Смета|Го|Ги|Ја|Одлучи))/u)
    .map(compact)
    .filter(Boolean);

  for(const sentence of sentences){
    const result=resultFromSentence(sentence);
    if(result==="unclassified") continue;
    const articles=[];
    for(const m of sentence.matchAll(/(?:Article|Art\.?)\s*(\d+(?:\s*§\s*\d+)?)/giu)) articles.push(normalizeArticle(m[1]));
    for(const m of sentence.matchAll(/член(?:от)?\s*(\d+(?:\s*(?:став|§)\s*\d+)?)/giu)) articles.push(normalizeArticle(m[1]));
    const uniqueArticles=[...new Set(articles)];
    if(uniqueArticles.length){
      for(const article of uniqueArticles){
        findings.push({
          article,
          result,
          aspect:aspectFromSentence(sentence),
          source_sentence:sentence.slice(0,900)
        });
      }
    }else if(result==="inadmissible"||result==="admissible"){
      findings.push({article:null,result,aspect:null,source_sentence:sentence.slice(0,900)});
    }
  }

  return Object.freeze(uniqueObjects(findings).map(x=>Object.freeze(x)));
}

export function extractEchrStructuredMetadata(textInput){
  const identity=extractEchrDocumentIdentity(textInput);
  const findings=extractEchrOperativeFindings(textInput);
  return Object.freeze({
    ...identity,
    findings,
    meritsDetermined:identity.documentType==="judgment" && findings.some(x=>["violation","no_violation"].includes(x.result)),
    inadmissibilityPresent:findings.some(x=>x.result==="inadmissible"),
    humanReviewRequired:true
  });
}
