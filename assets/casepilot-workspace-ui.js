import { downloadCasePilotExport, downloadCasePilotExportFromApi } from "./casepilot-export.js";
import {caseDraftAct,checkCaseDraftAct,caseDraftExportContent} from "../src/case-draft-act.js";
import {responseEvidenceRefs} from "../src/case-response-evidence.js";
const $=id=>document.getElementById(id);

const API_BASE=(
  location.hostname.endsWith("workers.dev") ||
  location.hostname==="localhost" ||
  location.hostname==="127.0.0.1"
) ? location.origin : "https://ai-advokat-github-io.aiadvokat16.workers.dev";

let accessKey="";
let activeCaseId="";
let currentCaseLawCards=[];
let currentWorkspaceData=null;
let currentCaseRole="";
let pendingCaseFiles=[];
let currentDocuments=[];
let workspaceContext={};
let responseAnalysis=null;
let workingDraft=null;
let draftRevisions=[];
let draftOperation=null;
let responseHistory=[];
let responseNextBefore=null;
let responseHead=null;
let responseHeadKnown=false;
let pendingResponseSave=null;
const responseRevisionRoute="intelligence/response-revisions";
const draftIdPattern=/^DRAFT-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const caseHash=/^[0-9a-f]{64}$/;

function checkWorkspace(context){
  if(context!==workspaceContext || !activeCaseId || !accessKey) throw new Error("Предметот или пристапот е променет.");
}

async function workspaceRequest(tail,options,context=workspaceContext){
  checkWorkspace(context);
  const caseId=activeCaseId;
  const data=await api("/api/cases/"+encodeURIComponent(caseId)+"/"+tail,options);
  checkWorkspace(context);
  if(data.caseId!==undefined && data.caseId!==caseId) throw new Error("Одговорот е за друг предмет.");
  return data;
}

function authHeaders(extra={}){
  if(!accessKey) throw new Error("membership_key_required");
  return {"X-Membership-Key":accessKey,"accept":"application/json",...extra};
}

function clearNode(node){
  while(node.firstChild) node.removeChild(node.firstChild);
}

function td(text){
  const cell=document.createElement("td");
  cell.textContent=text==null||text===""?"—":String(text);
  return cell;
}

function sourceLink(url,label="Отвори официјален извор"){
  if(!url || !/^https:\/\//i.test(url)) return document.createTextNode("—");
  const a=document.createElement("a");
  a.href=url;
  a.target="_blank";
  a.rel="noopener noreferrer";
  a.textContent=label;
  return a;
}

async function api(path,{method="GET",body=null,auth=true}={}){
  const headers=auth ? authHeaders() : {"accept":"application/json"};
  if(body!==null) headers["content-type"]="application/json";
  const response=await fetch(API_BASE+path,{
    method,
    headers,
    body:body===null?undefined:JSON.stringify(body)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok || !data.ok){
    const error=new Error(data.message||data.error||("http_"+response.status));
    error.code=data.error||null;
    throw error;
  }
  return data;
}

function setWorkspaceVisible(visible){
  $("workspace").classList.toggle("hidden",!visible);
}

function resetWorkspace(){
  activeCaseId="";
  currentCaseLawCards=[];
  currentWorkspaceData=null;
  currentCaseRole="";
  pendingCaseFiles=[];
  currentDocuments=[];
  workspaceContext={};
  responseAnalysis=null;
  workingDraft=null;
  draftRevisions=[];
  draftOperation=null;
  responseHistory=[];
  responseNextBefore=null;
  responseHead=null;
  responseHeadKnown=false;
  pendingResponseSave=null;
  $("caseDraftResult").value="";
  $("caseDraftResult").readOnly=false;
  $("caseDraftInstruction").value="";
  $("caseDraftRevisionNote").value="";
  $("caseDraftRevisionStatus").textContent="";
  $("caseDraftStatus").textContent="";
  $("caseIntelligenceResult").replaceChildren();
  $("caseIntelligenceResult").hidden=true;
  $("intelligenceStatus").textContent="";
  $("caseResponseSourceList").replaceChildren();
  $("caseResponseSources").hidden=true;
  $("caseDraftEditor").hidden=true;
  $("analyzeEntireCase").disabled=false;
  $("prepareCaseDraft").disabled=false;
  $("uploadCaseFile").disabled=false;
  renderDraftHistory();
  updateDraftControls();
  if($("caseFileInput")) $("caseFileInput").value="";
  if($("caseFileSelection")) $("caseFileSelection").textContent="PDF · DOC · DOCX · XLS · XLSX · PNG · JPG · WebP · до 500 MB по документ · до 20 документи";
  setWorkspaceVisible(false);
  $("caseTitle").textContent="—";
  $("caseLegalArea").textContent="—";
  $("humanGateCurrent").textContent="Нема одлука";
  $("humanGateStatus").textContent="";
  $("humanGateFingerprint").textContent="";
  $("selectedCaseLawId").value="";
  $("classificationReason").value="";
  $("issueKey").value="";
  $("saveClassification").disabled=true;
  $("researchStatus").textContent="";
  $("classificationStatus").textContent="";
}

function validCaseId(value){
  return /^CASE-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value||""));
}

async function openCaseById(caseId){
  if(!validCaseId(caseId)) throw new Error("invalid_case_id");
  if(activeCaseId!==caseId) resetWorkspace();
  activeCaseId=caseId;
  const context=workspaceContext;
  const data=await api("/api/cases/"+encodeURIComponent(caseId)+"/casepilot");
  checkWorkspace(context);
  if(data.caseId!==caseId) throw new Error("Одговорот е за друг предмет.");
  currentWorkspaceData=data;
  currentCaseRole=String(data.role||"");
  renderWorkspace(data);
  await loadDocuments(context);
  await loadIntelligenceReadiness(context).catch(()=>{});
  await loadClassifications(context);
  await loadHumanGate(context);
  await loadAudit(context);
  checkWorkspace(context);
  if(!responseHeadKnown && !workingDraft){
    await reloadResponseRevision(context).catch(error=>{
      if(context===workspaceContext) $("caseDraftStatus").textContent=responseRevisionError(error);
    });
  }
  checkWorkspace(context);
  setWorkspaceVisible(true);
  $("caseId").value=caseId;
  return data;
}

$("loadCases").addEventListener("click",async()=>{
  const key=$("membershipKey").value.trim();
  if(!key){
    $("accessStatus").textContent="Внесете го приватниот код за пристап.";
    return;
  }
  if(accessKey!==key) resetWorkspace();
  accessKey=key;
  $("loadCases").disabled=true;
  $("accessStatus").textContent="Се проверува кодот и се вчитуваат Вашите предмети…";
  try{
    const data=await api("/api/cases");
    const cases=Array.isArray(data.cases)?data.cases:[];
    renderCasePicker(cases);
    $("casePickerCard").classList.remove("hidden");
    $("createCaseCard").classList.remove("hidden");
    if(cases.length){
      $("accessStatus").textContent="Пристапот е потврден. Изберете предмет или притиснете „Нов предмет“.";
    }else{
      $("accessStatus").textContent="Пристапот е потврден. Немате предмети — започнете со „Нов предмет“.";
      $("createCaseCard").scrollIntoView({behavior:"smooth",block:"start"});
    }
  }catch(error){
    resetWorkspace();
    $("casePickerCard").classList.add("hidden");
    $("createCaseCard").classList.add("hidden");
    accessKey="";
    $("accessStatus").textContent="Не може да се вчитаат предметите: "+String(error?.message||error);
  }finally{
    $("loadCases").disabled=false;
  }
});

$("membershipKey").addEventListener("keydown",event=>{
  if(event.key==="Enter"){
    event.preventDefault();
    $("loadCases").click();
  }
});

$("caseId").addEventListener("keydown",event=>{
  if(event.key==="Enter"){
    event.preventDefault();
    $("openCase").click();
  }
});

$("openCase").addEventListener("click",async()=>{
  const key=$("membershipKey").value.trim();
  const caseId=$("caseId").value.trim();
  if(!key){
    $("accessStatus").textContent="Внесете го приватниот код за пристап.";
    return;
  }
  if(!validCaseId(caseId)){
    $("accessStatus").textContent="Внесете важечки код на предмет.";
    return;
  }

  if(accessKey!==key) resetWorkspace();
  accessKey=key;
  $("openCase").disabled=true;
  $("accessStatus").textContent="Се отвора приватниот предмет…";
  try{
    await openCaseById(caseId);
    $("casePickerCard").classList.remove("hidden");
    $("createCaseCard").classList.remove("hidden");
    $("accessStatus").textContent="Предметот е отворен. Приватниот код не се зачувува на уредот.";
  }catch(error){
    resetWorkspace();
    accessKey="";
    $("accessStatus").textContent="Не може да се отвори предметот: "+String(error?.message||error);
  }finally{
    $("openCase").disabled=false;
  }
});

