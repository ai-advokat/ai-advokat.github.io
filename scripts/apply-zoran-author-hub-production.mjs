#!/usr/bin/env node
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const changed = [];
const file = (relative) => path.join(root, relative);

async function exists(relative) {
  try { await access(file(relative)); return true; } catch { return false; }
}

async function patch(relative, transform, optional = false) {
  if (!(await exists(relative))) {
    if (optional) return;
    throw new Error(`${relative}: file not found`);
  }
  const before = await readFile(file(relative), "utf8");
  const after = transform(before);
  if (after === before) return;
  await writeFile(file(relative), after, "utf8");
  changed.push(relative);
}

function insertBefore(content, anchor, block, marker, relative) {
  if (content.includes(marker)) return content;
  const index = content.indexOf(anchor);
  if (index < 0) throw new Error(`${relative}: missing anchor ${anchor.slice(0, 80)}`);
  return content.slice(0, index) + block + "\n" + content.slice(index);
}

function replaceOnce(content, search, replacement, relative) {
  if (content.includes(replacement)) return content;
  const index = content.indexOf(search);
  if (index < 0) throw new Error(`${relative}: missing anchor ${search.slice(0, 80)}`);
  return content.slice(0, index) + replacement + content.slice(index + search.length);
}

async function patchProfessionalLibrary() {
  const relative = "professional-library/index.html";
  await patch(relative, (html) => {
    let out = html;
    out = insertBefore(out, "</head>", '<script defer src="/assets/analytics.js"></script>', 'src="/assets/analytics.js"', relative);
    if (!out.includes('href="/authors/zoran-stojankic/"')) {
      out = replaceOnce(out, '<a href="/guides/">Практични водичи</a>', '<a href="/authors/zoran-stojankic/">Трудови на Зоран Стојанкиќ</a><a href="/guides/">Практични водичи</a>', relative);
    }
    const block = `<!-- ZORAN_AUTHOR_HUB_CARD_START -->
<section id="zoran-author-hub-card" class="audit" style="margin-top:24px;border:2px solid var(--gold);background:linear-gradient(135deg,#fff8e8,#fff)">
  <div style="text-transform:uppercase;letter-spacing:.08em;font-weight:800;color:#173d66;font-size:.78rem">AUTHOR HUB · DOI · ZENODO · ACADEMY</div>
  <h2 style="margin-bottom:.35rem">Трудови на Зоран Стојанкиќ</h2>
  <p>Централен авторски каталог со научно-стручни трудови, DOI и Zenodo записи, професионални прирачници, правни коментари и директна врска со Nenad Lex Nova Academy.</p>
  <p><a href="/authors/zoran-stojankic/"><strong>Отвори ја научната, правната и професионалната библиотека →</strong></a></p>
</section>
<!-- ZORAN_AUTHOR_HUB_CARD_END -->`;
    return insertBefore(out, '<section id="zkp-commentary-v6-2026"', block, "ZORAN_AUTHOR_HUB_CARD_START", relative);
  });
}

async function patchAcademy() {
  const relative = "academy/index.html";
  await patch(relative, (html) => {
    let out = html;
    if (!out.includes('href="/authors/zoran-stojankic/"')) {
      out = replaceOnce(out, '<li><a href="/membership.html">Членство</a></li>', '<li><a href="/authors/zoran-stojankic/">Трудови на Зоки</a></li><li><a href="/membership.html">Членство</a></li>', relative);
    }
    const block = `<!-- ZORAN_ACADEMY_BRIDGE_START -->
<section id="zoran-academy-bridge" aria-labelledby="zoranAcademyBridgeTitle"><div class="wrap"><div class="panel gold"><span class="tag" style="color:#775e31">AUTHOR LIBRARY · ZENODO · DOI</span><h2 id="zoranAcademyBridgeTitle">Од трудовите на Зоран Стојанкиќ до практична Academy-програма</h2><p>Централниот авторски каталог ги поврзува објавените научно-стручни трудови, професионалните прирачници и правните коментари со предавања, masterclass-сесии, симулации и работни материјали под Human Gate.</p><div class="actions"><a class="btn primary" href="/authors/zoran-stojankic/">Отвори ги трудовите</a><a class="btn" href="/professional-library/">Стручна библиотека</a></div></div></div></section>
<!-- ZORAN_ACADEMY_BRIDGE_END -->`;
    return insertBefore(out, '<section id="research-library">', block, "ZORAN_ACADEMY_BRIDGE_START", relative);
  });
}

