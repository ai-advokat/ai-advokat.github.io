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
  $("exportJson").disabled=true; $("exportCsv").disabled=true; $("status").textContent="";
});

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
