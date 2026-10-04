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

  let abortController=null;
  let mode="auto";
  let attachments=[];
  let guideRecordsPromise=null;
  let currentId=null;
  const chats=new Map();

  const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
  const now=()=>new Date().toISOString();
  const uid=()=>crypto.randomUUID ? crypto.randomUUID() : "chat-"+Date.now()+"-"+Math.random().toString(16).slice(2);

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
    if(m.sourceLabel){
      const source=document.createElement("div");source.className="ai-msg-source";source.textContent=m.sourceLabel;body.append(source);
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

  async function fetchGuides(){
    if(!guideRecordsPromise){
      guideRecordsPromise=fetch("/data/guides.json?v=20261004-v2-final-master",{cache:"no-store"})
        .then(r=>r.ok?r.json():Promise.reject(new Error("guides")))
        .then(d=>Array.isArray(d.records)?d.records:[]);
    }
    return guideRecordsPromise;
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

  async function encodeFile(file){
    const mime=file.type||"application/octet-stream";
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
      .slice(-12)
      .map(m=>({role:m.role,text:String(m.text).slice(0,6000)}));
    const selectedFiles=[...attachments];
    addMessage({role:"user",text:q,meta:selectedFiles.length?selectedFiles.length+" прилог(а)":""});
    input.value="";attachments=[];renderAttachments();autoSize();

    const guides=await guideMatches(q);
    const assistantIndex=current().messages.length;
    addMessage({role:"assistant",text:"Обработувам…",meta:"AI Advokat",guides});
    root.classList.add("ai-chat-running");
    abortController=new AbortController();

    try{
      const encoded=[];
      for(const f of selectedFiles) encoded.push(await encodeFile(f));
      const r=await fetch(CHAT_API_BASE+"/api/chat",{
        method:"POST",
        headers:{"content-type":"application/json","accept":"application/json",...membershipHeaders()},
        signal:abortController.signal,
        body:JSON.stringify({
          q,
          mode:activeMode(),
          webSearch:activeMode()==="web",
          guideIds:guides.map(g=>g.id),
          history:historyForApi,
          attachments:encoded
        })
      });
      const d=await r.json().catch(()=>null);
      if(r.ok&&d?.ok){
        updateAssistantPlaceholder(assistantIndex,{
          text:d.answer,
          meta:(d.model||"GPT")+" · "+(d.mode||"auto")+" · session-private",
          guides,
          sourceLabel:d.sourceMode==="ai_advokat_catalogue_context_first"
            ?"AI Advokat corpus/catalogue first; GPT synthesis. Проверете го конкретниот водич и официјалните правни извори."
            :(d.webSearch==="enabled"?"GPT + Web research":"GPT general/proactive assistance")
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
          guides
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
    if(state==="configured_but_not_publicly_auto_executed") provider.textContent="GPT provider конфигуриран · production auto-execution сè уште gated";
    else provider.textContent="GPT-6.1 Sol target · provider activation pending";
  }).catch(()=>{});

  load();render();renderAttachments();autoSize();
})();