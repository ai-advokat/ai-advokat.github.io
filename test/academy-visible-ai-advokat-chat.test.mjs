import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
const html=fs.readFileSync("academy/index.html","utf8");
const js=fs.readFileSync("assets/academy-ai-advokat-chat.js","utf8");
const css=fs.readFileSync("assets/academy-ai-advokat-chat.css","utf8");
const LIVE="https://ai-advokat-github-io.aiadvokat16.workers.dev/bot/";

test("Academy visibly offers an external AI Advokat bot, not only training enrolment",()=>{
  assert.match(html, /id="academyChatOpenHero"/);
  assert.match(html, /id="academyChatLaunch"/);
  assert.match(html, /id="academyChatDialog"/);
  assert.match(html, /id="academyChatFrame"/);
  assert.match(html, /id="academyChatClose"/);
  assert.match(html, /href="https:\/\/ai-advokat-github-io\.aiadvokat16\.workers\.dev\/bot\/" target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /assets\/academy-ai-advokat-chat\.css/);
  assert.match(html, /assets\/academy-ai-advokat-chat\.js/);
  assert.ok(html.indexOf("Во спомен на Ненад") > -1,"Memorial content must be preserved");
  assert.ok(html.includes("Задолжител")||html.includes("Human Gate"));
});

test("One existing provider only, no automatic AI calls, lazy iframe and full-tab fallback",()=>{
  assert.ok(js.includes("var BOT_URL='"+LIVE+"'"));
  assert.ok(js.indexOf("frame.src=BOT_URL") > js.indexOf("function open()"));
  assert.ok(js.includes("mount.replaceChildren(frame)"));
  assert.ok(js.includes("full.href=BOT_URL"));
  assert.doesNotMatch(js,/\bfetch\s*\(|XMLHttpRequest|navigator\.sendBeacon|localStorage|sessionStorage|\/api\/bot|\/api\/chat/);
});

test("Accessible controls, fixed mobile layout and readable text",()=>{
  assert.match(html,/aria-haspopup="dialog" aria-controls="academyChatDialog"/);
  assert.match(html,/<dialog id="academyChatDialog"/);
  assert.match(css,/@media\(max-width:620px\)/);
  assert.match(css,/focus-visible/);
  assert.match(css,/color:#fff/);
  assert.match(css,/background:#102c49/);
  assert.match(html,/отворете го ботот во посебна картичка/);
});
