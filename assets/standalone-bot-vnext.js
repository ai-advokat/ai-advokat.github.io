/* AI Advokat Bot vNext
 * LexNova UX + AI Advokat governed backend.
 * Professional-workspace patterns inspired by modern legal AI products:
 * unified threads, search, evidence/context, workflows, documents and Human Gate.
 */

const nativeFetch = window.fetch.bind(window);
const SOURCE_KEYS = ['sources','legalSources','caseLawSources','guideSources','publicationSources'];
const workspace = {
  threads: [],
  activeId: null,
  panelTab: 'sources',
  panelOpen: true,
  sidebarOpen: false,
  lastArtifact: null,
};

function uid(){ return crypto.randomUUID ? crypto.randomUUID() : 't'+Math.random().toString(36).slice(2); }
function now(){ return Date.now(); }
function titleFrom(text){
  const clean=String(text||'').replace(/\s+/g,' ').trim();
  if(!clean) return 'Нов разговор';
  const words=clean.split(' ');
  return words.slice(0,8).join(' ')+(words.length>8?'…':'');
}
function makeThread(){
  const thread={id:uid(),sessionId:uid(),title:'Нов разговор',history:[],latestSources:[],model:'',createdAt:now(),updatedAt:now()};
  workspace.threads.unshift(thread); workspace.activeId=thread.id; return thread;
}
function activeThread(){ return workspace.threads.find(t=>t.id===workspace.activeId) || workspace.threads[0] || makeThread(); }
function flattenSources(data){
  const rows=[]; const seen=new Set();
  for(const key of SOURCE_KEYS){
    for(const row of Array.isArray(data?.[key])?data[key]:[]){
      const label=String(row?.title||row?.label||row?.name||row?.citation||'Извор').trim();
      const raw=String(row?.url||row?.sourceUrl||row?.source_url||'').trim();
      const sig=(raw||label).toLowerCase(); if(!sig||seen.has(sig)) continue; seen.add(sig);
      rows.push({label,url:raw,kind:key});
    }
  }
  return rows.slice(0,40);
}
makeThread();
window.AIAdvokatVNext = workspace;

/* Interpose only on the governed /api/bot call so each visible vNext thread gets
 * its own bounded history while the existing privacy/access/runtime controls stay intact. */
window.fetch = async function(input, init={}){
  const rawUrl=typeof input==='string' ? input : String(input?.url||'');
  if(!/\/api\/bot(?:\?|$)/.test(rawUrl) || !init?.body) return nativeFetch(input,init);
  let body;
  try{ body=JSON.parse(init.body); }catch{ return nativeFetch(input,init); }
  const thread=activeThread();
  const q=String(body.q||'').trim();
  body.history=thread.history.slice(-12).map(({role,text})=>({role,text}));
  body.sessionId=thread.sessionId;
  if(q){
    thread.history.push({role:'user',text:q,time:now()});
    if(thread.title==='Нов разговор') thread.title=titleFrom(q);
    thread.updatedAt=now();
    window.dispatchEvent(new CustomEvent('aiadvokat:vnext-thread-change'));
  }
  const response=await nativeFetch(input,{...init,body:JSON.stringify(body)});
  if(response.ok){
    response.clone().json().then(data=>{
      if(!data || data.ok===false) return;
      const answer=String(data.answer||'').trim();
      if(answer) thread.history.push({role:'assistant',text:answer,model:String(data.model||''),time:now()});
      thread.latestSources=flattenSources(data);
      thread.model=String(data.model||''); thread.updatedAt=now();
      window.dispatchEvent(new CustomEvent('aiadvokat:vnext-response',{detail:{threadId:thread.id,data}}));
    }).catch(()=>{});
  }
  return response;
};

await import('./standalone-bot.js');

const $=id=>document.getElementById(id);
const qs=(s,r=document)=>r.querySelector(s);
const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
const coreNewChat=$('newChat')?.onclick;
const coreLogout=$('logout')?.onclick;

