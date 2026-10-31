import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const css=fs.readFileSync("assets/ai-advokat-chat.css","utf8");

test("AI Advokat response placeholder renders the miniature dual-section Legal Pulse loader",()=>{
  assert.match(chat,/function createLegalPulseLoader\(\)/);
  assert.match(chat,/AI Advokat подготвува одговор…/);
  assert.match(chat,/m\.text==="Обработувам…"/);
  assert.match(chat,/section-left/);
  assert.match(chat,/section-right/);
  assert.match(chat,/ai-legal-pulse-dots/);
});

test("Legal Pulse is intentionally miniature and inline",()=>{
  assert.match(css,/display:inline-flex/);
  assert.match(css,/min-height:42px/);
  assert.match(css,/width:44px/);
  assert.match(css,/font-size:25px/);
  assert.doesNotMatch(css,/min-height:270px/);
  assert.doesNotMatch(css,/font-size:72px/);
});

test("mini loader keeps gold plus royal-lilac motion and reduced-motion accessibility",()=>{
  assert.match(css,/--pulse-gold:#d8b56a/);
  assert.match(css,/--pulse-lilac:#7f45d9/);
  assert.match(css,/@keyframes aiLegalMiniLeft/);
  assert.match(css,/@keyframes aiLegalMiniRight/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(chat,/role","status"/);
  assert.match(chat,/aria-live","polite"/);
});

test("loader makes no fabricated backend-stage completion claims",()=>{
  assert.doesNotMatch(chat,/Изворите се проверени/);
  assert.doesNotMatch(chat,/Human Gate completed/);
  assert.doesNotMatch(chat,/Правен тест.*complete/);
});
