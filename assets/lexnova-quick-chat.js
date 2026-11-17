/* LexNova Quick Chat v1. Reuses the existing external AI Advokat bot.
 * iframe loads ONLY on explicit click; the full-app link always works.
 * No duplicate model client, no new permissions, no personal-data telemetry.
 */
(function(scope){
"use strict";
const VERSION="LEXNOVA_QUICK_CHAT_V1";
function boot(){
  if(!document.body || document.getElementById("lexnovaQuickChatToggle"))return;
  // Never nest an existing bot inside itself.
  if(/^\/bot(?:\/|\/index\.html|$)/.test(location.pathname))return;
  const fixedOrigin="https://ai-advokat-github-io.aiadvokat16.workers.dev";
  const url=fixedOrigin+"/bot/";
  const launcher=document.createElement("button");
  launcher.id="lexnovaQuickChatToggle";launcher.type="button";
  launcher.setAttribute("aria-haspopup","dialog");
  launcher.setAttribute("aria-controls","lexnovaQuickChat");
  launcher.textContent="⚖ LexNova · Прашај";
  const panel=document.createElement("dialog");
  panel.id="lexnovaQuickChat";panel.className="lexnova-quick-chat";
  panel.setAttribute("aria-label","LexNova Quick Chat · AI Advokat");
  const header=document.createElement("header");
  const label=document.createElement("strong");label.textContent="LexNova Quick Chat";
  const close=document.createElement("button");close.type="button";close.textContent="Затвори ×";close.setAttribute("aria-label","Затвори Quick Chat");
  header.append(label,close);
  const content=document.createElement("div");content.className="lexnova-quick-content";
  const note=document.createElement("p");
  note.textContent="Го користи постојниот AI ADVOKAT. Ако вграден разговор е ограничен од прелистувачот, отворете го во нова картичка.";
  const openFull=document.createElement("a");openFull.href=url;openFull.target="_blank";openFull.rel="noopener noreferrer";
  openFull.textContent="Отвори целосен AI ADVOKAT";
  const placeholder=document.createElement("p");placeholder.textContent="Разговорот ќе се вчита само кога ќе го отворите Quick Chat.";
  content.append(placeholder);
  panel.append(header,content,note,openFull);
  document.body.append(launcher,panel);
  const show=()=>{
    if(!content.querySelector("iframe")){
      const frame=document.createElement("iframe");
      frame.title="AI ADVOKAT · разговор";
      frame.src=url;
      frame.loading="lazy";
      frame.referrerPolicy="no-referrer";
      frame.setAttribute("allow","microphone");
      // The same existing authenticated Worker app controls permissions and privacy.
      content.replaceChildren(frame);
    }
    if(!panel.open)panel.show();
    launcher.setAttribute("aria-expanded","true");
    close.focus();
  };
  const hide=()=>{if(panel.open)panel.close();launcher.setAttribute("aria-expanded","false");launcher.focus();};
  launcher.addEventListener("click",()=>panel.open?hide():show());
  close.addEventListener("click",hide);
  panel.addEventListener("close",()=>launcher.setAttribute("aria-expanded","false"));
  panel.addEventListener("keydown",e=>{if(e.key==="Escape")hide();});
}
scope.LexNovaQuickChat=Object.freeze({version:VERSION,init:boot});
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(typeof window!=="undefined"?window:globalThis);
