/* AI Advokat standalone toolkit parity
 * Direct governed parity for Public Evidence, Professional Ecosystem and Justice Daily.
 * No autonomous legal action. All consequential use remains behind Human Gate.
 */
const qs=(selector,root=document)=>root.querySelector(selector);
const qsa=(selector,root=document)=>Array.from(root.querySelectorAll(selector));
const el=(tag,attrs={})=>{
  const node=document.createElement(tag);
  for(const [key,value] of Object.entries(attrs)){
    if(key==="text") node.textContent=String(value??"");
    else if(key==="class") node.className=String(value||"");
    else if(key==="html") node.innerHTML=String(value||"");
    else if(value!==null&&value!==undefined) node.setAttribute(key,String(value));
  }
  return node;
};

function safeExternalUrl(value){
  try{
    const u=new URL(String(value||""),location.origin);
    if(!["http:","https:"].includes(u.protocol)) return null;
    return u;
  }catch{return null;}
}

function setComposer(text,dialog=null){
  const q=document.getElementById("question");
  if(!q) return;
  q.value=String(text||"").trim();
  q.dispatchEvent(new Event("input",{bubbles:true}));
  dialog?.close?.();
  q.focus();
}

async function apiJson(path,options={}){
  const response=await fetch(path,{
    headers:{accept:"application/json",...(options.headers||{})},
    ...options
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok||data?.ok===false){
    const error=new Error(data?.detail||data?.message||data?.error||("http_"+response.status));
    error.status=response.status;
    error.data=data;
    throw error;
  }
  return data;
}

async function sha256Text(value){
  const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(String(value||"")));
  return [...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("");
}

function baseDialog(id,title,subtitle){
  let d=document.getElementById(id);
  if(d) return d;
  d=document.createElement("dialog");
  d.id=id;
  d.className="aa-toolkit-dialog";
  const head=el("div",{class:"aa-toolkit-head"});
  const copy=el("div");
  copy.append(el("strong",{text:title}),el("small",{text:subtitle}));
  const close=el("button",{type:"button",class:"aa-toolkit-close",text:"×","aria-label":"Затвори"});
  close.onclick=()=>d.close();
  head.append(copy,close);
  const body=el("div",{class:"aa-toolkit-body"});
  d.append(head,body);
  d.addEventListener("click",event=>{if(event.target===d)d.close();});
  document.body.append(d);
  return d;
}

function statusLine(text=""){
  return el("div",{class:"aa-toolkit-status",text});
}

function section(title){
  const s=el("section",{class:"aa-toolkit-section"});
  if(title)s.append(el("h3",{text:title}));
  return s;
}

function card(title,meta=""){
  const c=el("article",{class:"aa-toolkit-card"});
  c.append(el("strong",{text:title}));
  if(meta)c.append(el("small",{text:meta}));
  return c;
}

function actionRow(){
  return el("div",{class:"aa-toolkit-actions"});
}

function openLinkButton(url,label="Отвори официјален извор ↗"){
  const u=safeExternalUrl(url);
  if(!u) return null;
  return el("a",{href:u.href,target:"_blank",rel:"noopener noreferrer",text:label});
}

/* ---------- Public Evidence & Legal OSINT ---------- */

async function loadPublicEvidence(dialog){
  const task=String(qs("[data-aa-public-task]",dialog)?.value||"entity");
  const host=qs("[data-aa-public-sources]",dialog);
  const status=qs("[data-aa-public-status]",dialog);
  host?.replaceChildren();
  if(status) status.textContent="Го вчитувам governed source workflow…";
  try{
    const data=await apiJson("/api/internal-toolkit?task="+encodeURIComponent(task));
    const wf=data?.publicEvidence?.workflow||{};
    const flow=el("div",{class:"aa-toolkit-flow"});
    for(const step of wf.steps||[]) flow.append(el("span",{text:String(step)}));
    host?.append(flow);
    for(const source of wf.sources||[]){
      const c=card(String(source.title||source.id||"Извор"),String(source.claimBoundary||source.sourceRole||""));
      const badges=el("div",{class:"aa-toolkit-badges"});
      badges.append(el("span",{text:String(source.authorityClass||"source")}));
      c.append(badges);
      if(source.sourceRole)c.append(el("p",{text:String(source.sourceRole)}));
      const actions=actionRow();
      const open=openLinkButton(source.url);
      if(open)actions.append(open);
      const use=el("button",{type:"button",text:"Постави задача"});
      use.onclick=()=>setComposer(
        "AI Advokat, направи Public Evidence истражување за следната задача: [ОПИШИ ШТО ПРОВЕРУВАМЕ].\n\n"+
        "Работен тип: "+task+".\nПочетен извор: "+String(source.title||source.id)+" — "+String(source.url||"")+"\n"+
        "Следи: "+(wf.steps||[]).join(" → ")+".\n"+
        "Правило: трага не е заклучок; entity/name match не е идентификација; јавен запис не е доказ за незаконитост. "+
        "За секој материјален наод наведи URL, датум/верзија, source class, што точно потврдува и што НЕ потврдува. HUMAN GATE REQUIRED.",
        dialog
      );
      actions.append(use);
      c.append(actions);
      host?.append(c);
    }
    if(status) status.textContent=String(wf.doctrine||"Трага не е заклучок.")+" · Human Gate";
  }catch(error){
    if(status) status.textContent="Public Evidence registry не е достапен: "+String(error?.message||error);
  }
}

function ensurePublicEvidenceDialog(){
  const d=baseDialog("aaStandalonePublicEvidence","⌕ Public Evidence & Legal OSINT","трага → извор → corroboration → legal relevance → Human Gate");
  const body=qs(".aa-toolkit-body",d);
  if(body.dataset.ready==="1") return d;
  body.dataset.ready="1";

  const sourceSec=section("Governed source workflow");
  const taskLabel=el("label",{class:"aa-toolkit-field"});
  taskLabel.append(el("span",{text:"Истражувачка задача"}));
  const task=el("select",{"data-aa-public-task":""});
  for(const [value,label] of [
    ["entity","Entity Verification"],["procurement","Public Procurement"],["public_money","Public Money"],
    ["regulatory_change","Regulatory Change"],["property","Property / Parcel"],["digital_entity","Domain / Digital Entity"],
    ["open_data","Open Data"],["web_history","Web History"]
  ]){
    const o=el("option",{value,text:label});task.append(o);
  }
  taskLabel.append(task);
  const st=statusLine("Вчитување…");st.dataset.aaPublicStatus="";
  const sources=el("div",{class:"aa-toolkit-grid"});sources.dataset.aaPublicSources="";
  sourceSec.append(taskLabel,st,sources);

  const evidenceSec=section("Evidence Card · локален fingerprint");
  evidenceSec.append(el("p",{text:"SHA-256 се пресметува локално во browser. Evidence Card е доказна трага, не правен заклучок."}));
  const grid=el("div",{class:"aa-toolkit-form-grid"});
  const title=el("input",{maxlength:"240",placeholder:"Наслов на јавниот запис"});
  const url=el("input",{type:"url",placeholder:"https://..."});
  const snapshot=el("textarea",{maxlength:"50000",placeholder:"Јавен snapshot / белешка"});
  const lf=(label,input)=>{const x=el("label",{class:"aa-toolkit-field"});x.append(el("span",{text:label}),input);return x;};
  grid.append(lf("Наслов",title),lf("Јавен URL",url),lf("Snapshot / белешка",snapshot));
  const actions=actionRow();
  const build=el("button",{type:"button",class:"primary",text:"Создај Evidence Card"});
  const toChat=el("button",{type:"button",text:"Испрати во chat",disabled:""});
  const output=el("pre",{class:"aa-toolkit-output",text:"Нема Evidence Card."});
  build.onclick=async()=>{
    if(!String(url.value||"").trim()){output.textContent="Внесете јавен URL.";toChat.disabled=true;return;}
    build.disabled=true;toChat.disabled=true;output.textContent="Градам provenance card…";
    try{
      const hash=String(snapshot.value||"")?await sha256Text(snapshot.value):null;
      const data=await apiJson("/api/public-evidence/card",{
        method:"POST",
        headers:{"content-type":"application/json"},
        body:JSON.stringify({
          title:String(title.value||"").trim()||"Јавна доказна трага",
          url:String(url.value||"").trim(),
          task:String(task.value||"general"),
          observedAt:new Date().toISOString(),
          contentSha256:hash,
          note:String(snapshot.value||"").slice(0,2000),
          status:"SOURCE_BACKED"
        })
      });
      d._lastEvidenceCard=data.card;
      output.textContent=JSON.stringify(data.card,null,2);
      toChat.disabled=false;
    }catch(error){output.textContent="Evidence Card error: "+String(error?.message||error);}
    finally{build.disabled=false;}
  };
  toChat.onclick=()=>{
    if(!d._lastEvidenceCard)return;
    setComposer(
      "AI Advokat, анализирај ја оваа Public Evidence Card само како доказна трага. Не претворај ја во правен заклучок без corroboration и Human Gate.\n\n"+
      JSON.stringify(d._lastEvidenceCard,null,2)+"\n\n"+
      "Формат: FACT / SOURCE-BACKED OBSERVATION / WHAT THIS DOES NOT PROVE / CORROBORATION NEEDED / LEGAL RELEVANCE / HUMAN GATE.",
      d
    );
  };
  actions.append(build,toChat);
  evidenceSec.append(grid,actions,output);
  const boundary=el("p",{class:"aa-toolkit-boundary",text:"Граница: PUBLIC ≠ REUSABLE · LEAD ≠ CONCLUSION. Нема surveillance, пробивање пристап, претпоставување идентитет или автоматска конверзија на јавен запис во доказ за вина."});
  body.append(sourceSec,evidenceSec,boundary);
  task.addEventListener("change",()=>loadPublicEvidence(d));
  loadPublicEvidence(d);
  return d;
}

function openPublicEvidence(){
  const d=ensurePublicEvidenceDialog();d.showModal();
}

/* ---------- Professional Ecosystem ---------- */

function calcCard(kind,title,fields){
  const c=el("article",{class:"aa-toolkit-card aa-toolkit-calc"});
  c.dataset.calc=kind;
  c.append(el("strong",{text:title}));
  for(const f of fields){
    const input=el(f.tag||"input",{type:f.type||"text","data-field":f.key,placeholder:f.placeholder||"",step:f.step||""});
    if(f.type==="checkbox"){
      const lab=el("label",{class:"aa-toolkit-check"});lab.append(input,document.createTextNode(" "+f.label));c.append(lab);
    }else{
      const lab=el("label",{class:"aa-toolkit-field"});lab.append(el("span",{text:f.label}),input);c.append(lab);
    }
  }
  const run=el("button",{type:"button",text:"Пресметај"});
  const out=el("pre",{class:"aa-toolkit-output",text:"—"});
  run.onclick=()=>runCalculator(c,out,run);
  c.append(run,out);
  return c;
}

function readCalcInput(c){
  const input={};
  qsa("[data-field]",c).forEach(x=>{
    if(x.type==="checkbox") input[x.dataset.field]=x.checked;
    else if(x.type==="number") input[x.dataset.field]=x.value===""?null:Number(x.value);
    else input[x.dataset.field]=x.value;
  });
  return input;
}

async function runCalculator(c,out,run){
  run.disabled=true;out.textContent="Пресметувам…";
  try{
    const data=await apiJson("/api/internal-toolkit/calculate",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({calculator:c.dataset.calc,input:readCalcInput(c)})
    });
    out.textContent=JSON.stringify(data.result,null,2);
  }catch(error){out.textContent="Calculator error: "+String(error?.message||error);}
  finally{run.disabled=false;}
}