function safeUrl(raw){
  try{ const u=new URL(raw,location.origin); return ['https:','http:'].includes(u.protocol)?u:null; }catch{return null;}
}
function mk(tag,attrs={},...kids){
  const n=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{})){
    if(k==='class') n.className=v;
    else if(k==='text') n.textContent=v;
    else if(k==='html') n.innerHTML=v;
    else if(k.startsWith('on')&&typeof v==='function') n.addEventListener(k.slice(2),v);
    else if(v!==null&&v!==undefined) n.setAttribute(k,String(v));
  }
  for(const child of kids.flat()) if(child!==null&&child!==undefined) n.append(child.nodeType?child:document.createTextNode(String(child)));
  return n;
}

function buildShell(){
  const header=qs('body>header'); const main=qs('body>main'); if(!header||!main) return;
  const shell=mk('div',{class:'vnext-shell'});
  const side=mk('aside',{class:'vnext-sidebar',id:'vnextSidebar','aria-label':'AI Advokat workspace'});
  const center=mk('div',{class:'vnext-center'});
  const evidence=mk('aside',{class:'vnext-evidence',id:'vnextEvidence','aria-label':'Извори, контекст и Human Gate'});
  document.body.insertBefore(shell,header); center.append(header,main); shell.append(side,center,evidence);
  side.innerHTML=`
    <div class="vnext-side-head">
      <div class="vnext-product"><span class="vnext-product-mark">§</span><div><strong>AI Advokat</strong><small>Professional Workspace · vNext</small></div></div>
      <button class="vnext-icon" id="vnextSidebarClose" type="button" aria-label="Затвори мени">×</button>
    </div>
    <button class="vnext-new" id="vnextNewThread" type="button">＋ Нов разговор</button>
    <button class="vnext-search-launch" id="vnextSearchLaunch" type="button"><span>⌕</span><span>Пребарај</span><kbd>Ctrl K</kbd></button>
    <nav class="vnext-nav" aria-label="Работни модули">
      <button data-vnext-action="assistant" class="active">◈ <span>Правен асистент</span></button>
      <button data-vnext-action="analyzer">⌁ <span>Анализатор</span></button>
      <button data-vnext-action="consolidator">≋ <span>Консолидатор</span></button>
      <button data-vnext-action="predictor">◎ <span>Предиктор</span></button>
      <button data-vnext-action="sources">▤ <span>Правни извори</span></button>
      <button data-vnext-action="cases">⚖ <span>Судска практика</span></button>
      <button data-vnext-action="casepilot">▣ <span>CasePilot</span></button>
      <button data-vnext-action="documents">▧ <span>Документи</span></button>
      <button data-vnext-action="workflows">◇ <span>Workflows</span></button>
      <button data-vnext-action="review">✓ <span>Human Gate</span></button>
      <button data-vnext-action="library">◫ <span>Library</span></button>
    </nav>
    <div class="vnext-history-head"><span>Историја · оваа сесија</span><button id="vnextTheme" type="button" class="vnext-icon" aria-label="Промени тема">◐</button></div>
    <input id="vnextThreadSearch" class="vnext-thread-search" type="search" placeholder="Пребарај разговори…" aria-label="Пребарај разговори">
    <div id="vnextThreadList" class="vnext-thread-list"></div>
    <div class="vnext-side-foot"><strong>Source-first · Human Gate</strong><span>Разговорите од vNext history не се чуваат трајно. Доверливи предмети → Secure Case Workspace.</span></div>`;
  evidence.innerHTML=`
    <div class="vnext-evidence-head"><div><strong id="vnextPanelTitle">Извори</strong><small id="vnextPanelSub">Проверлив контекст за активниот разговор</small></div><button id="vnextEvidenceClose" class="vnext-icon" type="button" aria-label="Затвори панел">×</button></div>
    <div class="vnext-evidence-tabs" role="tablist">
      <button class="active" data-panel="sources" type="button">Извори</button>
      <button data-panel="context" type="button">Контекст</button>
      <button data-panel="human" type="button">Human Gate</button>
      <button data-panel="artifact" type="button">Артефакт</button>
    </div>
    <div id="vnextPanelBody" class="vnext-panel-body"></div>`;

  const tools=mk('div',{class:'vnext-header-tools'});
  tools.innerHTML='<button id="vnextMobileMenu" type="button" aria-label="Отвори workspace мени">☰</button><button id="vnextHeaderSearch" type="button" aria-label="Пребарај">⌕</button><button id="vnextHeaderEvidence" type="button">Извори</button>';
  header.insertBefore(tools,header.lastElementChild);
  buildWorkflowDialog(); buildSearchDialog();
}

