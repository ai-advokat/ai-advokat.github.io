import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { staticCaseLawFallback, CASE_LAW_STATIC_FALLBACK_RECORDS } from "../assets/case-law-static-fallback.js";

const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const sync=fs.readFileSync(".github/workflows/sync-pages-runtime.yml","utf8");
const index=fs.readFileSync("index.html","utf8");

test("static case-law fallback finds the supplied money-laundering decisions during runtime outage",()=>{
  const out=staticCaseLawFallback("Најди ми релевантна судска практика за перење пари и прикажи ми и спротивна практика ако постои.");
  assert.ok(out?.ok);
  assert.ok(out.rows.length>=4);
  assert.ok(out.rows.every(r=>/перење пари/i.test(r.i)));
  assert.match(out.text,/DISCOVERY ONLY — NOT REVIEWED AUTHORITY/);
  assert.match(out.text,/Спротивна практика не е потврдена/);
});

test("static fallback registry remains the exact bounded 36-case supplied package",()=>{
  assert.equal(CASE_LAW_STATIC_FALLBACK_RECORDS.length,36);
  assert.equal(new Set(CASE_LAW_STATIC_FALLBACK_RECORDS.map(x=>x.n)).size,36);
});

test("main chat uses static discovery only after governed API fallbacks fail",()=>{
  const sourcePos=chat.indexOf("async function fallbackSourceAssistant");
  const staticPos=chat.indexOf("const caseFallback=await staticCaseLawRegistryFallback(q)");
  const returnPos=chat.indexOf("return {ok:false,error:assistantError}",sourcePos);
  assert.ok(sourcePos>=0 && staticPos>sourcePos && returnPos>staticPos);
  assert.match(chat,/Case-Law discovery · offline\/static fallback/);
  assert.match(chat,/DISCOVERY ONLY · reviewed authority retrieval unavailable/);
});

test("Pages runtime ships the static fallback and r20 chat cache contract",()=>{
  assert.match(sync,/assets\/case-law-static-fallback\.js/);
  assert.match(sync,/node --check assets\/case-law-static-fallback\.js/);
  assert.match(index,/ai-advokat-chat\.js\?v=20261105-root-r20-case-law-runtime-fallback-v1/);
});
