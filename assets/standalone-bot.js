import { localGuideDocuments } from './bot-materials.mjs';
import { detectConfidentialCasePrompt, redactConfidentialCasePrompt } from '../src/chat-privacy.js';
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
  const normalizedText=String(text||'').trim();
  if(role==='user'){
    const last=$('messages')?.lastElementChild;
    const lastText=last?.classList?.contains('user') ? String(last.querySelector('.text')?.textContent||'').trim() : '';
    if(lastText && lastText===normalizedText) return last;
  }
  const article = document.createElement('article');
  article.className = 'message ' + role;
  const body = document.createElement('div'); body.className = 'text'; body.textContent = normalizedText;
  article.append(body);
  if (model) { const meta = document.createElement('small'); meta.textContent = model; article.append(meta); }
  $('messages').append(article);
  article.scrollIntoView({block:'end'});
  return article;
}
function ensureLegalPulseStyles() {
  if (document.getElementById('legalPulseRuntimeStyle')) return;
  const style = document.createElement('style');
  style.id = 'legalPulseRuntimeStyle';
  style.textContent = `
    .message.response-pending{margin-bottom:18px}
    .legal-pulse{--pulse-gold:#d8b56a;--pulse-goldhot:#ffd88b;--pulse-lilachot:#b16cff;position:relative;display:inline-flex;align-items:center;gap:8px;width:auto;max-width:100%;min-height:42px;padding:5px 9px 5px 6px;border:1px solid rgba(216,181,106,.34);border-radius:999px;background:linear-gradient(135deg,rgba(7,24,44,.96),rgba(18,36,62,.96));box-shadow:0 5px 14px rgba(4,15,29,.12);color:#fff}
    .legal-pulse-mark{position:relative;flex:none;width:44px;height:34px;display:grid;place-items:center}
    .legal-pulse-ring{position:absolute;inset:2px 1px;border:1px solid rgba(216,181,106,.58);border-radius:50%;transform:rotate(12deg);box-shadow:0 0 6px rgba(127,69,217,.18);animation:legalPulseOrbit 3.8s linear infinite}
    .legal-pulse-ring:before,.legal-pulse-ring:after{content:"";position:absolute;width:4px;height:4px;top:50%;border-radius:50%;transform:translateY(-50%)}
    .legal-pulse-ring:before{left:-2px;background:var(--pulse-lilachot);box-shadow:0 0 5px rgba(177,108,255,.8)}
    .legal-pulse-ring:after{right:-2px;background:var(--pulse-goldhot);box-shadow:0 0 5px rgba(255,216,139,.8)}
    .legal-pulse-pair{position:relative;z-index:2;display:flex;align-items:center}
    .legal-pulse-sec{display:inline-block;font-family:Georgia,"Times New Roman",serif;font-size:25px;line-height:.86;font-weight:700;transform-origin:50% 52%}
    .legal-pulse-left{color:var(--pulse-goldhot);text-shadow:0 0 5px rgba(255,216,139,.48);animation:legalPulseLeft 2.5s ease-in-out infinite}
    .legal-pulse-right{color:#d9b2ff;text-shadow:0 0 5px rgba(177,108,255,.48);animation:legalPulseRight 2.5s ease-in-out infinite}
    .legal-pulse-copy{min-width:0;color:#e8edf4;font-size:.72rem;line-height:1.2;font-weight:650;white-space:nowrap}
    .legal-pulse-dots{display:flex;gap:3px}.legal-pulse-dots i{width:4px;height:4px;border-radius:50%;background:#66788c;animation:legalPulseDot 1.35s ease-in-out infinite}
    .legal-pulse-dots i:nth-child(2){animation-delay:.18s}.legal-pulse-dots i:nth-child(3){animation-delay:.36s}
    @keyframes legalPulseOrbit{to{transform:rotate(372deg)}}@keyframes legalPulseLeft{0%,100%{transform:rotateY(0) rotateZ(-2deg)}50%{transform:rotateY(180deg) rotateZ(2deg)}}@keyframes legalPulseRight{0%,100%{transform:rotateY(0) rotateZ(2deg)}50%{transform:rotateY(-180deg) rotateZ(-2deg)}}@keyframes legalPulseDot{0%,100%{background:#66788c;transform:scale(.8);opacity:.55}45%{background:var(--pulse-lilachot);transform:scale(1.18);opacity:1}70%{background:var(--pulse-goldhot);transform:scale(1);opacity:.9}}
    @media(max-width:520px){.legal-pulse{gap:6px;min-height:38px;padding:4px 8px 4px 5px}.legal-pulse-mark{width:39px;height:30px}.legal-pulse-sec{font-size:22px}.legal-pulse-copy{font-size:.66rem}}
    @media(prefers-reduced-motion:reduce){.legal-pulse-ring,.legal-pulse-sec,.legal-pulse-dots i{animation:none!important}}
  `;
  document.head.append(style);
}