async function populateProfessionalEcosystem(d){
  const status=qs("[data-aa-pro-status]",d);
  const living=qs("[data-aa-pro-living]",d);
  const registry=qs("[data-aa-pro-registry]",d);
  const docs=qs("[data-aa-pro-documents]",d);
  const watch=qs("[data-aa-pro-watch]",d);
  for(const host of [living,registry,docs,watch])host?.replaceChildren();
  if(status)status.textContent="Вчитување governed toolkit…";
  try{
    const data=await apiJson("/api/internal-toolkit");
    const eco=data.ecosystem||{};
    for(const item of eco.livingLaw||[]){
      const b=el("button",{type:"button",class:"aa-toolkit-action"});
      b.append(el("strong",{text:item.title}),el("span",{text:item.prompt}));
      b.onclick=()=>setComposer(String(item.prompt||"")+"\n\nКонкретен пропис/член/датум: [ВНЕСИ].",d);
      living?.append(b);
    }
    for(const item of eco.operationsRegistry||[]){
      const c=card(item.title,item.sourceRule);
      c.append(el("span",{class:"aa-toolkit-value-state",text:item.valueState}));
      registry?.append(c);
    }
    for(const item of eco.smartDocuments||[]){
      const b=el("button",{type:"button",class:"aa-toolkit-action"});
      b.append(el("strong",{text:item.title}),el("span",{text:"Полиња: "+(item.fields||[]).join(" · ")}));
      b.onclick=()=>setComposer(String(item.prompt||"")+"\n\nДостапни факти:\n[ВНЕСИ ФАКТИ]\n\nПровери ги полињата: "+(item.fields||[]).join(", ")+".",d);
      docs?.append(b);
    }
    for(const item of eco.legalWatch||[]){
      const c=card(item.title,item.watchRole||"Legal Watch");
      const actions=actionRow();
      const open=openLinkButton(item.url);
      if(open)actions.append(open);
      const ask=el("button",{type:"button",text:"Провери во chat"});
      ask.onclick=()=>setComposer(item.prompt||("Провери го официјалниот извор: "+item.url),d);
      actions.append(ask);c.append(actions);watch?.append(c);
    }
    if(status)status.textContent="Living Law · Registry · Calculators · Smart Documents · Legal Watch · Human Gate";
  }catch(error){if(status)status.textContent="Professional Ecosystem не е достапен: "+String(error?.message||error);}
}

