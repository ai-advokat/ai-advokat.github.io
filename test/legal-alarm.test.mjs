import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync} from 'node:fs';
import {handleLegalAlarm,dispatch,cleanupLegalAlarm,ready,validRecord,CONSENT_VERSION} from '../src/legal-alarm.js';
const schema=readFileSync(new URL('../staging/legal-alarm/schema.sql',import.meta.url),'utf8');
const originalFetch=globalThis.fetch;
function fixture(){
 const sql=new DatabaseSync(':memory:');sql.exec(schema);
 const db={prepare(query){let args=[];return {bind(...v){args=v;return this;},async run(){const r=sql.prepare(query).run(...args);return {meta:{changes:r.changes}};},async first(){return sql.prepare(query).get(...args)||null;},async all(){return {results:sql.prepare(query).all(...args)};}};}};
 const env={ALARM_DB:db,ALARM_ENABLED:'true',ALARM_ENCRYPTION_KEY:'ab'.repeat(32),ALARM_HMAC_SECRET:'s'.repeat(32),ALARM_ADMIN_SECRET:'a'.repeat(32),ALARM_ORIGIN:'https://example.test',ALARM_PROVIDER:'resend',ALARM_RESEND_KEY:'test-only',ALARM_FROM:'alarm@example.test',TURNSTILE_SECRET:'test-only',TURNSTILE_SITE_KEY:'test-only',ALARM_START_AT:String(Date.now()-100000)};
 for(const k of ['LEGAL','PRIVACY','DELIVERY','ZORAN'])env[`ALARM_${k}_APPROVAL`]='review:test-only';
 const emails=[];let challenge={success:true,action:'legal_alarm',hostname:'example.test'},failure=false;
 globalThis.fetch=async(url,options)=>{if(String(url).includes('siteverify'))return Response.json(challenge);emails.push({body:JSON.parse(options.body),headers:options.headers});if(failure)throw Error('timeout');return Response.json({id:'provider-'+emails.length});};
 const call=(action,p={},method='POST',headers={})=>handleLegalAlarm(new Request('https://example.test/api/legal-alarm/'+action,{method,headers:{origin:env.ALARM_ORIGIN,'content-type':'application/json',...headers},...(method==='GET'?{}:{body:JSON.stringify(p)})}),env);
 const subscribe=(extra={})=>call('subscribe',{email:'User@example.test',consent:true,consentVersion:CONSENT_VERSION,topics:['labour'],turnstileToken:'ok',...extra});
 const extract=(kind)=>emails[0].body.text.match(new RegExp('#'+kind+'=([a-f0-9]{64})'))[1];
 async function active(){await subscribe();await call('confirm',{token:extract('confirm')});sql.exec('UPDATE alarm_subscriptions SET confirmed_at=confirmed_at-1000');}
 const record=(extra={})=>({id:'issue-2026-1',title:'Нов пропис',source_url:'https://www.slvesnik.com.mk/issue-2026-1.pdf',published_at:Date.now()-100,verified_at:Date.now(),reviewer:'Reviewer',evidence:'Human verified official publication, reference review/1',topics:['labour'],state:'verified',...extra});
 const ingest=(r)=>call('records',r,'POST',{authorization:`Bearer ${env.ALARM_ADMIN_SECRET}`});
 return {sql,env,emails,call,subscribe,extract,active,record,ingest,setChallenge:v=>challenge=v,setFailure:v=>failure=v};
}
test.after(()=>{globalThis.fetch=originalFetch;});
test('disabled by default and each approval missing independently blocks all sends',async()=>{
 const f=fixture();for(const key of ['ALARM_ENABLED','ALARM_LEGAL_APPROVAL','ALARM_PRIVACY_APPROVAL','ALARM_DELIVERY_APPROVAL','ALARM_ZORAN_APPROVAL','ALARM_ENCRYPTION_KEY','TURNSTILE_SITE_KEY']){const v=f.env[key];delete f.env[key];assert.ok(!ready(f.env));assert.equal((await f.subscribe()).status,503);assert.equal((await dispatch(f.env)).sent,0);f.env[key]=v;}assert.equal(f.emails.length,0);
});
test('explicit versioned consent and valid topics/email required',async()=>{
 const f=fixture();for(const p of [{consent:false},{consent:'true'},{consentVersion:'old'},{topics:[]},{topics:['unknown']},{email:'victim@example.test\r\nBcc:other@example.test'}])assert.equal((await f.subscribe(p)).status,400);assert.equal(f.emails.length,0);
});
test('Turnstile wrong action/hostname/failure cannot enrol',async()=>{
 const f=fixture();for(const c of [{success:false},{success:true,action:'membership_request',hostname:'example.test'},{success:true,action:'legal_alarm',hostname:'attacker.test'}]){f.setChallenge(c);assert.equal((await f.subscribe()).status,202);}assert.equal(f.emails.length,0);assert.equal(f.sql.prepare('SELECT count(*) n FROM alarm_subscriptions').get().n,0);
});
test('pending requires confirmation; token hashed, address encrypted; replay rejected',async()=>{
 const f=fixture();await f.subscribe();const s=f.sql.prepare('SELECT * FROM alarm_subscriptions').get();assert.equal(s.state,'pending');assert.equal(s.consent_version,CONSENT_VERSION);assert.ok(!JSON.stringify(s).includes('user@example.test'));assert.ok(!JSON.stringify(s).includes(f.extract('confirm')));assert.equal((await f.call('confirm',{token:f.extract('manage')})).status,400);
 assert.equal((await f.call('confirm',{token:f.extract('confirm')})).status,200);assert.equal((await f.call('confirm',{token:f.extract('confirm')})).status,400);
});
test('expired confirmation and GET/link scanners cannot activate',async()=>{
 const f=fixture();await f.subscribe();assert.equal((await f.call('confirm',{},'GET')).status,405);f.sql.exec('UPDATE alarm_subscriptions SET confirm_expires=0');assert.equal((await f.call('confirm',{token:f.extract('confirm')})).status,400);
});
test('repeated/case variants cannot send duplicate confirmation or overwrite topics',async()=>{
 const f=fixture();await f.subscribe();await Promise.all([f.subscribe(),f.subscribe({email:'user@EXAMPLE.TEST',topics:['criminal']})]);assert.equal(f.emails.length,1);assert.equal(f.sql.prepare('SELECT topics FROM alarm_subscriptions').get().topics,'["labour"]');
});
test('address and IP limits persist and reject abuse',async()=>{
 const f=fixture();for(let n=0;n<55;n++)await f.subscribe({email:`a${n}@example.test`});assert.equal(f.emails.length,50);assert.equal((await f.subscribe()).status,429);
});
test('origin, body size, content type and admin authentication fail closed',async()=>{
 const f=fixture();assert.equal((await f.call('subscribe',{},'POST',{origin:'https://evil.test'})).status,403);assert.equal((await f.call('subscribe',{},'POST',{'content-type':'text/plain'})).status,415);assert.equal((await f.call('subscribe',{pad:'x'.repeat(9000)})).status,413);assert.equal((await f.call('records',f.record())).status,403);assert.equal((await f.call('dispatch')).status,403);
});
test('unverified, historical, future and nonofficial records rejected',async()=>{
 const f=fixture();for(const p of [{state:'draft'},{source_url:'https://slvesnik.com.mk.evil.test/x'},{source_url:'http://slvesnik.com.mk/x'},{source_url:'https://slvesnik.com.mk/x?tracking=1'},{reviewer:''},{evidence:''},{published_at:1},{verified_at:Date.now()+100000},{published_at:Date.now()+100000}])assert.equal((await f.ingest(f.record(p))).status,400);assert.equal(f.sql.prepare('SELECT count(*) n FROM alarm_records').get().n,0);
});
test('only confirmed, matching new records send once under concurrent dispatch',async()=>{
 const f=fixture();await f.active();await f.ingest(f.record());await Promise.all([dispatch(f.env),dispatch(f.env)]);assert.equal(f.emails.length,2);assert.match(f.emails[1].body.text,/https:\/\/www.slvesnik.com.mk/);assert.equal(f.sql.prepare('SELECT state FROM alarm_deliveries').get().state,'sent');await dispatch(f.env);assert.equal(f.emails.length,2);
});
test('canonical source cannot be reimported under another id',async()=>{
 const f=fixture();await f.active();await f.ingest(f.record());await f.ingest(f.record({id:'alias'}));assert.equal(f.sql.prepare('SELECT count(*) n FROM alarm_records').get().n,1);await dispatch(f.env);assert.equal(f.emails.length,2);
});
test('wrong topic, withdrawn and preconfirmation records do not notify',async()=>{
 const f=fixture();await f.active();await f.ingest(f.record({topics:['criminal']}));await dispatch(f.env);assert.equal(f.emails.length,1);f.sql.exec("UPDATE alarm_records SET topics='[\"labour\"]', state='withdrawn'");await dispatch(f.env);assert.equal(f.emails.length,1);f.sql.exec("UPDATE alarm_records SET state='verified'; UPDATE alarm_subscriptions SET confirmed_at=confirmed_at+10000");await dispatch(f.env);assert.equal(f.emails.length,1);
});
test('topics require management capability; unsubscribe idempotent even when sending disabled',async()=>{
 const f=fixture();await f.active();assert.equal((await f.call('topics',{token:'a'.repeat(64),topics:['criminal']})).status,400);assert.equal((await f.call('topics',{token:f.extract('manage'),topics:['criminal']})).status,200);f.env.ALARM_ENABLED='false';for(let i=0;i<2;i++)assert.equal((await f.call('unsubscribe',{token:f.extract('manage')})).status,200);const row=f.sql.prepare('SELECT * FROM alarm_subscriptions').get();assert.equal(row.state,'unsubscribed');assert.equal(row.address_cipher,null);assert.equal(row.manage_cipher,null);f.env.ALARM_ENABLED='true';await f.subscribe();assert.equal(f.emails.length,1);
});
test('uncertain delivery never retries, including beyond provider idempotency window',async()=>{
 const f=fixture();await f.active();await f.ingest(f.record());f.setFailure(true);await dispatch(f.env);assert.equal(f.sql.prepare('SELECT state FROM alarm_deliveries').get().state,'uncertain');f.setFailure(false);await dispatch(f.env,Date.now()+3*86400000);assert.equal(f.emails.length,2);
});
test('pending/active suppression, cleanup and unsubscribe before dispatch prevent delivery',async()=>{
 const f=fixture();await f.subscribe();await f.ingest(f.record());await dispatch(f.env);assert.equal(f.emails.length,1);await cleanupLegalAlarm(f.env,Date.now()+2*86400000);const row=f.sql.prepare('SELECT * FROM alarm_subscriptions').get();assert.equal(row.state,'suppressed');assert.equal(row.address_cipher,null);assert.equal((await f.call('confirm',{token:f.extract('confirm')})).status,400);
});
test('provider suppression cancels further notifications',async()=>{
 const f=fixture();await f.active();await f.ingest(f.record());const id=f.sql.prepare('SELECT id FROM alarm_subscriptions').get().id;await f.call('suppress',{id},'POST',{authorization:`Bearer ${f.env.ALARM_ADMIN_SECRET}`});await dispatch(f.env);assert.equal(f.emails.length,1);
});
test('frontend keeps capabilities in fragment, requires click and leaves legacy intact',()=>{
 const js=readFileSync(new URL('../assets/legal-alarm.js',import.meta.url),'utf8');assert.match(js,/history.replaceState/);assert.match(js,/guarded\(document.getElementById\('confirm'\)/);const legacy=readFileSync(new URL('../sluzben-vesnik/index.html',import.meta.url),'utf8');assert.match(legacy,/aiAdvokatGazetteAlertV1/);assert.match(legacy,/mailto:/);
});
test('crash after claim cannot produce an automatic duplicate',async()=>{
 const f=fixture();await f.active();await f.ingest(f.record());const s=f.sql.prepare('SELECT id FROM alarm_subscriptions').get();f.sql.prepare("INSERT INTO alarm_deliveries VALUES (?,?,'claimed',?,NULL)").run(s.id,'issue-2026-1',Date.now());await dispatch(f.env);assert.equal(f.emails.length,1);
});
test('unsubscribe before dispatch prevents all new delivery',async()=>{
 const f=fixture();await f.active();await f.ingest(f.record());await f.call('unsubscribe',{token:f.extract('manage')});await dispatch(f.env);assert.equal(f.emails.length,1);
});
test('record is revalidated after ingestion, not just trusted by state flag',async()=>{
 const f=fixture();await f.active();await f.ingest(f.record());f.sql.exec("UPDATE alarm_records SET source_url='https://evil.test/fake'");await dispatch(f.env);assert.equal(f.emails.length,1);
});
test('nonmatching topics cannot starve eligible records beyond the batch limit',async()=>{
 const f=fixture();await f.active();for(let i=0;i<101;i++)await f.ingest(f.record({id:'nonmatching-'+i,source_url:`https://www.slvesnik.com.mk/other-${i}.pdf`,topics:['criminal']}));await f.ingest(f.record());await dispatch(f.env);assert.equal(f.emails.length,2);
});