function buildWorkflowDialog(){
  const d=mk('dialog',{id:'vnextWorkflowDialog',class:'vnext-dialog'});
  d.innerHTML=`<div class="vnext-dialog-head"><div><strong>AI Advokat Workflows</strong><small>Структурирани почетоци врз governed backend</small></div><button type="button" data-close>×</button></div>
  <div class="vnext-workflow-grid">
    <button data-prompt="Истражи го правното прашање source-first. Прво утврди применливи официјални извори и важечка верзија, потоа дај анализа, ризици и отворени прашања."><strong>Правно истражување</strong><span>Извори → правило → анализа → ризици</span></button>
    <button data-prompt="Подготви професионален правен меморандум со: прашање, релевантни факти, правна рамка, анализа, спротивни аргументи, заклучок и Human Gate точки за проверка."><strong>Правен меморандум</strong><span>Issue · Facts · Law · Analysis · Conclusion</span></button>
    <button data-prompt="Прегледај го договорниот проблем. Издвои обврски, рокови, ризични клаузули, можни повреди, докази што недостигаат и точки за човечка проверка."><strong>Contract Review</strong><span>Клаузули · ризици · недостиг на докази</span></button>
    <button data-prompt="Изгради хронологија на предметот од дадените факти. Оддели потврдени факти, спорни факти, докази, правни прашања и следни чекори."><strong>Case Chronology</strong><span>Факти · докази · спорни точки · задачи</span></button>
    <button data-prompt="Направи source verification audit на претходниот одговор. За секое материјално правно тврдење наведи дали има примарен извор, важечка верзија и што останува непотврдено."><strong>Source Check</strong><span>Authority · version · provenance</span></button>
    <button data-prompt="Спореди ги двете верзии на документот. Издвои суштински промени, правен ефект, ризици и прашања за Human Gate. Не измислувај разлики што не се во документите."><strong>Redline / Compare</strong><span>Промени · ефект · ризик · review</span></button>
    <button data-prompt="CONSOLIDATOR MODE. Консолидирај ги доставените правни текстови, измени и извори во проверлива верзиска мапа. Оддели: основен текст, секоја измена, effective date, application date, преодни одредби, уставносудски ефекти и финална работна редакција. Класифицирај ја како official consolidated, editorial consolidated или working consolidation. Никогаш не прогласувај current law без governed official-source verification и Human Gate."><strong>Консолидатор</strong><span>Верзии · amendment chain · provenance · Human Gate</span></button>
    <button data-prompt="PREDICTOR MODE — GOVERNED SCENARIO ANALYSIS. Не давај процент на успех и не гарантирај исход. Изгради најмалку три сценарија: поволно, мешано и неповолно. За секое наведи: одлучувачки факти, докази, применлива правна основа и source status, спротивни аргументи/authority, процесни ризици, што недостига и кои факти би го смениле сценариото. Ако задачата содржи доверлив предмет или клиентски податоци, насочи ја анализата во Secure Case Workspace / CasePilot. Заврши со HUMAN GATE REQUIRED."><strong>Предиктор</strong><span>Сценарија · фактори · ризици · без лажни проценти</span></button>
  </div><p class="vnext-dialog-note">Овие Workflows не се автономно поднесување или потпишување. Тие подготвуваат работна задача за постојниот AI Advokat backend.</p>`;
  document.body.append(d);
  qs('[data-close]',d).onclick=()=>d.close();
  qsa('[data-prompt]',d).forEach(b=>b.onclick=()=>{ $('question').value=b.dataset.prompt; $('question').dispatchEvent(new Event('input')); d.close(); $('question').focus(); });
}

