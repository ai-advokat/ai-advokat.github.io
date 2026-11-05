(function(){
  "use strict";
  const root=document.getElementById("aiAdvokatChat");
  if(!root) return;
  const CHAT_API_BASE=location.hostname.endsWith("workers.dev") ? location.origin : "https://ai-advokat-github-io.aiadvokat16.workers.dev";

  const $=(s,p=root)=>p.querySelector(s);
  const messagesEl=$("#aiChatMessages");
  const input=$("#aiChatInput");
  const sendBtn=$("#aiChatSend");
  const stopBtn=$("#aiChatStop");
  const attachBtn=$("#aiChatAttach");
  const attachWideBtn=$("#aiChatAttachWide");
  const attachmentCount=$("#aiChatAttachmentCount");
  const fileInput=$("#aiChatFiles");
  const attachmentsEl=$("#aiChatAttachments");
  const dropZone=$("#aiChatDropZone");
  const dropHint=$("#aiChatDropHint");
  const newChatBtn=$("#aiChatNew");
  const historyEl=$("#aiChatHistory");
  const provider=$("#aiChatProvider");
  const modeBtns=[...root.querySelectorAll("[data-chat-mode]")];
  const exportButtons=[...root.querySelectorAll("[data-chat-export]")];
  const micBtn=$("#aiChatMic");
  const emptyTemplate=$("#aiChatEmptyTemplate");
  const guideVaultImport=$("#aiGuideVaultImport");
  const guideVaultClear=$("#aiGuideVaultClear");
  const guideVaultFiles=$("#aiGuideVaultFiles");
  const guideVaultStatus=$("#aiGuideVaultStatus");
  const toolsMenu=$("#aiChatTools");
  const topMenu=$("#aiChatMenu");
  const modeCaption=$("#aiChatModeCaption");
  const chatMembershipState=$("#aiChatMembershipState");
  const ownerState=$("#aiChatOwnerState");
  const historySearch=$("#aiChatHistorySearch");
  const workspaceNew=$("#aiWorkspaceNew");
  const workspaceSearchLaunch=$("#aiWorkspaceSearchLaunch");
  const evidencePanel=$("#aiChatEvidence");
  const evidenceBody=$("#aiChatEvidenceBody");
  const evidenceTitle=$("#aiEvidenceTitle");
  const evidenceSubtitle=$("#aiEvidenceSubtitle");
  const evidenceClose=$("#aiEvidenceClose");
  const evidenceToggle=$("#aiWorkspaceEvidenceToggle");
  const evidenceTabs=[...root.querySelectorAll("[data-ai-evidence-tab]")];
  const menuNew=$("#aiChatMenuNew");
  const exportConversationBtn=$("#aiChatExportConversation");
  const materialsTopBtn=$("#aiChatMaterialsTop");
  const professionalAccessBtn=$("#aiChatProfessionalAccess");
  const logoutBtn=$("#aiChatLogout");
  const accessDialog=$("#aiChatAccessDialog");
  const accessForm=$("#aiChatAccessForm");
  const accessKey=$("#aiChatAccessKey");
  const rememberAccess=$("#aiChatRememberAccess");
  const accessStatus=$("#aiChatAccessStatus");
  const accessClose=$("#aiChatAccessClose");
  const accessCancel=$("#aiChatAccessCancel");
  const accessSubmit=$("#aiChatAccessSubmit");
  const requiredChatElements={
    messagesEl,input,sendBtn,stopBtn,attachBtn,fileInput,attachmentsEl,
    newChatBtn,historyEl,provider,emptyTemplate
  };
  const missingChatElements=Object.entries(requiredChatElements).filter(([,value])=>!value).map(([name])=>name);
  if(missingChatElements.length){
    window.AIAdvokatFrontendGuard?.report?.("main","dom-contract",new Error("missing:"+missingChatElements.join(",")));
    return;
  }
  document.querySelectorAll("[data-foreign-static]").forEach(btn=>{
    btn.addEventListener("click",()=>loadForeignEmploymentPrompt(btn));
  });
  document.querySelectorAll("[data-echr-static]").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const echrMode=String(btn.dataset.echrStatic||"search");
      input.value=echrMode==="explain"
        ? "Анализирај конкретен предмет на ЕСЧП за Северна Македонија. Прво пронајди го во официјалниот македонски корпус на Бирото, потоа врзи го со HUDOC и јасно наведи application number, датум, релевантни членови, исход и извор. Ако врската не е сигурна, кажи дека е потребна дополнителна проверка."
        : "Пребарај ги официјалните македонски пресуди и одлуки на ЕСЧП за Северна Македонија. Користи го корпусот на Бирото за застапување пред ЕСЧП како домашен официјален извор и HUDOC за примарна проверка. Прикажи релевантни предмети со application number, датум, членови и точни извори.";
      autoSize();
      document.getElementById("ai-advokat-chat")?.scrollIntoView({behavior:"smooth",block:"start"});
      setTimeout(()=>input.focus(),350);
    });
  });


  let abortController=null;
  let mode="auto";
  let attachments=[];
  let guideRegistryPromise=null;
  let currentId=null;
  let evidenceTab="sources";
  let activeMembership=null;
  let accessModulePromise=null;
  const chats=new Map();

  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const now=()=>new Date().toISOString();
  const uid=()=>crypto.randomUUID ? crypto.randomUUID() : "chat-"+Date.now()+"-"+Math.random().toString(16).slice(2);
  function safeHttpUrl(value){
    try{
      const u=new URL(String(value||""));
      return (u.protocol==="https:"||u.protocol==="http:") ? u.href : null;
    }catch{return null;}
  }

  function newState(){
    return {id:uid(),title:"Нов разговор",messages:[],createdAt:now(),updatedAt:now()};
  }
  function save(){
    const serial=[...chats.values()].slice(-10).map(c=>({
      ...c,
      messages:c.messages.slice(-24).map(m=>({...m,attachments:(m.attachments||[]).map(a=>({name:a.name,type:a.type,size:a.size}))}))
    }));
    try{sessionStorage.setItem("aiAdvokatChatSessionV1",JSON.stringify({currentId,serial}));}catch{}
  }
  function load(){
    try{
      const raw=JSON.parse(sessionStorage.getItem("aiAdvokatChatSessionV1")||"null");
      if(raw?.serial?.length){
        raw.serial.forEach(c=>chats.set(c.id,c));
        currentId=raw.currentId && chats.has(raw.currentId) ? raw.currentId : raw.serial.at(-1).id;
        return;
      }
    }catch{}
    const c=newState(); chats.set(c.id,c); currentId=c.id;
  }
  function current(){return chats.get(currentId);}
  function setTitle(chat,text){
    if(chat.title==="Нов разговор" && text){
      chat.title=String(text).trim().replace(/\s+/g," ").slice(0,45) || "Нов разговор";
    }
  }
  function renderHistory(){
    historyEl.replaceChildren();
    const q=String(historySearch?.value||"").trim().toLocaleLowerCase("mk");
    [...chats.values()].slice().reverse()
      .filter(c=>!q || String(c.title||"").toLocaleLowerCase("mk").includes(q) || (c.messages||[]).some(m=>String(m?.text||"").toLocaleLowerCase("mk").includes(q)))
      .forEach(c=>{
        const row=document.createElement("div");row.className="ai-chat-history-row"+(c.id===currentId?" active":"");
        const open=document.createElement("button");open.type="button";open.className="ai-chat-history-open";open.textContent=c.title;open.title=c.title;
        open.onclick=()=>{currentId=c.id;attachments=[];renderAttachments();render();save();};
        const rename=document.createElement("button");rename.type="button";rename.className="ai-chat-history-rename";rename.textContent="⋯";rename.title="Преименувај разговор";rename.setAttribute("aria-label","Преименувај разговор");
        rename.onclick=event=>{event.stopPropagation();renameChatThread(c.id);};
        row.append(open,rename);historyEl.append(row);
      });
  }
  function renameChatThread(id){
    const chat=chats.get(id);if(!chat) return;
    const next=window.prompt("Име на разговорот:",String(chat.title||"Нов разговор"));
    if(next?.trim()){
      chat.title=next.trim().replace(/\s+/g," ").slice(0,90);
      chat.updatedAt=now();save();renderHistory();
    }
  }
  function empty(){
    const chat=current();
    return !chat || chat.messages.length===0;
  }
  async function loadForeignEmploymentPrompt(buttonOrMode){
    const button=buttonOrMode && typeof buttonOrMode==="object" ? buttonOrMode : null;
    const mode=String(button ? button.dataset.foreignEmployment : (buttonOrMode||"verify"));
    if(button) button.disabled=true;
    try{
      attachments=[];
      renderAttachments();
      input.value=[
        "AI Advokat, провери ја актуелноста на јавната МВР чек-листа за престој и вработување на странци.",
        mode==="first"
          ?"Фокус: прво барање за привремен престој по основ вработување."
          :mode==="renewal"
            ?"Фокус: продолжување на привремен престој по основ вработување."
            :"Фокус: кои документи, заверки, преводи, рокови и такси треба да се проверат пред поднесување.",
        "Фотографираните МВР листи се практична институционална информација и НЕ се сами по себе важечки правен извор.",
        "Провери ја секоја правна теза со важечки пропис и официјален извор; наведи точен извор, член/одредба, верзија и датум.",
        "Такси, рокови и задолжителни документи не преземај без тековна проверка.",
        "Не барај и не примај пасош, лична карта, уверение за неосудуваност, договор со лични податоци или друг доверлив документ во јавниот chat. За конкретни документи упати кон Secure Case Workspace."
      ].join("\n\n");
      autoSize();
      document.getElementById("ai-advokat-chat")?.scrollIntoView({behavior:"smooth",block:"start"});
      setTimeout(()=>input.focus(),350);
    }finally{
      if(button) button.disabled=false;
    }
  }

  function render(){
    renderHistory();
    messagesEl.replaceChildren();
    const chat=current();
    if(!chat || !chat.messages.length){
      messagesEl.append(emptyTemplate.content.cloneNode(true));
      messagesEl.querySelectorAll("[data-starter]").forEach(b=>b.addEventListener("click",()=>{
        input.value=b.dataset.starter||b.textContent.trim(); autoSize(); input.focus();
      }));
      messagesEl.querySelectorAll("[data-foreign-employment]").forEach(b=>b.addEventListener("click",()=>loadForeignEmploymentPrompt(b)));
      renderWorkspaceEvidence();
      return;
    }
    chat.messages.forEach((m,idx)=>messagesEl.append(renderMessage(m,idx)));
    messagesEl.scrollTop=messagesEl.scrollHeight;
    renderWorkspaceEvidence();
  }
  function createLegalPulseLoader(){
    const loader=document.createElement("div");
    loader.className="ai-legal-pulse";
    loader.setAttribute("role","status");
    loader.setAttribute("aria-live","polite");
    loader.setAttribute("aria-label","AI Advokat го подготвува одговорот");

    const mark=document.createElement("div");
    mark.className="ai-legal-pulse-mark";
    mark.setAttribute("aria-hidden","true");

    const ring=document.createElement("span");
    ring.className="ai-legal-pulse-ring";

    const pair=document.createElement("span");
    pair.className="ai-legal-pulse-pair";
    const left=document.createElement("span");left.className="ai-legal-section section-left";left.textContent="§";
    const right=document.createElement("span");right.className="ai-legal-section section-right";right.textContent="§";
    pair.append(left,right);
    mark.append(ring,pair);

    const copy=document.createElement("span");
    copy.className="ai-legal-pulse-copy";
    copy.textContent="AI Advokat подготвува одговор…";

    const dots=document.createElement("span");
    dots.className="ai-legal-pulse-dots";
    dots.setAttribute("aria-hidden","true");
    for(let i=0;i<3;i++){const dot=document.createElement("i");dot.style.setProperty("--dot-order",String(i));dots.append(dot);}

    loader.append(mark,copy,dots);
    return loader;
  }

  const MIN_PREPARING_PULSE_MS=900;
  async function keepPreparingPulseVisible(startedAt){
    const elapsed=Math.max(0,Date.now()-Number(startedAt||0));
    const remaining=Math.max(0,MIN_PREPARING_PULSE_MS-elapsed);
    if(remaining>0) await new Promise(resolve=>setTimeout(resolve,remaining));
  }

  function responseRuntimeLabel(data){
    const model=String(data?.model||"").trim();
    if(model) return model;
    if(data?.provider==="canonical_corpus_no_model") return "Governed corpus · без модел";
    if(data?.displayMode==="professional_exact_article_source_gap") return "Source/Version Gate";
    return String(data?.provider||"AI Advokat").trim()||"AI Advokat";
  }

  function renderMessage(m,idx){
    const article=document.createElement("article");
    article.className="ai-msg "+(m.role==="user"?"user":"assistant");
    const avatar=document.createElement("div");avatar.className="ai-msg-avatar";avatar.textContent=m.role==="user"?"Вие":"AI";
    const body=document.createElement("div");body.className="ai-msg-body";
    const head=document.createElement("div");head.className="ai-msg-head";
    const who=document.createElement("strong");who.textContent=m.role==="user"?"Вие":"AI Advokat";
    const meta=document.createElement("small");meta.className="meta";meta.textContent=m.meta||"";
    head.append(who,meta);
    const content=document.createElement("div");content.className="ai-msg-content";
    const isPreparing=m.role==="assistant" && m.text==="Обработувам…";
    if(isPreparing){
      article.classList.add("ai-msg-preparing");
      content.append(createLegalPulseLoader());
    }else{
      content.textContent=m.text||"";
    }
    body.append(head,content);
    let evidenceDetails=null;
    let evidenceBody=null;
    const appendEvidence=node=>{
      if(!evidenceDetails){
        evidenceDetails=document.createElement("details");
        evidenceDetails.className="ai-msg-evidence";
        const summary=document.createElement("summary");
        summary.textContent="Извори и проверка";
        evidenceBody=document.createElement("div");
        evidenceBody.className="ai-msg-evidence-body";
        evidenceDetails.append(summary,evidenceBody);
        body.append(evidenceDetails);
      }
      evidenceBody.append(node);
    };

    if(m.action && typeof m.action==="object"){
      const href=String(m.action.href||"");
      if(href.startsWith("/") && !href.startsWith("//")){
        const actionBox=document.createElement("div");actionBox.className="ai-msg-tools";
        const a=document.createElement("a");a.className="btn light";a.href=href;
        a.textContent=String(m.action.label||"Отвори");
        actionBox.append(a);body.append(actionBox);
      }
    }

    const requestedExports=Array.isArray(m.documentExports)
      ? m.documentExports
      : (m.documentExport?.format ? [m.documentExport] : []);
    if(requestedExports.length){
      const exportBox=document.createElement("div");exportBox.className="ai-msg-tools";
      requestedExports.slice(0,4).forEach(spec=>{
        const format=String(spec?.format||"").toLowerCase();
        if(!["docx","pdf","json","csv"].includes(format)) return;
        const download=document.createElement("button");download.type="button";download.className="btn light";
        const labels={docx:"Преземи Word (.docx)",pdf:"Преземи PDF",json:"Преземи JSON",csv:"Преземи CSV"};
        download.textContent=String(spec?.label||labels[format]||("Преземи "+format.toUpperCase()));
        download.addEventListener("click",async()=>{
          download.disabled=true;
          try{
            await exportAssistantMessage(m,current(),format,String(spec?.filename||("AI-Advokat-analysis."+format)));
          }catch(error){
            console.error("chat_message_export_failed",format,error);
            alert("Документот не можеше да се создаде. Обидете се повторно.");
          }finally{download.disabled=false;}
        });
        exportBox.append(download);
      });
      if(exportBox.childElementCount) body.append(exportBox);
    }

    if(m.guides?.length){
      const grid=document.createElement("div");grid.className="ai-chat-guide-grid";
      m.guides.forEach(g=>{
        const card=document.createElement("div");card.className="ai-chat-guide";
        const text=document.createElement("div");
        const b=document.createElement("b");b.textContent=g.title;
        const s=document.createElement("small");s.textContent=g.scope||g.category||"";
        const state=document.createElement("small");
        state.className="ai-chat-guide-state "+(g.activationState||"review_required");
        state.textContent=g.activationLabel||g.verificationLabel||"Правна ревизија потребна";
        text.append(b,s,state);
        const a=document.createElement("a");a.className="btn light";a.href=g.url;a.textContent="Отвори →";
        card.append(text,a);grid.append(card);
      });
      appendEvidence(grid);
    }
    if(m.governance){
      const box=document.createElement("div");box.className="ai-msg-source";
      const title=document.createElement("strong");title.textContent="LIOE правна контрола";
      const state=document.createElement("div");
      const g=m.governance;
      state.textContent=[g.missionProfile,g.releaseState,g.verificationState].filter(Boolean).join(" · ");
      box.append(title,state);
      if(g.warning){
        const warning=document.createElement("div");warning.textContent=String(g.warning);box.append(warning);
      }
      if(g.humanReviewRequired===true){
        const gate=document.createElement("div");
        const gates=Array.isArray(g.requiredGateTypes)&&g.requiredGateTypes.length ? " · "+g.requiredGateTypes.join(", ") : "";
        gate.textContent="Human Gate / човечка проверка: задолжително"+gates;
        box.append(gate);
      }
      if(g.executionAuthorization){
        const auth=document.createElement("div");auth.textContent="Execution: "+g.executionAuthorization;box.append(auth);
      }
      if(g.specialistExecution?.executed===true){
        const specialists=document.createElement("div");
        const agents=Array.isArray(g.specialistExecution.agents)?g.specialistExecution.agents:[];
        specialists.textContent="Bounded specialists: "+(agents.length?agents.join(", "):"executed");
        box.append(specialists);
      }
      appendEvidence(box);
    }
    if(m.sourceLabel){
      const source=document.createElement("div");source.className="ai-msg-source";source.textContent=m.sourceLabel;body.append(source);
    }
    if(Array.isArray(m.legalSources) && m.legalSources.length){
      const legalBox=document.createElement("div");legalBox.className="ai-msg-source";
      const legalLabel=document.createElement("strong");legalLabel.textContent="Правни извори";
      legalBox.append(legalLabel);
      const legalLinks=document.createElement("div");legalLinks.className="ai-msg-tools";
      m.legalSources.slice(0,8).forEach((src,i)=>{
        const href=safeHttpUrl(src?.url);
        const labelText=(src?.title||("Правен извор "+(i+1))).slice(0,100);
        if(href){
          const a=document.createElement("a");a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=labelText;legalLinks.append(a);
        }else{
          const span=document.createElement("span");span.textContent=labelText;legalLinks.append(span);
        }
      });
      if(legalLinks.childElementCount){legalBox.append(legalLinks);appendEvidence(legalBox);}
    }
    if(Array.isArray(m.caseLawSources) && m.caseLawSources.length){
      const caseBox=document.createElement("div");caseBox.className="ai-msg-source";
      const caseLabel=document.createElement("strong");caseLabel.textContent="Судска практика";
      caseBox.append(caseLabel);
      const caseLinks=document.createElement("div");caseLinks.className="ai-msg-tools";
      m.caseLawSources.slice(0,6).forEach((src,i)=>{
        const href=safeHttpUrl(src?.url);
        const labelText=(src?.title||("Судска одлука "+(i+1))).slice(0,120);
        if(href){
          const a=document.createElement("a");a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=labelText;caseLinks.append(a);
        }else{
          const span=document.createElement("span");span.textContent=labelText;caseLinks.append(span);
        }
      });
      if(caseLinks.childElementCount){caseBox.append(caseLinks);appendEvidence(caseBox);}
    }
    if(Array.isArray(m.guideSources) && m.guideSources.length){
      const guideBox=document.createElement("div");guideBox.className="ai-msg-source";
      const guideLabel=document.createElement("strong");guideLabel.textContent="Прочитани водичи";
      guideBox.append(guideLabel);
      const guideLinks=document.createElement("div");guideLinks.className="ai-msg-tools";
      m.guideSources.slice(0,4).forEach((src,i)=>{
        const href=safeHttpUrl(src?.url);
        const labelText=(src?.title||("Водич "+(i+1))).slice(0,100);
        if(href){
          const a=document.createElement("a");a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=labelText;guideLinks.append(a);
        }else{
          const span=document.createElement("span");span.textContent=labelText;guideLinks.append(span);
        }
      });
      if(guideLinks.childElementCount){guideBox.append(guideLinks);appendEvidence(guideBox);}
    }
    if(Array.isArray(m.publicationSources) && m.publicationSources.length){
      const publicationBox=document.createElement("div");publicationBox.className="ai-msg-source";
      const publicationLabel=document.createElement("strong");publicationLabel.textContent="Авторски трудови";
      publicationBox.append(publicationLabel);
      const publicationLinks=document.createElement("div");publicationLinks.className="ai-msg-tools";
      m.publicationSources.slice(0,6).forEach((src,i)=>{
        const href=safeHttpUrl(src?.url);
        const labelText=(src?.title||("Труд "+(i+1))).slice(0,120);
        if(href){
          const a=document.createElement("a");a.href=href;a.target="_blank";a.rel="noopener noreferrer";a.textContent=labelText;publicationLinks.append(a);
        }else{
          const span=document.createElement("span");span.textContent=labelText;publicationLinks.append(span);
        }
      });
      if(publicationLinks.childElementCount){publicationBox.append(publicationLinks);appendEvidence(publicationBox);}
    }
    if(Array.isArray(m.sources) && m.sources.length){
      const sourceBox=document.createElement("div");sourceBox.className="ai-msg-source";
      const label=document.createElement("strong");label.textContent="Web извори";
      sourceBox.append(label);
      const links=document.createElement("div");links.className="ai-msg-tools";
      m.sources.slice(0,8).forEach((s,i)=>{
        const href=safeHttpUrl(s?.url);
        if(!href) return;
        const a=document.createElement("a");
        a.href=href;a.target="_blank";a.rel="noopener noreferrer";
        a.textContent=(s?.title||("Извор "+(i+1))).slice(0,90);
        links.append(a);
      });
      if(links.childElementCount){sourceBox.append(links);appendEvidence(sourceBox);}
    }
    const tools=document.createElement("div");tools.className="ai-msg-tools";
    const copy=document.createElement("button");copy.type="button";copy.textContent="⧉ Копирај";
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(m.text||"");copy.textContent="Копирано ✓";setTimeout(()=>copy.textContent="⧉ Копирај",1200);}catch{}};
    tools.append(copy);
    if(m.role==="user"){
      const edit=document.createElement("button");edit.type="button";edit.textContent="✎ Уреди";
      edit.onclick=()=>{input.value=String(m.text||"");autoSize();input.focus();};
      const repeat=document.createElement("button");repeat.type="button";repeat.textContent="↺ Повтори";
      repeat.onclick=()=>{input.value=String(m.text||"");autoSize();input.focus();};
      tools.append(edit,repeat);
    }
    if(m.role==="assistant"){
      const retry=document.createElement("button");retry.type="button";retry.textContent="↺ Повтори";
      retry.onclick=()=>retryFrom(idx);
      const sources=document.createElement("button");sources.type="button";sources.className="ai-msg-prof-action";sources.textContent="▤ Извори";
      sources.onclick=()=>openWorkspaceEvidence("sources");
      const review=document.createElement("button");review.type="button";review.className="ai-msg-prof-action";review.textContent="✓ Проверка";
      review.onclick=()=>openWorkspaceEvidence("human");
      const docx=document.createElement("button");docx.type="button";docx.className="ai-msg-prof-action";docx.textContent="▧ DOCX";
      docx.onclick=()=>exportAssistantMessage(m,current(),"docx","AI-Advokat-working-draft.docx");
      const pdf=document.createElement("button");pdf.type="button";pdf.className="ai-msg-prof-action";pdf.textContent="▧ PDF";
      pdf.onclick=()=>exportAssistantMessage(m,current(),"pdf","AI-Advokat-working-draft.pdf");
      tools.append(retry,sources,review,docx,pdf);
    }
    body.append(tools);
    article.append(avatar,body);
    return article;
  }

  async function fetchGuideRegistry(){
    if(!guideRegistryPromise){
      guideRegistryPromise=fetch("/data/guides.json?v=20261010-current-law-review-v1",{cache:"no-store"})
        .then(r=>r.ok?r.json():Promise.reject(new Error("guides")));
    }
    return guideRegistryPromise;
  }
  async function fetchGuides(){
    const [d,practical]=await Promise.all([
      fetchGuideRegistry(),
      fetch("/data/public-practical-guides-38-73.json?v=20261013",{cache:"no-store"})
        .then(r=>r.ok?r.json():({guides:[]})).catch(()=>({guides:[]}))
    ]);
    const records=Array.isArray(d?.records)?d.records:[];
    const overlay=Array.isArray(practical?.guides)?practical.guides:[];
    const byId=new Map(records.map(x=>[String(x.id),x]));
    for(const x of overlay){
      const id=String(x?.id||"");
      if(!id) continue;
      byId.set(id,{...(byId.get(id)||{}),...x});
    }
    return [...byId.values()];
  }

  async function refreshGuideVaultStatus(){
    if(!guideVaultStatus) return;
    const vault=window.AIAdvokatGuideVault;
    if(!vault){
      guideVaultStatus.textContent="Guide Vault · недостапен";
      return;
    }
    try{
      const state=await vault.summary();
      guideVaultStatus.textContent=state.available ? `Guide Vault · ${state.count} водичи локално` : "Guide Vault · browser storage недостапен";
    }catch{
      guideVaultStatus.textContent="Guide Vault · статус недостапен";
    }
  }

  async function guideDocumentsForMatches(guides){
    const vault=window.AIAdvokatGuideVault;
    if(!vault) return [];
    try{return await vault.documentsForGuides(guides,{max:2});}
    catch{return [];}
  }

  if(guideVaultImport && guideVaultFiles){
    guideVaultImport.addEventListener("click",()=>guideVaultFiles.click());
    guideVaultFiles.addEventListener("change",async()=>{
      const files=[...guideVaultFiles.files];
      guideVaultFiles.value="";
      if(!files.length) return;
      const vault=window.AIAdvokatGuideVault;
      if(!vault){alert("Guide Vault не е достапен во овој browser.");return;}
      guideVaultImport.disabled=true;
      if(guideVaultStatus) guideVaultStatus.textContent="Guide Vault · проверка на fingerprint…";
      try{
        const registry=await fetchGuideRegistry();
        const result=await vault.importFiles(files,registry);
        await refreshGuideVaultStatus();
        const message=[
          `Вчитани: ${result.imported}`,
          `Одбиени: ${result.rejected}`,
          `Прескокнати: ${result.skipped}`
        ].join(" · ");
        alert("Guide Vault\n"+message);
      }catch(error){
        if(guideVaultStatus) guideVaultStatus.textContent="Guide Vault · вчитувањето не успеа";
        alert("Водичите не се вчитани: "+String(error?.message||error));
      }finally{
        guideVaultImport.disabled=false;
      }
    });
  }
  if(guideVaultClear){
    guideVaultClear.addEventListener("click",async()=>{
      const vault=window.AIAdvokatGuideVault;
      if(!vault) return;
      await vault.clear();
      await refreshGuideVaultStatus();
    });
  }
  async function guideMatches(q){
    try{
      const records=await fetchGuides();
      const router=window.AIAdvokatGuideRouter;
      return router?.routeGuides ? router.routeGuides(q,records,{limit:3,minScore:10}) : [];
    }catch{return [];}
  }

  function addMessage(message){
    const chat=current();chat.messages.push(message);chat.updatedAt=now();save();render();
  }
  function updateAssistantPlaceholder(index,patch){
    const chat=current(); if(!chat?.messages[index]) return;
    chat.messages[index]={...chat.messages[index],...patch};chat.updatedAt=now();save();render();
  }

  function activeMode(){
    return mode;
  }
  const modeLabels={auto:"Auto",library:"Library",web:"Web"};
  function syncModeUi(){
    modeBtns.forEach(x=>x.classList.toggle("active",x.dataset.chatMode===mode));
    if(modeCaption) modeCaption.textContent=modeLabels[mode]||"Auto";
  }
  modeBtns.forEach(btn=>btn.addEventListener("click",()=>{
    mode=btn.dataset.chatMode;
    syncModeUi();
    if(toolsMenu) toolsMenu.open=false;
  }));

  function autoSize(){
    input.style.height="auto";
    input.style.height=Math.min(180,Math.max(48,input.scrollHeight))+"px";
  }
  input.addEventListener("input",autoSize);
  input.addEventListener("keydown",e=>{
    if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}
  });

  function renderAttachments(){
    attachmentsEl.replaceChildren();
    if(attachmentCount) attachmentCount.textContent=attachments.length+" / "+CHAT_ATTACHMENT_LIMIT;
    attachments.forEach((a,i)=>{
      const chip=document.createElement("div");chip.className="ai-chat-attachment";
      const icon=document.createElement("span");icon.textContent=(a.type||"").startsWith("image/")?"🖼️":"📎";
      const name=document.createElement("span");name.textContent=a.name;name.title=a.name;
      const rm=document.createElement("button");rm.type="button";rm.textContent="×";rm.setAttribute("aria-label","Отстрани "+a.name);
      rm.onclick=()=>{attachments.splice(i,1);renderAttachments();};
      chip.append(icon,name,rm);attachmentsEl.append(chip);
    });
  }
  function inferredMime(file){
    const declared=String(file?.type||"").toLowerCase();
    if(declared && declared!=="application/octet-stream") return declared;
    const name=String(file?.name||"").toLowerCase();
    if(name.endsWith(".pdf")) return "application/pdf";
    if(name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if(name.endsWith(".csv")) return "text/csv";
    if(name.endsWith(".json")) return "application/json";
    if(name.endsWith(".txt")||name.endsWith(".md")) return "text/plain";
    if(name.endsWith(".png")) return "image/png";
    if(name.endsWith(".jpg")||name.endsWith(".jpeg")) return "image/jpeg";
    if(name.endsWith(".webp")) return "image/webp";
    return "application/octet-stream";
  }

  const CHAT_ACCEPTED_MIME=new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain","text/markdown","text/csv","application/csv","application/json",
    "image/png","image/jpeg","image/webp"
  ]);
  const CHAT_ATTACHMENT_TOTAL_BYTES=24_000_000;
  const CHAT_ATTACHMENT_LIMIT=20;

  function openSecureAttachmentWorkspace(){
    attachments=[];
    renderAttachments();
    if(dropHint) dropHint.textContent="Документи од конкретни предмети се обработуваат само во Secure Case Workspace.";
    window.location.href="/casepilot-workspace.html";
  }

  function addAttachmentFiles(files,{source="picker"}={}){
    const incoming=[...(files||[])].filter(Boolean);
    if(!incoming.length) return;
    // P0 privacy gate: no user-supplied document/image bytes leave the browser
    // through the public chat path. The server enforces the same rule.
    openSecureAttachmentWorkspace();
  }

  syncChatMembershipState();

  attachBtn.addEventListener("click",openSecureAttachmentWorkspace);
  if(attachWideBtn) attachWideBtn.addEventListener("click",openSecureAttachmentWorkspace);
  fileInput.addEventListener("change",()=>{
    if(fileInput.files?.length) openSecureAttachmentWorkspace();
    fileInput.value="";
  });

  if(dropZone){
    const stop=e=>{e.preventDefault();e.stopPropagation();};
    dropZone.addEventListener("dragenter",stop);
    dropZone.addEventListener("dragover",stop);
    dropZone.addEventListener("dragleave",stop);
    dropZone.addEventListener("drop",e=>{
      stop(e);
      if(e.dataTransfer?.files?.length) openSecureAttachmentWorkspace();
    });
  }

  input.addEventListener("paste",e=>{
    const files=e.clipboardData?.files;
    if(files?.length){
      e.preventDefault();
      openSecureAttachmentWorkspace();
    }
  });

  async function encodeFile(file){
    const mime=inferredMime(file);
    if(mime.startsWith("text/")||["application/json","text/csv","application/xml"].includes(mime)){
      return {kind:"text",name:file.name,mime,text:(await file.text()).slice(0,120000)};
    }
    const dataUrl=await new Promise((resolve,reject)=>{
      const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(String(reader.result||""));reader.readAsDataURL(file);
    });
    if(mime.startsWith("image/")) return {kind:"image",name:file.name,mime,dataUrl};
    const comma=dataUrl.indexOf(",");
    return {kind:"file",name:file.name,mime,base64:comma>=0?dataUrl.slice(comma+1):""};
  }

  function currentMembershipKey(){
    const key=sessionStorage.getItem("aiAdvokatMembershipKey")||sessionStorage.getItem("ai_advokat_membership_key")||"";
    if(/^AIADV-OWNER-/i.test(key)){
      sessionStorage.removeItem("aiAdvokatMembershipKey");
      sessionStorage.removeItem("ai_advokat_membership_key");
      return "";
    }
    return key;
  }
  function membershipHeaders(){
    const key=currentMembershipKey();
    return key?{"authorization":"Bearer "+key}:{};
  }
  function storeMembershipKey(key){
    const clean=String(key||"").trim();
    if(clean){
      sessionStorage.setItem("aiAdvokatMembershipKey",clean);
      sessionStorage.removeItem("ai_advokat_membership_key");
    }else{
      sessionStorage.removeItem("aiAdvokatMembershipKey");
      sessionStorage.removeItem("ai_advokat_membership_key");
    }
  }
  function syncChatMembershipState(){
    const key=currentMembershipKey();
    const plan=String(activeMembership?.planCode||activeMembership?.plan_code||"").trim();
    const professional=Boolean(key&&plan);
    const label=professional
      ?"Професионален пристап · "+plan+" · governed OpenAI кога е активен"
      :"FREE активен · јавен текстуален chat · Workers AI";
    if(chatMembershipState) chatMembershipState.textContent=label;
    if(ownerState) ownerState.textContent=label;
    if(professionalAccessBtn) professionalAccessBtn.textContent=professional?"✓ Професионален пристап · "+plan:"✓ Професионален пристап";
    if(logoutBtn) logoutBtn.hidden=!key;
  }
  function accessStorage(){
    try{return window.localStorage;}catch{return null;}
  }
  async function accessModule(){
    if(!accessModulePromise) accessModulePromise=import("/assets/bot-device-access.mjs");
    return accessModulePromise;
  }
  async function verifyProfessionalKey(candidate,{signal}={}){
    const response=await fetch(CHAT_API_BASE+"/api/membership/status",{
      method:"GET",cache:"no-store",signal,
      headers:{accept:"application/json",authorization:"Bearer "+candidate}
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok||!data?.ok){
      const error=new Error(data?.message||data?.error||"membership_not_active");
      error.status=response.status;throw error;
    }
    return data;
  }
  function openProfessionalAccess(){
    if(topMenu) topMenu.open=false;
    if(!accessDialog) return;
    if(accessStatus) accessStatus.textContent="";
    if(accessKey) accessKey.value="";
    if(rememberAccess) rememberAccess.checked=false;
    accessDialog.showModal();
    setTimeout(()=>accessKey?.focus(),0);
  }
  async function activateProfessionalAccess(candidate,{remember=false}={}){
    const data=await verifyProfessionalKey(candidate,{signal:AbortSignal.timeout(20000)});
    storeMembershipKey(candidate);
    activeMembership=data.membership||{};
    const storage=accessStorage();
    const mod=await accessModule().catch(()=>null);
    if(mod&&storage){
      mod.forgetDeviceAccess?.(storage);
      if(remember) mod.saveDeviceAccess?.(storage,candidate);
    }
    syncChatMembershipState();
    return data;
  }
  async function restoreProfessionalAccess(){
    let candidate=currentMembershipKey();
    const storage=accessStorage();
    const mod=await accessModule().catch(()=>null);
    if(!candidate&&mod&&storage) candidate=String(mod.readDeviceAccess?.(storage)||"");
    if(!candidate){activeMembership=null;syncChatMembershipState();return;}
    try{
      const data=await verifyProfessionalKey(candidate,{signal:AbortSignal.timeout(15000)});
      storeMembershipKey(candidate);activeMembership=data.membership||{};syncChatMembershipState();
    }catch{
      storeMembershipKey("");activeMembership=null;
      if(mod&&storage) mod.forgetDeviceAccess?.(storage);
      syncChatMembershipState();
    }
  }
  async function forgetProfessionalAccess(){
    storeMembershipKey("");activeMembership=null;
    const storage=accessStorage();
    const mod=await accessModule().catch(()=>null);
    if(mod&&storage) mod.forgetDeviceAccess?.(storage);
    syncChatMembershipState();
    if(topMenu) topMenu.open=false;
  }
  function exportCurrentConversation(){
    const chat=current();
    const rows=(chat?.messages||[]).filter(m=>m?.text&&m.text!=="Обработувам…");
    if(!rows.length) return;
    const text=[
      "AI Advokat — работен разговор",
      "Потребна е професионална човечка проверка пред последична правна употреба.",
      "",
      ...rows.map(m=>(m.role==="user"?"Вие":"AI Advokat")+":\n"+String(m.text||""))
    ].join("\n\n");
    const url=URL.createObjectURL(new Blob([text],{type:"text/plain;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download="AI-Advokat-razgovor.txt";a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    if(topMenu) topMenu.open=false;
  }


  async function fallbackSourceAssistant(q){
    let assistantError="source_fallback_unavailable";
    try{
      const r=await fetch(CHAT_API_BASE+"/api/assistant",{method:"POST",headers:{"content-type":"application/json","accept":"application/json",...membershipHeaders()},body:JSON.stringify({q,instrument:"auto"})});
      const d=await r.json().catch(()=>null);
      if(r.ok&&d?.ok&&d.answer){
        const cite=(d.citations||[]).map(c=>"чл. "+c.articleNumber).join(", ");
        return {ok:true,text:d.answer,meta:"Source-backed режим",sourceLabel:cite?"Изворни членови: "+cite:"Одговор од проверливиот article-level корпус."};
      }
      assistantError=d?.error||assistantError;
    }catch{}

    // Last-resort public-library fallback: never leave the whole portal unusable
    // merely because AI generation is temporarily gated or redeploying.
    try{
      const url=CHAT_API_BASE+"/api/search?q="+encodeURIComponent(String(q||"").slice(0,120))+"&type=all&status=all&limit=5";
      const r=await fetch(url,{headers:{"accept":"application/json"}});
      const d=await r.json().catch(()=>null);
      const rows=Array.isArray(d?.results)?d.results.slice(0,5):[];
      if(r.ok&&d?.ok&&rows.length){
        const body=rows.map((item,index)=>{
          const title=String(item?.title||item?.name||"Резултат").trim();
          const snippet=String(item?.snippet||item?.description||"").replace(/\s+/g," ").trim().slice(0,420);
          return (index+1)+". "+title+(snippet?"\n"+snippet:"");
        }).join("\n\n");
        return {
          ok:true,
          text:"AI генерирањето е привремено недостапно, но јавната правна библиотека работи. Најрелевантни записи за вашето прашање се:\n\n"+body+"\n\nЗа правен заклучок проверете го примарниот извор и Human Gate.",
          meta:"Јавна библиотека · резервен режим",
          sourceLabel:"Детерминистички резултати од AI Advokat search; нема измислен AI одговор."
        };
      }
    }catch{}
    return {ok:false,error:assistantError};
  }

  function localConfidentialCasePrompt(value){
    const text=String(value||"").normalize("NFKC");
    if(!text.trim()) return false;
    const hard=[
      /(?:ЕМБГ|EMBG|матичен\s+број)/iu,
      /(?<!\d)\d{13}(?!\d)/u,
      /(?:лична\s+карта|пасош)\s*(?:бр(?:ој)?\.?|number|no\.?)/iu
    ].some(rx=>rx.test(text));
    if(hard) return true;

    const caseSignals=[
      /предмет\s*:/iu,
      /оставинск[\p{L}-]*/iu,
      /тужб[\p{L}-]*/iu,
      /судск(?:и|а)\s+предмет/iu,
      /имотен\s+лист/iu,
      /катастарск(?:а|и|иот)\s+(?:парцела|план|лист|имот)/iu,
      /КП\s*\.?\s*\d+/iu,
      /ИЛ\s*\.?\s*\d+/iu,
      /ОВ\s*\.?\s*бр/iu
    ].reduce((n,rx)=>n+(rx.test(text)?1:0),0);
    const contactSignals=[
      /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu,
      /(?<!\d)(?:\+?389|0)\s*7\d(?:[\s/-]*\d){6,7}(?!\d)/u,
      /(?:ул\.?|улица|адреса)\s+[^\n,]{2,80}\s+бр\.?\s*\d+/iu
    ].reduce((n,rx)=>n+(rx.test(text)?1:0),0);
    return (caseSignals>=2 && contactSignals>=1) || (text.length>=1200 && caseSignals>=3);
  }

  function confidentialCaseHandoffMessage(){
    return {
      role:"assistant",
      text:"Ова изгледа како конкретен доверлив правен предмет. Не го испратив преку јавниот AI chat и не ја задржав чувствителната содржина во јавната session history. Отворете Secure Case Workspace, внесете го предметот таму и прикачете ги документите за Case Intelligence анализа.",
      meta:"Privacy gate · local preflight",
      guides:[],
      action:{label:"Отвори Secure Case Workspace",href:"/casepilot-workspace.html"},
      sourceLabel:"Public chat processing stopped before network/provider execution. Конкретните предмети се обработуваат во приватен case-scoped workspace."
    };
  }

  function scrubConfidentialPublicTurn({userIndex,assistantIndex}={}){
    const chat=current();
    if(!chat) return;
    if(Number.isInteger(userIndex) && chat.messages[userIndex]){
      chat.messages[userIndex]={
        role:"user",
        text:"[Доверлив правен предмет — чувствителната содржина е отстранета од јавната session history.]",
        meta:"Privacy-redacted"
      };
    }
    if(Number.isInteger(assistantIndex) && chat.messages[assistantIndex]){
      chat.messages[assistantIndex]={...chat.messages[assistantIndex],guides:[]};
    }
    chat.title="Доверлив правен предмет";
    chat.updatedAt=now();
    save();
    render();
  }

  async function send(forcedText=null){
    if(abortController) return;
    const q=String(forcedText??input.value).trim();
    if(!q) return;

    if(localConfidentialCasePrompt(q)){
      input.value="";
      attachments=[];
      renderAttachments();
      autoSize();
      const chat=current();
      chat.title="Доверлив правен предмет";
      addMessage({
        role:"user",
        text:"[Доверлив правен предмет — чувствителната содржина не е зачувана во јавниот chat.]",
        meta:"Privacy-protected"
      });
      addMessage(confidentialCaseHandoffMessage());
      save();
      return;
    }

    const chat=current();setTitle(chat,q);
    const historyForApi=chat.messages
      .filter(m=>(m.role==="user"||m.role==="assistant") && m.text && m.text!=="Обработувам…")
      .slice(-8)
      .map(m=>({role:m.role,text:String(m.text).slice(0,4000)}));
    const selectedFiles=[...attachments];
    const userIndex=current().messages.length;
    addMessage({role:"user",text:q,meta:selectedFiles.length?selectedFiles.length+" прилог(а)":""});
    input.value="";attachments=[];renderAttachments();autoSize();

    const guidePromise=guideMatches(q);
    const encodePromise=Promise.all(selectedFiles.map(f=>encodeFile(f)));
    const assistantIndex=current().messages.length;
    const preparingStartedAt=Date.now();
    addMessage({role:"assistant",text:"Обработувам…",meta:"AI Advokat",guides:[]});
    root.classList.add("ai-chat-running");
    abortController=new AbortController();

    try{
      const [guides,encoded]=await Promise.all([guidePromise,encodePromise]);
      const guideDocuments=await guideDocumentsForMatches(guides);
      updateAssistantPlaceholder(assistantIndex,{guides});
      const r=await fetch(CHAT_API_BASE+"/api/chat",{
        method:"POST",
        headers:{"content-type":"application/json","accept":"application/json",...membershipHeaders()},
        signal:abortController.signal,
        body:JSON.stringify({
          q,
          sessionId:currentId,
          mode:activeMode(),
          webSearch:activeMode()==="web",
          guideIds:guides.map(g=>g.id),
          guideDocuments,
          history:historyForApi,
          attachments:encoded
        })
      });
      const d=await r.json().catch(()=>null);
      await keepPreparingPulseVisible(preparingStartedAt);
      if(r.ok&&d?.ok){
        updateAssistantPlaceholder(assistantIndex,{
          text:d.answer,
          meta:responseRuntimeLabel(d)+" · "+(d.displayMode||d.mode||"auto")+" · session-private",
          guides,
          sources:Array.isArray(d.sources)?d.sources:[],
          legalSources:Array.isArray(d.legalSources)?d.legalSources:[],
          caseLawSources:Array.isArray(d.caseLawSources)?d.caseLawSources:[],
          guideSources:Array.isArray(d.guideSources)?d.guideSources:[],
          publicationSources:Array.isArray(d.publicationSources)?d.publicationSources:[],
          gazetteIssueMetadata:Array.isArray(d.gazetteIssueMetadata)?d.gazetteIssueMetadata:[],
          governance:d.legalGovernance||null,
          humanGate:d.humanGate||null,
          provider:String(d.provider||""),
          sourceMode:String(d.sourceMode||d.displayMode||""),
          providerRecovery:(d.providerRecovery&&typeof d.providerRecovery==="object")?d.providerRecovery:null,
          documentExports:requestedExportFormats(q).map(format=>({
            format,
            label:format==="docx"?"Преземи Word (.docx)":format==="pdf"?"Преземи PDF":format==="json"?"Преземи JSON":"Преземи CSV",
            filename:"AI-Advokat-analysis."+format
          })),
          sourceLabel:d.sourceMode==="workers_ai_free_authorial_publication_context" || d.sourceMode==="ai_advokat_authorial_publication_context"
            ?"AI Advokat авторски трудови · секундарен извор · DOI/Zenodo + Human Gate; не е извор на важечко право."
            :d.sourceMode==="ai_advokat_article_corpus_first"
              ?"AI Advokat article-level corpus first · верзија и Human Gate се прикажани во изворите."
            :d.sourceMode==="ai_advokat_article_corpus_plus_external_web"
              ?"AI Advokat article-level corpus + одделно означено Web истражување."
              :d.sourceMode==="ai_advokat_article_corpus_gate"
                ?"AI Advokat corpus gate · недостига доволно потврден корпус за сигурен правен заклучок."
                :d.sourceMode==="ai_advokat_legal_corpus_plus_guides"
                  ?"AI Advokat законски corpus + fingerprint-верификувани целосни водичи · Human Gate."
                  :d.sourceMode==="ai_advokat_guides_secondary_primary_law_required"
                    ?"Fingerprint-верификуван водич · секундарен материјал · за тековна правна теза е задолжителен официјален законски извор."
                  :d.sourceMode==="ai_advokat_guides_fulltext_first"
                    ?"Fingerprint-верификувани целосни водичи · секундарен материјал под Human Gate."
                    :d.sourceMode==="ai_advokat_catalogue_context_first"
                      ?"AI Advokat catalogue first; GPT synthesis. Проверете го конкретниот водич и официјалните правни извори."
                      :d.sourceMode==="canonical_gazette_issue_metadata_no_model"
                        ?"ЈП „Службен весник на РСМ“ · PRIMARY OFFICIAL METADATA · deterministic/no-model · не е доказ за текст на акт или тековно право."
                        :(d.webSearchUsed===true?"External legal research · Web извори":"GPT general/proactive assistance")
        });
      }else if(["confidential_case_workspace_required","public_attachment_secure_workspace_required","public_history_secure_workspace_required"].includes(d?.error)){
        scrubConfidentialPublicTurn({userIndex,assistantIndex});
        updateAssistantPlaceholder(assistantIndex,{
          ...confidentialCaseHandoffMessage(),
          meta:"Privacy gate · public GPT call stopped · server preflight",
          guides:[],
          action:d?.action||{label:"Отвори Secure Case Workspace",href:"/casepilot-workspace.html"}
        });
      }else if(d?.error==="macedonian_release_blocked"){
        attachments=[...selectedFiles];
        renderAttachments();
        updateAssistantPlaceholder(assistantIndex,{
          text:d?.message||"AI-нацртот не ја помина задолжителната јазична проверка за стандарден македонски јазик и затоа не е објавен. Обидете се повторно или наведете го конкретниот закон.",
          meta:"Macedonian Release Gate · BLOCK",
          guides,
          sourceLabel:"Расипаниот AI-нацрт е блокиран пред објавување. Не се прикажува мешан или нестандарден македонски текст."
        });
      }else if(["free_mode_professional_postflight_required","macedonian_language_repair_failed","macedonian_language_quality_failed","macedonian_language_quality_gate_failed","lioe_postflight_locked","lioe_runtime_governance_locked","lioe_observability_locked","web_search_locked","free_mode_web_search_unavailable"].includes(d?.error)){
        attachments=[...selectedFiles];
        renderAttachments();
        const fallback=await fallbackSourceAssistant(q);
        updateAssistantPlaceholder(assistantIndex,{
          text:fallback.ok
            ? fallback.text+(selectedFiles.length?"\n\nЗабелешка: прилозите останаа локално и не се вклучени во резервниот одговор; обидете се повторно со нив кога AI runtime ќе биде активен.":"")
            : (d?.message||"AI runtime е привремено ограничен. Јавните извори и пребарувањето остануваат достапни."),
          meta:fallback.ok?fallback.meta:(d?.error||"runtime_guard"),
          guides,
          sourceLabel:fallback.ok?fallback.sourceLabel:"Барањето не е изгубено; прилозите се задржани локално за повторен обид."
        });
      }else if(d?.error==="gpt_provider_locked"){
        const fallback=selectedFiles.length?{ok:false,error:"attachments_need_gpt"}:await fallbackSourceAssistant(q);
        updateAssistantPlaceholder(assistantIndex,{
          text:fallback.ok?fallback.text:"Платениот AI provider не е активен за ова барање. FREE/source-backed патеките остануваат достапни кога нивните runtime контроли се активни; за прилози користете ја активната FREE Workers AI патека или Secure Case Workspace.",
          meta:fallback.ok?"Source-backed fallback":"Paid provider · неактивен",
          guides,
          sourceLabel:fallback.ok?fallback.sourceLabel:"Не е направен GPT повик и прилозите не се испратени."
        });
      }else if(d?.error==="free_quota_exhausted" || d?.error==="membership_quota_exhausted"){
        // The provider has not run: restore the local files so the user can activate
        // professional access and retry without selecting the documents again.
        attachments=[...selectedFiles];
        renderAttachments();
        const m=d?.membership||{};
        const free=d.error==="free_quota_exhausted";
        updateAssistantPlaceholder(assistantIndex,{
          text:free
            ?"FREE месечниот лимит е привремено исцрпен. Документите не беа испратени до AI provider за анализа и ги задржав локално за повторен обид."
            :"Месечната квота на активното членство е исцрпена. Документите не беа испратени до AI provider за анализа и ги задржав локално. Проверете го пакетот или квотата пред повторен обид.",
          meta:d.error+" · "+String(m.used??m.monthlyQuota??"—")+" / "+String(m.monthlyQuota??"—"),
          guides,
          action:{label:"Планови и професионален пристап",href:"/membership.html"},
          sourceLabel:"Quota gate stopped the request before provider document analysis. Прикачените датотеки се вратени локално во тековната browser сесија."
        });
      }else{
        updateAssistantPlaceholder(assistantIndex,{
          text:d?.message||"Ова барање не може безбедно да се заврши во моменталната состојба. Проверете го статусот и обидете се повторно.",
          meta:d?.error||"controlled state",
          guides,
          governance:d?.legalGovernance||null
        });
      }
    }catch(err){
      await keepPreparingPulseVisible(preparingStartedAt);
      if(err?.name==="AbortError") updateAssistantPlaceholder(assistantIndex,{text:"Генерирањето е прекинато.",meta:"Stop"});
      else{
        const fallback=await fallbackSourceAssistant(q);
        updateAssistantPlaceholder(assistantIndex,{
          text:fallback.ok?fallback.text:"Не можам да воспоставам врска со AI runtime. Јавните правни извори и другите делови од порталот остануваат достапни; обидете се повторно.",
          meta:fallback.ok?fallback.meta:"Runtime/API unavailable",
          sourceLabel:fallback.ok?fallback.sourceLabel:"Не е издаден AI правен одговор."
        });
      }
    }finally{
      abortController=null;root.classList.remove("ai-chat-running");save();
    }
  }

  function retryFrom(index){
    const chat=current();
    for(let i=index-1;i>=0;i--){
      if(chat.messages[i]?.role==="user"){send(chat.messages[i].text);return;}
    }
  }

  sendBtn.addEventListener("click",()=>send());
  stopBtn.addEventListener("click",()=>abortController?.abort());
  newChatBtn.addEventListener("click",()=>{
    const c=newState();chats.set(c.id,c);currentId=c.id;attachments=[];renderAttachments();render();save();input.focus();
  });
  function requestedExportFormats(value){
    const text=String(value||"").normalize("NFKC").toLocaleLowerCase("mk");
    const formats=[];
    if(/(?:\bdocx\b|\bword\b|\bworld\b|ворд|word\s+format|world\s+format|во\s+word|во\s+world|word\s+документ|ворд\s+документ)/iu.test(text)) formats.push("docx");
    if(/(?:\bpdf\b|пдф|во\s+pdf|pdf\s+формат)/iu.test(text)) formats.push("pdf");
    if(/(?:\bjson\b|џејсон|во\s+json)/iu.test(text)) formats.push("json");
    if(/(?:\bcsv\b|во\s+csv|цсв)/iu.test(text)) formats.push("csv");
    return [...new Set(formats)];
  }

  function wordDocumentRequested(value){ return requestedExportFormats(value).includes("docx"); }

  async function exportAssistantMessage(message,chat,format="docx",filename=null){
    if(!message || message.role!=="assistant" || !String(message.text||"").trim()) return;
    const mod=await import("/assets/casepilot-export.js");
    const core=await import("/src/case-export.js");
    const report=core.normalizeCaseExportReport({
      caseId:"CHAT-"+String(chat?.id||"session").replace(/[^A-Za-z0-9._-]+/g,"-").slice(0,72),
      title:String(chat?.title||"AI Advokat analysis").slice(0,220),
      caseVersion:"working-draft-1",
      generatedAt:new Date().toISOString(),
      mode:"working",
      humanGate:{status:"pending"},
      summary:"AI Advokat working document generated from the requested analysis. Professional human review is required before consequential legal reliance or external use.",
      sections:[{
        id:"ai-advokat-output",
        title:"AI Advokat - анализа / работен документ",
        items:[{text:String(message.text||"").slice(0,50000),status:"HUMAN GATE REQUIRED",sources:[]}]
      }],
      sourceManifest:[],
      provenance:[]
    },{mode:"working"});
    await mod.downloadCasePilotExport(report,format,{filename:filename||("AI-Advokat-analysis."+format)});
  }

  function exportPlainAssistantMessage(message,format="txt",filename=null){
    if(!message || message.role!=="assistant" || !String(message.text||"").trim()) return;
    const fmt=format==="md"?"md":"txt";
    const text=String(message.text||"").trim();
    const body=fmt==="md"
      ? "# AI Advokat — работен одговор\n\n"+text+"\n\n> HUMAN GATE REQUIRED — потребна е професионална човечка проверка пред последична употреба.\n"
      : "AI Advokat — работен одговор\n\n"+text+"\n\nHUMAN GATE REQUIRED — потребна е професионална човечка проверка пред последична употреба.\n";
    const url=URL.createObjectURL(new Blob([body],{type:"text/plain;charset=utf-8"}));
    const a=document.createElement("a");a.href=url;a.download=filename||("AI-Advokat-working-draft."+fmt);a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  async function exportLatestDraft(format){
    if(topMenu) topMenu.open=false;
    const chat=current();
    const latestAssistant=[...chat.messages].reverse().find(m=>m?.role==="assistant" && String(m.text||"").trim());
    if(!latestAssistant) return;
    const button=exportButtons.find(b=>b.dataset.chatExport===format);
    if(button) button.disabled=true;
    try{
      await exportAssistantMessage(latestAssistant,chat,format,"AI-Advokat-working-draft."+format);
    }catch(error){
      console.error("chat_export_failed",format,error);
    }finally{
      if(button) button.disabled=false;
    }
  }

  exportButtons.forEach(button=>{
    button.addEventListener("click",()=>exportLatestDraft(String(button.dataset.chatExport||"docx")));
  });
  if(menuNew) menuNew.addEventListener("click",()=>{if(topMenu) topMenu.open=false;newChatBtn.click();});
  if(exportConversationBtn) exportConversationBtn.addEventListener("click",exportCurrentConversation);
  if(materialsTopBtn) materialsTopBtn.addEventListener("click",()=>{if(topMenu) topMenu.open=false;openMaterialsDialog("library");});
  if(professionalAccessBtn) professionalAccessBtn.addEventListener("click",openProfessionalAccess);
  if(logoutBtn) logoutBtn.addEventListener("click",forgetProfessionalAccess);
  if(accessClose) accessClose.addEventListener("click",()=>accessDialog?.close());
  if(accessCancel) accessCancel.addEventListener("click",()=>accessDialog?.close());
  accessDialog?.addEventListener("close",()=>{if(accessKey) accessKey.value="";if(accessStatus) accessStatus.textContent="";});
  if(accessForm) accessForm.addEventListener("submit",async event=>{
    event.preventDefault();
    const candidate=String(accessKey?.value||"").trim();
    if(!candidate||/^sk-/i.test(candidate)){
      if(accessStatus) accessStatus.textContent="Потребен е AI Advokat членски клуч, не OpenAI API клуч.";
      return;
    }
    if(accessSubmit) accessSubmit.disabled=true;
    if(accessStatus) accessStatus.textContent="Го проверувам пристапот…";
    try{
      const data=await activateProfessionalAccess(candidate,{remember:Boolean(rememberAccess?.checked)});
      const plan=String(data?.membership?.planCode||data?.membership?.plan_code||"professional");
      if(accessStatus) accessStatus.textContent="Професионален пристап · "+plan+" · активен.";
      accessDialog?.close();
    }catch{
      if(accessStatus) accessStatus.textContent="Клучот не е активен или услугата не е достапна. Обидете се повторно.";
    }finally{
      if(accessSubmit) accessSubmit.disabled=false;
    }
  });

  if(micBtn){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){micBtn.hidden=true;}
    else micBtn.addEventListener("click",()=>{
      const rec=new SR();rec.lang="mk-MK";rec.interimResults=false;rec.maxAlternatives=1;
      rec.onresult=e=>{input.value=(input.value+" "+e.results[0][0].transcript).trim();autoSize();};
      rec.start();
    });
  }


  // AIAdvokat4 · LexNova UX professional workbench.
  // Frontend orchestration only: existing governed backend, privacy gate and CasePilot boundaries remain authoritative.
  const AIADV4_WORKBENCH=Object.freeze({
    label:"AIAdvokat4",
    ux:"LexNova UX",
    analyzerVersion:"1.0.1",
    consolidatorVersion:"10.4",
    predictorMode:"governed_scenario_risk_casepilot",
    backend:"AI Advokat governed backend"
  });
  window.AIAdvokat4Workbench=AIADV4_WORKBENCH;

  const workbenchPanel=document.getElementById("aiWorkbenchPanel");
  let lastAnalyzerResult=null;

  function latestAssistantMessage(){
    const chat=current();
    return [...(chat?.messages||[])].reverse().find(m=>m?.role==="assistant" && String(m.text||"").trim())||null;
  }

  function flattenWorkbenchSources(message){
    if(!message) return [];
    const specs=[
      ["Правен извор","legalSources"],
      ["Судска практика","caseLawSources"],
      ["Водич","guideSources"],
      ["Авторски труд","publicationSources"],
      ["Web извор","sources"]
    ];
    const seen=new Set();
    const out=[];
    for(const [kind,key] of specs){
      for(const row of Array.isArray(message[key])?message[key]:[]){
        const title=String(row?.title||row?.label||row?.name||kind).trim().slice(0,160);
        const url=safeHttpUrl(row?.url||row?.sourceUrl||row?.source_url||"");
        const sig=(url||title).toLowerCase();
        if(!sig||seen.has(sig)) continue;
        seen.add(sig);
        out.push({kind,title,url});
      }
    }
    return out.slice(0,30);
  }

  function showWorkbenchPanel(){
    if(!workbenchPanel) return;
    workbenchPanel.hidden=false;
    workbenchPanel.scrollIntoView({behavior:"smooth",block:"nearest"});
  }

  function renderWorkbenchSources(){
    if(!workbenchPanel) return;
    const m=latestAssistantMessage();
    workbenchPanel.replaceChildren();
    const h=document.createElement("h4");h.textContent="Sources · проверлив контекст";workbenchPanel.append(h);
    if(m?.sourceLabel){
      const p=document.createElement("p");p.textContent=String(m.sourceLabel);workbenchPanel.append(p);
    }
    const rows=flattenWorkbenchSources(m);
    if(!rows.length){
      const p=document.createElement("p");
      p.textContent="Во последниот AI одговор нема прикажани извори. Поставете прашање со source-backed режим или користете Библиотека / Веб.";
      workbenchPanel.append(p);
    }else{
      const ul=document.createElement("ul");
      rows.forEach((row,index)=>{
        const li=document.createElement("li");
        const prefix=document.createElement("strong");prefix.textContent=row.kind+" "+(index+1)+": ";li.append(prefix);
        if(row.url){
          const a=document.createElement("a");a.href=row.url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=row.title;li.append(a);
        }else li.append(document.createTextNode(row.title));
        ul.append(li);
      });
      workbenchPanel.append(ul);
    }
    showWorkbenchPanel();
  }

  function renderWorkbenchHumanGate(){
    if(!workbenchPanel) return;
    const m=latestAssistantMessage();
    const g=m?.governance||null;
    workbenchPanel.replaceChildren();
    const h=document.createElement("h4");h.textContent="Human Gate · governed legal review";workbenchPanel.append(h);
    const gate=document.createElement("p");gate.className="ai-prof-gate";
    gate.textContent="HUMAN GATE REQUIRED — правен заклучок, поднесување, потпис или друга последична професионална употреба бара човечка проверка.";
    workbenchPanel.append(gate);
    const statuses=[];
    if(g?.legalStatus) statuses.push("Legal status: "+g.legalStatus);
    if(g?.executionAuthorization) statuses.push("Execution: "+g.executionAuthorization);
    if(g?.humanReviewRequired===true) statuses.push("Human review: required");
    if(Array.isArray(g?.requiredGateTypes)&&g.requiredGateTypes.length) statuses.push("Gates: "+g.requiredGateTypes.join(", "));
    if(g?.specialistExecution?.executed===true){
      const agents=Array.isArray(g.specialistExecution.agents)?g.specialistExecution.agents:[];
      statuses.push("Bounded specialists: "+(agents.length?agents.join(", "):"executed"));
    }
    if(!statuses.length) statuses.push("Последниот одговор нема дополнителен governance payload; основниот Human Gate останува задолжителен.");
    statuses.forEach(text=>{
      const span=document.createElement("span");span.className="ai-prof-status";span.textContent=text;workbenchPanel.append(span);
    });
    const p=document.createElement("p");
    p.textContent="За доверлив клиентски предмет користете CasePilot / Secure Case Workspace; јавниот chat не е case vault.";
    workbenchPanel.append(p);
    showWorkbenchPanel();
  }

  function governedPredictorPrompt(){
    return "PREDICTOR MODE — GOVERNED SCENARIO / RISK ENGINE + CASEPILOT INTELLIGENCE. "+
      "Анализирај го прашањето преку најмалку три сценарија: поволно, мешано и неповолно. "+
      "Не давај процент на успех, не гарантирај исход и не претставувај претпоставка како факт. "+
      "За секое сценарио оддели: (1) одлучувачки факти, (2) доказна поддршка, (3) применлива правна основа и source status, "+
      "(4) спротивни аргументи/authority, (5) процесни и доказни ризици, (6) празнини во доказите, "+
      "(7) што би го сменило сценариото. Ако станува збор за доверлив конкретен предмет, запреј го јавниот пат и насочи во Secure Case Workspace / CasePilot. "+
      "Заврши со HUMAN GATE REQUIRED.\n\nПрашање/предмет: ";
  }

  function predictorFromAnalyzerResult(result){
    const r=result?.reviewRow||{};
    const parts=[
      "PREDICTOR MODE — GOVERNED SCENARIO / RISK ENGINE + CASEPILOT INTELLIGENCE.",
      "Користи го следниот deterministic Legal Analyzer v"+String(result?.version||AIADV4_WORKBENCH.analyzerVersion)+" snapshot само како извлечен работен контекст, не како конечен правен заклучок:",
      "Тип: "+String(r.documentType||"unknown"),
      "Орган: "+(Array.isArray(r.authority)&&r.authority.length?r.authority.join("; "):"не е извлечен"),
      "Број: "+String(r.referenceNumber||"не е извлечен"),
      "Закони: "+(Array.isArray(r.laws)&&r.laws.length?r.laws.join("; "):"не се извлечени"),
      "Членови: "+(Array.isArray(r.articles)&&r.articles.length?r.articles.join("; "):"не се извлечени"),
      "Рокови: "+(Array.isArray(r.deadlines)&&r.deadlines.length?r.deadlines.join("; "):"не се извлечени"),
      "Source verification: "+String(r.sourceVerification||"not_verified"),
      "",
      "Изгради поволно, мешано и неповолно сценарио. Без проценти и без гаранција. Провери примарни извори и заврши со HUMAN GATE REQUIRED."
    ];
    return parts.join("\n").slice(0,3900);
  }

  function ensureAnalyzerDialog(){
    let d=document.getElementById("aiProfAnalyzerDialog");
    if(d) return d;
    d=document.createElement("dialog");
    d.id="aiProfAnalyzerDialog";
    d.className="ai-prof-analyzer-dialog";
    d.innerHTML=
      '<div class="ai-prof-analyzer-head"><div><strong>Legal Analyzer v1.0.1</strong><small>deterministic · local browser analysis · Human Gate</small></div><button type="button" data-analyzer-close aria-label="Затвори">×</button></div>'+
      '<div class="ai-prof-analyzer-body">'+
      '<p>Текстот се анализира локално во browser преку постојниот <code>src/legal-analyzer.js</code>. Официјални идентификатори не се измислуваат.</p>'+
      '<textarea id="aiProfAnalyzerText" maxlength="250000" placeholder="Залепете правен текст..."></textarea>'+
      '<div class="ai-prof-analyzer-controls"><button class="primary" type="button" data-analyzer-run>Анализирај</button><button class="secondary" type="button" data-analyzer-predictor disabled>Продолжи → Предиктор</button></div>'+
      '<div class="ai-prof-analyzer-result" id="aiProfAnalyzerResult">Нема анализа.</div>'+
      '</div>';
    document.body.append(d);
    d.querySelector("[data-analyzer-close]")?.addEventListener("click",()=>d.close());
    d.addEventListener("click",event=>{if(event.target===d)d.close();});
    d.querySelector("[data-analyzer-run]")?.addEventListener("click",async()=>{
      const text=String(d.querySelector("#aiProfAnalyzerText")?.value||"").trim();
      const host=d.querySelector("#aiProfAnalyzerResult");
      const next=d.querySelector("[data-analyzer-predictor]");
      if(!text){host.textContent="Внесете правен текст.";next.disabled=true;return;}
      host.textContent="Анализирам локално…";
      next.disabled=true;
      try{
        const mod=await import("/src/legal-analyzer.js");
        const result=mod.analyzeLegalDocument({filename:"AIAdvokat4-chat-input.txt",text,sourceVerification:"not_verified"});
        if(String(result.version)!==String(mod.LEGAL_ANALYZER_VERSION)) throw new Error("legal_analyzer_version_mismatch");
        lastAnalyzerResult=result;
        const r=result.reviewRow||{};
        const summary={
          version:result.version,
          documentType:r.documentType,
          authority:r.authority,
          referenceNumber:r.referenceNumber,
          laws:r.laws,
          articles:r.articles,
          deadlines:r.deadlines,
          completeness:r.completeness,
          provenance:result.provenance,
          humanGate:result.humanGate
        };
        const pre=document.createElement("pre");pre.textContent=JSON.stringify(summary,null,2);
        host.replaceChildren(pre);
        next.disabled=false;
      }catch(error){
        lastAnalyzerResult=null;
        host.textContent="Analyzer error: "+String(error?.message||error);
      }
    });
    d.querySelector("[data-analyzer-predictor]")?.addEventListener("click",()=>{
      if(!lastAnalyzerResult) return;
      input.value=predictorFromAnalyzerResult(lastAnalyzerResult);
      autoSize();
      d.close();
      document.getElementById("ai-advokat-chat")?.scrollIntoView({behavior:"smooth",block:"start"});
      setTimeout(()=>input.focus(),250);
    });
    return d;
  }

  function latestUserMessage(){
    const chat=current();
    return [...(chat?.messages||[])].reverse().find(m=>m?.role==="user" && String(m.text||"").trim())||null;
  }

  function evidenceCard(title,text,{className="",url=null,meta=null}={}){
    const card=document.createElement("section");card.className="ai-evidence-card"+(className?" "+className:"");
    const strong=document.createElement("strong");strong.textContent=title;card.append(strong);
    if(url){
      const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener noreferrer";a.textContent=text||url;card.append(a);
    }else{
      const p=document.createElement("div");p.textContent=text||"";card.append(p);
    }
    if(meta){const small=document.createElement("div");small.className="ai-evidence-meta";small.textContent=meta;card.append(small);}
    return card;
  }

  function openWorkspaceEvidence(tab="sources"){
    evidenceTab=tab;
    if(evidencePanel) evidencePanel.classList.add("is-open");
    renderWorkspaceEvidence();
  }

  function renderWorkspaceEvidence(){
    if(!evidenceBody) return;
    evidenceTabs.forEach(btn=>btn.classList.toggle("active",btn.dataset.aiEvidenceTab===evidenceTab));
    evidenceBody.replaceChildren();
    const chat=current();
    const m=latestAssistantMessage();
    const user=latestUserMessage();
    const titles={
      sources:["Извори","Проверлив контекст за активниот разговор"],
      context:["Контекст","Сесија, режим и последен работен контекст"],
      human:["Human Gate","Професионална човечка проверка пред последична употреба"],
      artifact:["Артефакт","Извоз и продолжување на последниот работен одговор"]
    };
    const [title,sub]=titles[evidenceTab]||titles.sources;
    if(evidenceTitle) evidenceTitle.textContent=title;
    if(evidenceSubtitle) evidenceSubtitle.textContent=sub;

    if(evidenceTab==="sources"){
      const rows=flattenWorkbenchSources(m);
      if(m?.sourceLabel) evidenceBody.append(evidenceCard("Статус на изворите",String(m.sourceLabel)));
      const gazetteRows=Array.isArray(m?.gazetteIssueMetadata)?m.gazetteIssueMetadata:[];
      gazetteRows.forEach((g,index)=>{
        const authority=[
          "Издание: "+String(g.publicationType||"—"),
          "Број: "+String(g.issueNumber||"—")+"/"+String(g.year||"—"),
          "Датум: "+String(g.issueDate||"—"),
          "Изворен орган: "+String(g.sourceAuthority||"—"),
          "Класа: "+String(g.sourceClass||"—"),
          "Human review: "+String(g.humanReviewStatus||"—"),
          "Metadata runtime: "+(g.runtimeEligible===true?"ДА":"НЕ"),
          "Source occurrences: "+String(g.sourceOccurrences??"—"),
          "Source row: "+String(g.sourceRowFirst??"—"),
          "Legal-text authority: "+(g.legalTextAuthority===true?"ДА":"НЕ"),
          "Current-law authority: "+(g.currentLawAuthority===true?"ДА":"НЕ"),
          g.datasetId?"Dataset ID: "+g.datasetId:"",
          g.resourceId?"Resource ID: "+g.resourceId:"",
          g.snapshotSha256?"Snapshot SHA-256: "+g.snapshotSha256:""
        ].filter(Boolean).join("\n");
        evidenceBody.append(evidenceCard("Службен весник · metadata "+(index+1),authority,{className:"ai-evidence-gate"}));
      });
      if(!rows.length && !gazetteRows.length){
        evidenceBody.append(evidenceCard("Нема прикажани извори","Последниот AI одговор нема source payload. Користете Правни извори, Library или поставете source-first прашање."));
      }else{
        rows.forEach((row,index)=>evidenceBody.append(evidenceCard(row.kind+" · "+(index+1),row.title,{url:row.url||null})));
      }
      return;
    }

    if(evidenceTab==="context"){
      evidenceBody.append(evidenceCard("Активен разговор",String(chat?.title||"Нов разговор"),{meta:(chat?.messages?.length||0)+" пораки · режим "+String(mode||"auto")}));
      if(user) evidenceBody.append(evidenceCard("Последно прашање",String(user.text||"").slice(0,1400)));
      if(m){
        evidenceBody.append(evidenceCard("Последен AI runtime",String(m.meta||"provider/runtime не е наведен"),{meta:"Историјата е само во оваа browser сесија."}));
        if(m.provider) evidenceBody.append(evidenceCard("Provider",String(m.provider)));
        if(m.sourceMode) evidenceBody.append(evidenceCard("Source mode",String(m.sourceMode)));
        const recovery=m.providerRecovery&&typeof m.providerRecovery==="object"?m.providerRecovery:null;
        if(recovery){
          const recoveryText=[
            recovery.direction?String(recovery.direction):"",
            recovery.firstError?"first: "+String(recovery.firstError):"",
            recovery.secondError?"second: "+String(recovery.secondError):"",
            recovery.recovered===true?"recovered":""
          ].filter(Boolean).join(" · ");
          evidenceBody.append(evidenceCard("Provider recovery",recoveryText||"active"));
        }
      }
      const actions=document.createElement("div");actions.className="ai-evidence-actions";
      const cases=document.createElement("a");cases.href="/case-law-metadata.html";cases.target="_blank";cases.rel="noopener noreferrer";cases.textContent="⚖ Судска практика";
      const library=document.createElement("a");library.href="/professional-library/";library.target="_blank";library.rel="noopener noreferrer";library.textContent="◫ Professional Library";
      actions.append(cases,library);evidenceBody.append(actions);
      return;
    }

    if(evidenceTab==="human"){
      const g=m?.governance||null;
      evidenceBody.append(evidenceCard("HUMAN GATE REQUIRED","Правен заклучок, поднесување, потпис или друга последична професионална употреба бара проверка од адвокат/овластен професионалец.",{className:"ai-evidence-gate"}));
      if(m?.humanGate) evidenceBody.append(evidenceCard("Ограничување за овој одговор",String(m.humanGate),{className:"ai-evidence-gate"}));
      const states=[];
      if(g?.missionProfile) states.push("Mission: "+g.missionProfile);
      if(g?.releaseState) states.push("Release: "+g.releaseState);
      if(g?.verificationState) states.push("Verification: "+g.verificationState);
      if(g?.executionAuthorization) states.push("Execution: "+g.executionAuthorization);
      if(g?.sourceVerificationState) states.push("Source verification: "+g.sourceVerificationState);
      if(g?.temporalVerificationState) states.push("Temporal verification: "+g.temporalVerificationState);
      if(g?.jurisdictionVerificationState) states.push("Jurisdiction verification: "+g.jurisdictionVerificationState);
      if(Array.isArray(g?.requiredGateTypes)&&g.requiredGateTypes.length) states.push("Gates: "+g.requiredGateTypes.join(", "));
      if(g?.warning) states.push("Warning: "+g.warning);
      if(!states.length) states.push("Нема дополнителен governance payload; основниот Human Gate останува задолжителен.");
      states.forEach((s,i)=>evidenceBody.append(evidenceCard(i===0?"Governance status":"",s)));
      return;
    }

    if(evidenceTab==="artifact"){
      if(!m){
        evidenceBody.append(evidenceCard("Нема артефакт","Сè уште нема AI одговор за извоз."));
        return;
      }
      evidenceBody.append(evidenceCard("Последен работен одговор",String(m.text||"").slice(0,900),{meta:"Working draft · Human Gate required"}));
      const actions=document.createElement("div");actions.className="ai-evidence-actions";
      for(const [fmt,label] of [["docx","⇩ DOCX"],["pdf","⇩ PDF"],["md","⇩ MD"],["txt","⇩ TXT"]]){
        const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=()=>["txt","md"].includes(fmt)?exportPlainAssistantMessage(m,fmt,"AI-Advokat-working-draft."+fmt):exportAssistantMessage(m,chat,fmt,"AI-Advokat-working-draft."+fmt);actions.append(b);
      }
      const cp=document.createElement("a");cp.href="/casepilot-workspace.html";cp.target="_blank";cp.rel="noopener noreferrer";cp.textContent="▣ Отвори CasePilot";actions.append(cp);
      evidenceBody.append(actions);
    }
  }

  function latestAssistantForMaterials(){
    return [...(current()?.messages||[])].reverse().find(m=>m?.role==="assistant" && String(m.text||"").trim() && m.text!=="Обработувам…")||null;
  }

  function ensureMaterialsDialog(){
    let d=document.getElementById("aiWorkspaceMaterialsDialog");
    if(d) return d;
    d=document.createElement("dialog");d.id="aiWorkspaceMaterialsDialog";d.className="ai-workspace-search-dialog ai-materials-dialog";
    d.innerHTML=`<div class="ai-workspace-dialog-head"><div><strong>◫ Материјали и алатки</strong><small>Истиот governed toolbox како во надворешниот AI Advokat</small></div><button type="button" data-close>×</button></div>
      <div class="ai-materials-body">
        <section class="ai-materials-section"><strong>⌕ Пребарување</strong><div class="ai-materials-mode">
          <button type="button" data-materials-mode="auto">Автоматски</button>
          <button type="button" data-materials-mode="library">Само библиотека</button>
          <button type="button" data-materials-mode="web">Веб истражување</button>
        </div><small>Режимот го користи истиот AI Advokat governed backend; Web режимот зависи од активниот runtime.</small></section>
        <section class="ai-materials-section"><strong>⇩ Извоз на последниот AI одговор</strong><div class="ai-evidence-actions">
          <button type="button" data-materials-export="docx">▧ DOCX</button>
          <button type="button" data-materials-export="pdf">▧ PDF</button>
          <button type="button" data-materials-export="txt">▤ TXT</button>
          <button type="button" data-materials-export="md">◇ MD</button>
        </div></section>
        <section class="ai-materials-section"><strong>◫ Мои проверени водичи</strong><div class="ai-evidence-actions">
          <button type="button" data-materials-guides="import">⇧ Вчитај водичи</button>
          <button type="button" data-materials-guides="clear">× Избриши локални</button>
        </div><small>PDF/DOCX/ZIP се користат само кога fingerprint се совпаѓа со регистарот. Тие се секундарен материјал, не важечки закон.</small></section>
        <section class="ai-materials-section"><strong>Правни материјали и професионални алатки</strong><div class="ai-material-links">
          <a href="/casepilot-workspace.html" target="_blank" rel="noopener noreferrer">📎 Прикачи документи / Secure Case Workspace ↗</a>
          <a href="/professional-tools.html#analyzer" target="_blank" rel="noopener noreferrer">⚖ Правен анализатор ↗</a>
          <a href="/casepilot-workspace.html" target="_blank" rel="noopener noreferrer">▣ CasePilot ↗</a>
          <a href="/guides/" target="_blank" rel="noopener noreferrer">▧ Правни водичи ↗</a>
          <a href="/professional-library/" target="_blank" rel="noopener noreferrer">◫ Професионална библиотека и коментари ↗</a>
          <a href="/sluzben-vesnik/" target="_blank" rel="noopener noreferrer">▤ Службен весник и правен аларм ↗</a>
          <a href="/scholar/" target="_blank" rel="noopener noreferrer">◇ Научни трудови ↗</a>
          <a href="/authors/zoran-stojankic/" target="_blank" rel="noopener noreferrer">§ Авторски материјали на Зоран ↗</a>
          <a href="/kolumni/" target="_blank" rel="noopener noreferrer">✦ Колумни ↗</a>
          <a href="/document-router.html" target="_blank" rel="noopener noreferrer">▧ Прием и распределба на документи ↗</a>
          <a href="/case-law-metadata.html" target="_blank" rel="noopener noreferrer">⚖ Судски пресуди и метаподатоци ↗</a>
          <a href="/professional-tools.html" target="_blank" rel="noopener noreferrer">◇ Професионални алатки ↗</a>
        </div></section>
        <p class="ai-workflow-note">Доверливи оригинални документи и точни лични идентификатори одат во Secure Case Workspace. Јавниот chat останува session-private и не е case vault.</p>
      </div>`;
    document.body.append(d);
    d.querySelector("[data-close]")?.addEventListener("click",()=>d.close());
    d.querySelectorAll("[data-materials-mode]").forEach(b=>b.addEventListener("click",()=>{
      mode=String(b.dataset.materialsMode||"auto");syncModeUi();
      d.querySelectorAll("[data-materials-mode]").forEach(x=>x.classList.toggle("active",x===b));
    }));
    d.querySelectorAll("[data-materials-export]").forEach(b=>b.addEventListener("click",()=>{
      const m=latestAssistantForMaterials();if(!m) return;
      const fmt=String(b.dataset.materialsExport||"txt");
      if(["txt","md"].includes(fmt)) exportPlainAssistantMessage(m,fmt,"AI-Advokat-working-draft."+fmt);
      else exportAssistantMessage(m,current(),fmt,"AI-Advokat-working-draft."+fmt);
    }));
    d.querySelector("[data-materials-guides='import']")?.addEventListener("click",()=>guideVaultImport?.click());
    d.querySelector("[data-materials-guides='clear']")?.addEventListener("click",()=>guideVaultClear?.click());
    return d;
  }

  function openMaterialsDialog(section="library"){
    const d=ensureMaterialsDialog();
    d.querySelectorAll("[data-materials-mode]").forEach(x=>x.classList.toggle("active",String(x.dataset.materialsMode||"")===mode));
    d.showModal();
    if(section==="documents") setTimeout(()=>d.querySelector('a[href="/casepilot-workspace.html"]')?.focus(),0);
    else setTimeout(()=>d.querySelector('a[href="/professional-library/"]')?.focus(),0);
  }

  function ensureWorkflowDialog(){
    let d=document.getElementById("aiWorkspaceWorkflowDialog");
    if(d) return d;
    d=document.createElement("dialog");d.id="aiWorkspaceWorkflowDialog";d.className="ai-workflow-dialog";
    d.innerHTML=`<div class="ai-workspace-dialog-head"><div><strong>AI Advokat Workflows</strong><small>Структурирани почетоци врз governed backend</small></div><button type="button" data-close>×</button></div>
      <div class="ai-workflow-grid">
        <button data-workflow-prompt="Истражи го правното прашање source-first. Прво утврди применливи официјални извори и важечка верзија, потоа дај анализа, ризици и отворени прашања."><strong>⌕ Правно истражување</strong><span>Извори → правило → анализа → ризици</span></button>
        <button data-workflow-prompt="Подготви професионален правен меморандум со: прашање, релевантни факти, правна рамка, анализа, спротивни аргументи, заклучок и Human Gate точки за проверка."><strong>▧ Правен меморандум</strong><span>Issue · Facts · Law · Analysis · Conclusion</span></button>
        <button data-workflow-prompt="Прегледај го договорниот проблем. Издвои обврски, рокови, ризични клаузули, можни повреди, докази што недостигаат и точки за човечка проверка."><strong>≋ Contract Review</strong><span>Клаузули · ризици · недостиг на докази</span></button>
        <button data-workflow-prompt="Изгради хронологија на предметот од дадените факти. Оддели потврдени факти, спорни факти, докази, правни прашања и следни чекори."><strong>⌁ Case Chronology</strong><span>Факти · докази · спорни точки · задачи</span></button>
        <button data-workflow-prompt="Направи source verification audit на претходниот одговор. За секое материјално правно тврдење наведи дали има примарен извор, важечка верзија и што останува непотврдено."><strong>▤ Source Check</strong><span>Authority · version · provenance</span></button>
        <button data-workflow-prompt="Спореди ги двете верзии на документот. Издвои суштински промени, правен ефект, ризици и прашања за Human Gate. Не измислувај разлики што не се во документите."><strong>⇄ Redline / Compare</strong><span>Промени · ефект · ризик · review</span></button>
        <button data-workflow-tool="consolidator"><strong>≋ Консолидатор</strong><span>Legal Formatter v10.4 CORE</span></button>
        <button data-workflow-prompt="${governedPredictorPrompt()}"><strong>◎ Предиктор</strong><span>Сценарија · ризици · без лажни проценти</span></button>
      </div><p class="ai-workflow-note">Workflows подготвуваат работна задача. Не поднесуваат, не потпишуваат и не заменуваат Human Gate.</p>`;
    document.body.append(d);
    d.querySelector("[data-close]")?.addEventListener("click",()=>d.close());
    d.querySelectorAll("[data-workflow-prompt]").forEach(b=>b.addEventListener("click",()=>{input.value=String(b.dataset.workflowPrompt||"");autoSize();d.close();input.focus();}));
    d.querySelector("[data-workflow-tool='consolidator']")?.addEventListener("click",()=>{d.close();window.open("/consolidator/","_blank","noopener");});
    return d;
  }


  async function sha256Text(value){
    const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value||"")));
    return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
  }

  function setInternalToolPrompt(text,dialog=null){
    input.value=String(text||"").trim();
    autoSize();
    dialog?.close?.();
    document.getElementById("ai-advokat-chat")?.scrollIntoView({behavior:"smooth",block:"start"});
    setTimeout(()=>input.focus(),220);
  }

  async function loadPublicEvidenceTask(dialog){
    const task=String(dialog.querySelector("[data-public-evidence-task]")?.value||"entity");
    const status=dialog.querySelector("[data-public-evidence-status]");
    const host=dialog.querySelector("[data-public-evidence-sources]");
    if(status) status.textContent="Го вчитувам governed source workflow…";
    if(host) host.replaceChildren();
    try{
      const r=await fetch(CHAT_API_BASE+"/api/internal-toolkit?task="+encodeURIComponent(task),{headers:{accept:"application/json"}});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data?.ok) throw new Error(data?.error||"public_evidence_catalog_unavailable");
      dialog._publicEvidenceData=data;
      const wf=data?.publicEvidence?.workflow||{};
      const steps=document.createElement("div");steps.className="ai-toolkit-flow";
      (wf.steps||[]).forEach(step=>{const s=document.createElement("span");s.textContent=String(step);steps.append(s);});
      host?.append(steps);
      for(const source of wf.sources||[]){
        const card=document.createElement("article");card.className="ai-toolkit-source";
        const head=document.createElement("div");head.className="ai-toolkit-source-head";
        const title=document.createElement("strong");title.textContent=String(source.title||source.id);
        const badge=document.createElement("span");badge.textContent=String(source.authorityClass||"source");
        head.append(title,badge);
        const role=document.createElement("p");role.textContent=String(source.sourceRole||"");
        const boundary=document.createElement("small");boundary.textContent=String(source.claimBoundary||"");
        const actions=document.createElement("div");actions.className="ai-toolkit-card-actions";
        const open=document.createElement("a");open.href=source.url;open.target="_blank";open.rel="noopener noreferrer";open.textContent="Отвори извор ↗";
        const use=document.createElement("button");use.type="button";use.textContent="Постави задача";
        use.onclick=()=>setInternalToolPrompt(
          "AI Advokat, направи Public Evidence истражување за следната задача: [ОПИШИ ШТО ПРОВЕРУВАМЕ].\n\n"+
          "Работен тип: "+task+".\nПочетен извор: "+source.title+" — "+source.url+"\n"+
          "Следи ја низа: "+(wf.steps||[]).join(" → ")+".\n"+
          "Правило: трага не е заклучок; entity/name match не е идентификација; јавен запис не е доказ за незаконитост. "+
          "За секој материјален наод наведи URL, датум/верзија, source class, што точно потврдува и што НЕ потврдува. Human Gate задолжителен.",
          dialog
        );
        actions.append(open,use);card.append(head,role,boundary,actions);host?.append(card);
      }
      if(status) status.textContent=String(wf.doctrine||"Трага не е заклучок.")+" · Human Gate";
    }catch(error){
      if(status) status.textContent="Public Evidence registry не е достапен: "+String(error?.message||error);
    }
  }

  function ensurePublicEvidenceDialog(){
    let d=document.getElementById("aiPublicEvidenceDialog");
    if(d) return d;
    d=document.createElement("dialog");d.id="aiPublicEvidenceDialog";d.className="ai-toolkit-dialog";
    d.innerHTML=`<div class="ai-workspace-dialog-head"><div><strong>⌕ Public Evidence & Legal OSINT</strong><small>трага → извор → corroboration → legal relevance → Human Gate</small></div><button type="button" data-close>×</button></div>
      <div class="ai-toolkit-body">
        <section class="ai-toolkit-section">
          <label>Истражувачка задача
            <select data-public-evidence-task>
              <option value="entity">Entity Verification</option>
              <option value="procurement">Public Procurement</option>
              <option value="public_money">Public Money</option>
              <option value="regulatory_change">Regulatory Change</option>
              <option value="property">Property / Parcel</option>
              <option value="digital_entity">Domain / Digital Entity</option>
              <option value="open_data">Open Data</option>
              <option value="web_history">Web History</option>
            </select>
          </label>
          <div class="ai-toolkit-status" data-public-evidence-status>Вчитување…</div>
          <div class="ai-toolkit-grid" data-public-evidence-sources></div>
        </section>
        <section class="ai-toolkit-section">
          <h3>Evidence Card · локален fingerprint</h3>
          <p>Внесете јавен URL и, ако сакате, текстуален snapshot/белешка. SHA-256 се пресметува локално во browser; картата не е правен заклучок.</p>
          <div class="ai-toolkit-form-grid">
            <label>Наслов<input data-evidence-title maxlength="240" placeholder="Пр. Оглас / договор / јавен запис"></label>
            <label>Јавен URL<input data-evidence-url type="url" placeholder="https://..."></label>
            <label class="wide">Snapshot / белешка<textarea data-evidence-snapshot maxlength="50000" placeholder="Јавен текст или белешка што сакате да ја fingerprint-ирате"></textarea></label>
          </div>
          <div class="ai-toolkit-card-actions"><button type="button" class="primary" data-evidence-build>Создај Evidence Card</button><button type="button" data-evidence-to-chat disabled>Испрати во chat</button></div>
          <pre class="ai-toolkit-output" data-evidence-output>Нема Evidence Card.</pre>
        </section>
        <p class="ai-toolkit-boundary"><b>Граница:</b> Public Evidence не врши surveillance, не пробива пристап, не претпоставува идентитет и не претвора јавен запис во доказ за вина. PUBLIC ≠ REUSABLE · LEAD ≠ CONCLUSION.</p>
      </div>`;
    document.body.append(d);
    d.querySelector("[data-close]")?.addEventListener("click",()=>d.close());
    d.addEventListener("click",event=>{if(event.target===d)d.close();});
    d.querySelector("[data-public-evidence-task]")?.addEventListener("change",()=>loadPublicEvidenceTask(d));
    d.querySelector("[data-evidence-build]")?.addEventListener("click",async()=>{
      const out=d.querySelector("[data-evidence-output]");
      const toChat=d.querySelector("[data-evidence-to-chat]");
      const title=String(d.querySelector("[data-evidence-title]")?.value||"").trim();
      const url=String(d.querySelector("[data-evidence-url]")?.value||"").trim();
      const snapshot=String(d.querySelector("[data-evidence-snapshot]")?.value||"");
      const task=String(d.querySelector("[data-public-evidence-task]")?.value||"general");
      if(!url){out.textContent="Внесете јавен URL.";toChat.disabled=true;return;}
      out.textContent="Градам provenance card…";toChat.disabled=true;
      try{
        const hash=snapshot?await sha256Text(snapshot):null;
        const r=await fetch(CHAT_API_BASE+"/api/public-evidence/card",{
          method:"POST",headers:{"content-type":"application/json","accept":"application/json"},
          body:JSON.stringify({title:title||"Јавна доказна трага",url,task,observedAt:new Date().toISOString(),contentSha256:hash,note:snapshot.slice(0,2000),status:"SOURCE_BACKED"})
        });
        const data=await r.json().catch(()=>({}));
        if(!r.ok||!data?.ok) throw new Error(data?.error||"evidence_card_failed");
        d._lastEvidenceCard=data.card;
        out.textContent=JSON.stringify(data.card,null,2);toChat.disabled=false;
      }catch(error){
        out.textContent="Evidence Card error: "+String(error?.message||error);
      }
    });
    d.querySelector("[data-evidence-to-chat]")?.addEventListener("click",()=>{
      const card=d._lastEvidenceCard;if(!card)return;
      setInternalToolPrompt(
        "AI Advokat, анализирај ја оваа Public Evidence Card само како доказна трага. Не претворај ја во правен заклучок без corroboration и Human Gate.\n\n"+
        JSON.stringify(card,null,2)+"\n\n"+
        "Издвои: FACT / SOURCE-BACKED OBSERVATION / WHAT THIS DOES NOT PROVE / CORROBORATION NEEDED / LEGAL RELEVANCE / HUMAN GATE.",
        d
      );
    });
    loadPublicEvidenceTask(d);
    return d;
  }

  function calculatorPanelHtml(){
    return `<div class="ai-toolkit-calculators">
      <article class="ai-toolkit-calc" data-calc="simple_interest"><strong>Информативна проста камата</strong>
        <label>Главнина<input data-field="principal" type="number" step="0.01"></label>
        <label>Годишна стапка %<input data-field="annualRatePct" type="number" step="0.0001"></label>
        <div class="ai-toolkit-form-grid"><label>Од<input data-field="fromDate" type="date"></label><label>До<input data-field="toDate" type="date"></label></div>
        <label>Извор на стапката<input data-field="rateSource" placeholder="официјален извор / акт / период"></label>
        <label class="ai-toolkit-check"><input data-field="rateVerified" type="checkbox"> Јас ја проверив стапката и периодот</label>
        <button type="button" data-calc-run>Пресметај</button><pre data-calc-output>—</pre>
      </article>
      <article class="ai-toolkit-calc" data-calc="calendar_deadline"><strong>Календарски датум + N дена</strong>
        <label>Почетен датум<input data-field="baseDate" type="date"></label>
        <label>Дена<input data-field="days" type="number" step="1"></label>
        <button type="button" data-calc-run>Пресметај</button><pre data-calc-output>—</pre>
      </article>
      <article class="ai-toolkit-calc" data-calc="percentage"><strong>Процент од износ</strong>
        <label>Износ<input data-field="amount" type="number" step="0.01"></label>
        <label>Процент %<input data-field="percent" type="number" step="0.0001"></label>
        <label>Извор / основа<input data-field="source" placeholder="ако постои"></label>
        <button type="button" data-calc-run>Пресметај</button><pre data-calc-output>—</pre>
      </article>
    </div>`;
  }

  function readCalcInput(card){
    const out={};
    card.querySelectorAll("[data-field]").forEach(el=>{
      const key=el.dataset.field;
      if(el.type==="checkbox") out[key]=el.checked;
      else if(el.type==="number") out[key]=el.value===""?null:Number(el.value);
      else out[key]=el.value;
    });
    return out;
  }

  async function runInternalCalculator(card){
    const output=card.querySelector("[data-calc-output]");
    output.textContent="Пресметувам…";
    try{
      const r=await fetch(CHAT_API_BASE+"/api/internal-toolkit/calculate",{
        method:"POST",headers:{"content-type":"application/json","accept":"application/json"},
        body:JSON.stringify({calculator:card.dataset.calc,input:readCalcInput(card)})
      });
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data?.ok) throw new Error(data?.error||"calculation_failed");
      output.textContent=JSON.stringify(data.result,null,2);
    }catch(error){output.textContent="Calculator error: "+String(error?.message||error);}
  }

  async function populateProfessionalEcosystem(dialog){
    const status=dialog.querySelector("[data-pro-status]");
    try{
      const r=await fetch(CHAT_API_BASE+"/api/internal-toolkit",{headers:{accept:"application/json"}});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data?.ok) throw new Error(data?.error||"internal_toolkit_unavailable");
      dialog._toolkit=data.ecosystem;
      const living=dialog.querySelector("[data-pro-living]");
      const docs=dialog.querySelector("[data-pro-documents]");
      const watch=dialog.querySelector("[data-pro-watch]");
      const registry=dialog.querySelector("[data-pro-registry]");
      living.replaceChildren();docs.replaceChildren();watch.replaceChildren();registry.replaceChildren();
      for(const item of data.ecosystem.livingLaw||[]){
        const b=document.createElement("button");b.type="button";b.className="ai-toolkit-action";
        b.innerHTML="<strong>"+esc(item.title)+"</strong><span>"+esc(item.prompt)+"</span>";
        b.onclick=()=>setInternalToolPrompt(item.prompt+"\n\nКонкретен пропис/член/датум: [ВНЕСИ].",dialog);
        living.append(b);
      }
      for(const item of data.ecosystem.operationsRegistry||[]){
        const card=document.createElement("article");card.className="ai-toolkit-registry";
        const h=document.createElement("strong");h.textContent=item.title;
        const p=document.createElement("p");p.textContent=item.sourceRule;
        const s=document.createElement("span");s.textContent=item.valueState;
        card.append(h,p,s);registry.append(card);
      }
      for(const item of data.ecosystem.smartDocuments||[]){
        const b=document.createElement("button");b.type="button";b.className="ai-toolkit-action";
        const strong=document.createElement("strong");strong.textContent=item.title;
        const span=document.createElement("span");span.textContent="Полиња: "+item.fields.join(" · ");
        b.append(strong,span);
        b.onclick=()=>setInternalToolPrompt(item.prompt+"\n\nДостапни факти:\n[ВНЕСИ ФАКТИ]\n\nПровери ги овие полиња: "+item.fields.join(", ")+".",dialog);
        docs.append(b);
      }
      for(const item of data.ecosystem.legalWatch||[]){
        const card=document.createElement("article");card.className="ai-toolkit-source";
        const head=document.createElement("div");head.className="ai-toolkit-source-head";
        const strong=document.createElement("strong");strong.textContent=item.title;
        const badge=document.createElement("span");badge.textContent=item.watchRole;
        head.append(strong,badge);
        const actions=document.createElement("div");actions.className="ai-toolkit-card-actions";
        const open=document.createElement("a");open.href=item.url;open.target="_blank";open.rel="noopener noreferrer";open.textContent="Отвори официјален извор ↗";
        const ask=document.createElement("button");ask.type="button";ask.textContent="Провери во chat";ask.onclick=()=>setInternalToolPrompt(item.prompt,dialog);
        actions.append(open,ask);card.append(head,actions);watch.append(card);
      }
      status.textContent="Living Law · Registry · Calculators · Smart Documents · Legal Watch · Human Gate";
    }catch(error){status.textContent="Professional Ecosystem не е достапен: "+String(error?.message||error);}
  }

  function justiceDailyTypeLabel(type){
    return ({
      decision:"Одлука / предмет",
      session:"Седница",
      legislation:"Законодавство",
      prosecution:"Обвинителство",
      appointments:"Избор / именување",
      reform:"Реформа / извештај",
      training:"Обука",
      institutional_update:"Институционална вест"
    })[String(type||"")]||String(type||"Вест");
  }

  function justiceDailyInstitutionLabel(value){
    return ({
      assembly:"Собрание",
      constitutional_court:"Уставен суд",
      supreme_court:"Врховен суд",
      judicial_council:"Судски совет",
      public_prosecution:"Јавно обвинителство",
      prosecutors_council:"Совет на јавни обвинители",
      ministry_justice:"Министерство за правда",
      judicial_academy:"Академија",
      court_portal:"Судски портал",
      official_gazette:"Службен весник",
      ener:"ЕНЕР",
      state_audit:"ДЗР · Правосудство",
      anti_corruption:"ДКСК"
    })[String(value||"")]||String(value||"Институција");
  }

  function renderJusticeDaily(dialog,data){
    const host=dialog.querySelector("[data-justice-items]");
    const status=dialog.querySelector("[data-justice-status]");
    const health=dialog.querySelector("[data-justice-health]");
    const brief=dialog.querySelector("[data-justice-brief]");
    host?.replaceChildren();
    health?.replaceChildren();

    const items=Array.isArray(data?.items)?data.items:[];
    const sourceHealth=Array.isArray(data?.sourceHealth)?data.sourceHealth:[];
    const okCount=sourceHealth.filter(x=>x.status==="ok").length;
    const failed=sourceHealth.filter(x=>x.status!=="ok");

    if(status){
      status.textContent="Justice Daily · "+items.length+" записи · "+okCount+"/"+sourceHealth.length+" извори достапни · "+
        (Number(data?.windowDays||1)===1?"последни 24 часа":"последни "+Number(data?.windowDays||1)+" дена");
    }

    if(health){
      const summary=document.createElement("details");
      summary.className="ai-toolkit-source";
      const head=document.createElement("summary");
      head.textContent="Source health · "+okCount+" OK"+(failed.length?" · "+failed.length+" недостапни":"");
      summary.append(head);
      const list=document.createElement("div");list.className="ai-toolkit-flow";
      sourceHealth.forEach(s=>{
        const chip=document.createElement("span");
        chip.textContent=(s.status==="ok"?"✓ ":"⚠ ")+String(s.title||s.sourceId)+" · "+String(s.itemCount||0);
        chip.title=(s.errors||[]).join(" | ");
        list.append(chip);
      });
      summary.append(list);health.append(summary);
    }

    if(!items.length){
      const empty=document.createElement("div");empty.className="ai-toolkit-source";
      empty.innerHTML="<strong>Нема dated записи во избраниот прозорец.</strong><p>Променете на 3 или 7 дена. Недостапните институции се прикажани во Source health; системот не ги пополнува празнините со медиумски претпоставки.</p>";
      host?.append(empty);
    }

    items.forEach(item=>{
      const card=document.createElement("article");card.className="ai-toolkit-source";
      const head=document.createElement("div");head.className="ai-toolkit-source-head";
      const title=document.createElement("strong");title.textContent=String(item.title||"Официјална објава");
      const badge=document.createElement("span");badge.textContent=justiceDailyTypeLabel(item.type);
      head.append(title,badge);
      const meta=document.createElement("p");
      meta.textContent=[
        justiceDailyInstitutionLabel(item.institution),
        item.publishedDate||"датум непотврден",
        item.authorityClass||"official"
      ].join(" · ");
      const boundary=document.createElement("small");boundary.textContent=String(item.claimBoundary||"Вест ≠ правен заклучок.");
      const actions=document.createElement("div");actions.className="ai-toolkit-card-actions";
      const open=document.createElement("a");open.href=item.url;open.target="_blank";open.rel="noopener noreferrer";open.textContent="Отвори официјален извор ↗";
      const ask=document.createElement("button");ask.type="button";ask.textContent="Во chat";
      ask.onclick=()=>setInternalToolPrompt(
        "AI Advokat, подготви краток правосуден briefing за оваа официјална објава. Прво провери го оригиналниот URL и точниот датум/статус. Не претворај најава, седница, сомнение, предлог или соопштение во конечен правен заклучок.\n\n"+
        "Институција: "+justiceDailyInstitutionLabel(item.institution)+"\n"+
        "Тип: "+justiceDailyTypeLabel(item.type)+"\n"+
        "Датум: "+String(item.publishedDate||"непотврден")+"\n"+
        "Наслов: "+String(item.title||"")+"\n"+
        "URL: "+String(item.url||"")+"\n\n"+
        "Формат: FACT / INSTITUTIONAL STATUS / WHAT IT DOES NOT PROVE / LEGAL RELEVANCE / NEXT SOURCE TO VERIFY / HUMAN GATE.",
        dialog
      );
      actions.append(open,ask);
      card.append(head,meta,boundary,actions);host?.append(card);
    });

    if(brief){
      brief.disabled=!items.length;
      brief.onclick=()=>{
        const top=items.slice(0,12).map((item,i)=>
          (i+1)+". ["+justiceDailyInstitutionLabel(item.institution)+"] "+String(item.publishedDate||"датум?")+" — "+String(item.title||"")+" — "+String(item.url||"")
        ).join("\n");
        setInternalToolPrompt(
          "AI Advokat, изработи ДНЕВЕН ПРАВОСУДЕН БРИФИНГ само од следните официјално агрегирани записи. За секој запис задржи го институционалниот статус и не претпоставувај правно дејство. Групирај: 1) Клучни одлуки/предмети, 2) Законодавство и реформи, 3) Судско и обвинителско управување, 4) Ризици/рокови за следење, 5) Human Gate.\n\n"+top,
          dialog
        );
      };
    }
  }

  async function loadJusticeDaily(dialog){
    const status=dialog.querySelector("[data-justice-status]");
    const host=dialog.querySelector("[data-justice-items]");
    if(status) status.textContent="Justice Daily ги проверува официјалните извори…";
    if(host) host.replaceChildren();
    const days=String(dialog.querySelector("[data-justice-days]")?.value||"1");
    const institution=String(dialog.querySelector("[data-justice-institution]")?.value||"");
    const type=String(dialog.querySelector("[data-justice-type]")?.value||"");
    const params=new URLSearchParams({days,limit:"60"});
    if(institution) params.set("institution",institution);
    if(type) params.set("type",type);
    try{
      const r=await fetch(CHAT_API_BASE+"/api/legal-news?"+params.toString(),{headers:{accept:"application/json"}});
      const data=await r.json().catch(()=>({}));
      if(!r.ok||!data?.ok) throw new Error(data?.detail||data?.error||"justice_daily_unavailable");
      dialog._justiceDailyData=data;
      renderJusticeDaily(dialog,data);
    }catch(error){
      if(status) status.textContent="Justice Daily не е достапен: "+String(error?.message||error);
      const failed=document.createElement("div");failed.className="ai-toolkit-source";
      failed.textContent="Не е објавен правосуден брифинг. Изворните празнини не се пополнуваат автоматски.";
      host?.append(failed);
    }
  }

  function ensureJusticeDailyDialog(){
    let d=document.getElementById("aiJusticeDailyDialog");
    if(d) return d;
    d=document.createElement("dialog");d.id="aiJusticeDailyDialog";d.className="ai-toolkit-dialog ai-pro-ecosystem-dialog";
    d.innerHTML=`<div class="ai-workspace-dialog-head"><div><strong>◉ Justice Daily · Правосуден агрегатор</strong><small>официјални извори · дедупликација · source health · Human Gate</small></div><button type="button" data-close>×</button></div>
      <div class="ai-toolkit-body">
        <section class="ai-toolkit-section">
          <div class="ai-toolkit-form-grid">
            <label>Период<select data-justice-days><option value="1">Последни 24 часа</option><option value="3">Последни 3 дена</option><option value="7">Последни 7 дена</option></select></label>
            <label>Институција<select data-justice-institution>
              <option value="">Сите официјални извори</option>
              <option value="assembly">Собрание</option>
              <option value="constitutional_court">Уставен суд</option>
              <option value="supreme_court">Врховен суд</option>
              <option value="judicial_council">Судски совет</option>
              <option value="public_prosecution">Јавно обвинителство</option>
              <option value="prosecutors_council">Совет на јавни обвинители</option>
              <option value="ministry_justice">Министерство за правда</option>
              <option value="judicial_academy">Академија</option>
              <option value="court_portal">Судски портал</option>
              <option value="official_gazette">Службен весник</option>
              <option value="ener">ЕНЕР</option>
              <option value="state_audit">ДЗР · Правосудство</option>
              <option value="anti_corruption">ДКСК</option>
            </select></label>
            <label>Тип<select data-justice-type>
              <option value="">Сите типови</option>
              <option value="decision">Одлуки / предмети</option>
              <option value="session">Седници</option>
              <option value="legislation">Законодавство</option>
              <option value="prosecution">Обвинителство</option>
              <option value="appointments">Избор / именување</option>
              <option value="reform">Реформи / извештаи</option>
              <option value="training">Обуки</option>
            </select></label>
          </div>
          <div class="ai-toolkit-card-actions"><button type="button" data-justice-refresh>Освежи</button><button type="button" data-justice-brief disabled>Подготви дневен брифинг во chat</button></div>
          <div class="ai-toolkit-status" data-justice-status>Вчитување…</div>
          <div data-justice-health></div>
        </section>
        <section class="ai-toolkit-section"><h3>Официјални правосудни новости</h3><div class="ai-toolkit-grid" data-justice-items></div></section>
        <p class="ai-toolkit-boundary"><b>Граница:</b> Justice Daily користи официјални јавни институционални извори. Вест, најава, дневен ред, сомнение, ревизорски наод или предлог-закон не се автоматски конечен акт, вина или важечко право. За правно потпирање се бара item-level verification и Human Gate.</p>
      </div>`;
    document.body.append(d);
    d.querySelector("[data-close]")?.addEventListener("click",()=>d.close());
    d.addEventListener("click",event=>{if(event.target===d)d.close();});
    d.querySelector("[data-justice-refresh]")?.addEventListener("click",()=>loadJusticeDaily(d));
    d.querySelectorAll("[data-justice-days],[data-justice-institution],[data-justice-type]").forEach(el=>el.addEventListener("change",()=>loadJusticeDaily(d)));
    loadJusticeDaily(d);
    return d;
  }

  function ensureProfessionalEcosystemDialog(){
    let d=document.getElementById("aiProfessionalEcosystemDialog");
    if(d) return d;
    d=document.createElement("dialog");d.id="aiProfessionalEcosystemDialog";d.className="ai-toolkit-dialog ai-pro-ecosystem-dialog";
    d.innerHTML=`<div class="ai-workspace-dialog-head"><div><strong>◆ AI Advokat Professional Ecosystem</strong><small>Living Law · Legal Operations · Smart Documents · Legal Watch</small></div><button type="button" data-close>×</button></div>
      <div class="ai-toolkit-body">
        <div class="ai-toolkit-status" data-pro-status>Вчитување…</div>
        <section class="ai-toolkit-section"><h3>Living Law</h3><div class="ai-toolkit-action-grid" data-pro-living></div></section>
        <section class="ai-toolkit-section"><h3>Legal Operations Registry</h3><div class="ai-toolkit-grid" data-pro-registry></div></section>
        <section class="ai-toolkit-section"><h3>Deterministic Calculators</h3><p>Калкулаторите пресметуваат аритметика; не избираат правна стапка, такса или процесно правило.</p>${calculatorPanelHtml()}</section>
        <section class="ai-toolkit-section"><h3>Smart Legal Document Factory</h3><div class="ai-toolkit-action-grid" data-pro-documents></div></section>
        <section class="ai-toolkit-section"><h3>Legal Watch</h3><div class="ai-toolkit-grid" data-pro-watch></div></section>
        <p class="ai-toolkit-boundary"><b>Human Gate:</b> системот не поднесува, не потпишува, не плаќа и не презема последична правна акција. Living Law и Legal Watch мора да ја докажат верзијата/датумот пред current-law тврдење.</p>
      </div>`;
    document.body.append(d);
    d.querySelector("[data-close]")?.addEventListener("click",()=>d.close());
    d.addEventListener("click",event=>{if(event.target===d)d.close();});
    d.querySelectorAll("[data-calc-run]").forEach(button=>button.addEventListener("click",()=>runInternalCalculator(button.closest("[data-calc]"))));
    populateProfessionalEcosystem(d);
    return d;
  }

  function ensureWorkspaceSearchDialog(){
    let d=document.getElementById("aiWorkspaceSearchDialog");
    if(d) return d;
    d=document.createElement("dialog");d.id="aiWorkspaceSearchDialog";d.className="ai-workspace-search-dialog";
    d.innerHTML=`<div class="ai-workspace-dialog-head"><div><strong>Global Search</strong><small>Разговори и професионални алатки</small></div><button type="button" data-close>×</button></div><div class="ai-workspace-search-body"><input id="aiWorkspaceGlobalSearch" type="search" placeholder="Пребарај разговор, CasePilot, извор…" autocomplete="off"><div id="aiWorkspaceSearchResults" class="ai-workspace-search-results"></div></div>`;
    document.body.append(d);
    d.querySelector("[data-close]")?.addEventListener("click",()=>d.close());
    const field=d.querySelector("#aiWorkspaceGlobalSearch");
    field?.addEventListener("input",()=>renderWorkspaceSearchResults(d,field.value));
    return d;
  }

  function renderWorkspaceSearchResults(dialog,query=""){
    const host=dialog.querySelector("#aiWorkspaceSearchResults");if(!host) return;
    host.replaceChildren();
    const q=String(query||"").trim().toLocaleLowerCase("mk");
    const matching=[...chats.values()].filter(t=>!q||String(t.title||"").toLocaleLowerCase("mk").includes(q)||(t.messages||[]).some(m=>String(m?.text||"").toLocaleLowerCase("mk").includes(q))).slice(0,8);
    if(matching.length){
      const label=document.createElement("div");label.className="ai-workspace-search-group";label.textContent="Разговори";host.append(label);
      matching.forEach(t=>{const b=document.createElement("button");b.type="button";b.textContent=t.title;b.onclick=()=>{currentId=t.id;dialog.close();render();save();};host.append(b);});
    }
    const tools=[
      ["Правен асистент","assistant"],["Анализатор","analyzer"],["Консолидатор","consolidator"],["Предиктор","predictor"],
      ["Правни извори","sources"],["Јавни докази","public-evidence"],["Pro Ecosystem","professional-ecosystem"],["Justice Daily","justice-daily"],["Судска практика","cases"],["CasePilot","casepilot"],["Документи","documents"],
      ["Workflows","workflows"],["Human Gate","human-gate"],["Library","library"]
    ].filter(([label])=>!q||label.toLocaleLowerCase("mk").includes(q));
    if(tools.length){
      const label=document.createElement("div");label.className="ai-workspace-search-group";label.textContent="Алатки";host.append(label);
      tools.forEach(([label,action])=>{const b=document.createElement("button");b.type="button";b.textContent=label;b.onclick=()=>{dialog.close();runAIAdvokat4Action(action);};host.append(b);});
    }
  }

  function openWorkspaceSearch(){
    const d=ensureWorkspaceSearchDialog();
    const field=d.querySelector("#aiWorkspaceGlobalSearch");
    if(field) field.value="";
    renderWorkspaceSearchResults(d,"");
    d.showModal();
    setTimeout(()=>field?.focus(),0);
  }

  function runAIAdvokat4Action(action){
    document.querySelectorAll("[data-ai-workbench]").forEach(b=>b.classList.toggle("active",String(b.dataset.aiWorkbench||"")===action));
    if(action==="assistant"){document.getElementById("ai-advokat-chat")?.scrollIntoView({behavior:"smooth",block:"start"});setTimeout(()=>input.focus(),200);return;}
    if(action==="consolidator"){window.open("/consolidator/","_blank","noopener");return;}
    if(action==="analyzer"){
      const d=ensureAnalyzerDialog();
      const area=d.querySelector("#aiProfAnalyzerText");
      if(area && !area.value.trim() && input.value.trim()) area.value=input.value.trim();
      d.showModal();
      return;
    }
    if(action==="predictor"){
      input.value=governedPredictorPrompt();
      autoSize();
      document.getElementById("ai-advokat-chat")?.scrollIntoView({behavior:"smooth",block:"start"});
      setTimeout(()=>input.focus(),250);
      return;
    }
    if(action==="casepilot"){window.open("/casepilot-workspace.html","_blank","noopener");return;}
    if(action==="cases"){window.open("/case-law-metadata.html","_blank","noopener");return;}
    if(action==="documents"){openMaterialsDialog("documents");return;}
    if(action==="workflows"){ensureWorkflowDialog().showModal();return;}
    if(action==="library"){openMaterialsDialog("library");return;}
    if(action==="sources"){renderWorkbenchSources();openWorkspaceEvidence("sources");return;}
    if(action==="public-evidence"){ensurePublicEvidenceDialog().showModal();return;}
    if(action==="professional-ecosystem"){ensureProfessionalEcosystemDialog().showModal();return;}
    if(action==="justice-daily"){ensureJusticeDailyDialog().showModal();return;}
    if(action==="human-gate"){renderWorkbenchHumanGate();openWorkspaceEvidence("human");return;}
  }

  if(historySearch) historySearch.addEventListener("input",renderHistory);
  if(workspaceNew) workspaceNew.addEventListener("click",()=>newChatBtn.click());
  if(workspaceSearchLaunch) workspaceSearchLaunch.addEventListener("click",openWorkspaceSearch);
  if(evidenceToggle) evidenceToggle.addEventListener("click",()=>{evidencePanel?.classList.toggle("is-open");renderWorkspaceEvidence();});
  if(evidenceClose) evidenceClose.addEventListener("click",()=>evidencePanel?.classList.remove("is-open"));
  evidenceTabs.forEach(button=>button.addEventListener("click",()=>openWorkspaceEvidence(String(button.dataset.aiEvidenceTab||"sources"))));
  document.addEventListener("keydown",event=>{
    if((event.ctrlKey||event.metaKey)&&String(event.key||"").toLowerCase()==="k" && !event.altKey){
      event.preventDefault();openWorkspaceSearch();
    }
  });

  document.querySelectorAll("[data-ai-workbench]").forEach(button=>{
    button.addEventListener("click",event=>{
      event.preventDefault();
      try{
        runAIAdvokat4Action(String(button.dataset.aiWorkbench||""));
      }catch(error){
        window.AIAdvokatFrontendGuard?.report?.("main","workbench-action",error);
      }
      if(toolsMenu) toolsMenu.open=false;
    });
  });

  fetch(CHAT_API_BASE+"/api/orchestrator",{headers:{"accept":"application/json"}})
    .then(async r=>{
      if(!r.ok) throw new Error("runtime_"+r.status);
      return r.json();
    })
    .then(d=>{
      const runtime=d?.runtime||{};
      const fullyReady=
        runtime.providerExecution==="configured_for_api_chat_execution"
        && runtime.lioeRuntimeGovernance==="enabled"
        && runtime.lioePostflight==="enabled"
        && runtime.lioeSpecialistExecution==="enabled"
        && runtime.lioeRuntimeTelemetry==="ready";
      const freeModel=String(runtime.freeProviderModel||"").trim();
      const paidModel=String(runtime.paidProviderModel||"").trim();
      if(runtime.freeProvider==="workers_ai_free" || runtime.providerExecution==="configured_for_free_workers_ai_chat_execution"){
        provider.textContent="FREE Workers AI · "+(freeModel||"активен модел")+" · LIVE";
      }else if(fullyReady){
        provider.textContent=(paidModel||"OpenAI provider")+" · LIVE governed";
      }else if(runtime.providerExecution==="configured_for_api_chat_execution"){
        provider.textContent=(paidModel||"OpenAI provider")+" · runtime partial · recovery required";
      }else provider.textContent="AI provider · недостапен";
    })
    .catch(()=>{provider.textContent="AI runtime · недостапен";});

  try{
    load();syncModeUi();render();renderAttachments();autoSize();refreshGuideVaultStatus();renderWorkspaceEvidence();syncChatMembershipState();
    restoreProfessionalAccess().catch(()=>{});
    window.AIAdvokatFrontendGuard?.markReady?.("main");
  }catch(error){
    window.AIAdvokatFrontendGuard?.report?.("main","boot",error);
  }
})();