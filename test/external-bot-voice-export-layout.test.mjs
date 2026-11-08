import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const html=fs.readFileSync("bot/index.html","utf8");
const core=fs.readFileSync("assets/standalone-bot.js","utf8");
const voice=fs.readFileSync("assets/ai-advokat-voice.mjs","utf8");
const vnext=fs.readFileSync("assets/standalone-bot-vnext.js","utf8");
const css=fs.readFileSync("assets/standalone-bot-r7.css","utf8");

test("external voice conversation remains mk-MK dictation -> auto send -> auto speak",()=>{
  assert.match(core,/mode:"half_duplex_auto_send_auto_speak"/);
  assert.match(core,/language:"mk-MK"/);
  assert.match(core,/createAIAdvokatVoiceRuntime\(window,\{lang:"mk-MK"\}\)/);
  assert.match(core,/voiceConversationPending=true/);
  assert.match(core,/requestSubmit\(\)/);
  assert.match(core,/voice\?\.speak\?\.\(spokenAnswer,\{status\}\)/);
  assert.match(voice,/SpeechRecognitionCtor=win\?\.SpeechRecognition\|\|win\?\.webkitSpeechRecognition/);
  assert.match(voice,/utter\.lang=lang/);
  assert.match(voice,/pickMacedonianVoice/);
});

test("external export UI exposes JSON DOCX PDF TXT and MD",()=>{
  for(const format of ["docx","pdf","json","txt","md"]){
    assert.match(html,new RegExp('data-export="'+format+'"'));
  }
});

test("external working export report satisfies governed CasePilot export schema",()=>{
  assert.match(vnext,/caseId:'external-'/);
  assert.match(vnext,/caseVersion:'working-1'/);
  assert.match(vnext,/humanGate:\{status:'pending'/);
  assert.match(vnext,/items:\[\{heading:'Работен одговор',text,status:'WORKING COPY',sources:\[\]\}\]/);
  assert.match(vnext,/sourceManifest:\[\]/);
  assert.match(vnext,/provenance:\[\]/);
});

test("MD and JSON export without depending on DOCX/PDF module import",()=>{
  assert.match(vnext,/if\(fmt==='md'\)/);
  assert.match(vnext,/text\/markdown;charset=utf-8/);
  assert.match(vnext,/if\(fmt==='json'\)/);
  assert.match(vnext,/JSON\.stringify\(report,null,2\)/);
  assert.match(vnext,/await mod\.downloadCasePilotExport\(report,fmt/);
});

test("export falls back to rendered assistant response if thread history is unavailable",()=>{
  assert.match(vnext,/document\.querySelectorAll\('#messages \.message\.assistant \.text'\)/);
  assert.match(vnext,/nodes\.at\(-1\)/);
});

test("Consolidator stays inside its R7 engine box",()=>{
  assert.match(css,/\.r7-engine\[data-r7-engine="consolidator"\]\{min-width:124px\}/);
  assert.match(css,/\.r7-engine\{[\s\S]*overflow:hidden/);
  assert.match(css,/\.r7-engine strong\{[\s\S]*white-space:nowrap;overflow:hidden/);
  assert.match(css,/@media\(max-width:1380px\)[\s\S]*consolidator"\]\{min-width:112px\}/);
});
