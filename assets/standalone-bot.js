import { detectConfidentialCasePrompt } from '../src/chat-privacy.js';

const $ = id => document.getElementById(id);
const base = location.hostname.endsWith('workers.dev') ? location.origin : 'https://ai-advokat-github-io.aiadvokat16.workers.dev';
let key = '', history = [], pending = null, generation = 0;
let sessionId = crypto.randomUUID();
const welcome = $('welcome').cloneNode(true);

function status(text) { $('status').textContent = text; }
function busy(value) {
  $('send').disabled = value || !key;
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
    reset(); key = candidate; busy(false); $('login').close();
    status('Професионален пристап · ' + data.membership.planCode + ' · OpenAI се проверува при секое барање.');
    $('question').focus();
  } catch { $('loginStatus').textContent = 'Клучот не е активен или услугата не е достапна. Обидете се повторно.'; }
  finally { $('loginSubmit').disabled = false; }
};
$('newChat').onclick = () => { reset(); status(key ? 'Нов разговор · професионален пристап.' : 'Внесете професионален клуч преку ⋯.'); };
$('logout').onclick = () => { key = ''; reset(); $('login').close(); status('Сесијата е избришана.'); };
$('stop').onclick = () => pending?.abort();
$('question').oninput = () => { $('question').style.height = 'auto'; $('question').style.height = Math.min($('question').scrollHeight,180) + 'px'; };
$('question').onkeydown = event => { if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) { event.preventDefault(); $('composer').requestSubmit(); } };
$('question').addEventListener('paste', event => { if (event.clipboardData?.files?.length) { event.preventDefault(); $('plus').open = true; status('Прикачете ги документите во приватниот простор преку „+“.'); } });
$('composer').addEventListener('dragover', event => event.preventDefault());
$('composer').addEventListener('drop', event => { event.preventDefault(); $('plus').open = true; status('Документите се прикачуваат во приватниот простор преку „+“.'); });
$('composer').onsubmit = async event => {
  event.preventDefault(); const q = $('question').value.trim();
  if (pending || q.length < 2) return;
  if (!key) { $('access').click(); return; }
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
    const data = await request('/api/bot',{signal:controller.signal,body:{q,sessionId,mode:'auto',guideIds:ids,history:history.slice(-8),attachments:[]}});
    if (epoch !== generation) return;
    const article = message('assistant',data.answer || 'Нема одговор.',data.model || 'OpenAI'); sources(article,data);
    history.push({role:'user',text:q},{role:'assistant',text:String(data.answer || '').slice(0,4000)}); history = history.slice(-24);
    status('Одговорот е работен материјал. Проверете ги наведените извори.');
  } catch (error) {
    if (epoch !== generation) return;
    if (error.status === 401) { key = ''; status('Пристапот истекол. Внесете активен клуч преку ⋯.'); }
    else if (error.name === 'AbortError') status('Барањето е запрено или истече времето за одговор. Можете да се обидете повторно.');
    else status(error.status === 404 ? 'Новата верзија на серверот сè уште не е објавена.' : error.message);
    $('question').value = q;
  } finally {
    clearTimeout(timeout);
    if (epoch === generation) { pending = null; busy(false); $('question').focus(); }
  }
};
$('exportChat').onclick = () => {
  if (!history.length) { status('Сè уште нема завршен разговор за преземање.'); return; }
  const text = 'AI Advokat — работен разговор\nПотребна е професионална проверка.\n\n' + history.map(m => (m.role === 'user' ? 'Вие' : 'AI Advokat') + ':\n' + m.text).join('\n\n');
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const a = document.createElement('a'); a.href = url; a.download = 'AI-Advokat-razgovor.txt'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
  $('menu').open = false;
};