function renderCasePicker(cases){
  const body=$("casePickerBody");
  clearNode(body);
  if(!cases.length){
    const tr=document.createElement("tr");
    const cell=td("Немате активни предмети.");
    cell.colSpan=6;
    cell.className="muted";
    tr.appendChild(cell);
    body.appendChild(tr);
    return;
  }

  for(const item of cases){
    const tr=document.createElement("tr");
    tr.appendChild(td(item.title));
    tr.appendChild(td(item.clientReference));
    tr.appendChild(td(item.legalArea));
    tr.appendChild(td(item.status));
    tr.appendChild(td(item.professionalUseLocked?"Потребна":"Одобрена"));

    const action=document.createElement("td");
    const button=document.createElement("button");
    button.type="button";
    button.className="secondary";
    button.textContent="Отвори";
    button.addEventListener("click",async()=>{
      button.disabled=true;
      $("accessStatus").textContent="Се отвора предметот…";
      try{
        await openCaseById(String(item.id||""));
        $("accessStatus").textContent="Предметот е отворен.";
      }catch(error){
        $("accessStatus").textContent="Не може да се отвори предметот: "+String(error?.message||error);
      }finally{
        button.disabled=false;
      }
    });
    action.appendChild(button);
    tr.appendChild(action);
    body.appendChild(tr);
  }
}

$("newCaseShortcut").addEventListener("click",()=>{
  $("createCaseCard").classList.remove("hidden");
  $("createCaseCard").scrollIntoView({behavior:"smooth",block:"start"});
  setTimeout(()=>{$("newCaseTitle").focus();},250);
});

$("createCase").addEventListener("click",async()=>{
  if(!accessKey){
    $("createCaseStatus").textContent="Прво внесете го приватниот код и притиснете „Продолжи“.";
    return;
  }
  const title=$("newCaseTitle").value.trim();
  const clientReference=$("newClientReference").value.trim();
  const legalArea=$("newLegalArea").value.trim();
  const retentionUntil=$("newRetentionUntil").value.trim();
  if(!title){
    $("createCaseStatus").textContent="Внесете назив на предмет.";
    return;
  }

  $("createCase").disabled=true;
  $("createCaseStatus").textContent="Се креира новиот предмет…";
  try{
    const data=await api("/api/cases",{
      method:"POST",
      body:{
        title,
        clientReference:clientReference||null,
        legalArea:legalArea||null,
        retentionUntil:retentionUntil||null
      }
    });
    const newCase=data.case||{};
    $("createCaseStatus").textContent="Предметот е креиран и отворен. Сега додадете ги документите и побарајте анализа.";
    $("newCaseTitle").value="";
    $("newClientReference").value="";
    $("newLegalArea").value="";
    $("newRetentionUntil").value="";
    const list=await api("/api/cases");
    renderCasePicker(Array.isArray(list.cases)?list.cases:[]);
    $("casePickerCard").classList.remove("hidden");
    if(validCaseId(newCase.id)) await openCaseById(newCase.id);
  }catch(error){
    $("createCaseStatus").textContent="Предметот не е креиран: "+String(error?.message||error);
  }finally{
    $("createCase").disabled=false;
  }
});

$("forgetAccess").addEventListener("click",()=>{
  accessKey="";
  $("membershipKey").value="";
  $("caseId").value="";
  resetWorkspace();
  $("casePickerCard").classList.add("hidden");
  $("createCaseCard").classList.add("hidden");
  $("casePickerBody").innerHTML='<tr><td colspan="6" class="muted">Нема вчитани предмети.</td></tr>';
  $("createCaseStatus").textContent="";
  $("accessStatus").textContent="Пристапните податоци се исчистени од оваа страница.";
});

function renderWorkspace(data){
  const cp=data.casePilot||{};
  const matter=cp.matter||{};
  $("caseTitle").textContent=String(matter.title||data.caseId||"—");
  $("caseLegalArea").textContent=String(matter.legalArea||"—");

  const body=$("sourceRegistryBody");
  clearNode(body);
  const sources=Array.isArray(cp.sourceRegistry)?cp.sourceRegistry:[];
  if(!sources.length){
    const tr=document.createElement("tr");
    const cell=td("Нема source-linkable документи.");
    cell.colSpan=4;
    cell.className="muted";
    tr.appendChild(cell);
    body.appendChild(tr);
    return;
  }

  for(const source of sources){
    const tr=document.createElement("tr");
    tr.appendChild(td(source.sourceId));
    tr.appendChild(td(source.title));
    tr.appendChild(td(source.pageCount));
    tr.appendChild(td(source.sha256));
    body.appendChild(tr);
  }
}


function documentMimeForFile(file){
  const name=String(file?.name||"").toLowerCase();
  if(file?.type==="application/pdf" || name.endsWith(".pdf")) return "application/pdf";
  if(file?.type==="application/msword" || name.endsWith(".doc")) return "application/msword";
  if(file?.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document" || name.endsWith(".docx")){
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  }
  if(file?.type==="application/vnd.ms-excel" || name.endsWith(".xls")) return "application/vnd.ms-excel";
  if(file?.type==="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" || name.endsWith(".xlsx")){
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }
  if(file?.type==="image/png" || name.endsWith(".png")) return "image/png";
  if(file?.type==="image/jpeg" || name.endsWith(".jpg") || name.endsWith(".jpeg")) return "image/jpeg";
  if(file?.type==="image/webp" || name.endsWith(".webp")) return "image/webp";
  return "";
}

function setPendingCaseFiles(files){
  const all=[...(files||[])].filter(Boolean);
  if(all.length>20){
    $("documentStatus").textContent="Во една операција може да поставите најмногу 20 документи.";
    return false;
  }
  const incoming=all;
  const invalid=incoming.filter(file=>!documentMimeForFile(file) || file.size>500*1024*1024);
  if(invalid.length){
    $("documentStatus").textContent="Одбиени се неподдржани или преголеми датотеки: "+invalid.map(x=>x.name).join(", ");
    return false;
  }
  pendingCaseFiles=incoming;
  const selection=$("caseFileSelection");
  if(selection){
    selection.textContent=pendingCaseFiles.length
      ? pendingCaseFiles.map(file=>file.name+" ("+Math.max(1,Math.round(file.size/1024))+" KB)").join(" · ")
      : "PDF · DOC · DOCX · XLS · XLSX · PNG · JPG · WebP · до 500 MB по документ · до 20 документи";
  }
  return true;
}

$("chooseCaseFiles").addEventListener("click",()=>$("caseFileInput").click());
$("caseFileInput").addEventListener("change",()=>{
  setPendingCaseFiles($("caseFileInput").files);
});

const caseDrop=$("caseFileDrop");
if(caseDrop){
  let depth=0;
  const stop=e=>{e.preventDefault();e.stopPropagation();};
  caseDrop.addEventListener("click",e=>{if(e.target===caseDrop) $("caseFileInput").click();});
  caseDrop.addEventListener("keydown",e=>{
    if(e.key==="Enter"||e.key===" "){e.preventDefault();$("caseFileInput").click();}
  });
  caseDrop.addEventListener("dragenter",e=>{stop(e);depth++;caseDrop.classList.add("dragover");});
  caseDrop.addEventListener("dragover",e=>{stop(e);caseDrop.classList.add("dragover");});
  caseDrop.addEventListener("dragleave",e=>{stop(e);depth=Math.max(0,depth-1);if(depth===0) caseDrop.classList.remove("dragover");});
  caseDrop.addEventListener("drop",e=>{
    stop(e);depth=0;caseDrop.classList.remove("dragover");
    setPendingCaseFiles(e.dataTransfer?.files);
  });
}

async function loadDocuments(context=workspaceContext){
  if(!activeCaseId || !accessKey) return;
  $("documentStatus").textContent="Се вчитуваат приватните документи…";
  try{
    const data=await workspaceRequest("documents",undefined,context);
    currentDocuments=Array.isArray(data.documents)?data.documents:[];
    renderDocuments(currentDocuments);
    $("documentStorageState").textContent="Storage: "+String(data.upload||"unknown")+" · limit "+String(data.documentLimit||20);
    $("documentStatus").textContent="Document registry е освежен.";
    updateDraftControls();
    return currentDocuments;
  }catch(error){
    if(context!==workspaceContext) return null;
    currentDocuments=[];
    renderDocuments([]);
    $("documentStorageState").textContent="Storage: unavailable";
    $("documentStatus").textContent="Документите не се достапни: "+String(error?.message||error);
    updateDraftControls();
    return null;
  }
}

function renderDocuments(rows){
  const body=$("documentBody");
  clearNode(body);
  if(!rows.length){
    const tr=document.createElement("tr");
    const cell=td("Нема приватни документи.");
    cell.colSpan=7;
    cell.className="muted";
    tr.appendChild(cell);
    body.appendChild(tr);
    return;
  }
  for(const row of rows){
    if(String(row.storage_state||"")==="deleted") continue;
    const tr=document.createElement("tr");
    tr.appendChild(td(row.slot_number));
    const name=td(row.original_name);
    const reference=document.createElement("div");
    reference.className="muted";
    reference.textContent=String(row.id||"");
    name.appendChild(reference);
    tr.appendChild(name);
    tr.appendChild(td(row.mime_type));
    tr.appendChild(td(row.page_count));
    tr.appendChild(td(row.sha256));
    tr.appendChild(td(row.extraction_state==="complete"
      ? row.storage_state+" / Извлечен текст · за проверка"
      : row.storage_state+" / Непрочитан · "+String(row.extraction_state||"—")));
    const actions=document.createElement("td");
    if(String(row.storage_state||"")==="uploaded"){
      const download=document.createElement("button");
      download.type="button";
      download.className="secondary";
      download.textContent="Преземи";
      download.addEventListener("click",()=>downloadPrivateDocument(row));
      actions.appendChild(download);
    }
    if(["owner","lawyer"].includes(currentCaseRole)){
      const del=document.createElement("button");
      del.type="button";
      del.className="secondary";
      del.textContent="Избриши";
      del.addEventListener("click",()=>deletePrivateDocument(row));
      actions.appendChild(del);
    }
    tr.appendChild(actions);
    body.appendChild(tr);
  }
}