function ensureProfessionalEcosystemDialog(){
  const d=baseDialog("aaStandaloneProfessionalEcosystem","◆ AI Advokat Professional Ecosystem","Living Law · Legal Operations · Smart Documents · Legal Watch");
  const body=qs(".aa-toolkit-body",d);
  if(body.dataset.ready==="1") return d;
  body.dataset.ready="1";
  const st=statusLine("Вчитување…");st.dataset.aaProStatus="";
  const living=section("Living Law");const livingHost=el("div",{class:"aa-toolkit-action-grid"});livingHost.dataset.aaProLiving="";living.append(livingHost);
  const registry=section("Legal Operations Registry");const regHost=el("div",{class:"aa-toolkit-grid"});regHost.dataset.aaProRegistry="";registry.append(regHost);
  const calcs=section("Deterministic Calculators");
  calcs.append(el("p",{text:"Калкулаторите пресметуваат аритметика; не избираат правна стапка, такса или процесно правило."}));
  const cg=el("div",{class:"aa-toolkit-grid"});
  cg.append(
    calcCard("simple_interest","Информативна проста камата",[
      {key:"principal",label:"Главнина",type:"number",step:"0.01"},
      {key:"annualRatePct",label:"Годишна стапка %",type:"number",step:"0.0001"},
      {key:"fromDate",label:"Од",type:"date"},
      {key:"toDate",label:"До",type:"date"},
      {key:"rateSource",label:"Извор на стапката",placeholder:"официјален извор / акт / период"},
      {key:"rateVerified",label:"Ја проверив стапката и периодот",type:"checkbox"}
    ]),
    calcCard("calendar_deadline","Календарски датум + N дена",[
      {key:"baseDate",label:"Почетен датум",type:"date"},
      {key:"days",label:"Дена",type:"number",step:"1"}
    ]),
    calcCard("percentage","Процент од износ",[
      {key:"amount",label:"Износ",type:"number",step:"0.01"},
      {key:"percent",label:"Процент %",type:"number",step:"0.0001"},
      {key:"source",label:"Извор / основа"}
    ])
  );
  calcs.append(cg);
  const docs=section("Smart Legal Document Factory");const docHost=el("div",{class:"aa-toolkit-action-grid"});docHost.dataset.aaProDocuments="";docs.append(docHost);
  const watch=section("Legal Watch");const watchHost=el("div",{class:"aa-toolkit-grid"});watchHost.dataset.aaProWatch="";watch.append(watchHost);
  body.append(st,living,registry,calcs,docs,watch,el("p",{class:"aa-toolkit-boundary",text:"Human Gate: системот не поднесува, не потпишува, не плаќа и не презема последична правна акција. Living Law и Legal Watch мора да ја докажат верзијата/датумот пред current-law тврдење."}));
  populateProfessionalEcosystem(d);
  return d;
}

