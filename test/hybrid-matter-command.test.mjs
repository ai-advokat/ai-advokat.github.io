import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const js=await readFile(new URL("../assets/hybrid-matter-command.js",import.meta.url),"utf8");
const html=await readFile(new URL("../hybrid-matter-command.html",import.meta.url),"utf8");

test("Hybrid Matter Command is isolated from production chat and translator runtime",()=>{
  assert.doesNotMatch(js,/\/api\/chat|\/api\/ui-translate|fetch\s*\(/);
  assert.match(html,/connect-src 'none'/);
  assert.match(html,/Human Gate · LOCKED/);
});

test("Hybrid Matter Command exposes bounded readiness and no outcome prediction",()=>{
  assert.match(js,/outcomePrediction:false/);
  assert.match(js,/WORKING_MATERIAL_HUMAN_GATE_LOCKED/);
  assert.match(html,/Ова не е веројатност за успех/);
});

test("Cross-border path requires local counsel before foreign-law reliance",()=>{
  assert.match(js,/Локален counsel: REQUIRED/);
  assert.match(js,/Не пренесувај автоматски македонско право/);
});

test("Expert routing is bounded to expert briefs rather than fabricated opinions",()=>{
  assert.match(js,/Digital Evidence \/ IT Forensics/);
  assert.match(js,/Medical \/ Psychology Expert/);
  assert.match(js,/AI не симулира медицинско вештачење/);
});
