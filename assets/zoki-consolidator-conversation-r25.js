/* ZOKI Consolidator RC36 conversation entry. This stages only a generic prompt
 * into whichever official AI Advokat chat composer is present. Manual Send. */
(function(){
"use strict";
function install(){
  if(document.querySelector("[data-zoki-consolidator-entry]"))return;
  const input=document.getElementById("aiChatInput")||document.getElementById("question");
  if(!input)return;
  const composer=input.id==="aiChatInput"?input.closest(".ai-chat-input"):input.closest("form");
  if(!composer?.parentNode)return;
  const box=document.createElement("details");
  box.dataset.zokiConsolidatorEntry="rc36";
  box.style.cssText="margin:9px 0;padding:11px 12px;border:1px solid #ad93ac;border-radius:10px;color:var(--text,#172f44);background:var(--panel,#f4f7fb);font:13px/1.5 system-ui,sans-serif";
  const summary=document.createElement("summary");
  summary.textContent="§ Консолидатор RC36 · разговорна подготовка на измени";
  summary.style.cssText="font-weight:750;cursor:pointer";
  box.append(summary);
  const p=document.createElement("p");
  p.textContent="Разговорен водич за правна ревизија; работниот текст се уредува и извезува локално во AI Advokat Консолидатор. Изборот само го пополнува прашањето, без да го испрати.";
  box.append(p);
  const pick=document.createElement("button");
  pick.type="button";pick.textContent="Почни разговор за консолидиран закон";
  pick.style.cssText="background:#e4ecf5;border:1px solid #8ca3bf;color:#122c46;border-radius:8px;padding:9px;margin:5px 5px 5px 0;font-weight:650;cursor:pointer";
  pick.onclick=()=>{
    input.value="Зоки RC36 · Консолидатор. Помогни ми да подготвам само редакциски РАБОТЕН ПРЕГЛЕД на основен закон и подоцнежни измени. Поставувај по ЕДНО прашање: (1) точен назив на акт, (2) официјален извор и број на службено гласило, (3) датум на објавување, сила и примена, (4) точен член и извадок, (5) точен текст на замената и изворна референца. Не измислувај закони, членови, рокови или правно дејство. Не барај матичен број или оригинални клиентски документи во јавниот разговор. За техничка exact-match проверка користи /consolidator/ и остави HG11/HG35 OPEN, член 48 LEGAL HOLD, финален статус NO-GO. Започни со првото прашање.";
    input.dispatchEvent(new Event("input",{bubbles:true}));
    box.open=false;input.focus();
  };
  box.append(pick);
  const a=document.createElement("a");
  a.href="/consolidator/";
  a.textContent="Отвори го интегрираниот Консолидатор v10.4 + RC36";
  a.style.cssText="display:inline-block;color:inherit;text-decoration:underline;font-weight:750;margin:6px 4px";
  box.append(a);
  composer.before(box);
}
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",install,{once:true});else install();
})();
