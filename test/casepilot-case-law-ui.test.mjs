import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("CasePilot UI sends only a legal query to governed case-law research",()=>{
  const js=fs.readFileSync(new URL("../assets/professional-tools.js",import.meta.url),"utf8");
  const start=js.indexOf('caseLawSearchButton.addEventListener("click"');
  const end=js.indexOf("function renderCaseLaw",start);
  assert.ok(start>0 && end>start);
  const block=js.slice(start,end);
  assert.ok(block.includes("JSON.stringify({query})"));
  assert.doesNotMatch(block,/matterText|documentText|fullText|attachments|documents/);
});

test("CasePilot case-law UI keeps records neutral until lawyer classification",()=>{
  const html=fs.readFileSync(new URL("../professional-tools.html",import.meta.url),"utf8");
  assert.match(html,/neutral/);
  assert.match(html,/supporting, adverse или distinguishing/);
  assert.match(html,/Приватен matter text или документи не се испраќаат/);
});

test("CasePilot case-law UI links only https sources in a new safe tab",()=>{
  const js=fs.readFileSync(new URL("../assets/professional-tools.js",import.meta.url),"utf8");
  const start=js.indexOf("function renderCaseLaw");
  const block=js.slice(start,start+2500);
  assert.ok(block.includes("/^https:\\/\\//i.test(card.sourceUrl)"));
  assert.match(block,/a.rel="noopener noreferrer"/);
});
