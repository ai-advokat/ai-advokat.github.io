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
  const fileInput=$("#aiChatFiles");
  const attachmentsEl=$("#aiChatAttachments");
  const newChatBtn=$("#aiChatNew");
  const historyEl=$("#aiChatHistory");
  const provider=$("#aiChatProvider");
  const modeBtns=[...root.querySelectorAll("[data-chat-mode]")];
  const exportBtn=$("#aiChatExport");
  const micBtn=$("#aiChatMic");
  const emptyTemplate=$("#aiChatEmptyTemplate");
  const guideVaultImport=$("#aiGuideVaultImport");
  const guideVaultClear=$("#aiGuideVaultClear");
  const guideVaultFiles=$("#aiGuideVaultFiles");
  const guideVaultStatus=$("#aiGuideVaultStatus");

  let abortController=null;
  let mode="auto";
  let attachments=[];
  let guideRegistryPromise=null;
  let currentId=null;
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
  function render(){
    renderHistory();
    messagesEl.replaceChildren();
    const chat=current();
    if(!chat || !chat.messages.length){
      messagesEl.append(emptyTemplate.content.cloneNode(true));
      messagesEl.querySelectorAll("[data-starter]").forEach(b=>b.addEventListener("click",()=>{
        input.value=b.dataset.starter||b.textContent.trim(); autoSize(); input.focus();
      }));
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

    if(m.guides?.length){
      const grid=document.createElement("div");grid.className="ai-chat-guide-grid";
      m.guides.forEach(g=>{
        const card=document.createElement("div");card.className="ai-chat-guide";
        const text=document.createElement("div");
        const b=document.createElement("b");b.textContent=g.title;
        const s=document.createElement("small");s.textContent=g.scope||g.category||"";
        text.append(b,s);
        const a=document.createElement("a");a.className="btn light";a.href=g.url;a.textContent="Отвори →";
        card.append(text,a);grid.append(card);
      });
      body.append(grid);
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
      body.append(box);
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
      if(legalLinks.childElementCount){legalBox.append(legalLinks);body.append(legalBox);}
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
      if(guideLinks.childElementCount){guideBox.append(guideLinks);body.append(guideBox);}
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
      if(links.childElementCount){sourceBox.append(links);body.append(sourceBox);}
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
      guideRegistryPromise=fetch("/data/guides.json?v=20261005-private-guide-reading",{cache:"no-store"})
        .then(r=>r.ok?r.json():Promise.reject(new Error("guides")));
    }
    return guideRegistryPromise;
  }
  async function fetchGuides(){
    const d=await fetchGuideRegistry();
    return Array.isArray(d?.records)?d.records:[];
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
      return router?.routeGuides ? router.routeGuides(q,records,{limit:3,minScore:6}) : [];
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
  modeBtns.forEach(btn=>btn.addEventListener("click",()=>{
    mode=btn.dataset.chatMode;
    modeBtns.forEach(x=>x.classList.toggle("active",x===btn));
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
    attachments.forEach((a,i)=>{
      const chip=document.createElement("div");chip.className="ai-chat-attachment";
      const icon=document.createElement("span");icon.textContent=(a.type||"").startsWith("image/")?"🖼️":"📎";
      const name=document.createElement("span");name.textContent=a.name;name.title=a.name;
      const rm=document.createElement("button");rm.type="button";rm.textContent="×";rm.setAttribute("aria-label","Отстрани "+a.name);
      rm.onclick=()=>{attachments.splice(i,1);renderAttachments();};
      chip.append(icon,name,rm);attachmentsEl.append(chip);
    });
  }
  attachBtn.addEventListener("click",()=>fileInput.click());
  fileInput.addEventListener("change",()=>{
    const list=[...fileInput.files].slice(0,5);
    const total=[...attachments,...list].reduce((n,f)=>n+(f.size||0),0);
    if(total>4_000_000){alert("За оваа фаза вкупната големина на прилозите е ограничена на 4 MB.");fileInput.value="";return;}
    attachments=[...attachments,...list].slice(0,5);
    fileInput.value="";renderAttachments();
  });

  function inferredMime(file){
    if(file?.type) return file.type;
    const name=String(file?.name||"").toLowerCase();
    if(name.endsWith(".pdf")) return "application/pdf";
    if(name.endsWith(".docx")) return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    if(name.endsWith(".doc")) return "application/msword";
    if(name.endsWith(".csv")) return "text/csv";
    if(name.endsWith(".json")) return "application/json";
    if(name.endsWith(".txt")||name.endsWith(".md")) return "text/plain";
    if(name.endsWith(".png")) return "image/png";
    if(name.endsWith(".jpg")||name.endsWith(".jpeg")) return "image/jpeg";
    if(name.endsWith(".webp")) return "image/webp";
    return "application/octet-stream";
  }

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

  function membershipHeaders(){
    const key=sessionStorage.getItem("aiAdvokatMembershipKey")||sessionStorage.getItem("ai_advokat_membership_key")||"";
    return key?{"authorization":"Bearer "+key}:{};
  }

  async function fallbackSourceAssistant(q){
    try{
      const r=await fetch(CHAT_API_BASE+"/api/assistant",{method:"POST",headers:{"content-type":"application/json","accept":"application/json",...membershipHeaders()},body:JSON.stringify({q,instrument:"auto"})});
      const d=await r.json().catch(()=>null);
      if(r.ok&&d?.ok&&d.answer){
        const cite=(d.citations||[]).map(c=>"чл. "+c.articleNumber).join(", ");
        return {ok:true,text:d.answer,meta:"Source-backed режим",sourceLabel:cite?"Изворни членови: "+cite:"Одговор од проверливиот article-level корпус."};
      }
      return {ok:false,error:d?.error||"source_fallback_unavailable"};
    }catch{return {ok:false,error:"source_fallback_unavailable"};}
  }

  async function send(forcedText=null){
    if(abortController) return;
    const q=String(forcedText??input.value).trim();
    if(!q) return;
    const chat=current();setTitle(chat,q);
    const historyForApi=chat.messages
      .filter(m=>(m.role==="user"||m.role==="assistant") && m.text && m.text!=="Обработувам…")
      .slice(-8)
      .map(m=>({role:m.role,text:String(m.text).slice(0,4000)}));
    const selectedFiles=[...attachments];
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
          attachments:encoded
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
          guideSources:Array.isArray(d.guideSources)?d.guideSources:[],
          governance:d.legalGovernance||null,
          sourceLabel:d.sourceMode==="ai_advokat_article_corpus_first"
            ?"AI Advokat article-level corpus first · верзија и Human Gate се прикажани во изворите."
            :d.sourceMode==="ai_advokat_article_corpus_plus_external_web"
              ?"AI Advokat article-level corpus + одделно означено Web истражување."
              :d.sourceMode==="ai_advokat_article_corpus_gate"
                ?"AI Advokat corpus gate · недостига доволно потврден корпус за сигурен правен заклучок."
                :d.sourceMode==="ai_advokat_legal_corpus_plus_guides"
                  ?"AI Advokat законски corpus + fingerprint-верификувани целосни водичи · Human Gate."
                  :d.sourceMode==="ai_advokat_guides_fulltext_first"
                    ?"Fingerprint-верификувани целосни водичи · секундарен материјал под Human Gate."
                    :d.sourceMode==="ai_advokat_catalogue_context_first"
                      ?"AI Advokat catalogue first; GPT synthesis. Проверете го конкретниот водич и официјалните правни извори."
                      :(d.webSearchUsed===true?"External legal research · Web извори":"GPT general/proactive assistance")
        });
      }else if(d?.error==="gpt_provider_locked"){
        const fallback=selectedFiles.length?{ok:false,error:"attachments_need_gpt"}:await fallbackSourceAssistant(q);
        updateAssistantPlaceholder(assistantIndex,{
          text:fallback.ok?fallback.text:"GPT-6.1 Sol е подготвен како мотор во позадина, но production provider-от сè уште не е активиран. Во меѓувреме користете ги предложените водичи или напредниот source-backed AI Истражувач подолу.",
          meta:fallback.ok?"Source-backed fallback":"GPT provider · чека активација",
          guides,
          sourceLabel:fallback.ok?fallback.sourceLabel:"Не е направен GPT повик и прилозите не се испратени."
        });
      }else{
        updateAssistantPlaceholder(assistantIndex,{
          text:d?.message||"Оваа функција моментално е заклучена со Human Gate. Предложените водичи остануваат достапни.",
          meta:d?.error||"controlled state",
          guides,
          governance:d?.legalGovernance||null
        });
      }
    }catch(err){
      if(err?.name==="AbortError") updateAssistantPlaceholder(assistantIndex,{text:"Генерирањето е прекинато.",meta:"Stop"});
      else updateAssistantPlaceholder(assistantIndex,{text:"Сервисот моментално не е достапен. Обидете се повторно.",meta:"Unavailable"});
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
  exportBtn.addEventListener("click",()=>{
    const chat=current();
    const text=chat.messages.map(m=>(m.role==="user"?"Вие":"AI Advokat")+":\n"+m.text).join("\n\n");
    const blob=new Blob([text],{type:"text/plain;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="AI-Advokat-razgovor.txt";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
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

  fetch(CHAT_API_BASE+"/api/orchestrator",{headers:{"accept":"application/json"}}).then(r=>r.json()).then(d=>{
    const state=d?.runtime?.providerExecution;
    if(state==="configured_for_api_chat_execution") provider.textContent="GPT-6.1 Sol · LIVE governed";
    else provider.textContent="GPT-6.1 Sol target · provider activation pending";
  }).catch(()=>{});

  load();render();renderAttachments();autoSize();refreshGuideVaultStatus();
})();