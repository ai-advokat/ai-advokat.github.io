/* ZOKI R25: six-contract conversational entry point. Uses existing chat provider
 * only after the user manually presses Send. No private data, API calls, legal
 * clause promotion or contract engine overwrite in this module. */
(function(){
"use strict";
const models=[
  ["nda","Доверливост (NDA)"],["cooperation","Деловна соработка"],
  ["services","Вршење услуги"],["lease","Закуп"],
  ["loan","Заем"],["debt","Регулирање долг"]
];
function prompt(label){
  return "AI Contract · разговорно составување на РАБОТЕН НАЦРТ: "+label+
    ". Поставувај ми по ЕДНО прашање за фактите, договорните страни без чувствителни идентификатори, предметот, роковите, доказите и ризиците. "+
    "По секој одговор продолжи со следното релевантно прашање во ИСТИОТ разговор. "+
    "Не измислувај факти, важечки законски членови, судови, рокови или потписи. "+
    "Предложи работна структура и празни полиња, а не правно одобрен договор. "+
    "Не барај матичен број, лична карта или оригинални доверливи документи во јавниот chat; за тоа постои Secure Case Workspace. "+
    "На крај, само по потврда од корисникот, понуди валиден JSON со model и fields (текстуални фактографски полиња, без правни клаузули, лични идентификатори, потписи и статус на одобрување), за РАЧНО пренесување во приватната W2 апликација. Human Gate: HOLD. Започни со едно прашање.";
}
function install(){
  if(document.querySelector('[data-zoki-contract-conversation="r25"]'))return;
  const input=document.getElementById("aiChatInput")||document.getElementById("question");
  if(!input)return;
  const wrap=input.id==="aiChatInput"?input.closest(".ai-chat-input"):input.closest("form");
  if(!wrap||!wrap.parentElement)return;
  const d=document.createElement("details");
  d.dataset.zokiContractConversation="r25";
  d.setAttribute("aria-label","AI Contract · шест договорни модели");
  d.style.cssText="margin:8px 0;padding:10px 12px;border:1px solid #8daabc;border-radius:10px;background:var(--panel,#f1f6fa);color:var(--text,#203b52);font:13px/1.45 system-ui,sans-serif";
  const s=document.createElement("summary");
  s.textContent="▤ AI Contract · разговорно креирање договор · 6 модели";
  s.style.cssText="cursor:pointer;font-weight:750";
  d.append(s);
  const note=document.createElement("p");
  note.textContent="Изберете модел: подготвуваме само неутрално почетно прашање. Вие одлучувате дали да го испратите. Не се пренесуваат лични документи или податоци од договорниот мотор.";
  d.append(note);
  const row=document.createElement("div");
  row.style.cssText="display:flex;gap:6px;flex-wrap:wrap;margin:8px 0";
  for(const [id,name] of models){
    const b=document.createElement("button");
    b.type="button";b.dataset.zokiContractModel=id;b.textContent=name;
    b.style.cssText="background:#eef5f9;color:#173d55;border:1px solid #709ab0;border-radius:7px;padding:8px;cursor:pointer;font:600 12px system-ui";
    b.addEventListener("click",()=>{
      input.value=prompt(name);
      input.dispatchEvent(new Event("input",{bubbles:true}));
      input.focus();
      d.open=false;
    });
    row.append(b);
  }
  d.append(row);
  const a=document.createElement("a");
  a.href="/ai-contract.html";a.textContent="Постоен AI Contract PRO · Word/PROJECT JSON";
  a.style.cssText="color:inherit;text-decoration:underline;font-weight:700";
  d.append(a);
  wrap.before(d);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
