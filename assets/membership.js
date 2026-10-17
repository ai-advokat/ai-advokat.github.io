  const $=s=>document.querySelector(s);
  // Same rule as index.html: on a workers.dev host the Worker is same-origin;
  // on GitHub Pages (ai-advokat.github.io) the API lives on the production Worker.
  const API_BASE = (
    location.hostname.endsWith("workers.dev") ||
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1"
  )
    ? location.origin
    : "https://ai-advokat-github-io.aiadvokat16.workers.dev";
  document.querySelectorAll(".choose").forEach(btn=>btn.addEventListener("click",()=>{
    $("#planCode").value=btn.dataset.plan;
    $("#request").scrollIntoView({behavior:"smooth",block:"start"});
    $("#email").focus({preventScroll:true});
  }));

  // Turnstile: the public site key comes from the Worker (/api/membership/plans),
  // so it is configured in one place. Without it the form stays closed; the server
  // enforces the same rule independently.
  let turnstileToken=null;
  let turnstileWidget=null;
  let turnstileReady=false;

  function showRequestMessage(text, state){
    const box=$("#requestResult");
    box.hidden=false;
    box.className="result"+(state==="ok" ? " ok" : state==="err" ? " err" : "");
    box.textContent="";
    if(state==="ok"){ const s=document.createElement("strong"); s.className="okText"; s.textContent="Барањето е примено."; box.append(s); }
    if(state==="err"){ const s=document.createElement("strong"); s.className="errText"; s.textContent="Барањето не е испратено."; box.append(s); }
    box.append(document.createTextNode(text));
    if(state) box.focus({preventScroll:false});
  }

  async function initTurnstile(){
    let siteKey=null;
    try{
      const r=await fetch(API_BASE+"/api/membership/plans",{headers:{accept:"application/json"}});
      const d=await r.json();
      siteKey=d.turnstileSiteKey || null;
    }catch{}
    if(!siteKey){
      showRequestMessage("Барањата за членство привремено не се достапни (заштитата од автоматизирани барања не е конфигурирана). Обидете се подоцна.", null);
      return;
    }
    const render=()=>{
      turnstileWidget=window.turnstile.render("#turnstileBox",{
        sitekey:siteKey,
        action:"membership_request",
        callback:t=>{ turnstileToken=t; },
        "expired-callback":()=>{ turnstileToken=null; },
        "error-callback":()=>{ turnstileToken=null; }
      });
      turnstileReady=true;
    };
    if(window.turnstile) render();
    else {
      const wait=setInterval(()=>{ if(window.turnstile){ clearInterval(wait); render(); } },200);
      setTimeout(()=>clearInterval(wait),15000);
    }
  }

  const REQUEST_ERRORS={
    turnstile_required:"Потврдете ја заштитата од автоматизирани барања.",
    turnstile_failed:"Проверката од автоматизирани барања не успеа. Обидете се повторно.",
    too_many_requests:"Премногу барања. Обидете се повторно подоцна.",
    invalid_email:"Внесете валидна е-пошта.",
    invalid_display_name:"Името е предолго или содржи недозволени знаци.",
    invalid_organization_name:"Називот на организацијата е предолг или содржи недозволени знаци.",
    membership_requests_temporarily_unavailable:"Барањата за членство привремено не се достапни. Обидете се подоцна."
  };

  function emailIsValid(){
    const email=$("#email");
    const ok=email.checkValidity() && email.value.trim()!=="";
    email.setAttribute("aria-invalid",String(!ok));
    if(!ok){ showRequestMessage(" Внесете валидна е-пошта.", "err"); email.focus(); }
    return ok;
  }

  async function submitMembership(payload){
    if(!turnstileReady){ showRequestMessage(" Формата сè уште се вчитува или привремено не е достапна.", "err"); return; }
    if(!turnstileToken){ showRequestMessage(" "+REQUEST_ERRORS.turnstile_required, "err"); return; }
    showRequestMessage("Се испраќа…", null);
    try{
      const r=await fetch(API_BASE+"/api/membership/request",{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({...payload,turnstileToken})});
      const d=await r.json();
      if(!r.ok || !d.ok) throw new Error(d.error || "request_failed");
      showRequestMessage(" "+d.message, "ok");
    }catch(e){
      showRequestMessage(" "+(REQUEST_ERRORS[e.message] || "Барањето не можеше да се запише. Обидете се повторно подоцна."), "err");
    }finally{
      // Turnstile tokens are single-use.
      turnstileToken=null;
      if(turnstileWidget!==null && window.turnstile) window.turnstile.reset(turnstileWidget);
    }
  }

  initTurnstile();

  $("#membershipForm").addEventListener("submit",e=>{
    e.preventDefault();
    if(!emailIsValid()) return;
    const fd=new FormData(e.currentTarget);
    submitMembership({requestKind:"subscription",displayName:fd.get("displayName"),email:fd.get("email"),organizationName:fd.get("organizationName"),planCode:fd.get("planCode"),billingCycle:fd.get("billingCycle")});
  });

  $("#trialBtn").addEventListener("click",()=>{
    if(!emailIsValid()) return;
    const fd=new FormData($("#membershipForm"));
    submitMembership({requestKind:"trial",displayName:fd.get("displayName"),email:fd.get("email"),organizationName:fd.get("organizationName")});
  });

  $("#statusForm").addEventListener("submit",async e=>{
    e.preventDefault(); const key=$("#membershipKey").value.trim(); const box=$("#statusResult");
    box.hidden=false; box.className="result"; box.textContent="Се проверува…";
    try{
      const r=await fetch(API_BASE+"/api/membership/status",{headers:{"accept":"application/json","authorization":"Bearer "+key}});
      const d=await r.json();
      if(!r.ok || !d.ok) throw new Error(d.error || "inactive");
      const m=d.membership;
      box.className="result ok"; box.textContent="";
      const head=document.createElement("strong"); head.className="okText"; head.textContent="Активно членство: "+String(m.planCode).toUpperCase();
      box.append(head, document.createTextNode("Квота: "+m.used+" / "+m.monthlyQuota+" · преостануваат "+m.remaining+" AI прашања овој месец."));
    }catch(e){ box.className="result err"; box.textContent="Клучот не е активен или не може да се провери."; }
  });