async function downloadPrivateDocument(row){
  if(!activeCaseId || !accessKey) return;
  $("documentStatus").textContent="Се презема приватниот документ…";
  try{
    const response=await fetch(API_BASE+"/api/cases/"+encodeURIComponent(activeCaseId)+"/documents/"+encodeURIComponent(row.id)+"/download",{
      method:"GET",
      headers:authHeaders()
    });
    if(!response.ok){
      const data=await response.json().catch(()=>({}));
      throw new Error(data.error||("http_"+response.status));
    }
    const blob=await response.blob();
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url;
    a.download=String(row.original_name||"document");
    a.rel="noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    $("documentStatus").textContent="Документот е преземен преку authenticated case-scoped route.";
    await loadAudit();
  }catch(error){
    $("documentStatus").textContent="Преземањето не успеа: "+String(error?.message||error);
  }
}

async function deletePrivateDocument(row){
  if(!activeCaseId || !accessKey) return;
  if(!["owner","lawyer"].includes(currentCaseRole)){
    $("documentStatus").textContent="Reviewer пристапот е read-only.";
    return;
  }
  if(!confirm("Да се избрише приватниот документ од CasePilot storage?")) return;
  $("documentStatus").textContent="Се брише приватниот документ…";
  try{
    await api("/api/cases/"+encodeURIComponent(activeCaseId)+"/documents/"+encodeURIComponent(row.id),{method:"DELETE"});
    $("documentStatus").textContent="Документот е избришан. Professional Human Gate е повторно заклучен.";
    await loadDocuments();
    await loadHumanGate();
    await loadAudit();
  }catch(error){
    $("documentStatus").textContent="Бришењето не успеа: "+String(error?.message||error);
  }
}

$("refreshDocuments").addEventListener("click",async()=>{
  $("refreshDocuments").disabled=true;
  try{await loadDocuments();}finally{$("refreshDocuments").disabled=false;}
});

async function extractPendingCaseDocuments(context=workspaceContext){
  if(!activeCaseId || !accessKey) return {extracted:0,failed:[]};
  const rows=await loadDocuments(context);
  checkWorkspace(context);
  if(!rows) throw new Error("Документите не се достапни.");
  const active=rows.filter(row=>String(row.storage_state||"")!=="deleted");
  let extracted=0;
  const failed=[];
  for(let i=0;i<active.length;i++){
    const row=active[i];
    if(String(row.extraction_state||"")==="complete") continue;
    if(String(row.storage_state||"")!=="uploaded"){
      failed.push({
        id:row.id,
        name:row.original_name,
        error:"Документот не е source-ready ("+String(row.storage_state||"not_ready")+"). Големите/quarantined документи бараат partitioned extraction."
      });
      continue;
    }
    $("documentStatus").textContent="AI intake "+(i+1)+"/"+active.length+": "+String(row.original_name||row.id)+"…";
    try{
      await workspaceRequest("documents/"+encodeURIComponent(row.id)+"/extract",{method:"POST",body:{}},context);
      extracted++;
    }catch(error){
      checkWorkspace(context);
      const message=error?.code==="case_document_partitioning_required"
        ? "Документот е преголем за single-document analysis и бара partitioned extraction."
        : String(error?.message||error);
      failed.push({id:row.id,name:row.original_name,error:message});
    }
  }
  if(!await loadDocuments(context)) throw new Error("Документите не се достапни.");
  return {extracted,failed};
}

async function loadIntelligenceReadiness(context=workspaceContext){
  if(!activeCaseId || !accessKey) return null;
  const data=await workspaceRequest("intelligence",undefined,context);
  const counts=data.counts||{};
  $("intelligenceDocs").textContent=String(counts.extracted||0)+"/"+String(counts.registered||0);
  $("intelligenceEvidence").textContent=data.latestAnalysisAvailable?"analysis ready":"—";
  $("intelligenceLaw").textContent=data.latestAnalysisAvailable?"see analysis":"—";
  $("intelligenceStatus").textContent=[
    "Извлечени "+String(counts.extracted||0)+" од "+String(counts.registered||0)+" документи.",
    data.latestAnalysisAvailable?"Постои последна приватна анализа.":"Нема завршена cross-document анализа."
  ].join(" ");
  return data;
}

$("refreshIntelligence").addEventListener("click",async()=>{
  $("refreshIntelligence").disabled=true;
  try{
    await loadDocuments();
    await loadIntelligenceReadiness();
  }catch(error){
    $("intelligenceStatus").textContent="Readiness не може да се вчита: "+String(error?.message||error);
  }finally{
    $("refreshIntelligence").disabled=false;
  }
});

function activeDocumentSnapshot(){
  const rows=currentDocuments.filter(row=>row.storage_state!=="deleted");
  if(!rows.length || rows.some(row=>row.storage_state!=="uploaded" ||
      row.extraction_state!=="complete" || !caseHash.test(row.sha256))) return null;
  return JSON.stringify(rows.map(({id,sha256})=>({id,sha256})));
}

async function textHash(value){
  return sha256HexFromBuffer(new TextEncoder().encode(value));
}

