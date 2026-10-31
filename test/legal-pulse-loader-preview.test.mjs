import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const chat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const css=fs.readFileSync("assets/ai-advokat-chat.css","utf8");

test("AI Advokat response placeholder renders the dual-section Legal Pulse loader",()=>{
  assert.match(chat,/function createLegalPulseLoader\(\)/);
  assert.match(chat,/AI Advokat го подготвува одговорот…/);
  assert.match(chat,/Source-first · Governed AI · Human Review/);
  assert.match(chat,/m\.text==="Обработувам…"/);
  assert.match(chat,/section-left/);
  assert.match(chat,/section-right/);
});

test("Legal Pulse uses gold plus royal-lilac motion and remains accessible",()=>{
  assert.match(css,/--pulse-gold:#d8b56a/);
  assert.match(css,/--pulse-lilac:#7f45d9/);
  assert.match(css,/@keyframes aiLegalSectionLeft/);
  assert.match(css,/@keyframes aiLegalSectionRight/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(chat,/role","status"/);
  assert.match(chat,/aria-live","polite"/);
});

test("loader stage labels are visual progress cues, not backend completion claims",()=>{
  for(const label of ["Извори","Анализа","Правен тест","Human Gate"]){
    assert.match(chat,new RegExp(label));
  }
  assert.doesNotMatch(chat,/Изворите се проверени/);
  assert.doesNotMatch(chat,/Human Gate completed/);
});