function responsePulse() {
  ensureLegalPulseStyles();
  $('welcome')?.remove();
  const article = document.createElement('article');
  article.className = 'message assistant response-pending';
  article.setAttribute('role','status');
  article.setAttribute('aria-live','polite');
  article.setAttribute('aria-label','AI Advokat го подготвува одговорот');
  const pulse = document.createElement('div');
  pulse.className = 'legal-pulse';
  pulse.innerHTML = '<span class="legal-pulse-mark" aria-hidden="true"><span class="legal-pulse-ring"></span><span class="legal-pulse-pair"><span class="legal-pulse-sec legal-pulse-left">§</span><span class="legal-pulse-sec legal-pulse-right">§</span></span></span><span class="legal-pulse-copy">AI Advokat подготвува одговор…</span><span class="legal-pulse-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
  article.append(pulse);
  $('messages').append(article);
  article.scrollIntoView({block:'end'});
  return article;
}
function sources(article, data) {
  // Display only source rows returned by the governed backend. Browser-side guide
  // matches are routing hints, not proof that the final answer relied on a guide.
  const rows = ['sources','legalSources','caseLawSources','guideSources','publicationSources'].flatMap(k => Array.isArray(data[k]) ? data[k] : []);
  const details = document.createElement('details'); details.className = 'sources';
  const summary = document.createElement('summary'); summary.textContent = 'Извори'; details.append(summary);
  const seen = new Set();
  for (const row of rows) {
    const label = String(row.title || row.label || row.name || '').trim();
    const raw = row.url || row.sourceUrl || row.source_url;
    let url = null; try { url = new URL(raw); } catch {}
    if (url && url.protocol === 'https:') {
      if (seen.has(url.href)) continue;
      seen.add(url.href);
      const a = document.createElement('a'); a.href = url.href; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.textContent = label || url.hostname; details.append(a);
    } else if (label && !seen.has('label:' + label)) {
      // Sources without a public URL (e.g. the approved ZKP commentary) are shown as plain text, never dropped.
      seen.add('label:' + label);
      const span = document.createElement('span'); span.className = 'source-text'; span.textContent = label;
      span.style.cssText = 'display:block;padding:5px 0;color:var(--muted)';
      details.append(span);
    }
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
async function guideMatches(q, signal) {
  try {
    const responses = await Promise.all(['/data/guides.json','/data/public-practical-guides-38-73.json'].map(url => fetch(url,{signal})));
    const data = await Promise.all(responses.map(r => r.ok ? r.json() : {}));
    const records = new Map((data[0].records || []).map(r => [String(r.id),r]));
    for (const row of data[1].guides || []) records.set(String(row.id),{...records.get(String(row.id)),...row});
    return window.AIAdvokatGuideRouter?.routeGuides(q,[...records.values()],{limit:3,minScore:10}) || [];
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

  let outboundQ=q, privacyRedacted=false;
  const privacy=detectConfidentialCasePrompt(q);
  if (privacy.confidential) {
    const redacted=redactConfidentialCasePrompt(q);
    if (redacted.changed && redacted.safeToSend) {
      outboundQ=redacted.text;
      privacyRedacted=true;
    } else {
      status('Овој текст содржи доверливи детали што не можам сигурно да ги маскирам автоматски. Ништо не е испратено. Можете да ги отстраните идентификаторите и повторно да испратите, или да го користите „+“ само ако точните податоци се неопходни за документот.');
      return;
    }
  }

  const epoch = generation, controller = new AbortController(); pending = controller; busy(true);
  const timeout = setTimeout(() => controller.abort(),180000);
  message('user',outboundQ); $('question').value = ''; $('question').style.height = '';
  const pulse = responsePulse();
  status(privacyRedacted
    ? 'Чувствителните идентификатори се маскирани локално и оригиналните вредности не се испратени. Го подготвувам одговорот…'
    : 'Ги проверувам материјалите и го подготвувам одговорот…');
  try {
    const guides = await guideMatches(outboundQ,controller.signal), ids = guides.map(g => g.id);
    const guideDocuments = await localGuideDocuments(window.AIAdvokatGuideVault,ids,$('useLocalGuides').checked);
    const data = await request('/api/bot',{signal:controller.signal,body:{q:outboundQ,sessionId,mode:$('researchMode').value,guideIds:ids,guideDocuments,history:history.slice(-8),attachments:[]}});
    if (epoch !== generation) return;
    pulse.remove();
    const article = message('assistant',data.answer || 'Нема одговор.',data.model || 'OpenAI'); sources(article,data);
    history.push({role:'user',text:outboundQ},{role:'assistant',text:String(data.answer || '').slice(0,6000)}); history = history.slice(-24);
    status(privacyRedacted
      ? 'Одговорот е работен материјал. Личните идентификатори беа маскирани локално и не беа испратени.'
      : 'Одговорот е работен материјал. Проверете ги наведените извори.');
  } catch (error) {
    pulse.remove();
    if (epoch !== generation) return;
    if (error.status === 401) { key = ''; forgetDeviceAccess(deviceStorage); status('Пристапот истекол. Внесете активен код преку ⋯.'); }
    else if (error.name === 'AbortError') status('Барањето е запрено или истече времето за одговор. Можете да се обидете повторно.');
    else status(error.status === 404 ? 'Новата верзија на серверот сè уште не е објавена.' : error.message);
    $('question').value = q;
  } finally {
    pulse.remove();
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