function openProfessionalEcosystem(){
  const d=ensureProfessionalEcosystemDialog();d.showModal();
}

/* ---------- Justice Daily ---------- */

const INSTITUTIONS={
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
  anti_corruption:"ДКСК",
  ldbis:"ЛДБИС",
  echr_hudoc:"HUDOC · ЕСЧП",
  eurlex_oj:"EUR-Lex · OJ",
  curia_cjeu:"CURIA · Суд на ЕУ",
  serbia_pis:"Правно-информациони систем · Србија",
  slovenia_justice:"Министерство за правда · Словенија"
};
const TYPES={decision:"Одлука / предмет",session:"Седница",legislation:"Законодавство",prosecution:"Обвинителство",appointments:"Избор / именување",reform:"Реформа / извештај",training:"Обука",institutional_update:"Институционална вест"};
const institutionLabel=value=>INSTITUTIONS[String(value||"")]||String(value||"Институција");
const typeLabel=value=>TYPES[String(value||"")]||String(value||"Вест");

function briefText(data,items){
  const lines=["JUSTICE DAILY · Правосуден брифинг","Генерирано: "+String(data?.generatedAt||new Date().toISOString()),""];
  items.forEach((item,i)=>lines.push(
    (i+1)+". "+String(item.title||"Официјална објава"),
    "   Институција: "+institutionLabel(item.institution),
    "   Тип: "+typeLabel(item.type),
    "   Датум: "+String(item.publishedDate||"непотврден"),
    "   Приоритет: "+String(item.priority?.level||"normal"),
    "   URL: "+String(item.url||""),
    "   Граница: "+String(item.claimBoundary||"Вест ≠ правен заклучок."),
    ""
  ));
  lines.push("Human Gate: item-level verification е задолжителен пред правно потпирање.");
  return lines.join("\n");
}

