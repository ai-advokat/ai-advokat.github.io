import fs from "node:fs";
import test from "node:test";
import assert from "node:assert/strict";

const home=fs.readFileSync("index.html","utf8");
const rootChat=fs.readFileSync("assets/ai-advokat-chat.js","utf8");
const external=fs.readFileSync("assets/standalone-bot.js","utf8");
const bot=fs.readFileSync("bot/index.html","utf8");
const voice=fs.readFileSync("assets/ai-advokat-voice.mjs","utf8");

test("root AI Advokat exposes the governed 33-language selector",()=>{
  assert.match(home,/id="aiChatLanguage"/);
  const block=rootChat.slice(rootChat.indexOf("const AI_ADVOCAT_LANGUAGES"),rootChat.indexOf("const LANGUAGE_KEY"));
  const codes=[...block.matchAll(/code:"([a-z]{2})"/g)].map(m=>m[1]);
  assert.equal(codes.length,33);
  assert.deepEqual(codes,["sq","ar","bn","bs","bg","zh","hr","en","eo","fr","de","el","ha","he","hi","hu","id","it","ja","ko","la","mk","fa","pt","pa","ru","sr","sl","es","sw","tr","ur","vi"]);
  assert.match(rootChat,/localStorage\.setItem\(LANGUAGE_KEY/);
  assert.match(rootChat,/outputLanguage:selectedLanguageMeta\(\)\.code/);
});

test("English output mode is strict and preserves legal source identity",()=>{
  assert.match(rootChat,/Answer only in English explanatory prose/);
  assert.match(rootChat,/Do not mix Macedonian, Serbian, Bulgarian or other languages/);
  assert.match(rootChat,/jurisdiction, legal authority, source status, article identity, case number, citation and Human Gate responsibility must remain unchanged/);
});

test("dictation follows the selected language on root and external bot",()=>{
  assert.match(rootChat,/language:\(\)=>selectedSpeechLocale\(\)/);
  assert.match(external,/language:\(\)=>selectedSpeechLocale\(\)/);
  assert.match(rootChat,/langOverride:selectedSpeechLocale\(\)/);
});

test("root and external bot expose local microphone recording controls",()=>{
  for(const id of ["aiChatRecordStart","aiChatRecordStop","aiChatRecordDownload"]){
    assert.match(home,new RegExp('id="'+id+'"'));
  }
  for(const id of ["recordStart","recordStop","recordDownload"]){
    assert.match(bot,new RegExp('id="'+id+'"'));
  }
  assert.match(rootChat,/bindMicrophoneRecorder/);
  assert.match(external,/bindMicrophoneRecorder/);
});

test("shared Voice R4 recorder creates downloadable local WEBM without automatic upload",()=>{
  assert.match(voice,/function bindMicrophoneRecorder/);
  assert.match(voice,/mediaDevices\.getUserMedia/);
  assert.match(voice,/new Blob\(chunks/);
  assert.match(voice,/createObjectURL/);
  assert.match(voice,/a\.download=/);
  assert.match(voice,/Снимката е преземена локално/);
});
