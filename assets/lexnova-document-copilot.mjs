// LexNova Document Copilot v1 — ALL document bytes remain in browser memory.
// The engine compares USER-SUPPLIED original and USER-SUPPLIED candidate only.
// It never generates a fake citation, adds a legal clause or contacts a model.
export const LEXNOVA_DOCUMENT_VERSION="LEXNOVA_LOCAL_DOCUMENT_REVIEW_V1";
const MAX_CHARS=40000,MAX_LINES=220;
const fields=Object.freeze([
  {id:"parties",label:"Странки и нивни својства",pattern:/(?:странк|тужител|тужен|доверител|должник|договорн[иао]|закуподав|закупец)/iu},
  {id:"subject",label:"Предмет и барање",pattern:/(?:предмет|барањ|обврск|цел на договор|тужбено барањ)/iu},
  {id:"date",label:"Датум и временски опфат",pattern:/(?:\b\d{1,2}[.\/-]\d{1,2}[.\/-]\d{4}\b|датум|ден на)/iu},
  {id:"evidence",label:"Прилози и докази (ако се релевантни)",pattern:/(?:доказ|прилог|извештај|извод|документациј)/iu},
  {id:"signature",label:"Потпис и овластување (ако се бараат)",pattern:/(?:потпис|полномош|овластув|застапник)/iu},
  {id:"authority",label:"Правна основа и проверлив извор",pattern:/(?:закон|член|службен весник|ldbis|правен основ)/iu}
]);
const reject=message=>({ok:false,error:message,version:LEXNOVA_DOCUMENT_VERSION,changes:[],checklist:[]});
export function legalDocumentChecklist(text){
  const value=String(text||"");
  return fields.map(f=>({
    id:f.id,label:f.label,
    state:f.pattern.test(value)?"MENTIONED_NOT_VERIFIED":"REVIEW_REQUIRED",
    reason:f.pattern.test(value)?"Поимот е спомнат; содржината не е правно проверена.":"Проверете дали ова е потребно за конкретниот документ."
  }));
}
function op(type,oldText,newText){
  return {type,oldText:String(oldText||""),newText:String(newText||""),status:"AWAITING_HUMAN_DECISION"};
}
// Line-level LCS: bounded and explicit, never fabricates document language.
export function reviewLexNovaDocument(original,candidate){
  if(typeof original!=="string"||typeof candidate!=="string")return reject("Внесете текстуален оригинал и предложена верзија.");
  if(!original.trim()||!candidate.trim())return reject("Двата текста мора да бидат внесени.");
  if(original.length>MAX_CHARS||candidate.length>MAX_CHARS)return reject("Документите се предолги за локалната споредба (до 40.000 знаци по верзија).");
  const a=original.replace(/\r\n/g,"\n").split("\n"),b=candidate.replace(/\r\n/g,"\n").split("\n");
  if(a.length>MAX_LINES||b.length>MAX_LINES)return reject("Премногу редови за локална споредба (до 220 по документ).");
  const dp=Array.from({length:a.length+1},()=>new Uint16Array(b.length+1));
  for(let i=a.length-1;i>=0;i--)for(let j=b.length-1;j>=0;j--){
    dp[i][j]=a[i]===b[j]?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  }
  const changes=[];
  let i=0,j=0,startA=0,startB=0;
  function flush(){
    if(i===startA && j===startB)return;
    const oldText=a.slice(startA,i).join("\n"),newText=b.slice(startB,j).join("\n");
    const kind=oldText&&newText?"replace":oldText?"remove":"insert";
    changes.push({id:"change-"+(changes.length+1),startOriginalLine:startA+1,startSuggestedLine:startB+1,...op(kind,oldText,newText)});
  }
  const sections=[];let lastA=0,lastB=0;
  while(i<a.length||j<b.length){
    if(i<a.length&&j<b.length&&a[i]===b[j]){
      flush();
      sections.push({kind:"unchanged",text:a[i]});
      i++;j++;startA=i;startB=j;lastA=i;lastB=j;
    }else if(j<b.length&&(i===a.length||dp[i][j+1]>dp[i+1][j]))j++;
    else i++;
  }
  flush();
  return {
    ok:true,version:LEXNOVA_DOCUMENT_VERSION,
    totalChanges:changes.length,changes,
    checklist:legalDocumentChecklist(candidate),
    originalCharacters:original.length,suggestedCharacters:candidate.length,
    finality:"WORKING_DRAFT_NOT_APPROVED",
    humanGate:"Адвокатот мора поединечно да прифати или одбие секоја измена; ниедна измена не важи автоматски.",
    original,candidate
  };
}
// Applying a selection uses the original as source of truth; no hidden rewrite.
// Sequential edit ranges retain the order in the source text.
export function applyLexNovaDecisions(review,decisionMap={}){
  if(!review?.ok || !Array.isArray(review.changes))throw Error("invalid_review");
  if(review.changes.some(c=>!["accept","reject"].includes(String(decisionMap[c.id]||""))))
    return {ok:false,error:"Секоја измена бара посебна одлука: прифати или одбиј.",text:null};
  const lines=String(review.original).replace(/\r\n/g,"\n").split("\n");
  let shift=0;
  for(const c of review.changes){
    const originalLen=c.oldText?c.oldText.split("\n").length:0;
    const newLines=c.newText?c.newText.split("\n"):[];
    const location=c.startOriginalLine-1+shift;
    if(decisionMap[c.id]==="accept"){
      lines.splice(location,originalLen,...newLines);
      shift+=newLines.length-originalLen;
    }
  }
  return {ok:true,text:lines.join("\n"),status:"HUMAN_REVIEWED_WORKING_DRAFT_NOT_SIGNED"};
}
export function lexnovaReviewExport(review,decisionMap={}){
  const changed=applyLexNovaDecisions(review,decisionMap);
  if(!changed.ok)return changed;
  return {
    ok:true,
    filename:"LexNova_Document_Review.md",
    content:[
      "# LexNova Document Copilot · работен документ",
      "Статус: HUMAN REVIEWED WORKING DRAFT · не е потпишан, поднесен или заверен",
      "Број изменети сегменти: "+review.changes.length,
      "",
      changed.text,
      "",
      "## Евиденција на одлуките",
      ...review.changes.map(c=>"- "+c.id+": "+decisionMap[c.id]+", тип: "+c.type),
      "",
      "## Структурни проверки (не се правна потврда)",
      ...review.checklist.map(f=>"- "+f.label+": "+f.state)
    ].join("\n")
  };
}
