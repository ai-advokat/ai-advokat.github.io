(function(){
  "use strict";
  const VERSION="1.0.0";
  const state={ready:new Set(),errors:[]};

  function targetFor(surface){
    if(surface==="external") return document.getElementById("status");
    if(surface==="main") return document.getElementById("aiChatProvider");
    return null;
  }
  function publicMessage(surface,stage){
    const prefix=surface==="external"?"Надворешниот AI Advokat":"AI Advokat";
    return prefix+" не се вчита целосно · "+stage+" · освежете со Ctrl+F5. Ако се повтори, пријавете го кодот.";
  }
  function report(surface,stage,error){
    const code="UI-"+String(surface||"unknown").toUpperCase()+"-"+String(stage||"runtime").toUpperCase().replace(/[^A-Z0-9]+/g,"-").slice(0,32);
    state.errors.push({surface,stage,code,time:Date.now()});
    const target=targetFor(surface);
    if(target){
      target.textContent=publicMessage(surface,stage)+" Код: "+code;
      target.dataset.runtimeState="degraded";
      target.dataset.runtimeCode=code;
    }
    try{console.error("ai_advokat_frontend_runtime",code,error);}catch{}
    return code;
  }
  function markReady(surface){
    state.ready.add(surface);
    const root=surface==="external"
      ? document.documentElement
      : document.getElementById("aiAdvokatChat");
    if(root) root.dataset.frontendRuntime="ready";
  }
  function watchdog(){
    setTimeout(()=>{
      if(document.getElementById("aiAdvokatChat") && !state.ready.has("main")){
        report("main","boot-timeout",new Error("main_frontend_not_ready"));
      }
      if(document.getElementById("messages") && document.getElementById("composer") && !state.ready.has("external")){
        report("external","boot-timeout",new Error("external_frontend_not_ready"));
      }
    },2500);
  }

  window.addEventListener("error",event=>{
    const filename=String(event?.filename||"");
    if(filename.includes("ai-advokat-chat")) report("main","uncaught-error",event.error||event.message);
    if(filename.includes("standalone-bot")) report("external","uncaught-error",event.error||event.message);
  });
  window.addEventListener("unhandledrejection",event=>{
    const reason=event?.reason;
    const text=String(reason?.stack||reason?.message||reason||"");
    if(text.includes("ai-advokat-chat")) report("main","unhandled-rejection",reason);
    if(text.includes("standalone-bot")) report("external","unhandled-rejection",reason);
  });

  window.AIAdvokatFrontendGuard=Object.freeze({
    version:VERSION,
    markReady,
    report,
    state
  });

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",watchdog,{once:true});
  else watchdog();
})();