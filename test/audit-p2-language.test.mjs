// Audit P2 — reader-facing Macedonian, author records and risk terminology.
import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const page=readFileSync("index.html","utf8");
const chat=readFileSync("assets/ai-advokat-chat.js","utf8");
const scholar=readFileSync("scholar/index.html","utf8");

test("P2 Macedonian ECHR acronym is uniformly ЕСЧП",()=>{
  assert.doesNotMatch(page,/ЕСПЧ/);
  assert.match(page,/ЕСЧП/);
});

test("P2 human review status headings start with an uppercase letter without changing governance identifiers",()=>{
  assert.match(page,/trustLabel2:"Човечка контрола"/);
  assert.match(page,/>Човечка контрола</);
  assert.match(page,/T\("Човечка контрола \(закон\)"/);
});

test("P2 malformed member-level phrase is corrected",()=>{
  assert.doesNotMatch(page,/членте/);
  assert.match(page,/на ниво на член/);
});

test("P2 internal release IDs are not exposed as visible marketing labels",()=>{
  for(const token of ["F0-FAST-27","AIAdvokat4 · LexNova UX","Носечката Zoki corpus-control","LexNova UX + AI Advokat governed backend"]){
    assert.ok(!page.includes(token),"visible internal token leaked: "+token);
  }
});

test("P2 core professional UI has Macedonian labels for the reviewed glossary",()=>{
  for(const term of ["Проактивни правни агенти","меморија на предмети","Отвори адвокатски преглед","Професионален работен простор","Анализа на ризик"]){
    assert.ok(page.includes(term),"missing translated label "+term);
  }
  assert.doesNotMatch(page,/>Предиктор</);
  assert.doesNotMatch(page,/PROFESSIONAL WORKBENCH/);
});

test("P2 Zenodo count distinguishes six published papers and one manual",()=>{
  assert.match(page,/7 DOI записи: 6 стручни труда и 1 прирачник/);
  assert.match(page,/7 DOI records: 6 papers and 1 professional manual/);
  assert.doesNotMatch(page,/Google Scholar · 7 труда/);
  assert.doesNotMatch(page,/Zenodo · 6 објавени труда · 6 научни профили/);
});

test("P2 static Scholar list includes Digital Earnings, without disturbing the canonical scholar index",()=>{
  const start=page.indexOf('id="scholarStaticLinks"');
  assert.ok(start>=0);
  const list=page.slice(start,page.indexOf("</section>",start));
  const urls=[...list.matchAll(/href="(\/scholar\/[^"]+)"\s*>/g)].map(m=>m[1]);
  assert.ok(urls.includes("/scholar/digital-earnings/"));
  assert.equal(new Set(urls).size,6);
  assert.match(scholar,/\/scholar\/digital-earnings\//);
});

test("P2 evidence panel has a true initial state, not fabricated missing sources",()=>{
  assert.match(chat,/Изворите ќе се појават тука по првиот одговор/);
  assert.doesNotMatch(chat,/Последниот AI одговор нема source payload/);
  assert.match(chat,/m\s*\? evidenceCard\("Нема прикажани извори"/);
});

test("P2 risk tool retains internal routing key but does not claim outcome prediction",()=>{
  assert.match(page,/data-ai-workbench="predictor"/);
  assert.match(page,/АНАЛИЗА НА РИЗИК/);
  assert.match(chat,/data-workflow-prompt/);
  assert.doesNotMatch(chat,/>Предиктор</);
});

test("P2 author portrait already uses the efficient WebP asset on the public homepage",()=>{
  assert.match(page,/src="\/assets\/zoran-stojankic\.webp"/);
  assert.doesNotMatch(page,/zoran-stojankic\.png/);
});