function buildSearchDialog(){
  const d=mk('dialog',{id:'vnextSearchDialog',class:'vnext-dialog vnext-search-dialog'});
  d.innerHTML=`<div class="vnext-dialog-head"><div><strong>Global Search</strong><small>Разговори, workspaces и алатки</small></div><button type="button" data-close>×</button></div><input id="vnextGlobalSearch" type="search" placeholder="Пребарај разговор, CasePilot, извор…" autocomplete="off"><div id="vnextSearchResults" class="vnext-search-results"></div>`;
  document.body.append(d); qs('[data-close]',d).onclick=()=>d.close();
  $('vnextGlobalSearch').addEventListener('input',renderGlobalSearch);
}

function renderThreadList(){
  const list=$('vnextThreadList'); if(!list) return;
  const q=String($('vnextThreadSearch')?.value||'').trim().toLowerCase(); list.replaceChildren();
  const threads=workspace.threads.filter(t=>!q || t.title.toLowerCase().includes(q) || t.history.some(m=>String(m.text||'').toLowerCase().includes(q)));
  for(const t of threads){
    const row=mk('div',{class:'vnext-thread'+(t.id===workspace.activeId?' active':'')});
    const open=mk('button',{class:'vnext-thread-open',type:'button',text:t.title});
    const rename=mk('button',{class:'vnext-thread-rename',type:'button','aria-label':'Преименувај',text:'⋯'});
    open.onclick=()=>switchThread(t.id); rename.onclick=()=>renameThread(t.id); row.append(open,rename); list.append(row);
  }
}
function renameThread(id){
  const t=workspace.threads.find(x=>x.id===id); if(!t) return;
  const next=prompt('Име на разговорот:',t.title); if(next?.trim()){t.title=next.trim().slice(0,90);renderThreadList();}
}
function createNewThread(){
  coreNewChat?.call($('newChat')); makeThread(); renderThreadList(); renderEvidence(); closeMobileSidebar(); $('question')?.focus();
}
function switchThread(id){
  const t=workspace.threads.find(x=>x.id===id); if(!t||id===workspace.activeId) return;
  coreNewChat?.call($('newChat')); workspace.activeId=id; renderTranscript(t); renderThreadList(); renderEvidence(); closeMobileSidebar();
}
function renderTranscript(t){
  const host=$('messages'); if(!host) return; host.replaceChildren();
  if(!t.history.length){
    const w=mk('div',{id:'welcome'}); w.innerHTML='<div class="mark mark-logo" aria-hidden="true"><img src="/assets/ai-advokat-hero-brand.webp" width="400" height="225" alt=""></div><h1>На што работиме денес?</h1><p>Прашајте слободно. Правните извори ги проверуваме во позадина.</p>'; host.append(w); return;
  }
  for(const item of t.history){
    const a=mk('article',{class:'message '+item.role}); const body=mk('div',{class:'text',text:item.text}); a.append(body);
    if(item.role==='assistant'&&item.model) a.append(mk('small',{text:item.model})); host.append(a); enhanceLegalMarkers(body);
  }
  if(t.latestSources.length) addSourceTray(qs('.message.assistant:last-of-type',host),t.latestSources);
  host.scrollTop=host.scrollHeight;
}

