import {
  classifyDocumentForIngest
} from "/src/document-ingest-router.js";
import {
  bindOfficialSource,
  combineGovernedSourceRegistries
} from "/src/official-source-binder.js";
import {
  extractCaseLawMetadata
} from "/src/case-law-metadata-processor.js";

const $=id=>document.getElementById(id);
let files=[];
let manifestByFilename=new Map();
let results=[];
let registriesPromise=null;

$("documents").addEventListener("change",e=>{
  files=Array.from(e.target.files||[]).slice(0,500);
  $("documentStatus").textContent=files.length?`${files.length} документи избрани.`:"Нема избрани документи.";
});

$("sourceManifest").addEventListener("change",async e=>{
  const file=e.target.files?.[0];
  manifestByFilename=new Map();
  if(!file){
    $("manifestStatus").textContent="Без source manifest: документите ќе останат unbound.";
    return;
  }
  try{
    const parsed=JSON.parse(await file.text());
    manifestByFilename=normalizeManifest(parsed);
    $("manifestStatus").textContent=`Manifest вчитан: ${manifestByFilename.size} provenance записи.`;
  }catch(error){
    $("sourceManifest").value="";
    $("manifestStatus").textContent="Manifest не е валиден JSON: "+String(error?.message||error);
  }
});

$("routeBatch").addEventListener("click",async()=>{
  if(!files.length){
    $("runStatus").textContent="Изберете најмалку еден документ.";
    return;
  }
  $("routeBatch").disabled=true;
  $("runStatus").textContent="Локално fingerprinting, deterministic routing и source binding…";
  results=[];
  try{
    const registrySources=await loadGovernedRegistries();
    for(const file of files){
      const text=await file.text();
      const sourceSha256=await sha256Hex(await file.arrayBuffer());
      const routing=classifyDocumentForIngest(text);
      const supplied=manifestByFilename.get(file.name)||{};
      let binding=null;
      let bindingError=null;

      if(supplied.sourceUrl && ["legal_instrument","case_law"].includes(routing.route)){
        try{
          binding=bindOfficialSource({
            sourceUrl:supplied.sourceUrl,
            sourceSha256,
            route:routing.route,
            registrySources
          });
        }catch(error){
          bindingError=String(error?.message||error);
        }
      }

      let downstreamPreview=null;
      let downstreamState="manual_review_required";
      let missingRequirements=[];

      if(routing.route==="case_law"){
        const sourceClass=binding?.metadataStagingEligible?"official_public":"local_unverified";
        downstreamPreview=extractCaseLawMetadata(text,{
          filename:file.name,
          sourceUrl:supplied.sourceUrl||null,
          sourceClass,
          sourceSha256,
          sourceHashBasis:"original_file_bytes_sha256"
        });
        downstreamState=binding?.metadataStagingEligible
          ?"case_law_metadata_staged_pending_human_gate"
          :"case_law_metadata_discovery_only";
      }else if(routing.route==="legal_instrument"){
        const provided={
          instrument_key:supplied.instrumentKey||supplied.instrument_key||null,
          instrument_title:supplied.instrumentTitle||supplied.instrument_title||null,
          version_id:supplied.versionId||supplied.version_id||null,
          source_url:supplied.sourceUrl||null,
          source_sha256:sourceSha256
        };
        missingRequirements=routing.downstream.requiredMetadata.filter(key=>!provided[key]);
        downstreamPreview={
          pipeline:routing.downstream.id,
          parser:routing.downstream.parser,
          importer:routing.downstream.importer,
          parserMetadata:provided,
          sourceBinding:binding,
          note:"Full article parsing/consolidation stays in the existing governed Legal Text pipeline."
        };
        downstreamState=!missingRequirements.length && binding?.metadataStagingEligible
          ?"legal_text_pipeline_metadata_ready_pending_human_gate"
          :"legal_text_pipeline_requirements_pending";
      }else if(routing.route==="review_only"){
        downstreamState="legal_analyzer_review_only";
      }

      results.push({
        filename:file.name,
        size:file.size,
        sourceSha256,
        routing,
        suppliedSource:supplied.sourceUrl||null,
        sourceBinding:binding,
        sourceBindingError:bindingError,
        missingRequirements,
        downstreamState,
        downstreamPreview,
        humanGateRequired:true
      });
    }
    render();
    const auto=results.filter(r=>r.routing.autoRouteAllowed).length;
    const manual=results.length-auto;
    $("runStatus").textContent=`Рутирањето е завршено: ${auto} auto-route, ${manual} review-only/manual. Human Gate останува заклучен.`;
  }catch(error){
    results=[];
    render();
    $("runStatus").textContent="Рутирањето не успеа: "+String(error?.message||error);
  }finally{
    $("routeBatch").disabled=false;
  }
});

$("clearBatch").addEventListener("click",()=>{
  files=[];
  results=[];
  manifestByFilename=new Map();
  $("documents").value="";
  $("sourceManifest").value="";
  $("documentStatus").textContent="Нема избрани документи.";
  $("manifestStatus").textContent="Без source manifest: документите ќе останат unbound.";
  $("runStatus").textContent="";
  render();
});

$("exportJson").addEventListener("click",()=>{
  if(!results.length) return;
  download(JSON.stringify({
    schemaVersion:"AI_ADVOCAT_DOCUMENT_ROUTE_PLAN_V1",
    generatedAt:new Date().toISOString(),
    productionEligible:false,
    humanGateRequired:true,
    records:results
  },null,2),"ai-advokat-document-route-plan.json","application/json");
});