async function recordResponseSources(data,context){
  const sources=data.responseSources;
  if(!sources || !caseHash.test(sources.sha256) || !caseHash.test(data.analysisSha256) ||
      !Array.isArray(sources.documents) || !Array.isArray(sources.legalSources) ||
      !sources.legalSources.length || sources.documents.some(doc=>!caseHash.test(doc?.extractionSha256)) ||
      sources.legalSources.some(source=>typeof source?.title!=="string" || !source.articleNumber ||
        !source.version || !/^https:\/\//i.test(source.url) || !caseHash.test(source.sha256)) ||
      data.analysisSha256!==await textHash(data.analysis)) return false;
  checkWorkspace(context);
  const documents=activeDocumentSnapshot();
  if(!documents || documents!==JSON.stringify(sources.documents.map(({id,sha256})=>({id,sha256})))) return false;
  responseAnalysis=Object.freeze({
    analysisSha256:data.analysisSha256, sha256:sources.sha256, documents,
    extractionDocuments:sources.documents, legalSources:sources.legalSources
  });
  showResponseSources(sources.legalSources);
  return true;
}

function showResponseSources(sources){
  $("caseResponseSourceList").replaceChildren();
  for(const source of sources){
    const row=document.createElement("li");
    row.append(sourceLink(source.url,source.title),
      document.createTextNode(" · член "+source.articleNumber+" · верзија "+source.version+" · SHA-256: "+source.sha256));
    $("caseResponseSourceList").appendChild(row);
  }
  $("caseResponseSources").hidden=!sources.length;
}

function caseDraftPermission(){
  return activeCaseId && accessKey && ["owner","lawyer"].includes(currentCaseRole);
}

$("analyzeEntireCase").addEventListener("click",async()=>{
  if(!caseDraftPermission()){
    $("intelligenceStatus").textContent="За анализа е потребен пристап на сопственик или адвокат.";
    return;
  }
  if(draftOperation || $("prepareCaseDraft").disabled || $("uploadCaseFile").disabled) return;
  const context=workspaceContext;
  $("analyzeEntireCase").disabled=true;
  responseAnalysis=null;
  $("caseResponseSourceList").replaceChildren();
  $("caseResponseSources").hidden=true;
  $("caseIntelligenceResult").hidden=true;
  try{
    await loadDocuments(context);
    checkWorkspace(context);
    const active=currentDocuments.filter(row=>row.storage_state!=="deleted");
    if(!active.length) throw new Error("Нема документи за анализа.");
    const intake=await extractPendingCaseDocuments(context);
    if(intake.failed.length){
      throw new Error("Извлекувањето е нецелосно: "+intake.failed.map(x=>x.name+": "+x.error).join(" | "));
    }
    if(!activeDocumentSnapshot()) throw new Error("Има непрочитани документи.");
    $("intelligenceStatus").textContent="Се подготвува работна анализа на предметот…";
    const data=await workspaceRequest("intelligence/analyze",{method:"POST",body:{}},context);
    if(typeof data.analysis!=="string" || !data.analysis.trim()) throw new Error("Серверот не врати работна анализа.");
    await loadDocuments(context);
    checkWorkspace(context);
    const sourcesReady=await recordResponseSources(data,context);
    checkWorkspace(context);
    $("caseIntelligenceResult").textContent=data.analysis;
    $("caseIntelligenceResult").hidden=false;
    $("intelligenceDocs").textContent=String(data.coverage?.documentCoverage??"—")+"%";
    $("intelligenceEvidence").textContent=data.coverage?.evidenceCoverage==null?"—":data.coverage.evidenceCoverage+"%";
    $("intelligenceLaw").textContent=String(data.coverage?.currentLawVerification||"потребна е проверка");
    $("intelligenceStatus").textContent=sourcesReady
      ? "Работната анализа и правните извори се достапни. Professional use останува под Human Gate."
      : "Работната анализа е достапна. За одговор на жалба е потребна проверлива снимка на документите и правните извори.";
    await loadHumanGate(context);
    await loadAudit(context);
  }catch(error){
    if(context===workspaceContext) $("intelligenceStatus").textContent="Анализата е запрена: "+responseRevisionError(error);
  }finally{
    if(context===workspaceContext) $("analyzeEntireCase").disabled=false;
  }
});

$("prepareCaseDraft").addEventListener("click",async()=>{
  if(!caseDraftPermission()){
    $("caseDraftStatus").textContent="За подготовка на нацрт е потребен пристап на сопственик или адвокат.";
    return;
  }
  if(draftOperation || $("analyzeEntireCase").disabled || $("uploadCaseFile").disabled) return;
  const draftType=$("caseDraftType").value;
  const instruction=$("caseDraftInstruction").value.trim();
  if(instruction.length<3){
    $("caseDraftStatus").textContent="Внесете конкретна задача за поднесокот.";
    return;
  }
  const isResponse=draftType==="response";
  const analysis=responseAnalysis;
  if(isResponse && !analysis){
    $("caseDraftStatus").textContent="Прво извршете анализа со проверливи правни извори.";
    return;
  }
  const editor=$("caseDraftResult");
  if(editor.value.trim() && !confirm("Да се прикаже нов нацрт во редакторот? Зачуваните ревизии остануваат во историјата.")) return;
  const context=workspaceContext;
  $("prepareCaseDraft").disabled=true;
  editor.readOnly=true;
  $("caseDraftStatus").textContent="Се проверуваат документите и анализата на предметот…";
  updateDraftControls();
  try{
    if(isResponse) await loadDocuments(context);
    else {
      const intake=await extractPendingCaseDocuments(context);
      if(intake.failed.length) throw new Error("Има непрочитани или недостапни документи.");
    }
    checkWorkspace(context);
    const documents=activeDocumentSnapshot();
    if(!documents || (isResponse && documents!==analysis.documents)){
      throw new Error("Документите се недостапни, непрочитани или сменети. Повторете ја анализата.");
    }

    if(!isResponse){
      let readiness=await loadIntelligenceReadiness(context);
      if(!readiness?.latestAnalysisAvailable){
        await workspaceRequest("intelligence/analyze",{method:"POST",body:{}},context);
        readiness=await loadIntelligenceReadiness(context);
        if(!readiness?.latestAnalysisAvailable) throw new Error("case_intelligence_analysis_required");
      }
    }

    $("caseDraftStatus").textContent="Се подготвува работен поднесок…";
    const body={draftType,instruction,...(isResponse?{responseSourcesSha256:analysis.sha256}:{})};
    const data=await workspaceRequest("intelligence/draft",{method:"POST",body},context);
    if(data.caseId!==activeCaseId || data.draftType!==draftType || !draftIdPattern.test(data.draftId) ||
        typeof data.draft!=="string" || !data.draft.trim() || data.draft.length>50000 ||
        data.humanGate?.professionalUseLocked!==true || data.draftSha256!==await textHash(data.draft) ||
        (isResponse && (data.analysisSha256!==analysis.analysisSha256 || data.responseSourcesSha256!==analysis.sha256))){
      throw new Error("Потеклото на работниот нацрт не може да се потврди.");
    }
    checkWorkspace(context);
    await loadDocuments(context);
    checkWorkspace(context);
    if(activeDocumentSnapshot()!==documents) throw new Error("Документите се сменети. Повторете ја анализата.");
    pendingResponseSave=null;
    workingDraft=Object.freeze({
      caseId:activeCaseId, draftId:data.draftId, draftSha256:data.draftSha256, draftType, documents,
      analysisSha256:isResponse?analysis.analysisSha256:null,
      responseSourcesSha256:isResponse?analysis.sha256:null,
      extractionDocuments:isResponse?analysis.extractionDocuments:[],
      legalSources:isResponse?analysis.legalSources:[]
    });
    const actCheck=checkCaseDraftAct(data.draft,draftType);
    if(!actCheck.ok){ workingDraft=null; throw new Error(draftActError(actCheck.error)); }
    editor.value=data.draft;
    $("caseDraftRevisionNote").value="";
    $("caseDraftEditor").hidden=false;
    renderDraftHistory();
    $("caseDraftRevisionStatus").textContent="Прегледајте го текстот и зачувајте работна ревизија.";
    $("caseDraftStatus").textContent="WORKING DRAFT е подготвен за адвокатска доработка.";
    editor.focus();
    await loadHumanGate(context);
    await loadAudit(context);
  }catch(error){
    if(context===workspaceContext){
      const message={
        case_response_source_snapshot_changed:"Изворната снимка е сменета. Повторете ја анализата.",
        case_response_document_snapshot_changed:"Документите или извлекувањата се сменети. Повторете ја анализата.",
        case_response_source_snapshot_required:"Потребна е анализа со проверливи правни извори."
      }[error.code]||responseRevisionError(error);
      $("caseDraftStatus").textContent="Нацртот е блокиран: "+message;
    }
  }finally{
    if(context===workspaceContext){
      $("prepareCaseDraft").disabled=false;
      editor.readOnly=false;
      updateDraftControls();
    }
  }
});

function draftMatchesDocuments(draft){
  return Boolean(draft && draft.documents===activeDocumentSnapshot());
}

function isResponseDraft(){
  return workingDraft?.draftType==="response";
}

function currentSavedDraft(){
  return isResponseDraft()?responseHead:draftRevisions.at(-1);
}

function sameDraft(left,right){
  return Boolean(left && right && left.draftId===right.draftId && left.draftSha256===right.draftSha256);
}

function draftActError(code){
  return ({case_draft_instrument_mismatch:"Видот на актот не се совпаѓа со текстот. Исправете го насловот и проверете ја содржината.",case_draft_instrument_heading_required:"Недостига насловот на избраниот вид на акт. Додајте го и проверете го текстот."})[code]||code;
}

function renderSavedEvidenceLinks(revision,saved){
  const panel=$("caseDraftEvidence"),list=$("caseDraftEvidenceLinks"),detail=$("caseDraftEvidenceDetail");
  list.replaceChildren();
  detail.textContent="";
  panel.hidden=!saved || !isResponseDraft() || !caseDraftPermission();
  if(panel.hidden) return;
  const refs=responseEvidenceRefs(revision.text);
  if(!refs.length){
    detail.textContent="Нема експлицитни ознаки на извори во оваа ревизија. Не се претпоставуваат врски.";
    return;
  }
  const context=workspaceContext;
  let selection=0;
  const current=()=>context===workspaceContext && isResponseDraft() &&
    responseHead?.sha256===revision.sha256 && sameDraft(revision.draft,workingDraft) &&
    $("caseDraftResult").value===revision.text && draftMatchesDocuments(workingDraft) && caseDraftPermission();
  for(const ref of refs){
    const item=document.createElement("li"),button=document.createElement("button");
    button.type="button";
    button.className="secondary";
    const line=revision.text.split(/\r?\n/).find(line=>line.includes(ref.marker))||ref.marker;
    button.textContent="Отвори извор: "+line.slice(0,220);
    item.append(button);
    list.append(item);
    button.addEventListener("click",async()=>{
      if(!current()) return;
      const selected=++selection;
      button.disabled=true;
      detail.textContent="Се проверува изворот…";
      try{
        const query=new URLSearchParams({revisionSha256:revision.sha256,documentId:ref.documentId,factId:ref.factId});
        const data=await workspaceRequest(responseRevisionRoute+"/"+revision.number+"/evidence?"+query,undefined,context);
        if(!current() || !button.isConnected || selected!==selection) return;
        const e=data.evidence,doc=revision.draft.extractionDocuments.find(d=>d.id===ref.documentId);
        if(data.legalHold!=="ACTIVE" || data.humanGate?.professionalUseLocked!==true ||
          e?.kind!=="extracted_statement_not_proof" || e.professionalUseLocked!==true || !doc ||
          e.documentId!==ref.documentId || e.factId!==ref.factId || e.revisionSha256!==revision.sha256 ||
          e.responseSourcesSha256!==revision.draft.responseSourcesSha256 || e.sourceSha256!==doc.sha256 ||
          e.extractionSha256!==doc.extractionSha256 || typeof e.text!=="string") throw new Error("Непроверлив извор.");
        detail.textContent=["ИЗВЛЕЧЕН НАВОД — НЕ Е ПОТВРДА ЗА ВИСТИНИТОСТ",e.text,
          "Статус на извлекување: "+e.status,"Документ: "+e.documentId+" · "+e.documentType,
          "Локација: "+(e.page?"стр. "+e.page:"")+(e.locator?" · "+e.locator:""),
          "SHA-256 на извлекувањето: "+e.extractionSha256,"Проверете го оригиналот во документите на предметот."].join("\n");
      }catch(error){
        if(current() && button.isConnected && selected===selection) detail.textContent="Изворот не може да се потврди: "+responseRevisionError(error);
      }finally{button.disabled=false;}
    });
  }
}

function updateDraftControls(){
  const latest=currentSavedDraft();
  const editor=$("caseDraftResult");
  const instrument=checkCaseDraftAct(editor.value,workingDraft?.draftType);
  const valid=draftMatchesDocuments(workingDraft) && caseDraftPermission() && instrument.ok;
  $("caseDraftEditorTitle").textContent=caseDraftAct(workingDraft?.draftType)?.title||"Работен поднесок";
  if(workingDraft && editor.value.trim() && !instrument.ok) $("caseDraftRevisionStatus").textContent=draftActError(instrument.error);
  const busy=Boolean(draftOperation || editor.readOnly);
  const saved=Boolean(sameDraft(latest?.draft,workingDraft) && latest.text===editor.value);
  $("caseResponseRevisionActions").hidden=!isResponseDraft();
  $("reloadCaseResponseRevision").disabled=busy;
  $("loadOlderResponseRevisions").disabled=busy;
  $("saveCaseDraftRevision").disabled=busy || !valid || !editor.value.trim() || saved;
  $("downloadCaseDraftWord").disabled=busy || !valid || !saved;
  $("downloadCaseDraftPdf").disabled=busy || !valid || !saved;
  renderSavedEvidenceLinks(latest,valid && saved && !busy);
}

function responseRevisionError(error){
  return ({
    case_response_revision_conflict:"Друг корисник или друга сесија зачувала понова ревизија. Вашиот текст е во редакторот. Отворете ја последната серверска ревизија за споредба.",
    case_response_document_snapshot_changed:"Документите или нивното извлекување се сменети. Повторете ја анализата и подгответе нов нацрт.",
    case_response_atomic_state_conflict:"Изворите се ажурирани. Освежете го предметот, повторете ја анализата и отворете нова работна ревизија.",
    case_response_authority_changed:"Правните извори се ажурирани. Повторете ја анализата пред да продолжите со ревизијата или прегледот.",
    case_response_authority_unavailable:"Верзијата на правилата за правна анализа чека проверка. Обидете се по потврдата.",
    case_response_review_conflict_or_access_changed:"Ревизијата, одлуката или пристапот се смениле при запишувањето. Освежете го предметот и проверете ја последната состојба.",
    case_response_atomic_legacy_history:"Постојните ревизии бараат пренос пред да може да зачувате нова ревизија.",
    case_response_revision_storage_unavailable:"Серверското складиште за ревизии е недостапно. Текстот во редакторот е достапен за повторен обид.",
    case_response_revision_draft_unverified:"Изворната снимка на нацртот не може да се потврди.",
    case_draft_instrument_mismatch:draftActError("case_draft_instrument_mismatch"),
    case_draft_instrument_heading_required:draftActError("case_draft_instrument_heading_required")
  })[error.code]||error.message;
}

async function verifyServerRevision(data,context){
  const {revision}=data;
  if(data.legalHold!=="ACTIVE" || data.humanGate?.professionalUseLocked!==true ||
      !revision || revision.caseId!==activeCaseId || revision.draft?.caseId!==activeCaseId ||
      revision.draft.draftType!=="response" || !Number.isSafeInteger(revision.number) || revision.number<1 ||
      typeof revision.text!=="string" || !caseHash.test(revision.sha256)){
    throw new Error("Серверот не врати проверлива работна ревизија.");
  }
  const {sha256,...record}=revision;
  if(sha256!==await textHash(JSON.stringify(record))) throw new Error("SHA-256 на ревизијата не се совпаѓа.");
  checkWorkspace(context);
  return revision;
}

function showResponseRevision(revision){
  workingDraft=Object.freeze(revision.draft);
  $("caseDraftType").value="response";
  $("caseDraftResult").value=revision.text;
  $("caseDraftRevisionNote").value="";
  $("caseDraftEditor").hidden=false;
  $("caseDraftStatus").textContent="Работниот одговор на жалба е вчитан.";
  $("caseDraftRevisionStatus").textContent="Серверска ревизија "+revision.number+" · НЕОДОБРЕНА.";
  showResponseSources(revision.draft.legalSources);
  renderDraftHistory();
  updateDraftControls();
}

async function reloadResponseRevision(context){
  const data=await workspaceRequest(responseRevisionRoute,undefined,context);
  const head=data.head===null?null:await verifyServerRevision({...data,revision:data.head},context);
  if(!Array.isArray(data.history) || (head && data.history[0]!==head.number)){
    throw new Error("Серверот не врати проверлива историја.");
  }
  responseHead=head;
  responseHeadKnown=true;
  responseHistory=data.history;
  responseNextBefore=data.nextBefore;
  pendingResponseSave=null;
  if(head) showResponseRevision(head);
}

function restoreDraftRevision(revision){
  const editor=$("caseDraftResult");
  const status=$("caseDraftRevisionStatus");
  if(!caseDraftPermission() || draftOperation || editor.readOnly || !draftMatchesDocuments(revision.draft)){
    status.textContent="Враќањето е блокирано. Проверете ги документите или почекајте да заврши тековното дејствие.";
    return;
  }
  if(editor.value!==revision.text && !confirm("Да се врати овој текст во редакторот?")) return;
  workingDraft=revision.draft;
  editor.value=revision.text;
  $("caseDraftRevisionNote").value="Враќање од ревизија "+revision.number;
  if(isResponseDraft()) showResponseSources(revision.draft.legalSources);
  status.textContent="Текстот е во редакторот. Зачувајте нова работна ревизија.";
  updateDraftControls();
}

function draftHistoryRow(number,available){
  const row=document.createElement("li");
  row.className="draft-revision";
  const details=document.createElement("details");
  const title=document.createElement("summary");
  title.textContent="Ревизија "+number;
  details.append(title);
  row.append(details);
  function show(revision){
    title.textContent="Ревизија "+number+(revision.note?" · "+revision.note:"");
    const sha=document.createElement("code");
    sha.textContent="SHA-256 "+revision.sha256;
    const contents=document.createElement("pre");
    contents.className="analysis-output";
    contents.textContent=revision.text;
    const restore=document.createElement("button");
    restore.type="button";
    restore.className="secondary";
    restore.textContent="Врати во редакторот";
    restore.hidden=!caseDraftPermission();
    restore.addEventListener("click",()=>restoreDraftRevision(revision));
    details.append(sha,contents,restore);
  }
  if(available) show(available);
  else {
    const context=workspaceContext;
    let loading=false;
    details.addEventListener("toggle",async()=>{
      if(!details.open || loading || details.children.length>1) return;
      loading=true;
      try{
        const data=await workspaceRequest(responseRevisionRoute+"/"+number,undefined,context);
        const revision=await verifyServerRevision(data,context);
        if(revision.number!==number) throw new Error("Серверот врати друга ревизија.");
        show(revision);
      }catch(error){
        if(context===workspaceContext) $("caseDraftRevisionStatus").textContent=responseRevisionError(error);
      }finally{
        loading=false;
      }
    });
  }
  return row;
}

function renderDraftHistory(){
  const list=$("caseDraftHistory");
  list.replaceChildren();
  const server=isResponseDraft();
  if(server){
    for(const number of responseHistory) list.append(draftHistoryRow(number,number===responseHead?.number?responseHead:null));
  }else{
    for(const revision of draftRevisions.slice().reverse()) list.append(draftHistoryRow(revision.number,revision));
  }
  $("loadOlderResponseRevisions").hidden=!server || !responseNextBefore;
}

$("reloadCaseResponseRevision").addEventListener("click",async()=>{
  const editor=$("caseDraftResult");
  if(draftOperation || editor.readOnly) return;
  const dirty=editor.value && (!sameDraft(responseHead?.draft,workingDraft) || responseHead.text!==editor.value);
  if(dirty && !confirm("Да се замени текстот во редакторот со последната серверска ревизија? Незачуваните измени ќе се изгубат.")) return;
  const context=workspaceContext;
  const operation=draftOperation={};
  editor.readOnly=true;
  updateDraftControls();
  try{
    await reloadResponseRevision(context);
    if(!responseHead) $("caseDraftRevisionStatus").textContent="Предметот сè уште нема зачувана серверска ревизија.";
  }catch(error){
    if(context===workspaceContext) $("caseDraftRevisionStatus").textContent=responseRevisionError(error);
  }finally{
    if(draftOperation===operation){
      draftOperation=null;
      editor.readOnly=false;
    }
    updateDraftControls();
  }
});

$("loadOlderResponseRevisions").addEventListener("click",async()=>{
  if(draftOperation || !responseNextBefore) return;
  const context=workspaceContext;
  const operation=draftOperation={};
  updateDraftControls();
  try{
    const data=await workspaceRequest(responseRevisionRoute+"?before="+responseNextBefore,undefined,context);
    if(!Array.isArray(data.history)) throw new Error("Серверот не врати проверлива историја.");
    responseHistory.push(...data.history);
    responseNextBefore=data.nextBefore;
    renderDraftHistory();
  }catch(error){
    if(context===workspaceContext) $("caseDraftRevisionStatus").textContent=responseRevisionError(error);
  }finally{
    if(draftOperation===operation) draftOperation=null;
    updateDraftControls();
  }
});

$("caseDraftResult").addEventListener("input",()=>{
  $("caseDraftRevisionStatus").textContent="Имате незачувани измени.";
  updateDraftControls();
});

$("saveCaseDraftRevision").addEventListener("click",async()=>{
  if($("saveCaseDraftRevision").disabled) return;
  const context=workspaceContext;
  const operation=draftOperation={};
  const editor=$("caseDraftResult");
  const draft=workingDraft;
  const previous=currentSavedDraft();
  const rawText=editor.value;
  const text=rawText.normalize("NFKC").trim();
  const note=$("caseDraftRevisionNote").value.normalize("NFKC").trim()||"Адвокатска доработка";
  const status=$("caseDraftRevisionStatus");
  updateDraftControls();
  try{
    if(!text || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/u.test(text)){
      throw new Error("Проверете го текстот на ревизијата.");
    }
    const instrument=checkCaseDraftAct(text,draft.draftType);
    if(!instrument.ok) throw new Error(draftActError(instrument.error));
    if(isResponseDraft()){
      if(!responseHeadKnown){
        throw new Error("Прво отворете ја последната серверска ревизија за да го потврдите тековниот статус.");
      }
      const base=previous?{number:previous.number,sha256:previous.sha256}:null;
      const input={base,draftId:draft.draftId,text,note};
      const signature=JSON.stringify(input);
      if(pendingResponseSave?.signature!==signature) pendingResponseSave={signature,requestId:crypto.randomUUID()};
      const data=await workspaceRequest(responseRevisionRoute,{
        method:"POST",body:{...input,requestId:pendingResponseSave.requestId}
      },context);
      const revision=await verifyServerRevision(data,context);
      if(!sameDraft(revision.draft,draft) || revision.number!==(base?.number??0)+1 ||
          revision.parentSha256!==(base?.sha256??null) || revision.text!==text || revision.note!==note){
        throw new Error("Серверот врати друга ревизија.");
      }
      pendingResponseSave=null;
      responseHead=revision;
      responseHistory=[revision.number,...responseHistory];
      if(rawText===editor.value && draft===workingDraft){
        workingDraft=Object.freeze(revision.draft);
        editor.value=revision.text;
        $("caseDraftRevisionNote").value="";
        status.textContent="Ревизија "+revision.number+" · зачувана на сервер · НЕОДОБРЕНА.";
      }else{
        status.textContent="Ревизија "+revision.number+" е зачувана. Поновите измени во редакторот сè уште се незачувани.";
      }
      renderDraftHistory();
    }else{
      const revision={
        number:(previous?.number??0)+1, parentSha256:previous?.sha256??null,
        draft, text, note, savedAt:new Date().toISOString()
      };
      const sha256=await textHash(JSON.stringify(revision));
      checkWorkspace(context);
      if(draft!==workingDraft || !draftMatchesDocuments(draft) || rawText!==editor.value){
        throw new Error("Проверете го текстот и состојбата на документите.");
      }
      draftRevisions.push(Object.freeze({...revision,sha256}));
      editor.value=text;
      $("caseDraftRevisionNote").value="";
      renderDraftHistory();
      status.textContent="Ревизија "+revision.number+" · зачувана во оваа сесија · НЕОДОБРЕНА.";
    }
  }catch(error){
    if(context===workspaceContext) status.textContent="Зачувувањето е блокирано. "+responseRevisionError(error);
  }finally{
    if(draftOperation===operation) draftOperation=null;
    updateDraftControls();
  }
});

async function downloadWorkingDraft(format){
  const button=$(format==="docx"?"downloadCaseDraftWord":"downloadCaseDraftPdf");
  if(button.disabled) return;
  const context=workspaceContext;
  const operation=draftOperation={};
  const revision=currentSavedDraft();
  const draft=revision.draft;
  const server=draft.draftType==="response";
  const status=$("caseDraftRevisionStatus");
  const assertCurrentRevision=()=>{
    checkWorkspace(context);
    const instrument=checkCaseDraftAct(revision.text,draft.draftType);
    if(!instrument.ok) throw new Error(draftActError(instrument.error));
    if(!sameDraft(draft,workingDraft) || !draftMatchesDocuments(draft) || $("caseDraftResult").value!==revision.text){
      throw new Error("Ревизијата или документите се сменети.");
    }
  };
  updateDraftControls();
  try{
    await loadDocuments(context);
    assertCurrentRevision();
    if(server){
      const data=await workspaceRequest(responseRevisionRoute+"?exportSha256="+revision.sha256,undefined,context);
      const confirmed=await verifyServerRevision({...data,revision:data.head},context);
      if(confirmed.sha256!==revision.sha256) throw new Error("Серверот врати друга ревизија за извоз.");
      assertCurrentRevision();
    }
    const manifest=JSON.parse(draft.documents).map(doc=>{
      const extraction=draft.extractionDocuments.find(item=>item.id===doc.id);
      return {
        ...doc, title:"Документ од предметот",
        locator:extraction?"SHA-256 на извлекувањето: "+extraction.extractionSha256:""
      };
    });
    for(const source of draft.legalSources){
      manifest.push({
        id:"LAW-"+(manifest.length+1), title:source.title, locator:"Член "+source.articleNumber,
        version:source.version, sha256:source.sha256
      });
    }
    await downloadCasePilotExport({
      caseId:draft.caseId, caseVersion:(server?"server-r":"local-r")+revision.number,
      ...caseDraftExportContent(draft.draftType,revision.text),
      generatedAt:revision.savedAt, summary:[
        "НЕОДОБРЕН · HUMAN GATE HOLD · LEGAL_HOLD ACTIVE · НЕ Е ЗА ПОДНЕСУВАЊЕ",
        (server?"Серверска ревизија ":"Локална ревизија ")+revision.number+" · SHA-256: "+revision.sha256,
        "Серверски нацрт "+draft.draftId+" · SHA-256: "+draft.draftSha256,
        ...(draft.responseSourcesSha256?[
          "Анализа · SHA-256: "+draft.analysisSha256,
          "Снимка на изворите · SHA-256: "+draft.responseSourcesSha256
        ]:[])
      ].join("\n"),
      sourceManifest:manifest
    },format,{beforeDownload:assertCurrentRevision});
    status.textContent="Работен извоз од ревизија "+revision.number+" · НЕОДОБРЕН.";
  }catch(error){
    if(context===workspaceContext) status.textContent="Извозот е блокиран. "+responseRevisionError(error);
  }finally{
    if(draftOperation===operation) draftOperation=null;
    updateDraftControls();
  }
}

$("downloadCaseDraftWord").addEventListener("click",()=>downloadWorkingDraft("docx"));
$("downloadCaseDraftPdf").addEventListener("click",()=>downloadWorkingDraft("pdf"));

async function sha256HexFromBuffer(buffer){
  const digest=await crypto.subtle.digest("SHA-256",buffer);
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

async function uploadSmallPrivateFile(file,{pages=""}={}){
  const mime=documentMimeForFile(file);
  const nameHeader=/^[ -~]+$/.test(file.name)
    ? {"X-File-Name":file.name}
    : {"X-File-Name-UTF8":encodeURIComponent(file.name)};
  const headers=authHeaders({"content-type":mime,...nameHeader});
  if(pages) headers["X-Page-Count"]=pages;
  const response=await fetch(API_BASE+"/api/cases/"+encodeURIComponent(activeCaseId)+"/documents/upload",{
    method:"POST",
    headers,
    body:file
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok || !data.ok) throw new Error((data.error||("http_"+response.status))+" · "+file.name);
  return data;
}

async function uploadLargePrivateFile(file,{pages="",context=workspaceContext}={}){
  const mime=documentMimeForFile(file);
  checkWorkspace(context);
  const path="/api/cases/"+encodeURIComponent(activeCaseId)+"/documents/multipart/";
  const init=await api(path+"init",{
    method:"POST",
    body:{
      name:file.name,
      mimeType:mime,
      size:file.size,
      pageCount:pages||null
    }
  });
  const sessionId=init.uploadSessionId;
  const partSize=Number(init.partSize);
  const totalParts=Number(init.totalParts);
  let completed=false;
  try{
    for(let partNumber=1;partNumber<=totalParts;partNumber++){
      const start=(partNumber-1)*partSize;
      const end=Math.min(file.size,start+partSize);
      const blob=file.slice(start,end);
      const buffer=await blob.arrayBuffer();
      const sha256=await sha256HexFromBuffer(buffer);
      checkWorkspace(context);
      $("documentStatus").textContent="Се поставува "+file.name+" · дел "+partNumber+"/"+totalParts+"…";
      const response=await fetch(
        API_BASE+path+encodeURIComponent(sessionId)+"/parts/"+partNumber,
        {
          method:"PUT",
          headers:authHeaders({
            "content-type":"application/octet-stream",
            "X-Part-SHA256":sha256
          }),
          body:buffer
        }
      );
      const part=await response.json().catch(()=>({}));
      if(!response.ok || !part.ok) throw new Error((part.error||("http_"+response.status))+" · "+file.name+" · part "+partNumber);
    }
    checkWorkspace(context);
    const done=await api(
      path+encodeURIComponent(sessionId)+"/complete",
      {method:"POST",body:{}}
    );
    completed=true;
    return done;
  }finally{
    if(!completed && context===workspaceContext){
      try{
        await api(
          path+encodeURIComponent(sessionId)+"/abort",
          {method:"POST",body:{}}
        );
      }catch{}
    }
  }
}

async function uploadPrivateFile(file,{pages="",context=workspaceContext}={}){
  return file.size<=25*1024*1024
    ? uploadSmallPrivateFile(file,{pages})
    : uploadLargePrivateFile(file,{pages,context});
}

$("uploadCaseFile").addEventListener("click",async()=>{
  if(draftOperation || $("analyzeEntireCase").disabled || $("prepareCaseDraft").disabled){
    $("documentStatus").textContent="Почекајте да заврши тековното дејствие.";
    return;
  }
  if(!activeCaseId || !accessKey){
    $("documentStatus").textContent="Прво отворете предмет.";
    return;
  }
  if(!["owner","lawyer"].includes(currentCaseRole)){
    $("documentStatus").textContent="Reviewer пристапот е read-only.";
    return;
  }
  if(!pendingCaseFiles.length){
    setPendingCaseFiles($("caseFileInput").files);
  }
  if(!pendingCaseFiles.length){
    $("documentStatus").textContent="Изберете или повлечете PDF, Word или слика.";
    return;
  }
  const invalid=pendingCaseFiles.find(file=>!documentMimeForFile(file) || file.size>500*1024*1024);
  if(invalid){
    $("documentStatus").textContent="Неподдржана или преголема датотека: "+invalid.name;
    return;
  }
  const context=workspaceContext;
  const pages=pendingCaseFiles.length===1 ? $("caseFilePages").value.trim() : "";
  $("uploadCaseFile").disabled=true;
  $("documentStatus").textContent="Се поставуваат "+pendingCaseFiles.length+" приватни датотеки…";
  let uploaded=0;
  try{
    for(const file of pendingCaseFiles){
      await uploadPrivateFile(file,{pages,context});
      checkWorkspace(context);
      uploaded++;
    }
    pendingCaseFiles=[];
    $("caseFileInput").value="";
    $("caseFilePages").value="";
    $("caseFileSelection").textContent="PDF · DOC · DOCX · XLS · XLSX · PNG · JPG · WebP · до 500 MB по документ · до 20 документи";
    $("documentStatus").textContent=uploaded+" датотек(и) се зачувани приватно. Започнува AI intake…";
    await loadDocuments(context);
    const intake=await extractPendingCaseDocuments(context);
    checkWorkspace(context);
    if(intake.failed.length){
      $("documentStatus").textContent="Документите се зачувани. AI intake: "+intake.extracted+" успешно, "+intake.failed.length+" бараат дополнителна обработка. "+intake.failed.map(x=>String(x.name||x.id)+": "+x.error).join(" | ");
    }else{
      $("documentStatus").textContent=uploaded+" документ(и) се зачувани и прочитани. Подготвени се за анализа и синтеза.";
    }
    await openCaseById(activeCaseId);
  }catch(error){
    if(context!==workspaceContext) return;
    $("documentStatus").textContent="Upload прекинат по "+uploaded+" успешни датотеки: "+String(error?.message||error);
    await loadDocuments(context).catch(()=>{});
  }finally{
    if(context===workspaceContext) $("uploadCaseFile").disabled=false;
  }
});


$("researchCaseLaw").addEventListener("click",async()=>{
  if(!activeCaseId || !accessKey){
    $("researchStatus").textContent="Прво отворете предмет.";
    return;
  }
  const query=$("researchQuery").value.trim();
  if(query.length<3){
    $("researchStatus").textContent="Внесете конкретно правно прашање.";
    return;
  }

  $("researchCaseLaw").disabled=true;
  $("researchStatus").textContent="Пребарување низ reviewed official case law…";
  try{
    // Query-only endpoint: private matter text is never included.
    const data=await api("/api/casepilot/case-law",{
      method:"POST",
      body:{query},
      auth:false
    });
    currentCaseLawCards=Array.isArray(data?.comparison?.cards)?data.comparison.cards:[];
    renderResearchCards(currentCaseLawCards);
    $("researchStatus").textContent=currentCaseLawCards.length
      ? "Пронајдени се reviewed official authorities. Изберете одлука за адвокатска класификација."
      : "Нема reviewed official match во достапниот корпус.";
  }catch(error){
    currentCaseLawCards=[];
    renderResearchCards([]);
    $("researchStatus").textContent="Пребарувањето не успеа: "+String(error?.message||error);
  }finally{
    $("researchCaseLaw").disabled=false;
  }
});

function renderResearchCards(cards){
  const body=$("researchBody");
  clearNode(body);
  if(!cards.length){
    const tr=document.createElement("tr");
    const cell=td("Нема резултати.");
    cell.colSpan=5;
    cell.className="muted";
    tr.appendChild(cell);
    body.appendChild(tr);
    return;
  }

  for(const card of cards){
    const tr=document.createElement("tr");
    tr.appendChild(td([card.court,card.caseNumber||card.caseTitle].filter(Boolean).join(" · ")));
    tr.appendChild(td(card.jurisdiction));
    tr.appendChild(td(card.precedentialWeight));

    const sourceCell=document.createElement("td");
    sourceCell.appendChild(sourceLink(card.sourceUrl));
    tr.appendChild(sourceCell);

    const classifyCell=document.createElement("td");
    const button=document.createElement("button");
    button.type="button";
    button.className="secondary";
    button.textContent="Избери";
    button.addEventListener("click",()=>selectAuthority(card));
    classifyCell.appendChild(button);
    tr.appendChild(classifyCell);

    body.appendChild(tr);
  }
}

function selectAuthority(card){
  $("selectedCaseLawId").value=String(card.caseLawId||"");
  $("issueKey").value=$("researchQuery").value.trim().slice(0,240);
  $("classificationReason").value="";
  $("classificationRole").value="supporting";
  $("saveClassification").disabled=!Number.isInteger(Number(card.caseLawId));
  $("classificationStatus").textContent=[
    "Избрана одлука:",
    card.court||"",
    card.caseNumber||card.caseTitle||""
  ].filter(Boolean).join(" ");
  $("classificationReason").focus();
}

$("saveClassification").addEventListener("click",async()=>{
  if(!activeCaseId || !accessKey){
    $("classificationStatus").textContent="Прво отворете предмет.";
    return;
  }
  const caseLawId=Number($("selectedCaseLawId").value);
  const role=$("classificationRole").value;
  const reason=$("classificationReason").value.trim();
  const issueKey=$("issueKey").value.trim();

  if(!Number.isInteger(caseLawId)||caseLawId<1){
    $("classificationStatus").textContent="Изберете судска одлука.";
    return;
  }
  if(reason.length<8){
    $("classificationStatus").textContent="Внесете конкретно образложение (најмалку 8 знаци).";
    return;
  }

  $("saveClassification").disabled=true;
  $("classificationStatus").textContent="Се запишува адвокатската класификација…";
  try{
    await api("/api/cases/"+encodeURIComponent(activeCaseId)+"/case-law-classifications",{
      method:"POST",
      body:{caseLawId,role,reason,issueKey:issueKey||null}
    });
    $("classificationStatus").textContent="Класификацијата е зачувана како private case-scoped work product. Professional Human Gate повторно е заклучен до нова одлука.";
    await loadClassifications();
    await loadHumanGate();
  }catch(error){
    $("classificationStatus").textContent="Класификацијата не е зачувана: "+String(error?.message||error);
  }finally{
    $("saveClassification").disabled=false;
  }
});

async function loadClassifications(context=workspaceContext){
  if(!activeCaseId || !accessKey) return;
  const data=await workspaceRequest("case-law-classifications",undefined,context);
  renderClassifications(Array.isArray(data.classifications)?data.classifications:[]);
}

function renderClassifications(rows){
  const body=$("classificationBody");
  clearNode(body);
  if(!rows.length){
    const tr=document.createElement("tr");
    const cell=td("Нема активни класификации.");
    cell.colSpan=6;
    cell.className="muted";
    tr.appendChild(cell);
    body.appendChild(tr);
    return;
  }

  for(const row of rows){
    const tr=document.createElement("tr");
    tr.appendChild(td(row.role));
    tr.appendChild(td([row.authority?.court,row.authority?.caseNumber||row.authority?.caseTitle].filter(Boolean).join(" · ")));
    tr.appendChild(td(row.issueKey));
    tr.appendChild(td(row.reason));
    tr.appendChild(td(row.classifierDisplayName||"овластен account"));

    const sourceCell=document.createElement("td");
    sourceCell.appendChild(sourceLink(row.authority?.sourceUrl));
    tr.appendChild(sourceCell);
    body.appendChild(tr);
  }
}


async function loadHumanGate(context=workspaceContext){
  if(!activeCaseId || !accessKey) return;
  $("humanGateStatus").textContent="Се проверува Human Gate…";
  try{
    const data=await workspaceRequest("human-gate",undefined,context);
    renderHumanGate(data);
  }catch(error){
    if(context!==workspaceContext) return;
    $("humanGateCurrent").textContent="Недостапна";
    $("humanGateFingerprint").textContent="";
    $("humanGateStatus").textContent="Human Gate не е достапен: "+String(error?.message||error);
  }
}

function renderHumanGate(data){
  const gate=data?.gate||{};
  const review=data?.review;
  const decision=data?.responseReviewRequired===true?review?.decision:gate.decision;
  const labels={approved:"Одобрено",needs_revision:"Потребна доработка",rejected:"Одбиено",revoked:"Повлечено"};
  $("humanGateCurrent").textContent=labels[decision]||"Нема одлука";
  if(data?.responseReviewRequired===true){
    $("humanGateStatus").textContent=review
      ? "Ревизија "+review.revision.number+" · "+review.decidedAt
        +(review.authorizationStale?" · Овластувањето за оваа одлука е застарено.":"")
        +(review.authorityStale?" · Правните извори за оваа одлука се застарени.":"")
      : "Потребна е изречна одлука за зачуваната ревизија.";
    $("humanGateFingerprint").textContent=review
      ? "Ревизија SHA-256: "+review.revision.sha256+" · Снимка на изворите: "+review.revision.responseSourcesSha256
      : "Одлуката се врзува за точната серверска ревизија и нејзините извори.";
    return;
  }
  $("humanGateStatus").textContent=[
    gate.reviewer ? "Проверил: "+gate.reviewer : null,
    gate.decidedAt ? "Запишана на "+gate.decidedAt : null,
    gate.reason ? "Образложение: "+gate.reason : null,
    gate.stale ? "Одобрувањето е застарено по промена на предметот." : null
  ].filter(Boolean).join(" · ") || "Нема запишана адвокатска одлука за предметот.";
  $("humanGateFingerprint").textContent=gate.currentFingerprint
    ? "Тековен отпечаток на предметот: "+gate.currentFingerprint
    : "";
}

$("refreshHumanGate").addEventListener("click",async()=>{
  $("refreshHumanGate").disabled=true;
  try{
    await loadHumanGate();
  }finally{
    $("refreshHumanGate").disabled=false;
  }
});

$("recordHumanGate").addEventListener("click",async()=>{
  if(!activeCaseId || !accessKey){
    $("humanGateStatus").textContent="Прво отворете предмет.";
    return;
  }
  const decision=$("humanGateDecision").value;
  const reason=$("humanGateReason").value.trim();
  if(reason.length<8){
    $("humanGateStatus").textContent="Внесете конкретно образложение (најмалку 8 знаци).";
    return;
  }
  const context=workspaceContext;
  const target=responseHead;
  $("recordHumanGate").disabled=true;
  $("humanGateStatus").textContent="Се проверува Human Gate…";
  try{
    const gate=await workspaceRequest("human-gate",undefined,context);
    let body={decision,reason};
    if(gate.responseReviewRequired===true){
      if(!caseDraftPermission()) throw new Error("Потребен е пристап на сопственик или адвокат.");
      if(reason.length>160) throw new Error("Образложението за ревизијата мора да има најмногу 160 знаци.");
      let revision;
      if(decision==="revoked"){
        if(gate.review?.decision!=="approved") throw new Error("Нема последно евидентирано одобрување за повлекување.");
        revision=gate.review.revision;
      }else{
        if(draftOperation || !isResponseDraft() || !target || responseHead?.sha256!==target.sha256 ||
            !sameDraft(target.draft,workingDraft) || $("caseDraftResult").value!==target.text || !draftMatchesDocuments(workingDraft)){
          throw new Error("Отворете ја точната зачувана серверска ревизија без незачувани измени.");
        }
        revision={number:target.number,sha256:target.sha256,draftId:target.draft.draftId,responseSourcesSha256:target.draft.responseSourcesSha256};
      }
      if(!confirm("Изречно евидентирање на одлуката: "+decision+"\nРевизија "+revision.number+
          "\nSHA-256: "+revision.sha256+"\nСнимка на изворите: "+revision.responseSourcesSha256+
          "\nLEGAL_HOLD останува активен. Ова не е дозвола за професионален извоз.")){
        renderHumanGate(gate);
        return;
      }
      body={scope:"response_revision",decision,reason,revision,expectedDecisionId:gate.review?.decisionId??null};
    }
    const data=await workspaceRequest("human-gate",{method:"POST",body},context);
    renderHumanGate(data);
    $("humanGateReason").value="";
    await loadAudit(context);
    const list=await api("/api/cases");
    checkWorkspace(context);
    renderCasePicker(Array.isArray(list.cases)?list.cases:[]);
  }catch(error){
    if(context===workspaceContext) $("humanGateStatus").textContent="Human Gate одлуката не е запишана: "+responseRevisionError(error);
  }finally{
    $("recordHumanGate").disabled=false;
  }
});

function buildExportReport(){
  if(!currentWorkspaceData || !activeCaseId) throw new Error("case_not_open");
  const cp=currentWorkspaceData.casePilot||{};
  const matter=cp.matter||{};
  const sourceRegistry=Array.isArray(cp.sourceRegistry)?cp.sourceRegistry:[];
  return {
    caseId:activeCaseId,
    title:String(matter.title||activeCaseId),
    caseVersion:String(matter.caseVersion||"0.1"),
    summary:$("exportSummary")?.value?.trim()||"",
    sections:[{
      id:"workspace-overview",
      title:"CasePilot workspace",
      items:[{
        heading:"Предмет",
        text:[
          matter.legalArea ? "Правна област: "+matter.legalArea : null,
          "Професионален извоз: HOLD",
          "Source-linked documents: "+String(sourceRegistry.length)
        ].filter(Boolean).join("\n"),
        status:"WORKSPACE_METADATA",
        sources:[]
      }]
    }],
    sourceManifest:sourceRegistry.map(source=>({
      id:String(source.sourceId),
      title:String(source.title||source.sourceId),
      locator:"",
      version:String(matter.caseVersion||"0.1"),
      sha256:String(source.sha256||"")
    })),
    provenance:[]
  };
}

async function runExport(format){
  if(!activeCaseId || !accessKey){
    $("exportStatus").textContent="Прво отворете предмет.";
    return;
  }
  const button={
    md:$("exportMd"),
    txt:$("exportTxt"),
    docx:$("exportDocx"),
    csv:$("exportCsv"),
    json:$("exportJson"),
    png:$("exportPng"),
    jpg:$("exportJpg"),
    pdf:$("exportPdf")
  }[format];
  button.disabled=true;
  $("exportStatus").textContent="Се подготвува governed "+format.toUpperCase()+" export…";
  try{
    const report=buildExportReport();
    const result=await downloadCasePilotExportFromApi({
      caseId:activeCaseId,
      format,
      report,
      membershipKey:accessKey,
      apiBase:API_BASE
    });
    $("exportStatus").textContent="Работниот извоз е подготвен: "+String(result.filename||format)+" · НЕОДОБРЕН.";
    await loadAudit();
  }catch(error){
    $("exportStatus").textContent="Export не успеа: "+String(error?.message||error);
  }finally{
    button.disabled=false;
  }
}

$("exportDocx").addEventListener("click",()=>runExport("docx"));
$("exportMd").addEventListener("click",()=>runExport("md"));
$("exportTxt").addEventListener("click",()=>runExport("txt"));
$("exportCsv").addEventListener("click",()=>runExport("csv"));
$("exportJson").addEventListener("click",()=>runExport("json"));
$("exportPng").addEventListener("click",()=>runExport("png"));
$("exportJpg").addEventListener("click",()=>runExport("jpg"));
$("exportPdf").addEventListener("click",()=>runExport("pdf"));

$("refreshAudit").addEventListener("click",async()=>{
  $("refreshAudit").disabled=true;
  try{
    await loadAudit();
  }finally{
    $("refreshAudit").disabled=false;
  }
});

async function loadAudit(context=workspaceContext){
  if(!activeCaseId || !accessKey) return;
  $("auditStatus").textContent="Се вчитува audit trail…";
  try{
    const data=await workspaceRequest("audit",undefined,context);
    renderAudit(Array.isArray(data.events)?data.events:[]);
    $("auditStatus").textContent="Audit trail е освежен.";
  }catch(error){
    if(context!==workspaceContext) return;
    $("auditStatus").textContent="Audit trail не е достапен: "+String(error?.message||error);
  }
}

function renderAudit(events){
  const body=$("auditBody");
  clearNode(body);
  if(!events.length){
    const tr=document.createElement("tr");
    const cell=td("Нема audit events.");
    cell.colSpan=4;
    cell.className="muted";
    tr.appendChild(cell);
    body.appendChild(tr);
    return;
  }

  for(const event of events){
    const tr=document.createElement("tr");
    tr.appendChild(td(event.created_at));
    tr.appendChild(td(event.event_type));
    tr.appendChild(td([event.object_type,event.object_id].filter(Boolean).join(" · ")));
    let metadata="—";
    try{
      const parsed=JSON.parse(event.metadata_json||"{}");
      metadata=Object.entries(parsed).map(([k,v])=>k+": "+String(v)).join(" · ")||"—";
    }catch{
      metadata="—";
    }
    tr.appendChild(td(metadata));
    body.appendChild(tr);
  }
}