function addSourceTray(article,rows){
  if(!article||article.querySelector('.vnext-source-tray')||!rows.length) return;
  const tray=mk('div',{class:'vnext-source-tray'}); tray.append(mk('span',{text:'Извори'}));
  rows.slice(0,5).forEach((row,i)=>{
    const b=mk('button',{type:'button',text:String(i+1),'aria-label':'Отвори извор '+(i+1)}); b.title=row.label; b.onclick=()=>openArtifact(row); tray.append(b);
  }); article.append(tray);
}
function enhanceLegalMarkers(node){
  if(!node||node.dataset.vnextMarkers==='1') return; const text=node.textContent||'';
  const rx=/\{\{(LAW|CASE):([^:|}]+):([^|}]+)\|([^}]+)\}\}/g; if(!rx.test(text)) return; rx.lastIndex=0;
  const frag=document.createDocumentFragment(); let last=0,m;
  while((m=rx.exec(text))){
    frag.append(document.createTextNode(text.slice(last,m.index)));
    const kind=m[1],code=m[2].trim(),id=m[3].trim(),label=m[4].trim();
    const path=kind==='LAW'?'/zakoni/'+code.toLowerCase()+'.html#clen-'+id.replace(/\D+/g,''):'/odluki/'+code.toLowerCase()+'/'+id.trim().replace(/\s+/g,'-').replace(/\//g,'-').toLowerCase()+'.html';
    const b=mk('button',{class:'vnext-legal-ref',type:'button',text:(kind==='LAW'?'⚖ ':'📄 ')+label}); b.onclick=()=>openArtifact({label,url:path,kind}); frag.append(b); last=rx.lastIndex;
  }
  frag.append(document.createTextNode(text.slice(last))); node.replaceChildren(frag); node.dataset.vnextMarkers='1';
}
function scanMessages(){
  qsa('.message.assistant .text').forEach(enhanceLegalMarkers);
  const last=qs('.message.assistant:last-of-type'); if(last) addSourceTray(last,activeThread().latestSources);
}

