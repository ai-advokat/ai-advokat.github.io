import { analyzeLegalDocument } from "/src/legal-analyzer.js";

const $=id=>document.getElementById(id);
let current=null;

for(const button of document.querySelectorAll(".tab")){
  button.addEventListener("click",()=>{
    document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
    document.querySelectorAll(".panel").forEach(x=>x.classList.remove("active"));
    button.classList.add("active");
    $(button.dataset.tab).classList.add("active");
  });
}

$("localFile").addEventListener("change",async e=>{
  const file=e.target.files?.[0];
  if(!file) return;
  try{
    const text=await file.text();
    $("docName").value=file.name;
    $("docText").value=text;
    $("status").textContent=`Локално вчитано: ${file.name}. Датотеката не е испратена на сервер.`;
  }catch{
    $("status").textContent="Не може да се прочита локалната датотека.";
  }
});

$("analyze").addEventListener("click",()=>{
  const text=$("docText").value;
  if(!text.trim()){
    $("status").textContent="Внесете правен текст за анализа.";
    return;
  }
  try{
    current=analyzeLegalDocument({
      filename:$("docName").value||"правен-документ.txt",
      text,
      sourceVerification:"not_verified"
    });
    render(current);
    $("status").textContent="Локалната структурна анализа е завршена. Правните извори сè уште не се официјално верификувани.";
    $("verifyCorpus").disabled=false;
    $("exportJson").disabled=false;
    $("exportCsv").disabled=false;
  }catch(error){
    current=null;
    $("status").textContent="Анализата не успеа: "+String(error?.message||error);
  }
});

$("clear").addEventListener("click",()=>{
  current=null;
  $("docText").value="";
  $("reviewBody").innerHTML='<tr><td colspan="9" class="muted">Нема анализа.</td></tr>';
  $("mType").textContent="—"; $("mComplete").textContent="—"; $("mRefs").textContent="—"; $("mGate").textContent="LOCKED";
  $("verifyCorpus").disabled=true; $("exportJson").disabled=true; $("exportCsv").disabled=true; $("status").textContent=""; $("verifyStatus").textContent="";
  $("sourceBody").innerHTML='<tr><td colspan="4" class="muted">Нема corpus verification.</td></tr>';
});