function filteredJusticeItems(d,data){
  let items=Array.isArray(data?.items)?[...data.items]:[];
  const query=String(qs("[data-aa-justice-search]",d)?.value||"").trim().toLocaleLowerCase("mk");
  const priority=String(qs("[data-aa-justice-priority]",d)?.value||"");
  if(query)items=items.filter(item=>
    String(item.title||"").toLocaleLowerCase("mk").includes(query)||
    institutionLabel(item.institution).toLocaleLowerCase("mk").includes(query)||
    typeLabel(item.type).toLocaleLowerCase("mk").includes(query)
  );
  if(priority)items=items.filter(item=>String(item.priority?.level||"normal")===priority);
  return items;
}

function renderJusticeDaily(d,data){
  const itemsHost=qs("[data-aa-justice-items]",d);
  const healthHost=qs("[data-aa-justice-health]",d);
  const metrics=qs("[data-aa-justice-metrics]",d);
  const status=qs("[data-aa-justice-status]",d);
  itemsHost?.replaceChildren();healthHost?.replaceChildren();metrics?.replaceChildren();
  const items=filteredJusticeItems(d,data);
  const sourceHealth=Array.isArray(data?.sourceHealth)?data.sourceHealth:[];
  const okCount=sourceHealth.filter(x=>x.status==="ok").length;
  const referenceCount=sourceHealth.filter(x=>x.status==="reference_only").length;
  const failed=sourceHealth.filter(x=>x.status==="unavailable").length;
  if(status)status.textContent="Justice Daily · "+items.length+" записи · "+okCount+" извори OK"+(referenceCount?" · "+referenceCount+" reference-only":"")+(failed?" · "+failed+" недостапни":"");

  for(const [label,value] of [
    ["Висок приоритет",String(data?.stats?.highPriority??items.filter(x=>x.priority?.level==="high").length)],
    ["Потврдени 2+ извори",String(data?.stats?.corroborated??items.filter(x=>Array.isArray(x.corroboratingSources)&&x.corroboratingSources.length).length)],
    ["Извори OK",String(okCount)],["Недостапни",String(failed)]
  ]){
    const c=card(value,label);metrics?.append(c);
  }

  const h=el("details",{class:"aa-toolkit-card"});
  const hs=el("summary",{text:"Source health · "+okCount+" OK"+(referenceCount?" · "+referenceCount+" reference-only":"")+(failed?" · "+failed+" недостапни":"")});
  h.append(hs);
  const chips=el("div",{class:"aa-toolkit-flow"});
  for(const src of sourceHealth){
    const label=(src.status==="ok"?"✓ ":src.status==="reference_only"?"↗ ":"⚠ ")+String(src.title||src.sourceId)+" · "+String(src.itemCount||0);
    const u=safeExternalUrl(src.fetchedUrl||src.primaryUrl);
    const chip=u?el("a",{href:u.href,target:"_blank",rel:"noopener noreferrer",text:label}):el("span",{text:label});
    chips.append(chip);
  }
  h.append(chips);healthHost?.append(h);

  if(!items.length)itemsHost?.append(card("Нема dated записи во избраниот прозорец.","Изворните празнини не се пополнуваат со медиумски претпоставки."));
  for(const item of items){
    const c=card(String(item.title||"Официјална објава"),[institutionLabel(item.institution),item.publishedDate||"датум непотврден",typeLabel(item.type)].join(" · "));
    c.append(el("p",{text:String(item.claimBoundary||"Вест ≠ правен заклучок.")}));
    const actions=actionRow();
    const open=openLinkButton(item.url);
    if(open)actions.append(open);
    const ask=el("button",{type:"button",text:"Во chat"});
    ask.onclick=()=>setComposer(
      "AI Advokat, подготви краток правосуден briefing за оваа официјална објава. Прво провери го оригиналниот URL и точниот датум/статус. Не претворај најава, седница, сомнение, предлог или соопштение во конечен правен заклучок.\n\n"+
      "Институција: "+institutionLabel(item.institution)+"\nТип: "+typeLabel(item.type)+"\nДатум: "+String(item.publishedDate||"непотврден")+"\nНаслов: "+String(item.title||"")+"\nURL: "+String(item.url||"")+"\n\n"+
      "Формат: FACT / INSTITUTIONAL STATUS / WHAT IT DOES NOT PROVE / LEGAL RELEVANCE / NEXT SOURCE TO VERIFY / HUMAN GATE.",
      d
    );
    actions.append(ask);c.append(actions);itemsHost?.append(c);
  }

  const brief=qs("[data-aa-justice-brief]",d);
  const copy=qs("[data-aa-justice-copy]",d);
  const download=qs("[data-aa-justice-download]",d);
  for(const b of [brief,copy,download])if(b)b.disabled=!items.length;
  if(brief)brief.onclick=()=>setComposer(
    "AI Advokat, изработи ДНЕВЕН ПРАВОСУДЕН БРИФИНГ само од следните официјално агрегирани записи. Задржи институционален статус и Human Gate.\n\n"+
    items.slice(0,12).map((item,i)=>(i+1)+". ["+institutionLabel(item.institution)+"] "+String(item.publishedDate||"датум?")+" — "+String(item.title||"")+" — "+String(item.url||"")).join("\n"),
    d
  );
  if(copy)copy.onclick=async()=>{try{await navigator.clipboard.writeText(briefText(data,items));copy.textContent="Копирано ✓";setTimeout(()=>copy.textContent="Копирај briefing",1200);}catch{copy.textContent="Неуспешно копирање";}};
  if(download)download.onclick=()=>{
    const url=URL.createObjectURL(new Blob([briefText(data,items)],{type:"text/plain;charset=utf-8"}));
    const a=el("a",{href:url,download:"justice-daily-"+new Date().toISOString().slice(0,10)+".txt"});
    document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500);
  };
}