async function patchGazette() {
  const relative = "sluzben-vesnik/index.html";
  await patch(relative, (html) => {
    let out = html;
    out = insertBefore(out, "</head>", '<script defer src="/assets/analytics.js"></script>', 'src="/assets/analytics.js"', relative);
    if (!out.includes('href="/authors/zoran-stojankic/"')) {
      out = replaceOnce(out, '<a href="/governance.html">Проверливост</a>', '<a href="/authors/zoran-stojankic/">Трудови</a><a href="/governance.html">Проверливост</a>', relative);
    }
    const css = `/* ZORAN_GAZETTE_ALERT_CSS_START */
.alertPanel{background:linear-gradient(135deg,#fff8e8,#fff);border:1px solid #ead8b2;border-radius:18px;padding:24px;margin:22px 0;box-shadow:var(--shadow)}.alertPanel h2{margin:.3rem 0 .6rem;font-size:1.55rem}.alertPanel p{color:var(--muted)}.alertForm{display:grid;grid-template-columns:1.5fr 1fr 1.2fr auto;gap:10px;align-items:end;margin-top:16px}.alertForm label{display:block;font-size:.82rem;font-weight:850}.alertForm input,.alertForm select{width:100%;padding:11px;border:1px solid var(--line);border-radius:10px;background:#fff;min-height:44px}.alertStatus{margin-top:12px;padding:11px 13px;border-radius:10px;background:#fff;border:1px solid var(--line);color:var(--muted);font-size:.9rem}.alertStatus.saved{border-color:#bddbc9;color:var(--ok);background:#edf8f2}.privacyMini{font-size:.82rem;color:var(--muted);margin-top:10px}@media(max-width:900px){.alertForm{grid-template-columns:1fr 1fr}}@media(max-width:560px){.alertForm{grid-template-columns:1fr}}
/* ZORAN_GAZETTE_ALERT_CSS_END */`;
    out = insertBefore(out, "</style>", css, "ZORAN_GAZETTE_ALERT_CSS_START", relative);
    const block = `<!-- ZORAN_GAZETTE_ALERT_START -->
<section class="alertPanel" id="legal-alert" aria-labelledby="legalAlertTitle">
  <div class="eyebrow">ПРАВЕН АЛАРМ · ЛОКАЛНА ПРЕФЕРЕНЦИЈА · PRIVACY FIRST</div>
  <h2 id="legalAlertTitle">Следете број, пропис, институција или правна област</h2>
  <p>Зачувајте што сакате да следите во овој прелистувач и подгответе барање за известување. Додека не се активира посебен backend со согласност и одјава, AI Advokat <strong>не тврди дека автоматски испраќа е-пораки</strong>.</p>
  <form class="alertForm" id="gazetteAlertForm">
    <div><label for="alertKeyword">Клучен збор / пропис / институција</label><input id="alertKeyword" name="keyword" type="text" maxlength="120" placeholder="на пр. ЗКП, Министерство за правда"></div>
    <div><label for="alertScope">Опфат</label><select id="alertScope" name="scope"><option value="all">Сите нови записи</option><option value="law">Закони и измени</option><option value="bylaw">Правилници и подзаконски акти</option><option value="municipal">Локални гласила</option></select></div>
    <div><label for="alertEmail">Е-пошта (по избор)</label><input id="alertEmail" name="email" type="email" autocomplete="email" placeholder="име@example.com"></div>
    <button class="btn primary" type="submit">Зачувај избор</button>
  </form>
  <div class="source-actions"><a class="btn" id="gazetteAlertMail" href="mailto:aiadvokat16@gmail.com?subject=Правен%20аларм%20-%20барање">Испрати барање по е-пошта</a><button class="btn" id="gazetteAlertClear" type="button">Избриши локален избор</button></div>
  <div class="alertStatus" id="gazetteAlertStatus" role="status">Нема зачувана локална преференција.</div>
  <div class="privacyMini">Локалното зачувување користи localStorage на вашиот уред. Адресата не се испраќа на сервер со копчето „Зачувај избор“.</div>
</section>
<!-- ZORAN_GAZETTE_ALERT_END -->`;
    out = insertBefore(out, '<section class="stats" aria-label="Статистика">', block, "ZORAN_GAZETTE_ALERT_START", relative);
    const script = `<!-- ZORAN_GAZETTE_ALERT_SCRIPT_START -->
<script>
(function(){"use strict";var key="aiAdvokatGazetteAlertV1",form=document.getElementById("gazetteAlertForm"),keyword=document.getElementById("alertKeyword"),scope=document.getElementById("alertScope"),email=document.getElementById("alertEmail"),status=document.getElementById("gazetteAlertStatus"),mail=document.getElementById("gazetteAlertMail"),clear=document.getElementById("gazetteAlertClear");if(!form)return;function safe(value){return String(value||"").replace(/[\\r\\n]+/g," ").slice(0,160);}function updateMail(){var body="Сакам да добивам известување за: "+safe(keyword.value)+"%0AОпфат: "+encodeURIComponent(scope.value)+"%0AЕ-пошта: "+encodeURIComponent(email.value||"не е внесена");mail.href="mailto:aiadvokat16@gmail.com?subject="+encodeURIComponent("Правен аларм - барање")+"&body="+body;}function showSaved(record){status.className="alertStatus saved";status.textContent="Зачувано локално: "+(record.keyword||"сите записи")+" · "+record.scope+". Автоматско испраќање е-пошта сè уште не е активирано.";}try{var saved=JSON.parse(localStorage.getItem(key)||"null");if(saved){keyword.value=saved.keyword||"";scope.value=saved.scope||"all";email.value=saved.email||"";showSaved(saved);}}catch(e){}updateMail();form.addEventListener("submit",function(event){event.preventDefault();var record={keyword:safe(keyword.value),scope:scope.value,email:safe(email.value),updated_at:new Date().toISOString()};try{localStorage.setItem(key,JSON.stringify(record));showSaved(record);}catch(e){status.className="alertStatus";status.textContent="Прелистувачот не дозволи локално зачувување. Користете го копчето за е-пошта.";}updateMail();});[keyword,scope,email].forEach(function(el){el.addEventListener("input",updateMail);});clear.addEventListener("click",function(){try{localStorage.removeItem(key);}catch(e){}keyword.value="";scope.value="all";email.value="";status.className="alertStatus";status.textContent="Локалната преференција е избришана.";updateMail();});})();
</script>
<!-- ZORAN_GAZETTE_ALERT_SCRIPT_END -->`;
    return insertBefore(out, "</body>", script, "ZORAN_GAZETTE_ALERT_SCRIPT_START", relative);
  });
}

async function patchSitemaps() {
  await patch("sitemap.xml", (xml) => {
    const url = "https://ai-advokat.github.io/authors/zoran-stojankic/";
    if (xml.includes(url)) return xml;
    return insertBefore(xml, "</urlset>", `  <url>\n    <loc>${url}</loc>\n    <lastmod>2026-10-20</lastmod>\n  </url>`, url, "sitemap.xml");
  }, true);
  await patch("sitemap.txt", (txt) => {
    const url = "https://ai-advokat.github.io/authors/zoran-stojankic/";
    if (txt.includes(url)) return txt;
    return txt.replace(/\s*$/, "\n") + url + "\n";
  }, true);
}

async function main() {
  if (!(await exists("authors/zoran-stojankic/index.html"))) throw new Error("author hub overlay missing");
  if (!(await exists("data/zoran-stojankic-publications.json"))) throw new Error("publication registry missing");
  await patchProfessionalLibrary();
  await patchAcademy();
  await patchGazette();
  await patchSitemaps();
  console.log(changed.length ? `Updated: ${changed.join(", ")}` : "No changes required.");
}

main().catch((error) => { console.error(error.stack || error.message); process.exitCode = 1; });
