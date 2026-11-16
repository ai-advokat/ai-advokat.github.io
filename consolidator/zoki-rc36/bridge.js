/* Zoki RC36 controlled workspace in the existing AI Advokat v10.4 consolidator.
 * Uses the owner-supplied RC8 exact-operation engine; no legal source is silently
 * altered, authenticated, published, uploaded or converted to current law. */
(function(){
"use strict";
const q=id=>document.getElementById(id);
const core=window.ParagrafRC8;
const schema="AI_ADVOKAT_ZOKI_RC36_WORKSPACE_V1";
const LIMIT=12*1024*1024;
let draft=null, sourceMetadata=[], last=null;
const snapshot=x=>JSON.parse(JSON.stringify(x));
function info(text,failed=false){
  const box=q("zrStatus");
  box.textContent=String(text);
  box.className="status "+(failed?"warn":"ok");
}
function setJSON(id,x){q(id).textContent=JSON.stringify(x,null,2);}
function preciseDate(s){
  if(!/^\d{4}-\d{2}-\d{2}$/.test(s))throw Error("Датум мора да биде YYYY-MM-DD");
  const date=new Date(s+"T00:00:00.000Z");
  if(!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==s)throw Error("Неважечки календарски датум");
  return s;
}
function ids(){
  if(!/^[A-Za-z0-9А-Яа-яЀ-ӿ_.-]{1,80}$/.test(q("zrCase").value.trim()))throw Error("Неважечка ознака на предмет");
  if(!/^[A-Za-z0-9А-Яа-яЀ-ӿ_.-]{1,80}$/.test(q("zrArticle").value.trim()))throw Error("Неважечки број на член");
  return {caseId:q("zrCase").value.trim(),articleId:q("zrArticle").value.trim()};
}
function newDraft(){
  if(!core?.draft||!core?.preview)throw Error("RC8 CORE недостапен; ништо не е променето");
  const id=ids();
  const law=q("zrLaw").value.trim();
  if(!law||law.length>200)throw Error("Потребен е назив на законот/актот");
  const text=q("zrOriginal").value;
  if(!text||text.length>25000)throw Error("Изворен текст: 1–25.000 знаци (по една одредба)");
  const item=core.draft(id.caseId,law);
  item.provisions.push({id:id.articleId,text,source:q("zrSourceName").value.trim().slice(0,500)||"НЕПРОВЕРЕН ИЗВОР"});
  core.validate(item);
  draft=item;last=null;sourceMetadata=[];
  setJSON("zrResult",{state:"WORKSPACE_READY",caseId:draft.caseId,provisions:draft.provisions.length,humanGate:"OPEN",production:"NO_GO"});
  info("Изворната одредба е вчитана во локалната работна копија. Оригиналот во v10.4 не е променет.");
}
function fromV104(){
  const content=q("baseText")?.value||"";
  if(!content.trim())throw Error("Прво внесете изворен текст во v10.4 или користете синтетички пример");
  if(content.length>25000)throw Error("Текстот е над 25.000 знаци: издвојте една одредба без автоматско скратување.");
  q("zrOriginal").value=content;
  newDraft();
}
function addOp(){
  if(!draft)throw Error("Прво вчитај изворна одредба");
  const find=q("zrFind").value;
  const type=q("zrType").value;
  const insert=type==="delete_exact"?"":q("zrInsert").value;
  if(!find||find.length>25000||insert.length>25000)throw Error("Неточна големина на текст");
  if(!["replace_exact","delete_exact","insert_after_exact"].includes(type))throw Error("Неподдржана операција");
  const entry={
    type,target:draft.provisions[0].id,find,insert,
    reason:q("zrReason").value.slice(0,1000),
    source:q("zrSourceName").value.trim().slice(0,500)
  };
  const next=snapshot(draft);
  next.operations.push(entry);
  core.validate(next);
  core.preview(next); // atomic fail-closed: reject missing/duplicate exact text
  draft=next;
  last=null;
  setJSON("zrOperations",draft.operations);
  info("Операција "+draft.operations.length+" додадена; изворот е непроменет.");
}
function timeReview(){
  const publication=preciseDate(q("zrPublished").value);
  const force=preciseDate(q("zrForce").value);
  const application=preciseDate(q("zrApplies").value);
  const asOf=preciseDate(q("zrAsOf").value);
  if(publication>force||force>application)throw Error("Погрешна хронологија: објавување → сила → примена");
  let classification="DATE_WINDOW_CANDIDATE_REVIEW_REQUIRED";
  if(asOf<publication)classification="NOT_YET_PUBLISHED";
  else if(asOf<force)classification="BEFORE_ENTRY_INTO_FORCE";
  else if(asOf<application)classification="BEFORE_APPLICATION";
  return {publication,entryIntoForce:force,applicationFrom:application,asOf,
    classification,legalEffect:"NOT_DETERMINED",origin:"USER_ENTERED_UNVERIFIED"};
}
function preview(){
  if(!draft)throw Error("Прво вчитајте одредба");
  const result=core.preview(draft);
  const temporal=timeReview();
  last={schema,origin:"OWNER_RC36_RC8_TECHNICAL_BRIDGE",workspace:snapshot(draft),
    preview:result,temporal,sourceMetadata:snapshot(sourceMetadata),
    legalApproval:false,humanGate11:"OPEN",humanGate35:"OPEN",
    article48:"LEGAL_HOLD",production:"NO_GO",releaseDecision:"NO_GO",
    independentSourceAuthenticity:"UNVERIFIED",
    note:"НЕ Е СЛУЖБЕН ПРЕЧИСТЕН ТЕКСТ. Потребна е независна проверка на извор, применливост и адвокатска одлука."};
  setJSON("zrResult",last);
  info("Технички преглед: "+result.changes.length+" контролирани операции. Правна одлука: HOLD.");
}
function validateImport(o){
  if(!o||o.schema!==schema||o.legalApproval!==false||
      o.humanGate11!=="OPEN"||o.humanGate35!=="OPEN"||
      o.production!=="NO_GO"||o.releaseDecision!=="NO_GO"||
      o.independentSourceAuthenticity!=="UNVERIFIED"||
      o.article48!=="LEGAL_HOLD"||o.origin!=="OWNER_RC36_RC8_TECHNICAL_BRIDGE"||
      !Array.isArray(o.sourceMetadata)||o.sourceMetadata.length>50)throw Error("HOLD: недозволен статус или форма на проект");
  core.validate(o.workspace);
  core.preview(o.workspace);
  for(const s of o.sourceMetadata){
    if(!s||typeof s.name!=="string"||s.name.length>200||
      typeof s.sha256!=="string"||!/^[a-f0-9]{64}$/.test(s.sha256)||
      s.authenticity!=="UNVERIFIED"||s.legalApproval!==false)throw Error("HOLD: изворниот доказ не е валиден");
  }
  return true;
}
function importFile(file){
  if(!file||file.size>1024*1024||!file.name.toLowerCase().endsWith(".json"))throw Error("Увоз: само JSON до 1 MB");
  return file.text().then(t=>{
    const d=JSON.parse(t);validateImport(d);
    draft=snapshot(d.workspace);sourceMetadata=snapshot(d.sourceMetadata);last=null;
    q("zrCase").value=draft.caseId;
    q("zrLaw").value=draft.law;
    q("zrArticle").value=draft.provisions[0].id;
    q("zrOriginal").value=draft.provisions[0].text;
    q("zrSourceName").value=draft.provisions[0].source;
    if(draft.operations.length){
      const op=draft.operations.at(-1);
      q("zrFind").value=op.find;q("zrInsert").value=op.insert;q("zrType").value=op.type;
    }
    setJSON("zrOperations",draft.operations);
    setJSON("zrResult",{state:"IMPORTED_WORKSPACE",caseId:draft.caseId,legalApproval:false,production:"NO_GO"});
    info("Рачно вчитан проект со "+draft.operations.length+" операции. Human Gate останува OPEN.");
  });
}
async function attachEvidence(file){
  if(!file||file.size>LIMIT)throw Error("Доказот е премногу голем; максимум 12 MB за локален SHA-256");
  if(!/^.+\.(pdf|docx|txt|md|json)$/i.test(file.name))throw Error("Само PDF/DOCX/TXT/MD/JSON за локален хеш");
  if(!crypto?.subtle)throw Error("Потребен е HTTPS или доверлив localhost за SHA-256");
  const bytes=await file.arrayBuffer();
  const hash=[...new Uint8Array(await crypto.subtle.digest("SHA-256",bytes))].map(x=>x.toString(16).padStart(2,"0")).join("");
  sourceMetadata.push({name:file.name.slice(0,200),sha256:hash,size:file.size,
    authenticity:"UNVERIFIED",legalApproval:false,createdAt:new Date().toISOString()});
  if(sourceMetadata.length>50)sourceMetadata.shift();
  last=null;setJSON("zrEvidence",sourceMetadata);
  info("SHA-256 е пресметан локално; датотеката НЕ е испратена. Интегритет ≠ правна автентичност.");
}
function download(){
  if(!last)throw Error("Прво извршете технички преглед");
  validateImport(last);
  const blob=new Blob([JSON.stringify(last,null,2)],{type:"application/json;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download="ZOKI_RC36_"+draft.caseId+"_REVIEW_ONLY.json";
  a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  info("Преземен доказен JSON · статус REVIEW ONLY / NO-GO.");
}
function run(task){
  Promise.resolve().then(task).catch(error=>info("HOLD / ГРЕШКА: "+String(error?.message||error),true));
}
function install(){
  if(!q("zrBridge")||!core){if(q("zrBridge"))info("Не се вчита RC8_CORE.js. NO-GO.",true);return}
  q("zrFromV104").addEventListener("click",()=>run(fromV104));
  q("zrNew").addEventListener("click",()=>run(newDraft));
  q("zrDemo").addEventListener("click",()=>run(()=>{
    q("zrCase").value="DEMO_ZOKI_RC36";
    q("zrLaw").value="СИНТЕТИЧКИ ЗАКОН · НЕ Е ВАЖЕЧКИ ИЗВОР";
    q("zrArticle").value="1.1";q("zrOriginal").value="Член 1\nСтар текст во пример.";
    q("zrSourceName").value="SYNTHETIC_DEMO";
    q("zrFind").value="Стар текст";q("zrInsert").value="Предложен нов текст";
    q("zrType").value="replace_exact";
    newDraft();addOp();preview();
  }));
  q("zrAdd").addEventListener("click",()=>run(addOp));
  q("zrPreview").addEventListener("click",()=>run(preview));
  q("zrExport").addEventListener("click",()=>run(download));
  q("zrImport").addEventListener("change",e=>run(async()=>{
    const f=e.target.files?.[0];if(f)await importFile(f);e.target.value="";
  }));
  q("zrEvidenceFile").addEventListener("change",e=>run(async()=>{
    const f=e.target.files?.[0];if(f)await attachEvidence(f);e.target.value="";
  }));
  info("RC36 сопственички мост активен · RC8 exact-op · локално; HG11/HG35 OPEN.");
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});
else install();
})();
