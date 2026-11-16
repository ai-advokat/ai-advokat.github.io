/* AI Advokat R26. No automatic provider request, paid fallback, file upload or storage. */
(()=>{
"use strict";
const $=id=>document.getElementById(id);
const LANGUAGES=Object.freeze({
  sq:"Shqip · Albanian",ar:"العربية · Arabic",bn:"বাংলা · Bengali",bs:"Bosanski",bg:"Български",
  zh:"中文 · Chinese",hr:"Hrvatski",en:"English",eo:"Esperanto",fr:"Français",de:"Deutsch",
  el:"Ελληνικά",ha:"Hausa",he:"עברית",hi:"हिन्दी",hu:"Magyar",id:"Bahasa Indonesia",
  it:"Italiano",ja:"日本語",ko:"한국어",la:"Latina",mk:"Македонски",fa:"فارسی",
  pt:"Português",pa:"ਪੰਜਾਬੀ",ru:"Русский",sr:"Српски",sl:"Slovenščina",es:"Español",
  sw:"Kiswahili",tr:"Türkçe",ur:"اردو",vi:"Tiếng Việt"
});
const origin=location.hostname.endsWith("workers.dev")?location.origin
  :"https://ai-advokat-github-io.aiadvokat16.workers.dev";
let pending=false,controller=null;
function state(message,type="neutral"){$("status").textContent=message;$("status").dataset.type=type;}
function clearResult(){
  $("translated").value="";
  $("copyResult").disabled=true;$("saveResult").disabled=true;
  $("providerMeta").textContent="Провајдер: не е повикан.";
}
function reset(){
  if(controller)controller.abort();controller=null;pending=false;
  $("sourceText").value="";$("counter").textContent="0/800";clearResult();
  $("translateButton").disabled=false;state("Подготвено. Нема започнат AI-повик.");
}
for(const [code,label] of Object.entries(LANGUAGES)){
  const option=document.createElement("option");
  option.value=code;option.textContent=label;$("targetLanguage").append(option);
}
$("targetLanguage").value="en";
$("sourceText").addEventListener("input",()=>{
  $("counter").textContent=$("sourceText").value.length+"/800";
  if(!pending)clearResult();
});
$("sourceLanguage").addEventListener("change",()=>{if(!pending)clearResult();});
$("targetLanguage").addEventListener("change",()=>{if(!pending)clearResult();});
$("clearButton").addEventListener("click",reset);
$("copyResult").addEventListener("click",()=>{
  const value=$("translated").value;
  if(value && navigator.clipboard?.writeText)
    navigator.clipboard.writeText(value).catch(()=>state("Не успеа копирањето. Копирајте го текстот рачно.","error"));
  else if(value)state("Изберете го текстот и копирајте рачно.");
});
$("saveResult").addEventListener("click",()=>{
  const value=$("translated").value;if(!value)return;
  const blob=new Blob([value],{type:"text/plain;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.download="AI-Advokat-translation-"+$("targetLanguage").value+".txt";
  a.href=url;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});
$("translatorForm").addEventListener("submit",async event=>{
  event.preventDefault();if(pending)return;
  const source=$("sourceLanguage").value,target=$("targetLanguage").value;
  const text=$("sourceText").value.trim();
  if(!text||text.length>800){state("Внесете текст до 800 знаци.","error");return;}
  if(!["mk","en"].includes(source)||!Object.hasOwn(LANGUAGES,target)){
    state("Неподдржана јазична комбинација.","error");return;
  }
  if(source==="mk" && !/[\u0400-\u04FF]/u.test(text) && /[A-Za-z]/u.test(text)){
    state("Избрано е MK, но текстот изгледа латиничен. За англиски текст изберете EN.","error");return;
  }
  if(source==="en" && /[\u0400-\u04FF]/u.test(text)){
    state("Избрано е EN, но текстот изгледа кириличен. За македонски текст изберете MK.","error");return;
  }
  clearResult();
  if(source===target){
    $("translated").value=text;$("copyResult").disabled=false;$("saveResult").disabled=false;
    $("providerMeta").textContent="Режим: ист изворен и целен јазик, без AI-повик.";
    state("Јазикот е ист. Текстот не е променет и не е направен превод.");return;
  }
  controller=new AbortController();const thisController=controller;
  pending=true;$("translateButton").disabled=true;
  const timeout=setTimeout(()=>thisController.abort(),45000);
  state("Cloudflare AI обработува еден ограничен текст. Без платен provider…");
  try{
    const response=await fetch(origin+"/api/ui-translate",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({targetLanguage:target,items:[{id:"source-0",text}]}),
      signal:thisController.signal
    });
    let data=null;try{data=await response.json();}catch{}
    const valid=response.ok&&data?.ok===true&&Array.isArray(data.translations)
      &&data.translations.length===1&&data.translations[0]?.id==="source-0"
      &&typeof data.translations[0]?.text==="string"&&data.translations[0].text.trim().length>0;
    if(!valid){
      let message="AI преведувачот не врати проверлив превод.";
      if(response.status===429)message="Достигнато е Cloudflare ограничување (429). Обидете се подоцна.";
      else if(response.status===503)message="Cloudflare AI моментално нема капацитет (503) или не е конфигуриран. Не е направен превод.";
      else if(response.status===404)message="Сервисот /api/ui-translate не е достапен во ова распоредување (404).";
      state(message,"error");$("providerMeta").textContent="Провајдер: неуспешно · HTTP "+response.status;return;
    }
    if(controller!==thisController)return;
    const translated=data.translations[0].text.trim();
    if(translated===text){
      state("Провајдерот го врати оригиналот без промена. Не можам да потврдам дека е извршен превод.","error");
      $("providerMeta").textContent="Модел: "+String(data.translationModel||data.provider||"непознат");return;
    }
    $("translated").value=translated;
    $("copyResult").disabled=false;$("saveResult").disabled=false;
    $("providerMeta").textContent="Провајдер: "+String(data.provider||"непознат")+" · Модел: "+String(data.translationModel||"непознат");
    state("Преводот е добиен од провајдерот. За правна употреба проверете ја точноста со човек.","success");
  }catch(error){
    if(controller!==thisController)return;
    state(error?.name==="AbortError"
      ?"Преводот го надмина временското ограничување. Не е извршен потврден превод."
      :"Мрежна грешка: преводот не е достапен. Проверете го Cloudflare сервисот.","error");
  }finally{
    clearTimeout(timeout);
    if(controller===thisController){controller=null;pending=false;$("translateButton").disabled=false;}
  }
});
})();
