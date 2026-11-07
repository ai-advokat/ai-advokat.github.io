import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";
import {spawnSync} from "node:child_process";

const html=fs.readFileSync("bot/index.html","utf8");
const vnext=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");
const toolkit=fs.readFileSync("assets/standalone-bot-toolkit.js","utf8");
const css=fs.readFileSync("assets/standalone-bot-toolkit.css","utf8");

test("standalone toolkit assets parse and are cache-busted",()=>{
  for(const file of ["assets/standalone-bot-vnext.js","assets/standalone-bot-toolkit.js"]){
    const out=spawnSync(process.execPath,["--check",file],{encoding:"utf8"});
    assert.equal(out.status,0,file+" syntax error: "+out.stderr);
  }
  assert.match(html,/standalone-bot-vnext\.js\?v=20261107-hybrid-r1-visible/);
  assert.match(html,/standalone-bot-toolkit\.js\?v=20261106-toolkit-r14/);
  assert.match(html,/standalone-bot-toolkit\.css\?v=20261106-toolkit-r14/);
  assert.match(css,/\.aa-toolkit-dialog/);
});

test("standalone workspace exposes the three governed parity modules",()=>{
  for(const [action,label] of [
    ["public-evidence","Јавни докази"],
    ["professional-ecosystem","Pro Ecosystem"],
    ["justice-daily","Justice Daily"]
  ]){
    assert.ok(vnext.includes('data-vnext-action="'+action+'"'),"missing nav action "+action);
    assert.ok(vnext.includes(label),"missing label "+label);
  }
  assert.match(vnext,/AIAdvokatStandaloneToolkits\?\.openPublicEvidence/);
  assert.match(vnext,/AIAdvokatStandaloneToolkits\?\.openProfessionalEcosystem/);
  assert.match(vnext,/AIAdvokatStandaloneToolkits\?\.openJusticeDaily/);
});

test("Public Evidence parity uses governed registry and provenance card APIs",()=>{
  assert.match(toolkit,/\/api\/internal-toolkit\?task=/);
  assert.match(toolkit,/\/api\/public-evidence\/card/);
  assert.match(toolkit,/SHA-256/);
  assert.match(toolkit,/PUBLIC ≠ REUSABLE · LEAD ≠ CONCLUSION/);
  assert.match(toolkit,/HUMAN GATE REQUIRED/);
});

test("Professional Ecosystem parity keeps governed calculators and Human Gate",()=>{
  assert.match(toolkit,/\/api\/internal-toolkit\/calculate/);
  for(const calc of ["simple_interest","calendar_deadline","percentage"]) assert.ok(toolkit.includes(calc));
  assert.match(toolkit,/Living Law/);
  assert.match(toolkit,/Smart Legal Document Factory/);
  assert.match(toolkit,/Legal Watch/);
  assert.match(toolkit,/не поднесува, не потпишува, не плаќа/);
});

test("Justice Daily parity uses official aggregator data and source-health boundary",()=>{
  assert.match(toolkit,/\/api\/legal-news\?/);
  assert.match(toolkit,/Source health/);
  assert.match(toolkit,/Вест ≠ правен заклучок/);
  for(const source of ["ЛДБИС","HUDOC · ЕСЧП","EUR-Lex · OJ","CURIA · Суд на ЕУ","Правно-информациони систем · Србија","Министерство за правда · Словенија"]){
    assert.ok(toolkit.includes(source),"missing Justice Daily source "+source);
  }
});

test("Professional materials expose direct official authority shortcuts",()=>{
  for(const source of [
    "https://ldbis.pravda.gov.mk/",
    "https://hudoc.echr.coe.int/",
    "https://eur-lex.europa.eu/oj/daily-view/L-series/default.html",
    "https://curia.europa.eu/site/",
    "https://pravno-informacioni-sistem.rs/news-cat/3/0"
  ]) assert.ok(html.includes(source),"missing official source shortcut "+source);
});
