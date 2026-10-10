const $=id=>document.getElementById(id);

const API_BASE=(
  location.hostname.endsWith("workers.dev") ||
  location.hostname==="localhost" ||
  location.hostname==="127.0.0.1"
) ? location.origin : "https://ai-advokat-github-io.aiadvokat16.workers.dev";

let accessKey="";
let activeCaseId="";
let currentCaseLawCards=[];

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
  setWorkspaceVisible(false);
  $("caseTitle").textContent="—";
  $("caseLegalArea").textContent="—";
  $("caseGate").textContent="LOCKED";
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
  activeCaseId=caseId;
  const data=await api("/api/cases/"+encodeURIComponent(caseId)+"/casepilot");
  renderWorkspace(data);
  await loadClassifications();
  setWorkspaceVisible(true);
  $("caseId").value=caseId;
  return data;
}

$("loadCases").addEventListener("click",async()=>{
  const key=$("membershipKey").value.trim();
  if(!key){
    $("accessStatus").textContent="Внесете membership key.";
    return;
  }
  accessKey=key;
  $("loadCases").disabled=true;
  $("accessStatus").textContent="Се вчитуваат вашите Secure Case Workspaces…";
  try{
    const data=await api("/api/cases");
    renderCasePicker(Array.isArray(data.cases)?data.cases:[]);
    $("casePickerCard").classList.remove("hidden");
    $("createCaseCard").classList.remove("hidden");
    $("accessStatus").textContent="Пристапот е потврден. Изберете предмет или креирајте нов.";
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

$("openCase").addEventListener("click",async()=>{
  const key=$("membershipKey").value.trim();
  const caseId=$("caseId").value.trim();
  if(!key){
    $("accessStatus").textContent="Внесете membership key.";
    return;
  }
  if(!validCaseId(caseId)){
    $("accessStatus").textContent="Внесете валиден Case ID.";
    return;
  }

  accessKey=key;
  $("openCase").disabled=true;
  $("accessStatus").textContent="Се отвора приватниот CasePilot workspace…";
  try{
    await openCaseById(caseId);
    $("casePickerCard").classList.remove("hidden");
    $("createCaseCard").classList.remove("hidden");
    $("accessStatus").textContent="Предметот е отворен. Membership key останува само во меморијата на оваа страница.";
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
    const cell=td("Немате активни Secure Case Workspaces.");
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
    tr.appendChild(td(item.professionalUseLocked?"LOCKED":"UNLOCKED"));

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

$("createCase").addEventListener("click",async()=>{
  if(!accessKey){
    $("createCaseStatus").textContent="Прво потврдете membership key.";
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
  $("createCaseStatus").textContent="Се креира приватниот workspace…";
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
    $("createCaseStatus").textContent="Предметот е креиран. Document ingestion останува заклучен додека private storage gate не е активен.";
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
  $("caseGate").textContent=cp?.runtime?.professionalUseLocked===false?"UNLOCKED":"LOCKED";

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
    $("classificationStatus").textContent="Класификацијата е зачувана како private case-scoped work product.";
    await loadClassifications();
  }catch(error){
    $("classificationStatus").textContent="Класификацијата не е зачувана: "+String(error?.message||error);
  }finally{
    $("saveClassification").disabled=false;
  }
});

async function loadClassifications(){
  if(!activeCaseId || !accessKey) return;
  const data=await api("/api/cases/"+encodeURIComponent(activeCaseId)+"/case-law-classifications");
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
