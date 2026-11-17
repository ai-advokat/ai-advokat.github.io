/* LexNova Human Legal Handoff: an opt-in LOCAL review packet.
 * No network, no automatic legal advice transmission and no sign/file action.
 */
(function(scope){
"use strict";
const VERSION="LEXNOVA_HUMAN_HANDOFF_V1";
let dialog=null;
function make(tag,attrs={},value=""){
 const n=document.createElement(tag);
 for(const [key,v] of Object.entries(attrs)){if(key==="className")n.className=v;else n.setAttribute(key,String(v));}
 if(value)n.textContent=value;return n;
}
function build(){
  if(dialog?.isConnected)return dialog;
  dialog=make("dialog",{id:"lexnovaHandoffDialog",className:"lexnova-handoff-dialog","aria-label":"Предавање за адвокатски преглед"});
  const head=make("h2",{},"Human Legal Handoff · Работна белешка");
  const description=make("p",{},"Ништо не се испраќа автоматски. Проверете го текстот, отстранете лични податоци и сами одлучете дали ќе го предадете на овластен адвокат.");
  const label=make("label",{for:"lexnovaHandoffContent"},"Текст што ВИЕ ќе го одобрите за предавање");
  const input=make("textarea",{id:"lexnovaHandoffContent",rows:"8",maxlength:"20000",spellcheck:"false"});
  input.placeholder="Внесете само факти што смеете да ги споделите. Одговорот на AI не се додава автоматски.";
  const controls=make("div",{className:"lexnova-handoff-controls"});
  const add=make("button",{type:"button",id:"lexnovaHandoffInclude"},"Прегледај и додај го AI одговорот");
  const agreed=make("label",{className:"lexnova-consent"});
  const checkbox=make("input",{type:"checkbox",id:"lexnovaHandoffConsent"});
  agreed.append(checkbox,document.createTextNode("Ја проверив содржината; јас одлучувам што ќе споделам."));
  const copy=make("button",{type:"button",id:"lexnovaHandoffCopy"},"Копирај за човечки преглед");
  const save=make("button",{type:"button",id:"lexnovaHandoffDownload"},"Зачувај .txt на уред");
  const close=make("button",{type:"button",id:"lexnovaHandoffClose"},"Затвори");
  const status=make("p",{role:"status",id:"lexnovaHandoffStatus"});
  copy.disabled=true;save.disabled=true;
  controls.append(add,agreed,copy,save,close);
  dialog.append(head,description,label,input,controls,status);
  document.body.append(dialog);
  const toggle=()=>{const ready=checkbox.checked && input.value.trim().length>0;copy.disabled=!ready;save.disabled=!ready;};
  checkbox.addEventListener("change",toggle);input.addEventListener("input",toggle);
  dialog.addEventListener("close",()=>{input.value="";checkbox.checked=false;toggle();dialog.dataset.answer="";status.textContent="";});
  add.addEventListener("click",()=>{
    const answer=dialog.dataset.answer||"";
    if(!answer){status.textContent="Нема достапен одговор за додавање.";return;}
    input.value=answer.slice(0,16000);
    checkbox.checked=false;toggle();
    status.textContent="Одговорот е вметнат само во локалниот преглед. Отстранете доверливи детали пред одобрување.";
    input.focus();
  });
  copy.addEventListener("click",async()=>{
    if(!checkbox.checked||!input.value.trim())return;
    try{await navigator.clipboard.writeText(input.value);status.textContent="Копирано локално. Ништо не е испратено до адвокат.";}
    catch{status.textContent="Копирањето не е дозволено во овој прелистувач. Можете рачно да го означите текстот.";input.focus();}
  });
  save.addEventListener("click",()=>{
    if(!checkbox.checked||!input.value.trim())return;
    const blob=new Blob([input.value],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=make("a",{href:url,download:"LexNova_Human_Review_Draft.txt"});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
    status.textContent="Зачуван е локален работен текст; ништо не е испратено.";
  });
  close.addEventListener("click",()=>dialog.close());
  return dialog;
}
function open(options={}){
  const node=build();
  // Keep only a bounded answer in the dialog memory. No history / attachments.
  node.dataset.answer=String(options.answer||"").slice(0,16000);
  node.showModal();
  return true;
}
function attach(article,options={}){
 if(!article||article.querySelector(".lexnova-handoff-trigger"))return false;
 const required=Boolean(options?.required||options?.humanGate||options?.governance?.humanReviewRequired);
 if(!required)return false;
 const btn=make("button",{type:"button",className:"lexnova-handoff-trigger"},"Преглед од адвокат · без испраќање");
 btn.addEventListener("click",()=>open({answer:String(options.answer||"")}));
 article.append(btn);return true;
}
scope.LexNovaHandoff=Object.freeze({version:VERSION,open,attach});
})(typeof window!=="undefined"?window:globalThis);
