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
  const chatTurnstileRow=$("#aiChatTurnstileRow");
  const chatTurnstileBox=$("#aiChatTurnstileBox");
  const chatTurnstileState=$("#aiChatTurnstileState");
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
  let chatTurnstileToken=null;
  let chatTurnstileWidget=null;
  let chatTurnstileReady=false;
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
    [...chats.values()].slice().reverse().forEach(c=>{
      const b=document.createElement("button");
      b.type="button"; b.textContent=c.title; b.title=c.title;
      if(c.id===currentId) b.classList.add("active");
      b.onclick=()=>{currentId=c.id;attachments=[];renderAttachments();render();save();};
      historyEl.append(b);
    });
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
      return;
    }
    chat.messages.forEach((m,idx)=>messagesEl.append(renderMessage(m,idx)));
    messagesEl.scrollTop=messagesEl.scrollHeight;
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
    const content=document.createElement("div");content.className="ai-msg-content";content.textContent=m.text||"";
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
    const copy=document.createElement("button");copy.type="button";copy.textContent="Копирај";
    copy.onclick=async()=>{try{await navigator.clipboard.writeText(m.text||"");copy.textContent="Копирано ✓";setTimeout(()=>copy.textContent="Копирај",1200);}catch{}};
    tools.append(copy);
    if(m.role==="assistant"){
      const retry=document.createElement("button");retry.type="button";retry.textContent="Повтори";
      retry.onclick=()=>retryFrom(idx);
      tools.append(retry);
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
  initChatTurnstile();

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

  function membershipKey(){
    return sessionStorage.getItem("aiAdvokatMembershipKey")||sessionStorage.getItem("ai_advokat_membership_key")||"";
  }
  function membershipHeaders(){
    const key=membershipKey();
    return key?{"authorization":"Bearer "+key}:{};
  }
  function hasMembershipKey(){ return Boolean(membershipKey()); }

  function syncChatMembershipState(){
    const legacyOwner=membershipKey();
    if(/^AIADV-OWNER-/i.test(legacyOwner)){
      sessionStorage.removeItem("aiAdvokatMembershipKey");
      sessionStorage.removeItem("ai_advokat_membership_key");
    }
    const member=hasMembershipKey();
    const label=member
      ? "Членство · приватен session key · provider според активниот план"
      : "FREE активен · јавен текстуален chat · Workers AI";
    if(chatMembershipState) chatMembershipState.textContent=label;
    if(ownerState) ownerState.textContent=label;
    if(chatTurnstileRow) chatTurnstileRow.hidden=member;
  }

  function resetChatTurnstile(){
    chatTurnstileToken=null;
    if(chatTurnstileWidget!==null && window.turnstile){
      try{window.turnstile.reset(chatTurnstileWidget);}catch{}
    }
    if(chatTurnstileState && !hasMembershipKey()){
      chatTurnstileState.textContent="Потврдете ја анти-бот проверката пред следното FREE барање.";
    }
  }

  async function initChatTurnstile(){
    syncChatMembershipState();
    if(hasMembershipKey()){
      chatTurnstileReady=true;
      if(chatTurnstileState) chatTurnstileState.textContent="Turnstile не е потребен за membership key.";
      return;
    }
    if(chatTurnstileRow) chatTurnstileRow.hidden=false;
    let siteKey=null;
    try{
      const r=await fetch(CHAT_API_BASE+"/api/membership/plans",{headers:{accept:"application/json"}});
      const d=await r.json().catch(()=>null);
      if(r.ok&&d?.ok) siteKey=d.turnstileSiteKey||null;
    }catch{}
    if(!siteKey){
      if(chatTurnstileState) chatTurnstileState.textContent="FREE anti-bot проверката е привремено недостапна.";
      return;
    }

    const render=()=>{
      if(!window.turnstile || !chatTurnstileBox) return false;
      if(chatTurnstileWidget!==null) return true;
      chatTurnstileWidget=window.turnstile.render(chatTurnstileBox,{
        sitekey:siteKey,
        action:"public_chat",
        callback:token=>{
          chatTurnstileToken=String(token||"");
          chatTurnstileReady=true;
          if(chatTurnstileState) chatTurnstileState.textContent="Анти-бот проверката е успешна.";
        },
        "expired-callback":()=>{
          chatTurnstileToken=null;
          if(chatTurnstileState) chatTurnstileState.textContent="Анти-бот проверката истече. Потврдете повторно.";
        },
        "error-callback":()=>{
          chatTurnstileToken=null;
          chatTurnstileReady=false;
          if(chatTurnstileState) chatTurnstileState.textContent="Анти-бот проверката не успеа. Обидете се повторно.";
        }
      });
      return true;
    };
    if(render()) return;
    const started=Date.now();
    const wait=setInterval(()=>{
      if(render() || Date.now()-started>10000){
        clearInterval(wait);
        if(chatTurnstileWidget===null && chatTurnstileState){
          chatTurnstileState.textContent="FREE anti-bot проверката не се вчита. Освежете ја страницата.";
        }
      }
    },200);
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

    if(!hasMembershipKey() && !chatTurnstileToken){
      if(chatTurnstileState){
        chatTurnstileState.textContent=chatTurnstileReady
          ? "Потврдете ја Turnstile проверката пред FREE барањето."
          : "Почекајте или повторете ја anti-bot проверката за FREE chat.";
      }
      chatTurnstileBox?.scrollIntoView({behavior:"smooth",block:"nearest"});
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
          mode:activeMode(),
          webSearch:activeMode()==="web",
          guideIds:guides.map(g=>g.id),
          guideDocuments,
          history:historyForApi,
          attachments:encoded,
          turnstileToken:chatTurnstileToken
        })
      });
      const d=await r.json().catch(()=>null);
      if(r.ok&&d?.ok){
        updateAssistantPlaceholder(assistantIndex,{
          text:d.answer,
          meta:(d.model||"GPT")+" · "+(d.displayMode||d.mode||"auto")+" · session-private",
          guides,
          sources:Array.isArray(d.sources)?d.sources:[],
          legalSources:Array.isArray(d.legalSources)?d.legalSources:[],
          caseLawSources:Array.isArray(d.caseLawSources)?d.caseLawSources:[],
          guideSources:Array.isArray(d.guideSources)?d.guideSources:[],
          governance:d.legalGovernance||null,
          documentExports:requestedExportFormats(q).map(format=>({
            format,
            label:format==="docx"?"Преземи Word (.docx)":format==="pdf"?"Преземи PDF":format==="json"?"Преземи JSON":"Преземи CSV",
            filename:"AI-Advokat-analysis."+format
          })),
          sourceLabel:d.sourceMode==="ai_advokat_article_corpus_first"
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
                      :(d.webSearchUsed===true?"External legal research · Web извори":"GPT general/proactive assistance")
        });
      }else if(["confidential_case_workspace_required","public_attachment_secure_workspace_required","public_history_secure_workspace_required","confidential_document_secure_workspace_required"].includes(d?.error)){
        scrubConfidentialPublicTurn({userIndex,assistantIndex});
        updateAssistantPlaceholder(assistantIndex,{
          ...confidentialCaseHandoffMessage(),
          meta:"Privacy gate · public GPT call stopped · server preflight",
          guides:[],
          action:d?.action||{label:"Отвори Secure Case Workspace",href:"/casepilot-workspace.html"}
        });
      }else if(["free_chat_turnstile_required","free_chat_turnstile_failed"].includes(d?.error)){
        updateAssistantPlaceholder(assistantIndex,{
          text:"FREE јавниот chat бара успешна Cloudflare Turnstile анти-бот проверка. Потврдете ја проверката и испратете повторно.",
          meta:"Anti-bot gate",
          guides:[],
          sourceLabel:"AI provider не е повикан и квотата не е потрошена."
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
      if(!hasMembershipKey()) resetChatTurnstile();
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

  if(micBtn){
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){micBtn.hidden=true;}
    else micBtn.addEventListener("click",()=>{
      const rec=new SR();rec.lang="mk-MK";rec.interimResults=false;rec.maxAlternatives=1;
      rec.onresult=e=>{input.value=(input.value+" "+e.results[0][0].transcript).trim();autoSize();};
      rec.start();
    });
  }

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

  load();syncModeUi();render();renderAttachments();autoSize();refreshGuideVaultStatus();
})();