async function loadJusticeDaily(d){
  const status=qs("[data-aa-justice-status]",d);
  if(status)status.textContent="Justice Daily ги проверува официјалните извори…";
  const params=new URLSearchParams({days:String(qs("[data-aa-justice-days]",d)?.value||"1"),limit:"60"});
  const institution=String(qs("[data-aa-justice-institution]",d)?.value||"");
  const type=String(qs("[data-aa-justice-type]",d)?.value||"");
  if(institution)params.set("institution",institution);
  if(type)params.set("type",type);
  try{
    const data=await apiJson("/api/legal-news?"+params.toString());
    d._justice=data;renderJusticeDaily(d,data);
  }catch(error){
    if(status)status.textContent="Justice Daily не е достапен: "+String(error?.message||error);
    qs("[data-aa-justice-items]",d)?.replaceChildren(card("Не е објавен правосуден брифинг.","Изворните празнини не се пополнуваат автоматски."));
  }
}

function selectField(label,attr,options){
  const lab=el("label",{class:"aa-toolkit-field"});lab.append(el("span",{text:label}));
  const s=el("select",{[attr]:""});
  for(const [value,text] of options)s.append(el("option",{value,text}));
  lab.append(s);return lab;
}

function ensureJusticeDailyDialog(){
  const d=baseDialog("aaStandaloneJusticeDaily","◉ Justice Daily · Правосуден агрегатор","официјални извори · source health · Human Gate");
  const body=qs(".aa-toolkit-body",d);
  if(body.dataset.ready==="1") return d;
  body.dataset.ready="1";
  const controls=el("div",{class:"aa-toolkit-form-grid"});
  controls.append(
    selectField("Период","data-aa-justice-days",[["1","Последни 24 часа"],["3","Последни 3 дена"],["7","Последни 7 дена"]]),
    selectField("Институција","data-aa-justice-institution",[["","Сите официјални извори"],...Object.entries(INSTITUTIONS).map(([v,l])=>[v,l])]),
    selectField("Тип","data-aa-justice-type",[["","Сите типови"],...Object.entries(TYPES).map(([v,l])=>[v,l])])
  );
  const filters=el("div",{class:"aa-toolkit-form-grid"});
  const search=el("input",{type:"search","data-aa-justice-search":"",placeholder:"Наслов, институција, тип…"});
  const searchLab=el("label",{class:"aa-toolkit-field"});searchLab.append(el("span",{text:"Пребарај"}),search);
  filters.append(searchLab,selectField("Приоритет","data-aa-justice-priority",[["","Сите"],["high","Висок"],["medium","Среден"],["normal","Нормален"]]));
  const actions=actionRow();
  const refresh=el("button",{type:"button",text:"Освежи"});
  const brief=el("button",{type:"button","data-aa-justice-brief":"",text:"Подготви дневен брифинг во chat",disabled:""});
  const copy=el("button",{type:"button","data-aa-justice-copy":"",text:"Копирај briefing",disabled:""});
  const download=el("button",{type:"button","data-aa-justice-download":"",text:"Преземи TXT",disabled:""});
  actions.append(refresh,brief,copy,download);
  const st=statusLine("Вчитување…");st.dataset.aaJusticeStatus="";
  const metrics=el("div",{class:"aa-toolkit-grid"});metrics.dataset.aaJusticeMetrics="";
  const health=el("div");health.dataset.aaJusticeHealth="";
  const items=section("Официјални правосудни новости");const itemsHost=el("div",{class:"aa-toolkit-grid"});itemsHost.dataset.aaJusticeItems="";items.append(itemsHost);
  body.append(controls,filters,actions,st,metrics,health,items,el("p",{class:"aa-toolkit-boundary",text:"Граница: вест, најава, дневен ред, сомнение, ревизорски наод или предлог-закон не се автоматски конечен акт, вина или важечко право. За правно потпирање се бара item-level verification и Human Gate."}));
  refresh.onclick=()=>loadJusticeDaily(d);
  qsa("[data-aa-justice-days],[data-aa-justice-institution],[data-aa-justice-type]",d).forEach(x=>x.addEventListener("change",()=>loadJusticeDaily(d)));
  search.addEventListener("input",()=>renderJusticeDaily(d,d._justice||{}));
  qs("[data-aa-justice-priority]",d)?.addEventListener("change",()=>renderJusticeDaily(d,d._justice||{}));
  loadJusticeDaily(d);
  return d;
}

function openJusticeDaily(){
  const d=ensureJusticeDailyDialog();d.showModal();
}

window.AIAdvokatStandaloneToolkits=Object.freeze({
  version:"AI_ADVOCAT_STANDALONE_TOOLKIT_PARITY_R14",
  openPublicEvidence,
  openProfessionalEcosystem,
  openJusticeDaily,
  ensurePublicEvidenceDialog,
  ensureProfessionalEcosystemDialog,
  ensureJusticeDailyDialog
});
