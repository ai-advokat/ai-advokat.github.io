/* AI Advokat Professional Workbench R7 */
(() => {
  const $=id=>document.getElementById(id);
  const qs=(s,r=document)=>r.querySelector(s);
  const qsa=(s,r=document)=>[...r.querySelectorAll(s)];
  const state={phase:"idle"};

  function make(tag,cls,text){
    const n=document.createElement(tag);
    if(cls)n.className=cls;
    if(text!==undefined)n.textContent=text;
    return n;
  }
  function html(tag,cls,content){
    const n=make(tag,cls);
    n.innerHTML=content;
    return n;
  }
  function setPrompt(text){
    const q=$("question"); if(!q)return;
    q.value=text;q.dispatchEvent(new Event("input",{bubbles:true}));q.focus();
  }

  function buildHeader(){
    const header=qs(".vnext-center>header");
    if(!header||qs(".r7-header-identity",header))return;
    const identity=html("div","r7-header-identity",
      '<div class="r7-header-title">AIAdvokat4 · <b>LexNova UX</b><span class="r7-pro-pill">PRO</span></div>'+
      '<div class="r7-header-sub">Source-first · Governed AI · Human Review</div>');
    const strip=html("div","r7-engine-strip",
      '<button class="r7-engine is-primary" type="button" data-r7-engine="consolidator"><span class="r7-engine-icon">▤</span><strong>CONSOLIDATOR</strong><small>Legal Formatter</small></button>'+
      '<button class="r7-engine" type="button" data-r7-engine="analyzer"><span class="r7-engine-icon">⌕</span><strong>ANALYZER</strong><small>Legal Analyzer</small></button>'+
      '<button class="r7-engine" type="button" data-r7-engine="predictor"><span class="r7-engine-icon">▥</span><strong>PREDICTOR</strong><small>Scenario & Risk</small></button>'+
      '<button class="r7-engine" type="button" data-r7-engine="casepilot"><span class="r7-engine-icon">▣</span><strong>CasePilot</strong><small>Matter Space</small></button>'+
      '<button class="r7-engine" type="button" data-r7-engine="sources"><span class="r7-engine-icon">▤</span><strong>Sources</strong><small>Authority</small></button>'+
      '<button class="r7-engine" type="button" data-r7-engine="human"><span class="r7-engine-icon">●</span><strong>Human Gate</strong><small>Final Review</small></button>');
    header.prepend(identity);
    const tools=qs(".vnext-header-tools",header);
    header.insertBefore(strip,tools||header.lastChild);
    qsa("[data-r7-engine]",strip).forEach(b=>b.addEventListener("click",()=>{
      const a=b.dataset.r7Engine;
      if(a==="casepilot")return window.open("/casepilot-workspace.html","_blank","noopener");
      if(a==="sources")return $("vnextHeaderEvidence")?.click();
      if(a==="human"){qsa(".vnext-evidence-tabs button").find(x=>x.dataset.panel==="human")?.click();return;}
      qs('.vnext-nav button[data-vnext-action="'+a+'"]')?.click();
    }));
  }

  function buildProcess(){
    const aside=$("vnextEvidence");
    if(!aside||qs(".r7-process-card",aside))return;
    const card=html("section","r7-process-card",
      '<div class="r7-process-head"><strong>AI Advokat во процес</strong><span class="r7-live">Во тек</span></div>'+
      '<div class="r7-orbit" id="r7Orbit">'+
        '<div class="r7-orbit-node sources"><div><b>▤</b>SOURCES</div></div>'+
        '<div class="r7-orbit-node analyzer"><div><b>⌕</b>ANALYZER</div></div>'+
        '<div class="r7-orbit-node predictor"><div><b>▥</b>PREDICTOR</div></div>'+
        '<div class="r7-orbit-node casepilot"><div><b>▣</b>CASEPILOT</div></div>'+
        '<div class="r7-orbit-center" id="r7OrbitCenter">HUMAN<br>GATE</div>'+
      '</div>'+
      '<div class="r7-process-steps" id="r7ProcessSteps"></div>');
    const tabs=qs(".vnext-evidence-tabs",aside);
    aside.insertBefore(card,tabs||aside.lastChild);
    const steps=[
      ["sources","Се пребаруваат правни извори…"],
      ["analysis","Се анализираат релевантни норми…"],
      ["test","Се подготвува правен тест…"],
      ["scenario","Се генерираат можни сценарија…"],
      ["human","Human Gate — експертска проверка…"]
    ];
    const host=$("r7ProcessSteps");
    steps.forEach(([key,label])=>{
      const row=make("div","r7-process-step");row.dataset.r7Step=key;
      row.append(make("i"),make("span","",label));host.append(row);
    });
    renderPhase("idle");
  }

  function renderPhase(phase){
    state.phase=phase;
    const orbit=$("r7Orbit"),center=$("r7OrbitCenter");
    if(!orbit||!center)return;
    orbit.classList.toggle("r7-running",phase==="running");
    orbit.classList.toggle("r7-complete",phase==="complete");
    const rows=qsa("[data-r7-step]");
    rows.forEach(r=>r.classList.remove("is-active","is-done"));
    if(phase==="idle"){center.innerHTML="HUMAN<br>GATE";rows[0]?.classList.add("is-active");}
    if(phase==="running"){center.innerHTML="AI<br>PROCESS";rows[0]?.classList.add("is-done");rows[1]?.classList.add("is-done");rows[2]?.classList.add("is-active");}
    if(phase==="complete"){center.innerHTML="HUMAN<br>GATE";rows.forEach((r,i)=>r.classList.add(i===rows.length-1?"is-active":"is-done"));}
    if(phase==="error"){center.innerHTML="REVIEW<br>REQUIRED";rows[0]?.classList.add("is-done");rows[1]?.classList.add("is-active");}
  }

  function buildComposerActions(){
    const composer=$("composer");
    if(!composer||qs(".r7-composer-actions"))return;
    const actions=html("div","r7-composer-actions",
      '<button type="button" data-r7-prompt="document">▧ Додај документ</button>'+
      '<button type="button" data-r7-prompt="legal-test">§ Правен тест</button>'+
      '<button type="button" data-r7-prompt="sources">⌕ Побарај извори</button>'+
      '<button type="button" data-r7-prompt="scenario">◎ Спореди сценарија</button>'+
      '<button type="button" data-r7-prompt="case-law">⚖ Судска пракса</button>');
    composer.insertAdjacentElement("afterend",actions);
    actions.addEventListener("click",e=>{
      const b=e.target.closest("[data-r7-prompt]");if(!b)return;
      const k=b.dataset.r7Prompt;
      if(k==="document")return $("plus")?.querySelector("summary")?.click();
      const prompts={
        "legal-test":"Примени структуриран правен тест: ISSUE / FACTS / APPLICABLE LAW / ELEMENTS / ANALYSIS / COUNTER-ARGUMENTS / RISKS / CONCLUSION / HUMAN GATE. Прво потврди ги важечките извори.",
        "sources":"Провери ги релевантните примарни и официјални правни извори. Оддели reviewed authority од discovery и наведи верзија/датум каде што е важно.",
        "scenario":"Изгради поволно, мешано и неповолно сценарио. За секое наведи факти, докази, применливи извори, спротивни аргументи и што би го сменило исходот. Без проценти и гаранции.",
        "case-law":"Истражи релевантна судска пракса source-first. Разликувај Discovery од Reviewed Authority и не користи case-number claim без проверлив извор."
      };
      setPrompt(prompts[k]||"");
    });
  }

  function polish(){
    const prod=qs(".vnext-product");
    if(prod){const s=qs("strong",prod),m=qs("small",prod);if(s)s.textContent="AI Advokat";if(m)m.textContent="LEGAL PULSE";}
    const nb=$("vnextNewThread");if(nb)nb.textContent="▢  Нов разговор";
    const labels={assistant:"Работна површина",documents:"Мои документи",sources:"Правна база",predictor:"Сценарија и ризици",review:"Human Gate",cases:"Судска пракса",casepilot:"CasePilot"};
    Object.entries(labels).forEach(([a,label])=>{const n=qs('.vnext-nav button[data-vnext-action="'+a+'"] span:last-child');if(n)n.textContent=label;});
  }

  function installLifecycle(){
    if(window.__R7_FETCH_WRAPPED__)return;
    window.__R7_FETCH_WRAPPED__=true;
    const currentFetch=window.fetch.bind(window);
    window.fetch=async function(input,init={}){
      const raw=typeof input==="string"?input:String(input?.url||"");
      const bot=/\/api\/bot(?:\?|$)/.test(raw);
      if(bot)renderPhase("running");
      try{const response=await currentFetch(input,init);if(bot)renderPhase(response.ok?"complete":"error");return response;}
      catch(err){if(bot)renderPhase("error");throw err;}
    };
  }

  function activate(){
    document.documentElement.classList.add("professional-r7");
    buildHeader();buildProcess();buildComposerActions();polish();installLifecycle();
  }
  function wait(){
    if(qs(".vnext-shell"))return activate();
    const obs=new MutationObserver(()=>{if(qs(".vnext-shell")){obs.disconnect();activate();}});
    obs.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",wait,{once:true});else wait();
})();