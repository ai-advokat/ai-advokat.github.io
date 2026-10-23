import { localGuideDocuments } from './bot-materials.mjs';
import { detectConfidentialCasePrompt } from '../src/chat-privacy.js';
import { readDeviceAccess, saveDeviceAccess, forgetDeviceAccess } from './bot-device-access.mjs';
// Accessing localStorage itself can throw when browser storage is disabled.
let deviceStorage;
try { deviceStorage = window.localStorage; } catch {}

const $ = id => document.getElementById(id);
const base = location.hostname.endsWith('workers.dev') ? location.origin : 'https://ai-advokat-github-io.aiadvokat16.workers.dev';
let key = '', history = [], pending = null, generation = 0;
let sessionId = crypto.randomUUID();
const welcome = $('welcome').cloneNode(true);

function status(text) { $('status').textContent = text; }
function busy(value) {
  $('send').disabled = value;
  $('stop').hidden = !value;
  $('send').hidden = value;
  $('question').disabled = value;
  $('newChat').disabled = value;
  $('access').disabled = value;
}
function message(role, text, model = '') {
  $('welcome')?.remove();
  const article = document.createElement('article');
  article.className = 'message ' + role;
  const body = document.createElement('div'); body.className = 'text'; body.textContent = text;
  article.append(body);
  if (model) { const meta = document.createElement('small'); meta.textContent = model; article.append(meta); }
  $('messages').append(article);
  article.scrollIntoView({block:'end'});
  return article;
}
function sources(article, data) {
  const rows = ['sources','legalSources','caseLawSources','guideSources','publicationSources'].flatMap(k => Array.isArray(data[k]) ? data[k] : []);
  const details = document.createElement('details'); details.className = 'sources';
  const summary = document.createElement('summary'); summary.textContent = 'Извори'; details.append(summary);
  const seen = new Set();
  for (const row of rows) {
    const raw = row.url || row.sourceUrl || row.source_url;
    let url; try { url = new URL(raw); } catch { continue; }
    if (url.protocol !== 'https:' || seen.has(url.href)) continue;
    seen.add(url.href);
    const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.textContent = row.title || row.label || row.name || url.hostname; details.append(a);
  }
  if (seen.size) article.append(details);
}
async function request(path, {token=key, body, signal} = {}) {
  const response = await fetch(base + path, {
    method:body ? 'POST' : 'GET', signal, cache:'no-store',
    headers:{accept:'application/json', authorization:'Bearer ' + token, ...(body ? {'content-type':'application/json'} : {})},
    ...(body ? {body:JSON.stringify(body)} : {})
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) {
    const error = new Error(data.message || data.error || 'Услугата не е достапна (' + response.status + ').');
    error.code = data.error; error.status = response.status; throw error;
  }
  return data;
}
async function guideIds(q, signal) {
  try {
    const responses = await Promise.all(['/data/guides.json','/data/public-practical-guides-38-73.json'].map(url => fetch(url,{signal})));
    const data = await Promise.all(responses.map(r => r.ok ? r.json() : {}));
    const records = new Map((data[0].records || []).map(r => [String(r.id),r]));
    for (const row of data[1].guides || []) records.set(String(row.id),{...records.get(String(row.id)),...row});
    return (window.AIAdvokatGuideRouter?.routeGuides(q,[...records.values()],{limit:3,minScore:10}) || []).map(r => r.id);
  } catch { return []; }
}
function reset() {
  generation++; pending?.abort(); pending = null; history = []; sessionId = crypto.randomUUID();
  $('useLocalGuides').checked = false;
  $('messages').replaceChildren(welcome.cloneNode(true)); $('question').value = ''; $('question').style.height = '';
  $('menu').open = false; busy(false);
}
$('access').onclick = () => { $('menu').open = false; $('loginStatus').textContent = ''; $('login').showModal(); };
$('closeLogin').onclick = () => $('login').close();
$('login').addEventListener('close', () => { $('key').value = ''; });
$('loginForm').onsubmit = async event => {
  event.preventDefault();
  const candidate = $('key').value.trim();
  if (!candidate || candidate.startsWith('sk-')) { $('loginStatus').textContent = 'Потребен е AI Advokat членски клуч, не OpenAI API клуч.'; return; }
  $('loginSubmit').disabled = true; $('loginStatus').textContent = 'Го проверувам пристапот…';
  const epoch = generation;
  try {
    const data = await request('/api/membership/status',{token:candidate,signal:AbortSignal.timeout(20000)});
    if (epoch !== generation || !$('login').open) return;
    reset(); key = candidate;
    forgetDeviceAccess(deviceStorage);
    const remembered = $('rememberAccess').checked && saveDeviceAccess(deviceStorage,candidate);
    busy(false); $('login').close();
    status('Професионален пристап · ' + data.membership.planCode + ' · OpenAI се проверува при секое барање.');
    if ($('rememberAccess').checked && !remembered) status('Пристапот е активен, но прелистувачот не дозволува да се запомни.');
    $('question').focus();
  } catch { $('loginStatus').textContent = 'Клучот не е активен или услугата не е достапна. Обидете се повторно.'; }
  finally { $('loginSubmit').disabled = false; }
};
$('newChat').onclick = () => { reset(); status(key ? 'Нов разговор · професионален пристап.' : 'Внесете професионален клуч преку ⋯.'); };
$('logout').onclick = () => { $('useLocalGuides').checked = false; key = ''; forgetDeviceAccess(deviceStorage); reset(); $('login').close(); status('Сесијата и зачуваниот пристап се избришани.'); };
$('stop').onclick = () => pending?.abort();
$('question').oninput = () => { $('question').style.height = 'auto'; $('question').style.height = Math.min($('question').scrollHeight,180) + 'px'; };
$('question').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('composer').requestSubmit(); } };
const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SpeechRecognitionCtor) $('mic').hidden = true;
else $('mic').onclick = () => {
  const rec = new SpeechRecognitionCtor();
  rec.lang = 'mk-MK'; rec.interimResults = false; rec.maxAlternatives = 1;
  status('Слушам… зборувајте на македонски.');
  rec.onresult = event => {
    const spoken = String(event.results?.[0]?.[0]?.transcript || '').trim();
    if (!spoken) return;
    $('question').value = ($('question').value + ' ' + spoken).trim();
    $('question').dispatchEvent(new Event('input'));
    status('Диктирањето е внесено. Проверете го текстот и испратете.');
  };
  rec.onerror = () => status('Диктирањето не успеа. Можете да продолжите со пишување.');
  rec.start();
};
$('question').addEventListener('paste', event => { if (event.clipboardData?.files?.length) { event.preventDefault(); $('plus').open = true; status('Прикачете ги документите во приватниот простор преку „+“.'); } });
$('composer').addEventListener('dragover', event => event.preventDefault());
$('composer').addEventListener('drop', event => { event.preventDefault(); $('plus').open = true; status('Документите се прикачуваат во приватниот простор преку „+“.'); });
$('composer').onsubmit = async event => {
  event.preventDefault(); const q = $('question').value.trim();
  if (pending || q.length < 2) return;
  if (!key) { status('Најпрво внесете го вашиот приватен код за влез.'); $('access').click(); return; }
  if (detectConfidentialCasePrompt(q).confidential) {
    $('question').value = ''; $('plus').open = true;
    status('Ова личи на доверлив предмет. Не е испратено. Продолжете во приватниот простор преку „+“.'); return;
  }
  const epoch = generation, controller = new AbortController(); pending = controller; busy(true);
  const timeout = setTimeout(() => controller.abort(),180000);
  message('user',q); $('question').value = ''; $('question').style.height = '';
  status('Ги проверувам материјалите и го подготвувам одговорот…');
  try {
    const ids = await guideIds(q,controller.signal);
    const guideDocuments = await localGuideDocuments(window.AIAdvokatGuideVault,ids,$('useLocalGuides').checked);
    const data = await request('/api/bot',{signal:controller.signal,body:{q,sessionId,mode:$('researchMode').value,guideIds:ids,guideDocuments,history:history.slice(-8),attachments:[]}});
    if (epoch !== generation) return;
    const article = message('assistant',data.answer || 'Нема одговор.',data.model || 'OpenAI'); sources(article,data);
    history.push({role:'user',text:q},{role:'assistant',text:String(data.answer || '').slice(0,4000)}); history = history.slice(-24);
    status('Одговорот е работен материјал. Проверете ги наведените извори.');
  } catch (error) {
    if (epoch !== generation) return;
    if (error.status === 401) { key = ''; forgetDeviceAccess(deviceStorage); status('Пристапот истекол. Внесете активен код преку ⋯.'); }
    else if (error.name === 'AbortError') status('Барањето е запрено или истече времето за одговор. Можете да се обидете повторно.');
    else status(error.status === 404 ? 'Новата верзија на серверот сè уште не е објавена.' : error.message);
    $('question').value = q;
  } finally {
    clearTimeout(timeout);
    if (epoch === generation) { pending = null; busy(false); $('question').focus(); }
  }
};
async function restoreAccess() {
  const saved = readDeviceAccess(deviceStorage);
  if (!saved) return;
  const epoch = generation;
  status('Го проверувам зачуваниот пристап…');
  try {
    await request('/api/membership/status',{token:saved,signal:AbortSignal.timeout(20000)});
    if (epoch !== generation) return;
    key = saved; busy(false); status('Добредојдовте. Подготвено за разговор.');
  } catch(error) {
    if (epoch !== generation) return;
    if (error.status === 401) forgetDeviceAccess(deviceStorage);
    status('Пристапот не може да се потврди. Отворете ⋯ → Професионален пристап.');
  }
}
restoreAccess();
async function exportLatestAssistant(format) {
  const latest=[...history].reverse().find(item=>item.role==='assistant' && String(item.text||'').trim());
  if(!latest){ status('Сè уште нема AI одговор за извоз.'); return; }
  if(['txt','md'].includes(format)){
    const ext=format;
    const body=format==='md' ? '# AI Advokat — работен одговор\n\n'+latest.text : 'AI Advokat — работен одговор\n\n'+latest.text;
    const url=URL.createObjectURL(new Blob([body],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a'); a.href=url; a.download='AI-Advokat-working-draft.'+ext; a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000); return;
  }
  try{
    const mod=await import('/assets/casepilot-export.js');
    const core=await import('/src/case-export.js');
    const report=core.normalizeCaseExportReport({
      title:'AI Advokat — работен одговор',
      summary:latest.text,
      sections:[{title:'AI Advokat',content:latest.text}],
      humanGate:'Потребна е професионална човечка проверка пред последична употреба.'
    });
    await mod.downloadCasePilotExport(report,format,{filename:'AI-Advokat-working-draft.'+format});
  }catch{
    status('Извозот во '+format.toUpperCase()+' не успеа. Обидете се со TXT или MD.');
  }
}
for(const button of document.querySelectorAll('[data-export]')){
  button.addEventListener('click',()=>exportLatestAssistant(String(button.dataset.export||'txt')));
}

async function refreshRuntimeStatus(){
  const node=$('runtimeStatus'); if(!node) return;
  try{
    const response=await fetch(base+'/api/orchestrator',{headers:{accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(15000)});
    if(!response.ok) throw new Error('runtime_'+response.status);
    const data=await response.json(); const runtime=data?.runtime||{};
    const paid=String(runtime.paidProviderModel||'OpenAI').trim();
    const ready=runtime.providerExecution==='configured_for_api_chat_execution';
    node.textContent=ready ? 'AI runtime: '+paid+' · активен' : 'AI runtime: делумно активен — проверете provider/runtime поставки.';
  }catch{ node.textContent='AI runtime: моментално недостапен за проверка.'; }
}
refreshRuntimeStatus();

$('exportChat').onclick = () => {
  if (!history.length) { status('Сè уште нема завршен разговор за преземање.'); return; }
  const text = 'AI Advokat — работен разговор\nПотребна е професионална проверка.\n\n' + history.map(m => (m.role === 'user' ? 'Вие' : 'AI Advokat') + ':\n' + m.text).join('\n\n');
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'AI-Advokat-razgovor.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  $('menu').open = false;
};

async function vaultStatus() {
  try {
    const state = await window.AIAdvokatGuideVault?.summary();
    $('vaultStatus').textContent = state?.available ? state.count + ' проверени водичи на овој прелистувач.' : 'Локалното чување не е достапно.';
  } catch { $('vaultStatus').textContent = 'Локалната збирка не може да се прочита.'; }
}
function openMaterials() { $('menu').open = false; $('plus').open = false; $('materialsDialog').showModal(); vaultStatus(); }
$('materials').onclick = openMaterials;
$('plusMaterials').onclick = openMaterials;
$('closeMaterials').onclick = () => $('materialsDialog').close();
$('importGuides').onclick = () => $('guideFiles').click();
$('guideFiles').onchange = async () => {
  const files = [...$('guideFiles').files]; $('guideFiles').value = '';
  if (!files.length) return;
  $('importGuides').disabled = true;
  $('vaultStatus').textContent = 'Ги проверувам оригиналните датотеки…';
  try {
    const response = await fetch('/data/guides.json',{cache:'no-store'});
    if (!response.ok) throw new Error('Регистарот не е достапен.');
    const result = await window.AIAdvokatGuideVault.importFiles(files,await response.json());
    $('vaultStatus').textContent = 'Вчитани: ' + result.imported + ' · одбиени: ' + result.rejected + ' · прескокнати: ' + result.skipped + '.';
  } catch { $('vaultStatus').textContent = 'Вчитувањето не успеа. Проверете ги датотеките и пристапот до регистарот.'; }
  finally { $('importGuides').disabled = false; }
};
