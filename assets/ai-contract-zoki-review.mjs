const $=id=>document.getElementById(id);
const zipResult=$("zipResult");
let manifest=null;
function showFailure(message){zipResult.textContent=message;zipResult.style.color="#a42318";}
function describeSource(s){
  const el=$(s.id==="RC128"?"r128":"r187");
  if(!el)return;
  el.textContent=s.id+" · "+s.testEvidence+" · "+s.status+" · архивски SHA-256: "+s.archiveSha256.slice(0,16)+"…";
}
async function init(){
  try{
    const response=await fetch("/data/ai-contract-zoki-rc128-rc187-intake.json",{cache:"no-store"});
    if(!response.ok)throw Error("metadata_http_"+response.status);
    const value=await response.json();
    if(value?.schema!=="ai-advokat.contract-review.intake.v1"||
       value.releaseState!=="REVIEW_ONLY_HOLD"||value.production!=="NO_GO"||
       value.humanGate!=="HOLD"||value.legalReview?.approved!==0||
       value.legalReview?.findingCount!==28||
       !Array.isArray(value.sources)||value.sources.length!==2||
       !Array.isArray(value.models)||value.models.length!==6||
       value.models.reduce((n,x)=>n+x.findings,0)!==28)
       throw Error("invalid_or_unreviewed_release_manifest");
    manifest=value;
    for(const source of manifest.sources)describeSource(source);
    const target=$("models");target.replaceChildren();
    for(const model of manifest.models){
      const card=document.createElement("div");
      const title=document.createElement("strong");
      title.textContent=model.label;
      const info=document.createElement("p");
      info.textContent=model.findings+" наоди · HOLD";
      card.append(title,info);target.append(card);
    }
    $("archiveHashes").textContent=manifest.sources.map(s=>s.archive+"\n"+s.archiveSha256).join("\n\n");
  }catch(error){
    $("r128").textContent="Регистарот не е потврден.";
    $("r187").textContent="Регистарот не е потврден.";
    $("models").textContent="HOLD: не може да се провери регистарот.";
    showFailure("Не може да се потврдат архивските метаподатоци. Не продолжувајте со правно одобрување.");
  }
}
$("archiveFile").addEventListener("change",async()=>{
  const file=$("archiveFile").files?.[0];
  if(!file){zipResult.textContent="Нема избрана датотека.";return;}
  if(!manifest){showFailure("HOLD: контролниот регистар не е достапен.");return;}
  if(file.size>15*1024*1024){showFailure("Одберете ја внатрешната RC128 или RC187 архива (до 15 MB), не големиот изворен ZIP.");return;}
  if(!/\.zip$/i.test(file.name)){showFailure("Потребна е .zip архива.");return;}
  if(!globalThis.crypto?.subtle){showFailure("HTTPS е потребен за локална SHA-256 проверка.");return;}
  try{
    zipResult.textContent="Се проверува интегритетот локално…";
    const array=await file.arrayBuffer();
    const digest=await crypto.subtle.digest("SHA-256",array);
    const hash=[...new Uint8Array(digest)].map(x=>x.toString(16).padStart(2,"0")).join("");
    const match=manifest.sources.find(x=>x.archiveSha256===hash);
    if(match){zipResult.textContent="SHA-256 PASS: "+match.id+" · оригинален кандидат · LEGAL HOLD останува.";zipResult.style.color="#14663d";}
    else showFailure("SHA-256 НЕ СЕ СОВПАЃА. Архивата не одговара на доставените RC128 / RC187 кандидати.");
  }catch{showFailure("Локалната SHA-256 проверка не успеа. Датотеката не е испратена.");}
});
init();