$("exportCsv").addEventListener("click",()=>{
  if(!results.length) return;
  const columns=[
    "filename","route","autoRouteAllowed","reason","sourceSha256","sourceUrl",
    "sourceId","registryMatched","metadataStagingEligible","bulkIngestEligible",
    "rightsReviewRequired","downstreamState","missingRequirements","humanGate"
  ];
  const rows=results.map(r=>[
    r.filename,
    r.routing.route,
    r.routing.autoRouteAllowed,
    r.routing.reason,
    r.sourceSha256,
    r.suppliedSource,
    r.sourceBinding?.sourceId,
    r.sourceBinding?.registryMatched,
    r.sourceBinding?.metadataStagingEligible,
    r.sourceBinding?.bulkIngestEligible,
    r.sourceBinding?.rightsReviewRequired,
    r.downstreamState,
    r.missingRequirements.join(" | "),
    "required"
  ]);
  const csv=[columns,...rows].map(row=>row.map(csvCell).join(",")).join("\n");
  download("\uFEFF"+csv,"ai-advokat-document-route-review.csv","text/csv;charset=utf-8");
});

async function loadGovernedRegistries(){
  if(!registriesPromise){
    registriesPromise=Promise.all([
      fetch("/data/open-legal-sources-registry-2026.json",{headers:{"accept":"application/json"}}),
      fetch("/data/case-law-source-registry-2026.json",{headers:{"accept":"application/json"}})
    ]).then(async responses=>{
      for(const response of responses){
        if(!response.ok) throw new Error("source_registry_unavailable");
      }
      const [openRegistry,caseRegistry]=await Promise.all(responses.map(r=>r.json()));
      return combineGovernedSourceRegistries(openRegistry,caseRegistry);
    });
  }
  return registriesPromise;
}

function normalizeManifest(value){
  const map=new Map();
  let rows=[];
  if(Array.isArray(value)) rows=value;
  else if(Array.isArray(value?.documents)) rows=value.documents;
  else if(value && typeof value==="object"){
    rows=Object.entries(value).map(([filename,meta])=>({filename,...(meta&&typeof meta==="object"?meta:{})}));
  }else{
    throw new Error("source_manifest_expected_array_or_object");
  }
  for(const row of rows){
    const filename=String(row?.filename||"").trim();
    if(!filename) continue;
    map.set(filename,{...row,filename});
  }
  return map;
}

function routeLabel(route){
  return {
    legal_instrument:"Закон / нормативен акт",
    case_law:"Судска одлука",
    review_only:"Друг правен документ",
    manual_review:"Рачна проверка"
  }[route]||route;
}

function render(){
  $("mTotal").textContent=String(results.length);
  $("mLaws").textContent=String(results.filter(r=>r.routing.route==="legal_instrument").length);
  $("mCases").textContent=String(results.filter(r=>r.routing.route==="case_law").length);
  $("mReview").textContent=String(results.filter(r=>!r.routing.autoRouteAllowed).length);
  $("mBound").textContent=String(results.filter(r=>r.sourceBinding?.registryMatched).length);
  $("exportJson").disabled=!results.length;
  $("exportCsv").disabled=!results.length;

  const body=$("rows");
  body.innerHTML="";
  if(!results.length){
    body.innerHTML='<tr><td colspan="9" class="muted">Нема резултати.</td></tr>';
    return;
  }

  for(const r of results){
    const tr=document.createElement("tr");
    appendText(tr,r.filename);
    appendTag(tr,routeLabel(r.routing.route),r.routing.autoRouteAllowed?"ok":"warn");
    appendText(tr,r.routing.reason);
    appendText(tr,r.sourceSha256.slice(0,16)+"…");
    appendText(tr,r.sourceBinding?.sourceName||r.suppliedSource||"unbound");

    const binding=r.sourceBindingError
      ? "ERROR · "+r.sourceBindingError
      : r.sourceBinding?.metadataStagingEligible
        ? "registry match · staging candidate"
        : r.sourceBinding?.registryMatched
          ? "registry match · incomplete"
          : r.suppliedSource
            ? "unrecognized / unbound"
            : "unbound";
    appendTag(tr,binding,r.sourceBinding?.metadataStagingEligible?"ok":r.sourceBindingError?"danger":"warn");

    const rights=r.sourceBinding
      ? (r.sourceBinding.bulkIngestEligible?"bulk allowed by registry policy":r.sourceBinding.rightsReviewRequired?"rights review required":"bounded use")
      : "not evaluated";
    appendText(tr,rights);
    appendText(tr,r.downstreamState);
    appendTag(tr,"LOCKED","warn");
    body.appendChild(tr);
  }
}

function appendText(tr,value){
  const td=document.createElement("td");
  td.textContent=String(value??"—");
  tr.appendChild(td);
}

function appendTag(tr,value,kind){
  const td=document.createElement("td");
  const span=document.createElement("span");
  span.className="tag "+kind;
  span.textContent=String(value??"—");
  td.appendChild(span);
  tr.appendChild(td);
}

async function sha256Hex(data){
  const bytes=data instanceof ArrayBuffer?data:data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
  const digest=await crypto.subtle.digest("SHA-256",bytes);
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,"0")).join("");
}

function csvCell(value){
  return '"'+String(value??"").replaceAll('"','""')+'"';
}

function download(content,name,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;
  a.download=name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

render();
