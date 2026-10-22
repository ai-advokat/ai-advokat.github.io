// Controlled pilot: no schedule, no public record ingestion, no sending by default.
export const CONSENT_VERSION = 'legal-alarm-v1';
export const TOPICS = ['labour','criminal','civil','administrative','tax','health','procurement'];
const TOPIC_LABELS = {labour:'работни односи',criminal:'кривично право',civil:'граѓанско право',administrative:'управно право',tax:'даноци',health:'здравство',procurement:'јавни набавки'};
const enc = new TextEncoder();
const hex = b => [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('');
const token = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async s => hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const response = (body,status=200) => new Response(JSON.stringify(body), {status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store','referrer-policy':'no-referrer','x-content-type-options':'nosniff'}});
const accepted = () => response({ok:true,message:'Ако барањето е прифатливо, ќе добиете порака за потврда.'},202);
const run = (db,sql,...args) => db.prepare(sql).bind(...args).run();
const first = (db,sql,...args) => db.prepare(sql).bind(...args).first();
async function hmac(secret,value) {
 const key=await crypto.subtle.importKey('raw',enc.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 return hex(await crypto.subtle.sign('HMAC',key,enc.encode(value)));
}
async function seal(env,value, decrypt=false) {
 const key=await crypto.subtle.importKey('raw',Uint8Array.from(env.ALARM_ENCRYPTION_KEY.match(/../g),x=>parseInt(x,16)),'AES-GCM',false,['encrypt','decrypt']);
 if(decrypt){const bytes=Uint8Array.from(value.match(/../g),x=>parseInt(x,16));return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes.slice(0,12)},key,bytes.slice(12)));}
 const iv=crypto.getRandomValues(new Uint8Array(12));return hex(iv)+hex(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,enc.encode(value)));
}
export function ready(env) {
 return env.ALARM_ENABLED==='true' && ['LEGAL','PRIVACY','DELIVERY','ZORAN'].every(k=>/^review:[A-Za-z0-9._/-]{3,160}$/.test(env[`ALARM_${k}_APPROVAL`]||''))
  && env.ALARM_DB && /^[a-f0-9]{64}$/.test(env.ALARM_ENCRYPTION_KEY||'') && (env.ALARM_HMAC_SECRET||'').length>=32
  && env.ALARM_PROVIDER==='resend' && env.ALARM_RESEND_KEY && /^[^\s<>@]+@[^\s<>@]+\.[a-z]+$/i.test(env.ALARM_FROM||'')
  && env.TURNSTILE_SECRET && env.TURNSTILE_SITE_KEY && /^https:\/\/[a-z0-9.-]+$/.test(env.ALARM_ORIGIN||'')
  && Number.isSafeInteger(Number(env.ALARM_START_AT)) && Number(env.ALARM_START_AT)>0;
}
export function topics(value) {
 if(!Array.isArray(value)||value.length<1||value.length>7||value.some(v=>!TOPICS.includes(v))) throw Error('invalid_topics');
 return [...new Set(value)].sort();
}
export function validRecord(r,env,now) {
 let u;try{u=new URL(r.source_url);}catch{return false;}
 return /^[a-zA-Z0-9:_-]{1,100}$/.test(r.id||'') && typeof r.title==='string' && r.title.length>0 && r.title.length<=300 && !/[\r\n\x00-\x1f]/.test(r.title)
  && u.protocol==='https:' && !u.username && !u.password && !u.port && !u.search && !u.hash && ['slvesnik.com.mk','www.slvesnik.com.mk'].includes(u.hostname)
  && r.state==='verified' && typeof r.reviewer==='string' && r.reviewer.trim().length>=3 && typeof r.evidence==='string' && r.evidence.trim().length>=10
  && Number.isSafeInteger(r.published_at) && r.published_at>=Number(env.ALARM_START_AT) && r.published_at<=now
  && Number.isSafeInteger(r.verified_at) && r.verified_at>=r.published_at && r.verified_at<=now;
}
async function limit(env,key,max,now) {
 const bucket=Math.floor(now/86400000), hashed=await hmac(env.ALARM_HMAC_SECRET,key);
 const row=await first(env.ALARM_DB,'INSERT INTO alarm_limits(key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count',`${hashed}:${bucket}`, (bucket+2)*86400000);
 return row.count<=max;
}
async function challenge(env,p,request) {
 if(typeof p.turnstileToken!=='string'||p.turnstileToken.length>2048) return false;
 const result=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',body:new URLSearchParams({secret:env.TURNSTILE_SECRET,response:p.turnstileToken,remoteip:request.headers.get('CF-Connecting-IP')||''}),signal:AbortSignal.timeout(5000)});
 const out=await result.json();return out.success===true && out.action==='legal_alarm' && out.hostname===new URL(env.ALARM_ORIGIN).hostname;
}
async function mail(env,key,to,subject,text) {
 // Never retry an ambiguous outcome automatically (including provider timeouts).
 const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.ALARM_RESEND_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:env.ALARM_FROM,to:[to],subject,text}),signal:AbortSignal.timeout(10000)});
 if(!res.ok) throw Error('delivery_uncertain');const data=await res.json();if(!data.id)throw Error('delivery_uncertain');return data.id;
}
const link = (env,action,value) => `${env.ALARM_ORIGIN}/sluzben-vesnik/pretplata.html#${action}=${value}`;
export async function dispatch(env,now=Date.now()) {
 if(!ready(env)) return {sent:0,disabled:true};
 const rows=(await env.ALARM_DB.prepare("SELECT s.id AS sid,r.id AS rid FROM alarm_subscriptions s JOIN alarm_records r ON r.state='verified' WHERE s.state='active' AND r.published_at>=s.confirmed_at AND r.published_at>=? AND EXISTS (SELECT 1 FROM json_each(s.topics) st JOIN json_each(r.topics) rt ON st.value=rt.value) AND NOT EXISTS (SELECT 1 FROM alarm_deliveries d WHERE d.subscription_id=s.id AND d.record_id=r.id) LIMIT 100").bind(Number(env.ALARM_START_AT)).all()).results;
 let sent=0;
 for(const row of rows){
  const s=await first(env.ALARM_DB,"SELECT * FROM alarm_subscriptions WHERE id=? AND state='active'",row.sid);
  const r=await first(env.ALARM_DB,"SELECT * FROM alarm_records WHERE id=? AND state='verified'",row.rid);
  if(!s||!r||!validRecord(r,env,now)||!JSON.parse(s.topics).some(t=>JSON.parse(r.topics).includes(t))) continue;
  const claim=await run(env.ALARM_DB,"INSERT OR IGNORE INTO alarm_deliveries(subscription_id,record_id,state,claimed_at) SELECT ?,?,'claimed',? WHERE EXISTS(SELECT 1 FROM alarm_subscriptions WHERE id=? AND state='active') AND EXISTS(SELECT 1 FROM alarm_records WHERE id=? AND state='verified')",s.id,r.id,now,s.id,r.id);
  if(claim.meta.changes!==1)continue;
  // Recheck suppression immediately before provider call.
  const currentSub=await first(env.ALARM_DB,"SELECT * FROM alarm_subscriptions WHERE id=? AND state='active'",s.id);
  const currentRecord=await first(env.ALARM_DB,"SELECT * FROM alarm_records WHERE id=? AND state='verified'",r.id);
  if(!currentSub || !currentRecord || !validRecord(currentRecord,env,now) || currentRecord.published_at<currentSub.confirmed_at || !JSON.parse(currentSub.topics).some(t=>JSON.parse(currentRecord.topics).includes(t)))continue;
  try {
   const manage=await seal(env,s.manage_cipher,true);
   const id=await mail(env,`alarm-${s.id}-${r.id}`,await seal(env,s.address_cipher,true),'Правен аларм: нов проверен запис',`${r.title}\n${r.source_url}\nПроверено: ${new Date(r.verified_at).toISOString()}\nОва е известување за објава; не е потврда дека прописот е во сила.\nТеми и одјава: ${link(env,'manage',manage)}`);
   await run(env.ALARM_DB,"UPDATE alarm_deliveries SET state='sent',provider_id=? WHERE subscription_id=? AND record_id=?",id,s.id,r.id);sent++;
  }catch{await run(env.ALARM_DB,"UPDATE alarm_deliveries SET state='uncertain' WHERE subscription_id=? AND record_id=?",s.id,r.id);}
 }
 return {sent};
}
export async function handleLegalAlarm(request,env) {
 const url=new URL(request.url),action=url.pathname.split('/').pop();
 if(action==='status')return response({enabled:!!ready(env),consentVersion:CONSENT_VERSION,topics:TOPICS,siteKey:ready(env)?env.TURNSTILE_SITE_KEY:null});
 if(!ready(env) && !(action==='unsubscribe' && env.ALARM_DB && env.ALARM_ORIGIN && (env.ALARM_HMAC_SECRET||'').length>=32))return response({error:'Претплатата сè уште не е активирана.'},503);
 if(request.method!=='POST')return response({error:'method_not_allowed'},405);
 if(request.headers.get('origin')!==env.ALARM_ORIGIN)return response({error:'origin'},403);
 if(!request.headers.get('content-type')?.startsWith('application/json'))return response({error:'content_type'},415);
 try{
  // Streaming bound: Content-Length alone is not trusted.
  const reader=request.body?.getReader(),decoder=new TextDecoder('utf-8',{fatal:true});let raw='',size=0;if(!reader)throw Error('body');
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>8192){await reader.cancel();return response({error:'too_large'},413);}raw+=decoder.decode(value,{stream:true});}raw+=decoder.decode();
  const p=JSON.parse(raw),now=Date.now(),db=env.ALARM_DB;
  if(['records','dispatch','suppress'].includes(action)){
   if((env.ALARM_ADMIN_SECRET||'').length<32 || await digest(request.headers.get('authorization')||'')!==await digest(`Bearer ${env.ALARM_ADMIN_SECRET}`))return response({error:'forbidden'},403);
   if(action==='dispatch')return response(await dispatch(env,now));
   if(action==='suppress') {await run(db,"UPDATE alarm_subscriptions SET state='suppressed',address_cipher=NULL,manage_cipher=NULL,confirm_hash=NULL WHERE id=?",String(p.id));return response({ok:true});}
   if(p.withdraw===true){await run(db,"UPDATE alarm_records SET state='withdrawn' WHERE id=?",String(p.id));return response({ok:true});}
   if(!validRecord(p,env,now))throw Error('unverified_record');
   const chosen=topics(p.topics);
   await run(db,'INSERT OR IGNORE INTO alarm_records(id,title,source_url,published_at,verified_at,reviewer,evidence,topics,state) VALUES (?,?,?,?,?,?,?,?,?)',p.id,p.title,p.source_url,p.published_at,p.verified_at,p.reviewer,p.evidence,JSON.stringify(chosen),'verified');
   return response({ok:true});
  }
  if(!await limit(env,`ip:${request.headers.get('CF-Connecting-IP')||'unknown'}`,50,now))return response({error:'rate_limit'},429);
  if(action==='subscribe'){
   if(p.consent!==true||p.consentVersion!==CONSENT_VERSION)throw Error('consent_required');
   const chosen=topics(p.topics),email=String(p.email||'').trim().toLowerCase();
   if(email.length>254||! /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(email))throw Error('email');
   if(!await limit(env,`address:${email}`,3,now))return accepted();
   if(!await challenge(env,p,request))return accepted();
   const addressKey=await hmac(env.ALARM_HMAC_SECRET,email),id=crypto.randomUUID(),confirm=token(),manage=token();
   // Existing active/pending/suppressed addresses cannot be overwritten by strangers.
   const created=await run(db,"INSERT OR IGNORE INTO alarm_subscriptions(id,address_key,address_cipher,state,topics,consent_version,consent_at,confirm_hash,confirm_expires,manage_hash,manage_cipher,created_at) VALUES (?,?,?,'pending',?,?,?,?,?,?,?,?)",id,addressKey,await seal(env,email),JSON.stringify(chosen),CONSENT_VERSION,now,await digest(confirm),now+86400000,await digest(manage),await seal(env,manage),now);
   if(created.meta.changes===1 && await limit(env,'global:confirmation',200,now)){try{await mail(env,`confirm-${id}`,email,'Потврдете ја претплатата за Правен аларм',`Побарана е претплата за теми: ${chosen.map(t=>TOPIC_LABELS[t]).join(', ')}.\nПотврдете во рок од 24 часа: ${link(env,'confirm',confirm)}\nАко не го побаравте ова, игнорирајте ја пораката.\nОткажување: ${link(env,'manage',manage)}`);}catch{/* Reserved pending row prevents repeated mail on uncertain delivery. */}}
   return accepted();
  }
  if(!/^[a-f0-9]{64}$/.test(p.token||''))throw Error('token');
  const hash=await digest(p.token);
  if(action==='confirm'){
   const changed=await run(db,"UPDATE alarm_subscriptions SET state='active',confirmed_at=?,confirm_hash=NULL,confirm_expires=NULL WHERE confirm_hash=? AND state='pending' AND confirm_expires>?",now,hash,now);
   return response({ok:changed.meta.changes===1},changed.meta.changes===1?200:400);
  }
  if(action==='unsubscribe'){
   await run(db,"UPDATE alarm_subscriptions SET state='unsubscribed',address_cipher=NULL,manage_cipher=NULL,confirm_hash=NULL,topics='[]' WHERE manage_hash=? AND state IN ('pending','active')",hash);return response({ok:true});
  }
  if(action==='topics'){
   const chosen=topics(p.topics);
   const changed=await run(db,"UPDATE alarm_subscriptions SET topics=? WHERE manage_hash=? AND state='active'",JSON.stringify(chosen),hash);
   return response({ok:changed.meta.changes===1},changed.meta.changes===1?200:400);
  }
  return response({error:'not_found'},404);
 }catch{return response({error:'Барањето не може да се обработи.'},400);}
}
// Run manually in approved private database; retained keyed tombstones prevent re-enrolment abuse.
export async function cleanupLegalAlarm(env,now=Date.now()) {
 await run(env.ALARM_DB,"UPDATE alarm_subscriptions SET state='suppressed',address_cipher=NULL,manage_cipher=NULL,confirm_hash=NULL,topics='[]' WHERE state='pending' AND confirm_expires<?",now);
 await run(env.ALARM_DB,'DELETE FROM alarm_limits WHERE expires_at<?',now);
}