function renderEvidence(){
  const body=$('vnextPanelBody'); if(!body) return; const t=activeThread(); body.replaceChildren();
  qsa('.vnext-evidence-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.panel===workspace.panelTab));
  const titles={sources:['Извори','Проверлив контекст за активниот разговор'],context:['Контекст','Избран режим, библиотека и thread'],human:['Human Gate','Човечка проверка пред последична употреба'],artifact:['Артефакт','Преглед на правен извор или работен материјал']};
  $('vnextPanelTitle').textContent=titles[workspace.panelTab][0]; $('vnextPanelSub').textContent=titles[workspace.panelTab][1];
  if(workspace.panelTab==='sources'){
    if(!t.latestSources.length){ body.append(emptyCard('Нема прикажани извори','Кога backend ќе врати правни извори, тие ќе се појават тука. Ова не значи дека нема правна рамка — само дека за овој thread нема зачуван source payload.')); return; }
    t.latestSources.forEach((row,i)=>{
      const card=mk('section',{class:'vnext-evidence-card'}); card.append(mk('span',{class:'vnext-evidence-num',text:String(i+1).padStart(2,'0')}),mk('strong',{text:row.label}));
      const u=safeUrl(row.url); if(u){const a=mk('button',{type:'button',class:'vnext-open-source',text:'Отвори извор →'}); a.onclick=()=>openArtifact(row); card.append(a);} else card.append(mk('small',{text:'Изворот е наведен без јавен URL.'})); body.append(card);
    }); return;
  }
  if(workspace.panelTab==='context'){
    const mode=$('researchMode')?.selectedOptions?.[0]?.textContent||'Автоматски'; const guides=$('useLocalGuides')?.checked?'Вклучени':'Исклучени';
    body.append(infoCard('Активен thread',t.title),infoCard('Research mode',mode),infoCard('Проверени локални водичи',guides),infoCard('Модел',t.model||'Се прикажува по AI одговор'),infoCard('Privacy boundary','Доверливи клиентски предмети не се праќаат преку обичниот thread; се насочуваат во Secure Case Workspace.')); return;
  }
  if(workspace.panelTab==='human'){
    const card=mk('section',{class:'vnext-human-card'}); card.innerHTML='<span class="vnext-status-pill">HUMAN GATE</span><h3>Потребна е професионална проверка</h3><p>AI одговорите и извозите се работен материјал. Нема автоматско потпишување, поднесување, испраќање или правно овластување.</p>';
    const actions=mk('div',{class:'vnext-panel-actions'});
    const cp=mk('button',{type:'button',text:'Отвори CasePilot'}); cp.onclick=()=>window.open('/casepilot-workspace.html','_blank','noopener');
    const docx=mk('button',{type:'button',text:'Извези DOCX'}); docx.onclick=()=>exportActive('docx');
    const pdf=mk('button',{type:'button',text:'Извези PDF'}); pdf.onclick=()=>exportActive('pdf'); actions.append(cp,docx,pdf); card.append(actions); body.append(card); return;
  }
  if(workspace.lastArtifact){ renderArtifact(workspace.lastArtifact); }
  else body.append(emptyCard('Нема отворен артефакт','Кликнете правен извор, citation chip или интерна правна референца.'));
}
function emptyCard(title,text){ const c=mk('section',{class:'vnext-empty-card'}); c.append(mk('strong',{text:title}),mk('p',{text})); return c; }
function infoCard(label,value){ const c=mk('section',{class:'vnext-info-card'}); c.append(mk('small',{text:label}),mk('strong',{text:value})); return c; }
function openArtifact(row){ workspace.lastArtifact=row; workspace.panelTab='artifact'; openEvidence(); renderEvidence(); }
function renderArtifact(row){
  const body=$('vnextPanelBody'); const u=safeUrl(row.url); const card=mk('section',{class:'vnext-artifact-card'}); card.append(mk('strong',{text:row.label||'Правен извор'}));
  if(!u){card.append(mk('p',{text:'Нема јавен URL за директен преглед.'}));body.append(card);return;}
  if(u.origin===location.origin){ const frame=mk('iframe',{class:'vnext-artifact-frame',src:u.href,title:row.label||'Правен извор'}); card.append(frame); }
  else { card.append(mk('p',{text:'Надворешните извори се отвораат во посебен таб за да се почитуваат нивните безбедносни политики.'})); }
  const a=mk('a',{href:u.href,target:'_blank',rel:'noopener noreferrer',class:'vnext-artifact-open',text:'Отвори оригинал ↗'}); card.append(a); body.append(card);
}

function openEvidence(tab){ if(tab) workspace.panelTab=tab; workspace.panelOpen=true; document.documentElement.classList.add('vnext-evidence-open'); renderEvidence(); }
function closeEvidence(){ workspace.panelOpen=false; document.documentElement.classList.remove('vnext-evidence-open'); }
function openMobileSidebar(){ document.documentElement.classList.add('vnext-sidebar-open'); workspace.sidebarOpen=true; }
function closeMobileSidebar(){ document.documentElement.classList.remove('vnext-sidebar-open'); workspace.sidebarOpen=false; }

function openGlobalSearch(){ const d=$('vnextSearchDialog'); d.showModal(); $('vnextGlobalSearch').value=''; renderGlobalSearch(); setTimeout(()=>$('vnextGlobalSearch').focus(),0); }
function renderGlobalSearch(){
  const host=$('vnextSearchResults'); if(!host) return; const q=String($('vnextGlobalSearch')?.value||'').trim().toLowerCase(); host.replaceChildren();
  const tools=[
    ['Анализатор','analyzer'],['Консолидатор','consolidator'],['Предиктор','predictor'],['Правни извори','sources'],['Судска практика','cases'],['CasePilot','casepilot'],['Документи','documents'],['Workflows','workflows'],['Human Gate','review'],['Library','library']
  ];
  const matches=workspace.threads.filter(t=>!q||t.title.toLowerCase().includes(q)||t.history.some(m=>String(m.text||'').toLowerCase().includes(q))).slice(0,8);
  if(matches.length){host.append(mk('small',{class:'vnext-search-group',text:'Разговори'}));matches.forEach(t=>{const b=mk('button',{type:'button',text:t.title});b.onclick=()=>{$('vnextSearchDialog').close();switchThread(t.id)};host.append(b);});}
  const tm=tools.filter(([label])=>!q||label.toLowerCase().includes(q)); if(tm.length){host.append(mk('small',{class:'vnext-search-group',text:'Алатки'}));tm.forEach(([label,act])=>{const b=mk('button',{type:'button',text:label});b.onclick=()=>{$('vnextSearchDialog').close();runAction(act)};host.append(b);});}
}

function runAction(action){
  qsa('.vnext-nav button').forEach(b=>b.classList.toggle('active',b.dataset.vnextAction===action));
  if(action==='assistant'){ closeMobileSidebar(); $('question')?.focus(); return; }
  if(action==='analyzer'){window.open('/professional-tools.html#analyzer','_blank','noopener');return;}
  if(action==='consolidator'){
    $('question').value='CONSOLIDATOR MODE. Консолидирај ги правните текстови/измени што ќе ги наведам. Изгради проверлива amendment chain и provenance: основен текст → секоја измена → effective date → application date → преодни/завршни одредби → уставносудски ефекти → работна редакција. Разликувај official consolidated, editorial consolidated и working consolidation. Не прогласувај важечко право без governed official-source verification. HUMAN GATE REQUIRED.\n\nМатеријал/закон: ';
    $('question').dispatchEvent(new Event('input')); closeMobileSidebar(); $('question').focus(); return;
  }
  if(action==='predictor'){
    $('question').value='PREDICTOR MODE — GOVERNED SCENARIO ANALYSIS. Анализирај го прашањето преку поволно, мешано и неповолно сценарио. Не давај процент на успех и не гарантирај исход. За секое сценарио наведи одлучувачки факти, доказна поддршка, применлива правна основа и source status, спротивни аргументи/authority, процесни ризици, празнини во доказите и што би го сменило сценариото. Ако станува збор за доверлив клиентски предмет, насочи ме во Secure Case Workspace / CasePilot. HUMAN GATE REQUIRED.\n\nПрашање/предмет: ';
    $('question').dispatchEvent(new Event('input')); closeMobileSidebar(); $('question').focus(); return;
  }
  if(action==='sources'){openEvidence('sources');return;}
  if(action==='review'){openEvidence('human');return;}
  if(action==='casepilot'){window.open('/casepilot-workspace.html','_blank','noopener');return;}
  if(action==='cases'){window.open('/case-law-metadata.html','_blank','noopener');return;}
  if(action==='documents'){const d=$('materialsDialog');d?.showModal();setTimeout(()=>qs('.export-actions',d)?.scrollIntoView({block:'center'}),0);return;}
  if(action==='workflows'){$('vnextWorkflowDialog').showModal();return;}
  if(action==='library'){$('materialsDialog')?.showModal();return;}
}

async function exportActive(format){
  const t=activeThread(); const latest=[...t.history].reverse().find(m=>m.role==='assistant'&&String(m.text||'').trim());
  if(!latest){$('status').textContent='Сè уште нема AI одговор за извоз.';return;}
  if(['txt','md'].includes(format)){
    const text=format==='md'?'# AI Advokat — работен одговор\n\n'+latest.text:'AI Advokat — работен одговор\n\n'+latest.text;
    const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})); const a=mk('a',{href:url,download:'AI-Advokat-working-draft.'+format});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);return;
  }
  try{
    const mod=await import('./casepilot-export.js'); const core=await import('../src/case-export.js');
    const report=core.normalizeCaseExportReport({title:'AI Advokat — работен одговор',summary:latest.text,sections:[{title:'AI Advokat',content:latest.text}],humanGate:'Потребна е професионална човечка проверка пред последична употреба.'});
    await mod.downloadCasePilotExport(report,format,{filename:'AI-Advokat-working-draft.'+format});
  }catch{$('status').textContent='Извозот во '+format.toUpperCase()+' не успеа. Обидете се со TXT или MD.';}
}
function exportThread(){
  const t=activeThread(); if(!t.history.length){$('status').textContent='Сè уште нема завршен разговор за преземање.';return;}
  const text='AI Advokat — работен разговор\nПотребна е професионална проверка.\n\n'+t.history.map(m=>(m.role==='user'?'Вие':'AI Advokat')+':\n'+m.text).join('\n\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=mk('a',{href:url,download:'AI-Advokat-razgovor.txt'});a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function takeOverExports(){
  if($('exportChat')) $('exportChat').onclick=exportThread;
  qsa('[data-export]').forEach(old=>{const b=old.cloneNode(true);old.replaceWith(b);b.addEventListener('click',()=>exportActive(String(b.dataset.export||'txt')));});
}

const THEME_KEY='aiadvokat-vnext-theme';
function setTheme(mode){
  const allowed=['auto','light','dark']; if(!allowed.includes(mode)) mode='auto';
  localStorage.setItem(THEME_KEY,mode); applyTheme(mode); updateThemeButton(mode);
}
function applyTheme(mode=localStorage.getItem(THEME_KEY)||'auto'){
  const actual=mode==='auto'?(matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'):mode;
  document.documentElement.dataset.vnextTheme=actual; document.documentElement.dataset.vnextThemeMode=mode;
}
function updateThemeButton(mode=localStorage.getItem(THEME_KEY)||'auto'){$('vnextTheme')?.setAttribute('title','Тема: '+mode);}
function cycleTheme(){ const m=localStorage.getItem(THEME_KEY)||'auto'; setTheme(m==='auto'?'light':m==='light'?'dark':'auto'); }

function wire(){
  $('vnextNewThread').onclick=createNewThread;
  $('vnextThreadSearch').addEventListener('input',renderThreadList);
  $('vnextSearchLaunch').onclick=openGlobalSearch; $('vnextHeaderSearch').onclick=openGlobalSearch;
  $('vnextHeaderEvidence').onclick=()=>openEvidence('sources'); $('vnextEvidenceClose').onclick=closeEvidence;
  $('vnextMobileMenu').onclick=openMobileSidebar; $('vnextSidebarClose').onclick=closeSidebar;
  $('vnextTheme').onclick=cycleTheme;
  qsa('.vnext-nav button').forEach(b=>b.onclick=()=>runAction(b.dataset.vnextAction));
  qsa('.vnext-evidence-tabs button').forEach(b=>b.onclick=()=>{workspace.panelTab=b.dataset.panel;renderEvidence();});
  $('researchMode')?.addEventListener('change',renderEvidence); $('useLocalGuides')?.addEventListener('change',renderEvidence);
  document.addEventListener('keydown',e=>{
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openGlobalSearch();}
    if(e.key==='Escape'){closeMobileSidebar(); if(matchMedia('(max-width:1180px)').matches) closeEvidence();}
  });
  matchMedia('(prefers-color-scheme:dark)').addEventListener?.('change',()=>{if(readTheme()==='auto')applyTheme('auto');});
  if($('newChat')) $('newChat').onclick=()=>createNewThread();
  if($('logout')) $('logout').onclick=()=>{coreLogout?.call($('logout'));workspace.threads=[];makeThread();renderThreadList();renderEvidence();};
  window.addEventListener('aiadvokat:vnext-thread-change',()=>{renderThreadList();renderEvidence();});
  window.addEventListener('aiadvokat:vnext-response',()=>{renderThreadList();renderEvidence();setTimeout(scanMessages,0);});
  new MutationObserver(()=>scanMessages()).observe($('messages'),{childList:true,subtree:true});
}

buildShell(); takeOverExports(); wire(); applyTheme(); updateThemeButton(); renderThreadList(); renderEvidence(); scanMessages();