$("verifyCorpus").addEventListener("click",async()=>{
  if(!current) return;
  const r=current.reviewRow;
  const query=[
    ...r.laws.slice(0,4),
    ...r.articles.slice(0,8).map(n=>"член "+n),
    ...(r.referenceNumber ? [r.referenceNumber] : []),
    labelType(r.documentType)
  ].filter(Boolean).join(" ").slice(0,850);

  const body={
    query,
    instrument:"auto",
    articleNumbers:r.articles.slice(0,20),
    caseNumbers:r.identifiers.referenceNumbers.slice(0,12)
  };

  $("verifyCorpus").disabled=true;
  $("verifyStatus").textContent="Проверка во governed AI Advokat корпус…";
  try{
    const response=await fetch("/api/legal-analyzer/verify",{
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify(body)
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok || !data.ok) throw new Error(data.message||data.error||"verification_failed");
    renderSources(data);
    $("verifyStatus").textContent="Corpus verification е завршена. Human Gate останува заклучен до професионална проверка.";
  }catch(error){
    $("verifyStatus").textContent="Corpus verification не успеа: "+String(error?.message||error);
  }finally{
    $("verifyCorpus").disabled=false;
  }
});

function renderSources(data){
  const rows=[];
  for(const a of data?.exact?.articles||[]){
    rows.push({
      type:"Закон",
      source:"Член "+String(a.articleNumber||""),
      status:String(a.publicStatus||a.status||"pending"),
      locator:String(a.sourceUrl||"")
    });
  }
  for(const s of data?.governed?.legalSources||[]){
    rows.push({
      type:"Закон",
      source:String(s.title||"AI Advokat corpus"),
      status:[s.status,s.humanReviewStatus,s.version].filter(Boolean).join(" · "),
      locator:String(s.url||"")
    });
  }
  for(const k of data?.exact?.cases||[]){
    rows.push({
      type:"Судска практика",
      source:[k.court,k.caseNumber].filter(Boolean).join(" · "),
      status:[k.humanReviewStatus,k.authorityReviewStatus,k.precedentialWeight].filter(Boolean).join(" · "),
      locator:String(k.sourceUrl||"")
    });
  }
  for(const s of data?.governed?.caseLawSources||[]){
    rows.push({
      type:"Судска практика",
      source:[s.court,s.caseNumber||s.caseTitle].filter(Boolean).join(" · "),
      status:[s.humanReviewStatus,s.authorityReviewStatus,s.precedentialWeight].filter(Boolean).join(" · "),
      locator:String(s.url||"")
    });
  }

  const seen=new Set();
  const uniqueRows=rows.filter(row=>{
    const key=JSON.stringify(row);
    if(seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  $("sourceBody").innerHTML="";
  if(!uniqueRows.length){
    $("sourceBody").innerHTML='<tr><td colspan="4" class="muted">Нема Human-Gate проверен match во достапниот корпус. Тоа не значи дека извор не постои.</td></tr>';
    return;
  }
  for(const row of uniqueRows){
    const tr=document.createElement("tr");
    for(const key of ["type","source","status"]){
      const td=document.createElement("td");
      td.textContent=row[key]||"—";
      tr.appendChild(td);
    }
    const td=document.createElement("td");
    if(row.locator && /^https:\/\//i.test(row.locator)){
      const a=document.createElement("a");
      a.href=row.locator; a.target="_blank"; a.rel="noopener noreferrer";
      a.textContent="Отвори примарен извор";
      td.appendChild(a);
    }else{
      td.textContent=row.locator||"—";
    }
    tr.appendChild(td);
    $("sourceBody").appendChild(tr);
  }
}

$("exportJson").addEventListener("click",()=>{
  if(!current) return;
  download(JSON.stringify(current,null,2),"legal-analyzer-result.json","application/json");
});

$("exportCsv").addEventListener("click",()=>{
  if(!current) return;
  const r=current.reviewRow;
  const columns=["filename","documentType","authority","referenceNumber","decisionDate","laws","articles","deadlines","amounts","sourceVerification","humanGate"];
  const values=columns.map(k=>{
    const v=Array.isArray(r[k])?r[k].join(" | "):(r[k]??"");
    return '"'+String(v).replaceAll('"','""')+'"';
  });
  download("\uFEFF"+columns.join(",")+"\n"+values.join(","),"legal-analyzer-review-row.csv","text/csv;charset=utf-8");
});

function render(a){
  const r=a.reviewRow;
  $("mType").textContent=labelType(r.documentType);
  $("mComplete").textContent=r.completeness.score+"%";
  $("mRefs").textContent=String(r.legalReferences.articles.length+r.legalReferences.laws.length);
  $("mGate").textContent="LOCKED";
  $("reviewBody").innerHTML="";
  const tr=document.createElement("tr");
  const cells=[
    r.filename,
    labelType(r.documentType),
    r.authority.join("; ")||"—",
    r.referenceNumber||"—",
    r.decisionDate||"—",
    [...r.laws,...r.articles.map(x=>"чл. "+x)].join("; ")||"—",
    r.deadlines.join("; ")||"—",
    r.sourceVerification,
    r.humanGate
  ];
  for(const value of cells){
    const td=document.createElement("td");
    td.textContent=value;
    tr.appendChild(td);
  }
  $("reviewBody").appendChild(tr);
}

function labelType(type){
  const labels={
    criminal_judgment:"Кривична одлука",
    civil_judgment:"Граѓанска одлука",
    administrative_judgment:"Управна одлука",
    employment_dispute:"Работен спор",
    contract:"Договор",
    legal_submission:"Поднесок",
    decision:"Решение",
    unknown:"Непознат"
  };
  return labels[type]||type||"—";
}

function download(content,name,type){
  const blob=new Blob([content],{type});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
