(async function(){
 'use strict';
 const status=document.getElementById('status'),form=document.getElementById('subscribe'),actions=document.getElementById('actions');
 const names={labour:'Работни односи',criminal:'Кривично право',civil:'Граѓанско право',administrative:'Управно право',tax:'Даноци',health:'Здравство',procurement:'Јавни набавки'};
 const fragment=new URLSearchParams(location.hash.slice(1)),confirm=fragment.get('confirm'),manage=fragment.get('manage');
 history.replaceState(null,'',location.pathname); // Capability stays only in memory.
 let challengeToken='';
 function selected(){return [...document.querySelectorAll('[name=topic]:checked')].map(el=>el.value);}
 async function post(action,data){
  const res=await fetch('/api/legal-alarm/'+action,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(data),credentials:'omit',referrerPolicy:'no-referrer'});
  if(!res.ok)throw Error('Барањето не е прифатено. Проверете ги податоците и обидете се подоцна.');
  status.textContent=action==='subscribe'?'Ако барањето е прифатливо, ќе добиете порака за потврда.':action==='unsubscribe'?'Одјавата е обработена.':'Промената е зачувана.';
 }
 function guarded(button,fn){button.addEventListener('click',async()=>{button.disabled=true;try{await fn();}catch(e){status.textContent=e.message;}finally{button.disabled=false;}});}
 try{
  const res=await fetch('/api/legal-alarm/status',{cache:'no-store'});if(!res.ok)throw Error();const config=await res.json();
  for(const t of config.topics){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.name='topic';input.value=t;label.append(input,document.createTextNode(' '+names[t]));document.getElementById('topics').append(label);}
  if(manage){actions.hidden=false;document.getElementById('unsubscribe').hidden=false;guarded(document.getElementById('unsubscribe'),()=>post('unsubscribe',{token:manage}));
   if(config.enabled){form.hidden=false;form.querySelector('[name=email]').parentElement.hidden=true;form.querySelector('[name=consent]').parentElement.hidden=true;form.querySelector('[name=email]').required=false;form.querySelector('[name=consent]').required=false;form.querySelector('button').hidden=true;document.getElementById('save').hidden=false;guarded(document.getElementById('save'),()=>post('topics',{token:manage,topics:selected()}));}
   status.textContent='Можете да се одјавите. За промена на темите, изберете ја целосната нова листа.';return;
  }
  if(!config.enabled){status.textContent='Новата претплата сè уште не е активирана. Постојниот локален избор е достапен во Службен весник.';return;}
  if(confirm){actions.hidden=false;document.getElementById('confirm').hidden=false;status.textContent='Потврдете ја адресата за активирање.';guarded(document.getElementById('confirm'),()=>post('confirm',{token:confirm}));return;}
  form.hidden=false;status.textContent='Изберете теми и потврдете согласност.';
  window.legalAlarmChallengeReady=function(){window.turnstile.render('#challenge',{sitekey:config.siteKey,action:'legal_alarm',callback:t=>{challengeToken=t;},'expired-callback':()=>{challengeToken='';}});};
  const script=document.createElement('script');script.src='https://challenges.cloudflare.com/turnstile/v0/api.js?onload=legalAlarmChallengeReady&render=explicit';script.async=true;document.head.append(script);
  form.addEventListener('submit',async e=>{e.preventDefault();const button=form.querySelector('button');button.disabled=true;try{await post('subscribe',{email:form.elements.email.value,topics:selected(),consent:form.elements.consent.checked,consentVersion:config.consentVersion,turnstileToken:challengeToken});}catch(error){status.textContent=error.message;}finally{button.disabled=false;challengeToken='';if(window.turnstile)window.turnstile.reset();}});
 }catch{status.textContent='Услугата моментално не е достапна. Постојниот локален избор е достапен во Службен весник.';}
})();
