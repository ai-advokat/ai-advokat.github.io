import {
  extractCaseLawMetadata,
  buildCaseLawMetadataBatch,
  buildGovernedCaseLawNdjson
} from "/src/case-law-metadata-processor.js";
import { classifyDocumentForIngest } from "/src/document-ingest-router.js";

const $=id=>document.getElementById(id);
let files=[];
let batch=null;
let routingSkipped=[];

$("batchFiles").addEventListener("change",e=>{
  files=Array.from(e.target.files||[]).slice(0,500);
  $("batchStatus").textContent=files.length?`${files.length} датотеки избрани.`:"Нема избрани датотеки.";
});

$("processBatch").addEventListener("click",async()=>{
  if(!files.length){$("batchStatus").textContent="Изберете датотеки.";return;}
  $("processBatch").disabled=true;
  $("batchStatus").textContent="Локална обработка и SHA-256 fingerprint…";
  try{
    const docs=[];
    routingSkipped=[];
    for(const file of files){
      const text=await file.text();
      const routing=classifyDocumentForIngest(text);
      if(routing.route!=="case_law" || !routing.autoRouteAllowed){
        routingSkipped.push({filename:file.name,route:routing.route,reason:routing.reason});
        continue;
      }
      const sourceSha256=await sha256Hex(await file.arrayBuffer());
      docs.push({
        filename:file.name,
        text,
        sourceClass:"local_unverified",
        sourceSha256,
        sourceHashBasis:"original_file_bytes_sha256"
      });
    }
    if(!docs.length){
      batch=null;
      render();
      const names=routingSkipped.slice(0,5).map(x=>x.filename).join(", ");
      $("batchStatus").textContent=`Ниту еден документ не е безбедно рутиран како судска одлука. Користете Governed Document Router. ${names}`;
      return;
    }
    batch=buildCaseLawMetadataBatch(docs);
    render();
    const skipped=routingSkipped.length?` Пренасочени/задржани за review: ${routingSkipped.length}.`:"";
    $("batchStatus").textContent=`Обработени судски одлуки: ${batch.recordCount}. Дупликати по hash: ${batch.duplicateHashCount||0}.${skipped} Human Gate останува задолжителен.`;
  }catch(error){
    batch=null;
    $("batchStatus").textContent="Грешка: "+String(error?.message||error);
    render();
  }finally{
    $("processBatch").disabled=false;
  }
});

$("processSingle").addEventListener("click",async()=>{
  const text=$("singleText").value;
  if(!text.trim()) return;
  try{
    const routing=classifyDocumentForIngest(text);
    if(routing.route!=="case_law" || !routing.autoRouteAllowed){
      batch=null;
      render();
      $("batchStatus").textContent=`Документот не е безбедно класифициран како судска одлука (${routing.route}). Користете Governed Document Router.`;
      return;
    }
    const bytes=new TextEncoder().encode(text);
    const sourceSha256=await sha256Hex(bytes);
    const record=extractCaseLawMetadata(text,{
      filename:$("singleName").value||"presuda.txt",
      sourceSha256,
      sourceHashBasis:"normalized_text_utf8_sha256"
    });
    batch={
      records:[{...record,duplicateReview:{status:"unique_hash",duplicateOfIndex:null}}],
      recordCount:1,
      duplicateHashCount:0,
      humanGateRequired:true
    };
    render();
  }catch(error){
    batch=null;
    $("batchStatus").textContent="Грешка: "+String(error?.message||error);
    render();
  }
});

$("clearBatch").addEventListener("click",()=>{
  files=[]; batch=null; routingSkipped=[]; $("batchFiles").value=""; $("singleText").value="";
  $("batchStatus").textContent="Нема избрани датотеки."; render();
});

$("exportJson").addEventListener("click",()=>{
  if(!batch) return;
  download(JSON.stringify(batch,null,2),"ai-advokat-case-law-metadata.json","application/json");
});
$("exportNdjson").addEventListener("click",()=>{
  if(!batch) return;
  download(buildGovernedCaseLawNdjson(batch,{runId:"browser-"+Date.now()}),"ai-advokat-case-law-review.ndjson","application/x-ndjson");
});
$("exportCsv").addEventListener("click",()=>{
  if(!batch) return;
  const cols=["filename","sourceSha256","duplicateStatus","court","caseNumber","decisionDate","decisionDateIso","recordKind","decisionType","legalArea","ecli","echrApplications","completeness","privacyReview","humanGate"];
  const rows=batch.records.map(r=>[
    r.sourceIdentity.filename,
    r.sourceIdentity.sourceSha256,
    r.duplicateReview?.status,
    r.court,
    r.caseNumber,
    r.decisionDate,
    r.decisionDateIso,
    r.recordKind,
    r.decisionType,
    r.legalArea?.value,
    r.ecli?.primary,
    (r.echr?.applicationNumbers||[]).join(" | "),
    r.completeness?.score,
    r.privacyReview?.required?"required":"no_flag",
    "pending"
  ]);
  const csv=[cols,...rows].map(row=>row.map(v=>'"'+String(v??"").replaceAll('"','""')+'"').join(",")).join("\n");
  download("\uFEFF"+csv,"ai-advokat-case-law-review.csv","text/csv;charset=utf-8");
});

function render(){
  const records=batch?.records||[];
  $("mTotal").textContent=String(records.length);
  $("mIdentified").textContent=String(records.filter(r=>r.court&&r.caseNumber).length);
  $("mPrivacy").textContent=String(records.filter(r=>r.privacyReview?.required).length);
  for(const id of ["exportJson","exportNdjson","exportCsv"]) $(id).disabled=!records.length;
  const body=$("rows"); body.innerHTML="";
  if(!records.length){body.innerHTML='<tr><td colspan="11" class="muted">Нема резултати.</td></tr>';return;}
  for(const r of records){
    const tr=document.createElement("tr");
    const values=[
      r.sourceIdentity.filename,
      r.court||"—",
      r.caseNumber||"—",
      r.decisionDateIso||r.decisionDate||"—",
      r.decisionType||"—",
      r.legalArea?.value||"—",
      r.ecli?.primary||"—",
      [...(r.echr?.applicationNumbers||[]),...(r.echr?.ecli||[])].join("; ")||"—",
      `${r.completeness?.score??0}%`,
      r.privacyReview?.required?"ПРОВЕРКА":"нема flag",
      r.duplicateReview?.status==="duplicate_content_hash"?"DUPLICATE · PENDING":"PENDING"
    ];
    values.forEach((value,i)=>{
      const td=document.createElement("td");
      if(i===8||i===9||i===10){
        const span=document.createElement("span");
        span.className="tag "+(i===9&&r.privacyReview?.required?"danger":i===10?"warn":"ok");
        span.textContent=String(value);
        td.appendChild(span);
      }else td.textContent=String(value);
      tr.appendChild(td);
    });
    body.appendChild(tr);
  }
}

async function sha256Hex(data){
  const bytes=data instanceof ArrayBuffer?data:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}

function download(content,name,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

render();
